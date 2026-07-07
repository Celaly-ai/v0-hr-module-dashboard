-- =====================================================================
-- FeyRoute Core V1 — RLS Policies & Tenant Helpers
-- Phase-1B: additive only. Mevcut tablolara dokunmaz.
-- Calistirma sirasi: 015 → 016 → 017 → 018 → 019
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tenant yardimcilari (SECURITY DEFINER — RLS dongusunu kirar)
-- ---------------------------------------------------------------------
create or replace function public.core_v1_auth_sirket_id(uid uuid default auth.uid())
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select p.sirket_id
  from public.personeller p
  where p.auth_id = uid
     or p.kullanici_id = uid
  order by
    case when p.durum = 'aktif' then 0 else 1 end,
    p.updated_at desc nulls last
  limit 1;
$$;

comment on function public.core_v1_auth_sirket_id(uuid) is
  'Oturum acmis kullanicinin sirket_id degerini personeller tablosundan dondurur.';

grant execute on function public.core_v1_auth_sirket_id(uuid) to authenticated;

-- is_admin(uuid) ortamda yoksa false dondurur; CREATE/COMPILE hatasi vermez.
create or replace function public.core_v1_safe_is_admin(uid uuid default auth.uid())
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  admin_result boolean;
begin
  if to_regprocedure('public.is_admin(uuid)') is null then
    return false;
  end if;

  execute 'select public.is_admin($1)' into admin_result using uid;
  return coalesce(admin_result, false);
exception
  when others then
    return false;
end;
$$;

comment on function public.core_v1_safe_is_admin(uuid) is
  'public.is_admin(uuid) varsa cagirir; yoksa veya hata olursa false dondurur.';

grant execute on function public.core_v1_safe_is_admin(uuid) to authenticated;

create or replace function public.core_v1_is_privileged(uid uuid default auth.uid())
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  personel_privileged boolean;
begin
  select p.rol in (
    'admin', 'ceo', 'servis_yoneticisi', 'urun_sorumlusu', 'ik_yoneticisi'
  )
  into personel_privileged
  from public.personeller p
  where (p.auth_id = uid or p.kullanici_id = uid)
    and p.durum = 'aktif'
  limit 1;

  if personel_privileged is true then
    return true;
  end if;

  if personel_privileged is false then
    return false;
  end if;

  return public.core_v1_safe_is_admin(uid);
end;
$$;

comment on function public.core_v1_is_privileged(uuid) is
  'Core V1 yazma yetkisi: once personeller rolu, sonra (varsa) is_admin.';

grant execute on function public.core_v1_is_privileged(uuid) to authenticated;

create or replace function public.core_v1_tenant_visible(row_sirket_id uuid)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  return
    row_sirket_id is not null
    and (
      row_sirket_id = public.core_v1_auth_sirket_id(auth.uid())
      or public.core_v1_is_privileged(auth.uid())
      or public.core_v1_safe_is_admin(auth.uid())
    );
end;
$$;

