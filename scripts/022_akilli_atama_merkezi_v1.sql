-- Akıllı Atama Merkezi V1 — modül kaydı
-- Idempotent.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'moduller'
  ) then
    insert into public.moduller (kod, ad, aciklama, kategori, standart, aktif, sira)
    select
      'akilli_atama_merkezi',
      'Akıllı Atama Merkezi',
      'ARON aktif operasyonlar için ekip önerisi ve tek tek atama onayı.',
      'operasyon',
      false,
      true,
      108
    where not exists (
      select 1 from public.moduller where kod = 'akilli_atama_merkezi'
    );

    update public.moduller
    set
      ad = 'Akıllı Atama Merkezi',
      aciklama = 'ARON aktif operasyonlar için ekip önerisi ve tek tek atama onayı.',
      kategori = 'operasyon',
      standart = false,
      aktif = true
    where kod = 'akilli_atama_merkezi';
  end if;
end$$;
