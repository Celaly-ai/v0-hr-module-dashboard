import type { SupabaseClient } from "@supabase/supabase-js"

export type BayiMuhasebeOzet = {
  cari_bagli: boolean
  gelir_30: number
  gider_30: number
  net_30: number
  tahsilat_30: number
  acik_fatura_tutar: number
  karlilik_skoru: number
  not: string
}

function otuzGunOnceIso() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

function turEsles(tur: string | null | undefined, hareketTipi: string | null | undefined, hedef: string) {
  const birlesik = `${tur || ""} ${hareketTipi || ""}`.toLocaleLowerCase("tr-TR")
  return birlesik.includes(hedef)
}

function karlilikSkoruHesapla(gelir: number, net: number, acikFatura: number) {
  if (gelir <= 0 && net <= 0 && acikFatura <= 0) return 50

  let skor = 50
  if (gelir > 0) {
    const marj = net / gelir
    skor = Math.round(50 + marj * 50)
  } else if (net > 0) {
    skor = 70
  }

  if (acikFatura > gelir * 0.3 && gelir > 0) skor -= 15
  if (net < 0) skor -= 20

  return Math.max(0, Math.min(100, skor))
}

export async function hesaplaBayiMuhasebeOzet(
  client: SupabaseClient,
  sirketId: string,
  bayiCariId: string | null | undefined
): Promise<BayiMuhasebeOzet | null> {
  if (!bayiCariId) return null

  const since = otuzGunOnceIso()

  const hareketSorgu = client
    .from("muhasebe_hareketleri")
    .select("tur, hareket_tipi, tutar, created_at")
    .eq("sirket_id", sirketId)
    .eq("cari_id", bayiCariId)
    .gte("created_at", since)

  const faturaSorgu = client
    .from("muhasebe_faturalar")
    .select("kalan_tutar, durum")
    .eq("sirket_id", sirketId)
    .eq("cari_id", bayiCariId)
    .in("durum", ["bekliyor", "kismi_odendi"])

  const [{ data: hareketler, error: hareketError }, { data: faturalar, error: faturaError }] =
    await Promise.all([hareketSorgu, faturaSorgu])

  if (hareketError) return null
  if (faturaError) return null

  let gelir = 0
  let gider = 0
  let tahsilat = 0

  for (const h of hareketler || []) {
    const tutar = Number(h.tutar || 0)
    if (turEsles(h.tur, h.hareket_tipi, "gelir")) gelir += tutar
    if (turEsles(h.tur, h.hareket_tipi, "gider")) gider += tutar
    if (turEsles(h.tur, h.hareket_tipi, "tahsilat")) tahsilat += tutar
  }

  const acikFatura = (faturalar || []).reduce(
    (toplam, f) => toplam + Number(f.kalan_tutar || 0),
    0
  )
  const net = gelir - gider
  const karlilik = karlilikSkoruHesapla(gelir, net, acikFatura)

  let not = "Son 30 gün muhasebe hareketi zayıf veya dengeli."
  if (karlilik >= 75) not = "Muhasebe verisine göre güçlü karlılık profili."
  else if (karlilik >= 55) not = "Karlılık kabul edilebilir; açık fatura ve giderler izlenmeli."
  else if (net < 0) not = "Son 30 günde net negatif — maliyet ve iade süreçleri gözden geçirilmeli."
  else if (acikFatura > 0) not = "Açık fatura bakiyesi karlılık skorunu düşürüyor."

  return {
    cari_bagli: true,
    gelir_30: Math.round(gelir),
    gider_30: Math.round(gider),
    net_30: Math.round(net),
    tahsilat_30: Math.round(tahsilat),
    acik_fatura_tutar: Math.round(acikFatura),
    karlilik_skoru: karlilik,
    not,
  }
}
