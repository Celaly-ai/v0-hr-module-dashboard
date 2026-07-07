"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type PersonelOzet = {
  id: string
  ad: string
  ekip_id: string | null
  ekip_adi: string | null
}

type Zimmet = {
  id: string
  fis_no: string | null
  ekip_id: string | null
  ekip_adi: string | null
  rota_sirasi: number | null
  randevu_blok: string | null
  musteri_adi: string | null
  telefon: string | null
  il: string | null
  ilce: string | null
  mahalle: string | null
  adres: string | null
  is_tipi: string | null
  planlanan_is_tipi: string | null
  urun_sayisi: number | null
  toplam_is_zorluk_puani: number | null
  notlar: string | null
  adres_tanimlandi: boolean | null
  adrese_varildi: boolean | null
  operasyon_durumu: string | null
  sonuc_tamamlandi: boolean | null
  sonuc_barkod_zorunlu: boolean | null
  durum: string | null
  gerceklesen_is_tipi: string | null
}

type Detay = {
  id: string
  operasyon_zimmet_id: string | null
  fis_no: string | null
  urun_adi: string | null
  urun_model_kodu: string | null
  marka: string | null
  seri_no: string | null
  mevcut_konum_tipi: string | null
  mevcut_konum_adi: string | null
  zimmete_alindi: boolean | null
  barkod_dogrulandi: boolean | null
  seri_no_dogrulandi: boolean | null
  durum: string | null
}

type TeslimForm = {
  detayId: string
  urunAdi: string
  barkod: string
  seriNo: string
}

type SonucForm = {
  zimmetId: string
  gerceklesenIsTipi: "NM" | "N" | "M"
  planlananIsTipi: string | null
  aciklama: string
}

function planlananIs(z: Zimmet) {
  return z.planlanan_is_tipi || z.is_tipi || "-"
}

function tamamlandiMi(z: Zimmet) {
  return Boolean(z.sonuc_tamamlandi)
}

function iptalMi(z: Zimmet) {
  return Boolean(z.sonuc_tamamlandi) && z.durum === "iptal"
}

function basariliTamamlandiMi(z: Zimmet) {
  return Boolean(z.sonuc_tamamlandi) && z.durum === "tamamlandi"
}

function aktifIsMi(z: Zimmet) {
  return !tamamlandiMi(z) && Boolean(z.adrese_varildi)
}

function urunDogrulandiMi(u: Detay) {
  return Boolean(u.zimmete_alindi && u.barkod_dogrulandi && u.seri_no_dogrulandi)
}

function fisNoGoster(z: Zimmet, urunler: Detay[]) {
  if (z.fis_no) return z.fis_no
  return urunler.find((u) => u.fis_no)?.fis_no ?? "-"
}

function gorevDurumEtiketi(z: Zimmet, urunler: Detay[]) {
  if (iptalMi(z)) return "İptal"
  if (basariliTamamlandiMi(z)) return "Tamamlandı"
  if (z.adres_tanimlandi) return "AT Tamamlandı"
  if (z.adrese_varildi) return "AT Bekliyor"
  if (urunler.length > 0) {
    const hepsi = urunler.every((u) => urunDogrulandiMi(u))
    if (hepsi) return "Ürün Ekip Zimmetinde"
    const hic = urunler.some((u) => urunDogrulandiMi(u))
    if (!hic) return "Ürün Zimmeti Bekliyor"
    return "Ürün Zimmeti Bekliyor"
  }
  if (z.durum === "atanmis" || z.operasyon_durumu === "ADRESE_VARILDI") {
    return z.adrese_varildi ? "Adrese Varıldı" : "Atanmış"
  }
  return z.durum === "atanmis" ? "Atanmış" : z.durum || z.operasyon_durumu || "Atanmış"
}

