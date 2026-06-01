-- 009_live_pilot_readiness_check.sql
-- Read-only checks for live pilot readiness.
-- Expected result: every row should be ok=true before pilot users are invited.

with required_tables(table_name) as (
  values
    ('profiles'),
    ('role_permissions'),
    ('personeller'),
    ('vardiya_planlari'),
    ('izinler'),
    ('giris_cikis_kayitlari'),
    ('muhasebe_hareketleri'),
    ('varliklar'),
    ('araclar')
),
table_status as (
  select
    'table_exists:' || rt.table_name as check_name,
    exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_name = rt.table_name
    ) as ok
  from required_tables rt
),
rls_status as (
  select
    'rls_enabled:' || rt.table_name as check_name,
    coalesce(c.relrowsecurity, false) as ok
  from required_tables rt
  left join pg_class c on c.relname = rt.table_name
  left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
),
role_status as (
  select
    'role_permissions:' || r.role as check_name,
    exists (
      select 1
      from public.role_permissions rp
      where rp.role::text = r.role
        and cardinality(rp.modules) > 0
    ) as ok
  from (values
    ('admin'),
    ('servis_yoneticisi'),
    ('ik_yoneticisi'),
    ('urun_sorumlusu'),
    ('calisan')
  ) as r(role)
),
tenant_columns as (
  select
    'tenant_column:' || c.table_name as check_name,
    exists (
      select 1
      from information_schema.columns ic
      where ic.table_schema = 'public'
        and ic.table_name = c.table_name
        and ic.column_name = 'sirket_id'
    ) as ok
  from (values
    ('personeller'),
    ('izinler'),
    ('muhasebe_hareketleri'),
    ('varliklar'),
    ('araclar')
  ) as c(table_name)
)
select * from table_status
union all
select * from rls_status
union all
select * from role_status
union all
select * from tenant_columns
order by check_name;
