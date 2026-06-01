-- =====================================================================
-- Auth schema: app_role enum, profiles, role_permissions, RLS, triggers.
-- Idempotent: safe to run multiple times.
-- =====================================================================

-- 1) Role enum ---------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'admin',
      'servis_yoneticisi',
      'urun_sorumlusu',
      'calisan'
    );
  end if;
end $$;

-- 2) Profiles table ----------------------------------------------------
-- Every auth.users row gets a matching public.profiles row via trigger.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'calisan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

-- RLS: users can read their own profile; admins can read all.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- RLS: only admins can update roles; users can update their own name.
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (true);

-- RLS: only admins may insert manually; the trigger below bypasses RLS.
drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
  on public.profiles for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 3) Auto-create profile on signup ------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
begin
  -- Optional: allow role selection via signup metadata (admins only typically).
  begin
    requested_role := coalesce(
      (new.raw_user_meta_data->>'role')::public.app_role,
      'calisan'
    );
  exception when others then
    requested_role := 'calisan';
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    requested_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Role permissions --------------------------------------------------
-- Single row per role, with the list of module slugs that role can see.
create table if not exists public.role_permissions (
  role public.app_role primary key,
  modules text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.role_permissions enable row level security;

-- Everyone authenticated can read the permission map (needed client-side).
drop policy if exists "role_permissions_read_all" on public.role_permissions;
create policy "role_permissions_read_all"
  on public.role_permissions for select
  to authenticated
  using (true);

-- Only admins can modify the map.
drop policy if exists "role_permissions_admin_write" on public.role_permissions;
create policy "role_permissions_admin_write"
  on public.role_permissions for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 5) updated_at trigger ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists role_permissions_set_updated_at on public.role_permissions;
create trigger role_permissions_set_updated_at
  before update on public.role_permissions
  for each row execute function public.set_updated_at();