function yolTarifiUrl(z: Zimmet) {
  const parcalar = [z.adres, z.mahalle, z.ilce, z.il].filter(Boolean).join(", ")
  if (!parcalar) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parcalar)}`
}

function siralaAktif(liste: Zimmet[]) {
  return [...liste].sort(
    (a, b) => (a.rota_sirasi ?? 9999) - (b.rota_sirasi ?? 9999),
  )
}

function siralaTamamlanan(liste: Zimmet[]) {
  return [...liste].sort(
    (a, b) => (a.rota_sirasi ?? 9999) - (b.rota_sirasi ?? 9999),
  )
}

const buyukButon =
  "w-full rounded-2xl px-4 py-4 text-sm font-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"

export default function GorevlerimPage() {
  const [personel, setPersonel] = useState<PersonelOzet | null>(null)
  const [zimmetler, setZimmetler] = useState<Zimmet[]>([])
  const [detaylar, setDetaylar] = useState<Detay[]>([])
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")
  const [islemMesaji, setIslemMesaji] = useState("")
  const [islemHata, setIslemHata] = useState("")
  const [islem, setIslem] = useState(false)

  const [teslimForm, setTeslimForm] = useState<TeslimForm | null>(null)
  const [iptalZimmetId, setIptalZimmetId] = useState("")
  const [iptalNedeni, setIptalNedeni] = useState("")
  const [sonucForm, setSonucForm] = useState<SonucForm | null>(null)

  const verileriYukle = useCallback(async () => {
    setLoading(true)
    setHata("")

    const response = await fetch("/api/gorevlerim", { cache: "no-store" })
    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata(json?.error || "Görevler yüklenemedi.")
      setPersonel(null)
      setZimmetler([])
      setDetaylar([])
      setLoading(false)
      return
    }

    setPersonel(json.personel || null)
    setZimmetler((json.zimmetler || []) as Zimmet[])
    setDetaylar((json.detaylar || []) as Detay[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void verileriYukle()
  }, [verileriYukle])

  const detayMap = useMemo(() => {
    const map = new Map<string, Detay[]>()
    for (const d of detaylar) {
      const key = d.operasyon_zimmet_id
      if (!key) continue
      const mevcut = map.get(key) ?? []
      mevcut.push(d)
      map.set(key, mevcut)
    }
    return map
  }, [detaylar])

  const aktifGorevler = useMemo(
    () => siralaAktif(zimmetler.filter((z) => !tamamlandiMi(z))),
    [zimmetler],
  )

  const tamamlananGorevler = useMemo(
    () => siralaTamamlanan(zimmetler.filter((z) => tamamlandiMi(z))),
    [zimmetler],
  )

  const kpiler = useMemo(() => {
    const bugun = zimmetler.length
    const tamamlanan = zimmetler.filter((z) => basariliTamamlandiMi(z)).length
    const kalan = zimmetler.filter((z) => !tamamlandiMi(z)).length
    const aktifIs = zimmetler.filter((z) => aktifIsMi(z)).length

    return { bugun, tamamlanan, kalan, aktifIs }
  }, [zimmetler])

  function detaylariGetir(zimmetId: string) {
    return detayMap.get(zimmetId) ?? []
  }

  function konumAl(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Bu cihaz konum servisini desteklemiyor."))
        return
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      })
    })
  }

  async function adreseVarisKaydet(zimmet: Zimmet) {
    setIslem(true)
    setIslemHata("")
    setIslemMesaji("")

    try {
      const pos = await konumAl()
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const mesafe = 0

      const response = await fetch("/api/operasyon-zimmet/adrese-varis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zimmet_id: zimmet.id,
          lat,
          lng,
          mesafe_metre: mesafe,
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        setIslemHata(json?.error || "Adrese varış kaydedilemedi.")
        return
      }

      setIslemMesaji(json?.message || "Adrese varış kaydedildi.")
      await verileriYukle()
    } catch (err) {
      const geoError = err as GeolocationPositionError & Error
      if (geoError?.code === 1) {
        setIslemHata(
          "Konum izni verilmedi. Adrese varış kaydı için konum izni gereklidir.",
        )
      } else if (geoError?.code === 2) {
        setIslemHata("Konum bilgisi alınamadı. Açık alanda tekrar deneyin.")
      } else if (geoError?.code === 3) {
        setIslemHata("Konum alma zaman aşımına uğradı. Tekrar deneyin.")
      } else {
        setIslemHata(geoError?.message || "Konum alınamadı.")
      }
    } finally {
      setIslem(false)
    }
  }

  async function adresTeyitKaydet(zimmet: Zimmet) {
    setIslem(true)
    setIslemHata("")
    setIslemMesaji("")

    try {
      const pos = await konumAl()
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude

      const response = await fetch("/api/operasyon-zimmet/adres-teyit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zimmet_id: zimmet.id,
          lat,
          lng,
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        setIslemHata(json?.error || "Adres teyidi kaydedilemedi.")
        return
      }

      setIslemMesaji(json?.message || "Adres teyidi tamamlandı.")
      await verileriYukle()
    } catch (err) {
      const geoError = err as GeolocationPositionError & Error
      if (geoError?.code === 1) {
        setIslemHata(
          "Konum izni verilmedi. Adres teyidi için konum izni gereklidir.",
        )
      } else if (geoError?.code === 2) {
        setIslemHata("Konum bilgisi alınamadı. Açık alanda tekrar deneyin.")
      } else if (geoError?.code === 3) {
        setIslemHata("Konum alma zaman aşımına uğradı. Tekrar deneyin.")
      } else {
        setIslemHata(geoError?.message || "Konum alınamadı.")
      }
    } finally {
      setIslem(false)
    }
  }

  async function teslimAlKaydet() {
    if (!teslimForm) return

    if (!teslimForm.barkod.trim() || !teslimForm.seriNo.trim()) {
      setIslemHata("Barkod ve seri no zorunludur.")
      return
    }

    setIslem(true)
    setIslemHata("")
    setIslemMesaji("")

    const response = await fetch("/api/operasyon-zimmet/urun-zimmete-al", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        detay_id: teslimForm.detayId,
        barkod: teslimForm.barkod.trim(),
        seri_no: teslimForm.seriNo.trim(),
      }),
    })

    const json = await response.json().catch(() => null)
    setIslem(false)

    if (!response.ok) {
      setIslemHata(json?.error || "Ürün teslim alınamadı.")
      return
    }

    setTeslimForm(null)
    setIslemMesaji(json?.message || "Ürün ekip zimmetine alındı.")
    await verileriYukle()
  }

  async function sonucKaydet() {
    if (!sonucForm) return

    const aciklamaZorunlu =
      sonucForm.gerceklesenIsTipi === "N" &&
      sonucForm.planlananIsTipi === "NM"

    if (aciklamaZorunlu && !sonucForm.aciklama.trim()) {
      setIslemHata(
        "NM planlanmış iş N olarak sonuçlandırılıyorsa açıklama zorunludur.",
      )
      return
    }

    setIslem(true)
    setIslemHata("")
    setIslemMesaji("")

    const response = await fetch("/api/operasyon-zimmet/sonuclandir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zimmet_id: sonucForm.zimmetId,
        gerceklesen_is_tipi: sonucForm.gerceklesenIsTipi,
        aciklama: sonucForm.aciklama.trim(),
      }),
    })

    const json = await response.json().catch(() => null)
    setIslem(false)

    if (!response.ok) {
      setIslemHata(json?.error || "Sonuç kaydedilemedi.")
      return
    }

    setSonucForm(null)
    setIslemMesaji(json?.message || "Operasyon sonucu kaydedildi.")
    await verileriYukle()
  }

  async function iptalKaydet() {
    if (!iptalZimmetId || !iptalNedeni.trim()) return

    setIslem(true)
    setIslemHata("")
    setIslemMesaji("")

    const response = await fetch("/api/operasyon-zimmet/iptal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zimmet_id: iptalZimmetId,
        iptal_nedeni: iptalNedeni.trim(),
      }),
    })

    const json = await response.json().catch(() => null)
    setIslem(false)

    if (!response.ok) {
      setIslemHata(json?.error || "İptal kaydedilemedi.")
      return
    }

    setIptalZimmetId("")
    setIptalNedeni("")
    setIslemMesaji(json?.message || "İptal kaydedildi.")
    await verileriYukle()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-8 text-slate-950">
      <div className="mx-auto max-w-md space-y-3">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-blue-700">FeyRoute</p>
          <h1 className="text-xl font-black">Görevlerim</h1>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Bugünkü saha operasyon ekranınız
          </p>
          {personel?.ad && (
            <p className="mt-2 text-xs font-bold text-slate-600">
              {personel.ad}
              {personel.ekip_adi ? ` · ${personel.ekip_adi}` : ""}
            </p>
          )}
        </header>

        {hata && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {hata}
          </div>
        )}

        {islemMesaji && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">
            {islemMesaji}
          </div>
        )}

        {islemHata && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {islemHata}
          </div>
        )}

        <section className="grid grid-cols-2 gap-2">
          <Kpi title="Bugün" value={kpiler.bugun} />
          <Kpi title="Tamamlanan" value={kpiler.tamamlanan} />
          <Kpi title="Kalan" value={kpiler.kalan} />
          <Kpi title="Aktif İş" value={kpiler.aktifIs} />
        </section>

        {loading && (
          <div className="rounded-2xl bg-white p-4 text-center text-sm font-black">
            Yükleniyor...
          </div>
        )}

        {!loading && !hata && zimmetler.length === 0 && (
          <div className="rounded-2xl bg-white p-4 text-center text-sm font-bold text-slate-600">
            Bugün için atanmış görev bulunmuyor.
          </div>
        )}

        {!loading && aktifGorevler.length > 0 && (
          <p className="px-1 text-xs font-black uppercase tracking-wide text-slate-500">
            Bugünkü Görevler
          </p>
        )}

        {aktifGorevler.map((z) => {
          const urunler = detaylariGetir(z.id)
          const yolUrl = yolTarifiUrl(z)
          const atTamam = Boolean(z.adres_tanimlandi)
          const adreseVarildi = Boolean(z.adrese_varildi)
          const sonucAcik = atTamam && !tamamlandiMi(z)
          const atAcik = adreseVarildi && !atTamam && !tamamlandiMi(z)
          const durumEtiketi = gorevDurumEtiketi(z, urunler)
          const fis = fisNoGoster(z, urunler)

          return (
            <section
              key={z.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-500">
                      #{z.rota_sirasi ?? "-"} · {z.randevu_blok ?? "Randevu yok"}
                    </p>
                    <h2 className="mt-1 text-xl font-black leading-tight">
                      {z.musteri_adi || "-"}
                    </h2>
                    <span className="mt-2 inline-block rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-800">
                      {durumEtiketi}
                    </span>
                  </div>
                  <div className="shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-center">
                    <p className="text-xs font-black text-blue-700">İş</p>
                    <p className="text-lg font-black text-blue-900">
                      {planlananIs(z)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-sm font-bold text-slate-700">
                  <p>☎ {z.telefon || "-"}</p>
                  <p>
                    📍{" "}
                    {[z.il, z.ilce, z.mahalle].filter(Boolean).join(" / ") ||
                      "-"}
                  </p>
                  {z.adres && (
                    <p className="text-xs font-bold text-slate-500">{z.adres}</p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
                  <p>
                    <span className="font-black text-slate-900">Fiş:</span> {fis}
                  </p>
                  <p className="mt-1">
                    <span className="font-black text-slate-900">İş tipi:</span>{" "}
                    {planlananIs(z)}
                    {z.gerceklesen_is_tipi
                      ? ` → ${z.gerceklesen_is_tipi}`
                      : ""}
                  </p>
                  {z.notlar && (
                    <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">
                      <span className="font-black">Not:</span> {z.notlar}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={z.telefon ? `tel:${z.telefon}` : undefined}
                    className={`${buyukButon} text-center ${
                      z.telefon
                        ? "bg-green-700 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                    aria-disabled={!z.telefon}
                    onClick={(e) => {
                      if (!z.telefon) e.preventDefault()
                    }}
                  >
                    📞 Müşteriyi Ara
                  </a>

                  <a
                    href={yolUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${buyukButon} text-center ${
                      yolUrl
                        ? "bg-blue-700 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                    aria-disabled={!yolUrl}
                    onClick={(e) => {
                      if (!yolUrl) e.preventDefault()
                    }}
                  >
                    🗺️ Yol Tarifi
                  </a>
                </div>

                <details className="rounded-xl border border-slate-200" open>
                  <summary className="cursor-pointer list-none p-3 text-sm font-black text-blue-700">
                    Ürünler ({urunler.length})
                    {z.sonuc_barkod_zorunlu && (
                      <span className="ml-2 text-xs font-bold text-amber-700">
                        · Sonuç için ürün doğrulama zorunlu
                      </span>
                    )}
                  </summary>

                  <div className="space-y-2 border-t bg-slate-50 p-3">
                    {urunler.length === 0 && (
                      <p className="text-xs font-bold text-slate-500">
                        Ürün detayı yok — arıza/servis görevlerinde ürün müşteri
                        adresinde olabilir.
                      </p>
                    )}

                    {urunler.map((u) => {
                      const teslimAlindi = urunDogrulandiMi(u)

                      return (
                        <div key={u.id} className="rounded-xl border bg-white p-3">
                          <p className="text-xs font-black text-slate-500">
                            {u.fis_no || fis}
                          </p>
                          <p className="mt-1 text-sm font-black leading-tight">
                            {u.urun_adi || "-"}
                          </p>
                          {u.marka && (
                            <p className="text-xs font-bold text-slate-600">
                              Marka: {u.marka}
                            </p>
                          )}
                          {u.urun_model_kodu && (
                            <p className="text-xs font-bold text-slate-600">
                              Model: {u.urun_model_kodu}
                            </p>
                          )}
                          {u.seri_no && (
                            <p className="text-xs font-bold text-slate-600">
                              Seri: {u.seri_no}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-bold text-slate-600">
                            Konum: {u.mevcut_konum_tipi || "-"}{" "}
                            {u.mevcut_konum_adi
                              ? `· ${u.mevcut_konum_adi}`
                              : ""}
                          </p>
                          <div className="mt-2 space-y-1 text-xs font-bold">
                            <p>
                              {u.barkod_dogrulandi
                                ? "✅ Barkod doğrulandı"
                                : "□ Barkod bekliyor"}
                            </p>
                            <p>
                              {u.seri_no_dogrulandi
                                ? "✅ Seri no doğrulandı"
                                : "□ Seri no bekliyor"}
                            </p>
                            <p>
                              {u.zimmete_alindi
                                ? "✅ Ekip zimmetinde"
                                : "□ Ekip zimmeti bekliyor"}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={teslimAlindi || islem}
                            onClick={() =>
                              setTeslimForm({
                                detayId: u.id,
                                urunAdi: u.urun_adi || "Ürün",
                                barkod: "",
                                seriNo: "",
                              })
                            }
                            className={`mt-3 ${buyukButon} border-2 border-blue-700 bg-white text-blue-700`}
                          >
                            {teslimAlindi
                              ? "✓ Teslim Alındı"
                              : "Ürünü Teslim Al"}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </details>

                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Operasyon
                  </p>

                  <button
                    type="button"
                    disabled={islem || adreseVarildi}
                    onClick={() => void adreseVarisKaydet(z)}
                    className={`${buyukButon} bg-indigo-700 text-white`}
                  >
                    {adreseVarildi
                      ? "✓ Adrese Varıldı"
                      : "📍 Adrese Vardım"}
                  </button>

                  <button
                    type="button"
                    disabled={!atAcik || islem}
                    onClick={() => void adresTeyitKaydet(z)}
                    className={`${buyukButon} bg-slate-900 text-white`}
                  >
                    {atTamam
                      ? "✓ AT Tamamlandı"
                      : atAcik
                        ? "📍 AT Yap — Adres Teyidi"
                        : "📍 AT — Adrese varış sonrası"}
                  </button>

                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Sonuç
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {(["NM", "N", "M"] as const).map((tip) => (
                      <button
                        key={tip}
                        type="button"
                        disabled={!sonucAcik || islem}
                        onClick={() =>
                          setSonucForm({
                            zimmetId: z.id,
                            gerceklesenIsTipi: tip,
                            planlananIsTipi: planlananIs(z),
                            aciklama: "",
                          })
                        }
                        className={`rounded-2xl py-4 text-base font-black ${
                          sonucAcik
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {tip}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={tamamlandiMi(z) || islem}
                    onClick={() => setIptalZimmetId(z.id)}
                    className={`${buyukButon} bg-red-600 text-white`}
                  >
                    ⛔ İptal
                  </button>
                </div>
              </div>
            </section>
          )
        })}

        {!loading && tamamlananGorevler.length > 0 && (
          <>
            <p className="px-1 pt-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Tamamlanan Görevler
            </p>

            {tamamlananGorevler.map((z) => {
              const urunler = detaylariGetir(z.id)
              const durumEtiketi = gorevDurumEtiketi(z, urunler)

              return (
                <details
                  key={z.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  <summary className="cursor-pointer list-none p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-slate-500">
                          #{z.rota_sirasi ?? "-"} · {z.musteri_adi || "-"}
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {planlananIs(z)}
                          {z.gerceklesen_is_tipi
                            ? ` → ${z.gerceklesen_is_tipi}`
                            : ""}
                        </p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                        {durumEtiketi}
                      </span>
                    </div>
                  </summary>
                  <div className="border-t bg-slate-50 p-3 text-xs font-bold text-slate-600">
                    <p>Fiş: {fisNoGoster(z, urunler)}</p>
                    <p className="mt-1">Randevu: {z.randevu_blok || "-"}</p>
                    {z.notlar && <p className="mt-1">Not: {z.notlar}</p>}
                  </div>
                </details>
              )
            })}
          </>
        )}
      </div>

      {teslimForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-3">
          <div className="w-full rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-lg font-black text-blue-900">Ürünü Teslim Al</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {teslimForm.urunAdi}
            </p>

            <label className="mt-3 block text-xs font-black text-slate-600">
              Barkod
            </label>
            <input
              value={teslimForm.barkod}
              onChange={(e) =>
                setTeslimForm({ ...teslimForm, barkod: e.target.value })
              }
              className="mt-1 w-full rounded-xl border p-3 text-sm font-bold outline-none"
              placeholder="Barkod girin"
            />

            <label className="mt-3 block text-xs font-black text-slate-600">
              Seri No
            </label>
            <input
              value={teslimForm.seriNo}
              onChange={(e) =>
                setTeslimForm({ ...teslimForm, seriNo: e.target.value })
              }
              className="mt-1 w-full rounded-xl border p-3 text-sm font-bold outline-none"
              placeholder="Seri no girin"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTeslimForm(null)}
                className="rounded-xl border px-3 py-3 text-sm font-black"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={islem}
                onClick={() => void teslimAlKaydet()}
                className="rounded-xl bg-blue-700 px-3 py-3 text-sm font-black text-white disabled:bg-slate-300"
              >
                Teslim Al
              </button>
            </div>
          </div>
        </div>
      )}

      {sonucForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-3">
          <div className="w-full rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-lg font-black text-slate-900">Operasyon Sonucu</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">
              Gerçekleşen işlem: {sonucForm.gerceklesenIsTipi}
            </p>

            <label className="mt-3 block text-xs font-black text-slate-600">
              Açıklama
            </label>
            <textarea
              value={sonucForm.aciklama}
              onChange={(e) =>
                setSonucForm({ ...sonucForm, aciklama: e.target.value })
              }
              placeholder="Açıklama..."
              className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm font-bold outline-none"
            />

            {sonucForm.gerceklesenIsTipi === "N" &&
              sonucForm.planlananIsTipi === "NM" && (
                <p className="mt-2 text-xs font-bold text-amber-700">
                  NM planlanmış iş N olarak sonuçlandırılıyorsa açıklama
                  zorunludur.
                </p>
              )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSonucForm(null)}
                className="rounded-xl border px-3 py-3 text-sm font-black"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={islem}
                onClick={() => void sonucKaydet()}
                className="rounded-xl bg-slate-900 px-3 py-3 text-sm font-black text-white disabled:bg-slate-300"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {iptalZimmetId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-3">
          <div className="w-full rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-lg font-black text-red-700">İş İptali</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              İptal nedeni zorunludur.
            </p>

            <textarea
              value={iptalNedeni}
              onChange={(e) => setIptalNedeni(e.target.value)}
              placeholder="İptal nedeni yaz..."
              className="mt-3 min-h-28 w-full rounded-xl border p-3 text-sm font-bold outline-none"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIptalZimmetId("")
                  setIptalNedeni("")
                }}
                className="rounded-xl border px-3 py-3 text-sm font-black"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!iptalNedeni.trim() || islem}
                onClick={() => void iptalKaydet()}
                className="rounded-xl bg-red-600 px-3 py-3 text-sm font-black text-white disabled:bg-slate-300"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}
