-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.3
-- KYM Belge Storage Test Politikaları
--
-- KYM bağımsız geliştirme/test aşaması içindir.
-- Mevcut FeyRoute tablolarına dokunmaz.
--
-- CANLI ENTEGRASYON ÖNCESİ:
-- Bu politikalar şirket/kullanıcı bazlı sıkı RLS ile değiştirilecektir.
-- ---------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'kym-belgeleri',
  'kym-belgeleri',
  false
)
on conflict (id)
do update set
  public = false;

-- ---------------------------------------------------------------------
-- SELECT
-- ---------------------------------------------------------------------

drop policy if exists
"kym_belgeleri_test_read"
on storage.objects;

create policy
"kym_belgeleri_test_read"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'kym-belgeleri'
);

-- ---------------------------------------------------------------------
-- INSERT
-- ---------------------------------------------------------------------

drop policy if exists
"kym_belgeleri_test_insert"
on storage.objects;

create policy
"kym_belgeleri_test_insert"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'kym-belgeleri'
);

-- ---------------------------------------------------------------------
-- UPDATE
-- ---------------------------------------------------------------------

drop policy if exists
"kym_belgeleri_test_update"
on storage.objects;

create policy
"kym_belgeleri_test_update"
on storage.objects
for update
to anon, authenticated
using (
  bucket_id = 'kym-belgeleri'
)
with check (
  bucket_id = 'kym-belgeleri'
);

-- ---------------------------------------------------------------------
-- DELETE
-- ---------------------------------------------------------------------

drop policy if exists
"kym_belgeleri_test_delete"
on storage.objects;

create policy
"kym_belgeleri_test_delete"
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'kym-belgeleri'
);

-- ---------------------------------------------------------------------
-- Kontrol
-- ---------------------------------------------------------------------

select
  policyname,
  cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'kym_belgeleri_test_%'
order by policyname;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------