grant execute on function public.core_v1_tenant_visible(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RLS etkinlestir
-- ---------------------------------------------------------------------
alter table public.core_customers enable row level security;
alter table public.core_customer_phones enable row level security;
alter table public.core_products enable row level security;
alter table public.core_service_orders enable row level security;
alter table public.core_external_references enable row level security;
alter table public.core_operation_events enable row level security;
alter table public.core_identity_match_log enable row level security;

-- ---------------------------------------------------------------------
-- core_customers
-- ---------------------------------------------------------------------
drop policy if exists core_customers_select_tenant on public.core_customers;
create policy core_customers_select_tenant on public.core_customers
  for select to authenticated
  using (public.core_v1_tenant_visible(sirket_id));

drop policy if exists core_customers_insert_tenant on public.core_customers;
create policy core_customers_insert_tenant on public.core_customers
  for insert to authenticated
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

drop policy if exists core_customers_update_tenant on public.core_customers;
create policy core_customers_update_tenant on public.core_customers
  for update to authenticated
  using (public.core_v1_tenant_visible(sirket_id))
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

-- DELETE: trigger ile engellenir; ek policy yok

-- ---------------------------------------------------------------------
-- core_customer_phones
-- ---------------------------------------------------------------------
drop policy if exists core_customer_phones_select_tenant on public.core_customer_phones;
create policy core_customer_phones_select_tenant on public.core_customer_phones
  for select to authenticated
  using (public.core_v1_tenant_visible(sirket_id));

drop policy if exists core_customer_phones_insert_tenant on public.core_customer_phones;
create policy core_customer_phones_insert_tenant on public.core_customer_phones
  for insert to authenticated
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

drop policy if exists core_customer_phones_update_tenant on public.core_customer_phones;
create policy core_customer_phones_update_tenant on public.core_customer_phones
  for update to authenticated
  using (public.core_v1_tenant_visible(sirket_id))
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

-- ---------------------------------------------------------------------
-- core_products
-- ---------------------------------------------------------------------
drop policy if exists core_products_select_tenant on public.core_products;
create policy core_products_select_tenant on public.core_products
  for select to authenticated
  using (public.core_v1_tenant_visible(sirket_id));

drop policy if exists core_products_insert_tenant on public.core_products;
create policy core_products_insert_tenant on public.core_products
  for insert to authenticated
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

drop policy if exists core_products_update_tenant on public.core_products;
create policy core_products_update_tenant on public.core_products
  for update to authenticated
  using (public.core_v1_tenant_visible(sirket_id))
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

-- ---------------------------------------------------------------------
-- core_service_orders
-- ---------------------------------------------------------------------
drop policy if exists core_service_orders_select_tenant on public.core_service_orders;
create policy core_service_orders_select_tenant on public.core_service_orders
  for select to authenticated
  using (public.core_v1_tenant_visible(sirket_id));

drop policy if exists core_service_orders_insert_tenant on public.core_service_orders;
create policy core_service_orders_insert_tenant on public.core_service_orders
  for insert to authenticated
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

drop policy if exists core_service_orders_update_tenant on public.core_service_orders;
create policy core_service_orders_update_tenant on public.core_service_orders
  for update to authenticated
  using (public.core_v1_tenant_visible(sirket_id))
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

-- ---------------------------------------------------------------------
-- core_external_references (insert-only tablo)
-- ---------------------------------------------------------------------
drop policy if exists core_external_references_select_tenant on public.core_external_references;
create policy core_external_references_select_tenant on public.core_external_references
  for select to authenticated
  using (public.core_v1_tenant_visible(sirket_id));

drop policy if exists core_external_references_insert_tenant on public.core_external_references;
create policy core_external_references_insert_tenant on public.core_external_references
  for insert to authenticated
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

-- UPDATE/DELETE: trigger ile engellenir

-- ---------------------------------------------------------------------
-- core_operation_events (append-only)
-- ---------------------------------------------------------------------
drop policy if exists core_operation_events_select_tenant on public.core_operation_events;
create policy core_operation_events_select_tenant on public.core_operation_events
  for select to authenticated
  using (public.core_v1_tenant_visible(sirket_id));

drop policy if exists core_operation_events_insert_tenant on public.core_operation_events;
create policy core_operation_events_insert_tenant on public.core_operation_events
  for insert to authenticated
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

-- UPDATE/DELETE: trigger ile engellenir

-- ---------------------------------------------------------------------
-- core_identity_match_log (append-only)
-- ---------------------------------------------------------------------
drop policy if exists core_identity_match_log_select_tenant on public.core_identity_match_log;
create policy core_identity_match_log_select_tenant on public.core_identity_match_log
  for select to authenticated
  using (public.core_v1_tenant_visible(sirket_id));

drop policy if exists core_identity_match_log_insert_tenant on public.core_identity_match_log;
create policy core_identity_match_log_insert_tenant on public.core_identity_match_log
  for insert to authenticated
  with check (
    public.core_v1_tenant_visible(sirket_id)
    and public.core_v1_is_privileged(auth.uid())
  );

-- UPDATE/DELETE: trigger ile engellenir

-- ---------------------------------------------------------------------
-- Not: service_role anahtari RLS''i bypass eder (connector ingest icin).
-- ---------------------------------------------------------------------
