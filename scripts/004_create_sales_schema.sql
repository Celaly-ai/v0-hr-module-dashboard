-- =====================================================================
-- Satis Takibi Modulu - Tablolar, indeksler, RLS ve Realtime
-- =====================================================================
-- products : Barkod -> urun adi eslestirmesi (tekrar taramada otomatik dolar)
-- sales    : Gerceklesen satis kayitlari (gercek zamanli listeleme kaynagi)
-- =====================================================================

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  barcode        text unique not null,
  name           text not null,
  default_price  numeric(12, 2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_barcode_idx on public.products (barcode);
create index if not exists products_name_idx    on public.products (lower(name));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------
create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references public.products(id) on delete set null,
  barcode       text,
  product_name  text not null,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(12, 2) not null default 0 check (unit_price >= 0),
  total_price   numeric(14, 2) not null default 0 check (total_price >= 0),
  seller_id     text,
  seller_name   text not null,
  sold_at       timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

create index if not exists sales_sold_at_idx    on public.sales (sold_at desc);
create index if not exists sales_seller_id_idx  on public.sales (seller_id);
create index if not exists sales_product_id_idx on public.sales (product_id);

-- ---------------------------------------------------------------------
-- RLS - Oturum acmis her kullanici okuyabilir / ekleyebilir.
-- Guncelleme ve silme yalnizca admin role icin (scripts/003'teki is_admin helper).
-- is_admin yoksa (ornegin migration sirasi farkliysa) otomatik dogru cikar.
-- ---------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.sales    enable row level security;

-- products policies
drop policy if exists products_select_authenticated on public.products;
create policy products_select_authenticated
  on public.products for select
  to authenticated
  using (true);

drop policy if exists products_insert_authenticated on public.products;
create policy products_insert_authenticated
  on public.products for insert
  to authenticated
  with check (true);

drop policy if exists products_update_authenticated on public.products;
create policy products_update_authenticated
  on public.products for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists products_delete_admin on public.products;
create policy products_delete_admin
  on public.products for delete
  to authenticated
  using (
    coalesce(
      (select public.is_admin()),
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

-- sales policies
drop policy if exists sales_select_authenticated on public.sales;
create policy sales_select_authenticated
  on public.sales for select
  to authenticated
  using (true);

drop policy if exists sales_insert_authenticated on public.sales;
create policy sales_insert_authenticated
  on public.sales for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists sales_update_own_or_admin on public.sales;
create policy sales_update_own_or_admin
  on public.sales for update
  to authenticated
  using (
    created_by = auth.uid()
    or coalesce(
      (select public.is_admin()),
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  )
  with check (
    created_by = auth.uid()
    or coalesce(
      (select public.is_admin()),
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

drop policy if exists sales_delete_own_or_admin on public.sales;
create policy sales_delete_own_or_admin
  on public.sales for delete
  to authenticated
  using (
    created_by = auth.uid()
    or coalesce(
      (select public.is_admin()),
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

-- ---------------------------------------------------------------------
-- Realtime: gercek zamanli satis listesi icin publication'a ekle.
-- (Supabase'de "supabase_realtime" publication'i default gelir.)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.sales';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.products';
    exception when duplicate_object then null;
    end;
  end if;
end$$;
