-- AI Kurumsal Yazışma Asistanı — personel zorunlu (standart) modül kaydı
-- Idempotent: mevcut kayıt varsa tekrar eklenmez; standart=true güncellenir.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'moduller'
  ) then
    insert into public.moduller (kod, ad, aciklama, kategori, standart, aktif, sira)
    select
      'ai_kanitli_yazisma_asistani',
      'AI Kurumsal Yazışma Asistanı',
      'Kanıt ve talebe dayalı profesyonel kurumsal yazı hazırlar.',
      'standart',
      true,
      true,
      7
    where not exists (
      select 1 from public.moduller where kod = 'ai_kanitli_yazisma_asistani'
    );

    update public.moduller
    set
      ad = 'AI Kurumsal Yazışma Asistanı',
      aciklama = 'Kanıt ve talebe dayalı profesyonel kurumsal yazı hazırlar.',
      kategori = 'standart',
      standart = true,
      aktif = true,
      sira = 7
    where kod = 'ai_kanitli_yazisma_asistani';
  end if;
end$$;
