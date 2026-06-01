-- =====================================================================
-- Fix: "infinite recursion detected in policy for relation profiles"
--
-- The original policies in 001_create_auth_schema.sql subquery
-- public.profiles from *within* their own USING / WITH CHECK clauses.
-- Postgres does not guarantee short-circuit OR, so the subquery is
-- re-entered through RLS and recurses until the planner aborts.
-- Result: every SELECT on profiles returns an error and the client
-- falls back to the default role ("calisan"), which is why the
-- sidebar shows "Calisan" for everyone.
--
-- Fix: move the admin check into a SECURITY DEFINER helper that runs
-- bypassing RLS, then rewrite the policies to call that helper.
-- Idempotent: safe to run multiple times.
-- =====================================================================

-- 1) Admin check helper ------------------------------------------------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = uid),
    false
  );
$$;

-- Allow calling from the Postgrest API as both anon and authenticated
-- (the function still enforces: only returns true when the row exists).
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- 2) Rewrite profiles SELECT policy -----------------------------------
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_admin(auth.uid())
  );

-- 3) Rewrite profiles UPDATE policies ---------------------------------
-- Let users update their own row without a recursive role-check.
-- Role immutability for non-admins is enforced by the trigger below.
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (true);

-- 4) Rewrite profiles INSERT policy -----------------------------------
drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
  on public.profiles for insert
  with check (public.is_admin(auth.uid()));

-- 5) Rewrite role_permissions admin-write policy ----------------------
drop policy if exists "role_permissions_admin_write" on public.role_permissions;
create policy "role_permissions_admin_write"
  on public.role_permissions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 6) Prevent non-admins from changing their own role ------------------
-- (Replaces the recursive WITH CHECK that used to enforce this.)
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can change profile.role (uid=%).', auth.uid()
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_role_change on public.profiles;
create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();
