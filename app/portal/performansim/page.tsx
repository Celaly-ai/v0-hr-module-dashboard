"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type YillikPerformans = {
  personel_id: string
  yil: number
  teknisyen_gorunen_ad: string

  nps_puan: number | null
  randevu_puan: number | null
  sikayet_puan: number | null
  tamamlayici_puan: number | null
  ek_garanti_puan: number | null

  toplam_puan: number | null

  harf_notu: string
  prim_hakki: boolean
  prim_durumu: string

  performans_sirasi: number
  toplam_teknisyen_sayisi: number
}

type AylikPerformans = {
  personel_id: string
  yil: number
  ay: number
  teknisyen_gorunen_ad: string

  nps_deger: number | null
  nps_referans: number | null
  nps_puan: number | null

  randevu_deger: number | null
  randevu_referans: number | null
  randevu_puan: number | null

  sikayet_deger: number | null
  sikayet_servis_toplam: number | null
  sikayet_oran: number | null
  sikayet_puan: number | null

  tamamlayici_deger: number | null
  tamamlayici_referans: number | null
  tamamlayici_puan: number | null

  ek_garanti_deger: number | null
  ek_garanti_referans: number | null
  ek_garanti_puan: number | null

  toplam_puan: number | null

  harf_notu: string
  prim_hakki: boolean
  prim_durumu: string

  zayif_alanlar: unknown
  guclu_alanlar: unknown
  kisa_rapor: string | null
}

type SikayetDetaySatiri = {
  sikayet_nedeni?: string
  adet?: number
}

type SikayetDetay = {
  yil: number
  ay: number
  teknisyen_gorunen_ad: string

  sikayet_deger: number | null
  sikayet_servis_toplam: number | null
  sikayet_oran: number | null
  sikayet_puan: number | null

  sikayet_detaylari: unknown
}

type Metrik = {
  label: string
  puan: number | null
}

const aylar: Record<number, string> = {
  1: "Ocak",
  2: "Şubat",
  3: "Mart",
  4: "Nisan",
  5: "Mayıs",
  6: "Haziran",
  7: "Temmuz",
  8: "Ağustos",
  9: "Eylül",
  10: "Ekim",
  11: "Kasım",
  12: "Aralık",
}

function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 2,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "-"
  }

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value))
}

function numberValue(value: number | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return null
  }

  return Number(value)
}

function jsonStringList(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
}

function sikayetDetayListesi(value: unknown): SikayetDetaySatiri[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const detay = item as Record<string, unknown>

      return {
        sikayet_nedeni: String(detay.sikayet_nedeni || "").trim(),
        adet: Number(detay.adet || 0),
      }
    })
    .filter((item): item is SikayetDetaySatiri => item !== null)
    .filter((item) => Number(item.adet || 0) > 0)
}

function harfClass(harf: string) {
  if (harf === "D" || harf === "E") {
    return "bg-red-600 text-white"
  }

  if (harf === "A") {
    return "bg-emerald-600 text-white"
  }

  if (harf === "B") {
    return "bg-blue-700 text-white"
  }

  return "bg-amber-400 text-slate-950"
}

function anaKartClass(harf: string) {
  if (harf === "D" || harf === "E") {
    return "border-red-300 bg-gradient-to-br from-red-50 via-white to-red-50"
  }

  return "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50"
}

function primClass(primHakki: boolean) {
  if (primHakki) {
    return "border-emerald-200 bg-emerald-50 text-emerald-900"
  }

  return "border-red-300 bg-red-50 text-red-900"
}

function metrikAciklama(puan: number | null | undefined) {
  const value = numberValue(puan)

  if (value === null) {
    return "Bu dönem için veri bulunmuyor"
  }

  if (value >= 110) {
    return "Servis referansının belirgin üzerinde"
  }

  if (value >= 100) {
    return "Servis referansının üzerinde"
  }

  if (value >= 95) {
    return "Servis referansına yakın"
  }

  if (value >= 75) {
    return "Gelişim fırsatı bulunan alan"
  }

  return "Öncelikli gelişim alanı"
}

function metrikKartClass(puan: number | null | undefined) {
  const value = numberValue(puan)

  if (value === null) {
    return "border-slate-200 bg-slate-50"
  }

  if (value >= 100) {
    return "border-emerald-200 bg-emerald-50"
  }

  if (value >= 75) {
    return "border-amber-200 bg-amber-50"
  }

  return "border-red-200 bg-red-50"
}

function metrikBaslikClass(puan: number | null | undefined) {
  const value = numberValue(puan)

  if (value === null) {
    return "text-slate-600"
  }

  if (value >= 100) {
    return "text-emerald-900"
  }

  if (value >= 75) {
    return "text-amber-900"
  }

  return "text-red-900"
}

function aylikDegisim(ayliklar: AylikPerformans[]) {
  const puanliAylar = [...ayliklar]
    .filter(
      (row) =>
        row.toplam_puan !== null &&
        row.toplam_puan !== undefined &&
        Number.isFinite(Number(row.toplam_puan)),
    )
    .sort((a, b) => b.ay - a.ay)

  if (puanliAylar.length < 2) {
    return null
  }

  const son = puanliAylar[0]
  const onceki = puanliAylar[1]

  return {
    sonAy: son.ay,
    oncekiAy: onceki.ay,
    fark: Number(son.toplam_puan) - Number(onceki.toplam_puan),
  }
}

function metrikleriOlustur(
  performans: YillikPerformans | AylikPerformans,
): Metrik[] {
  return [
    {
      label: "NPS",
      puan: performans.nps_puan,
    },
    {
      label: "Randevuya Uyum",
      puan: performans.randevu_puan,
    },
    {
      label: "Şikayet",
      puan: performans.sikayet_puan,
    },
    {
      label: "Tamamlayıcı",
      puan: performans.tamamlayici_puan,
    },
    {
      label: "Ek Garanti",
      puan: performans.ek_garanti_puan,
    },
  ]
}

export default function PerformansimPage() {
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  const bugun = new Date()

  const [yil, setYil] = useState(
    bugun.getFullYear() < 2026 ? 2026 : bugun.getFullYear(),
  )

  const [yillikPerformans, setYillikPerformans] =
    useState<YillikPerformans | null>(null)

  const [aylikPerformanslar, setAylikPerformanslar] = useState<
    AylikPerformans[]
  >([])

  const [sikayetDetaylari, setSikayetDetaylari] = useState<SikayetDetay[]>(
    [],
  )

  const [acikAy, setAcikAy] = useState<number | null>(null)

  const [yukleniyor, setYukleniyor] = useState(true)

  const [hata, setHata] = useState<string | null>(null)

  const degisim = useMemo(
    () => aylikDegisim(aylikPerformanslar),
    [aylikPerformanslar],
  )

  const gucluAlan = useMemo(() => {
    if (!yillikPerformans) {
      return null
    }

    const alanlar = metrikleriOlustur(yillikPerformans).filter(
      (item): item is { label: string; puan: number } =>
        typeof item.puan === "number" && Number.isFinite(item.puan),
    )

    if (alanlar.length === 0) {
      return null
    }

    return [...alanlar].sort((a, b) => b.puan - a.puan)[0]
  }, [yillikPerformans])

  const gelisimAlani = useMemo(() => {
    if (!yillikPerformans) {
      return null
    }

    const alanlar = metrikleriOlustur(yillikPerformans).filter(
      (item): item is { label: string; puan: number } =>
        typeof item.puan === "number" && Number.isFinite(item.puan),
    )

    if (alanlar.length === 0) {
      return null
    }

    return [...alanlar].sort((a, b) => a.puan - b.puan)[0]
  }, [yillikPerformans])

  const sikayetMap = useMemo(() => {
    return new Map(sikayetDetaylari.map((row) => [row.ay, row]))
  }, [sikayetDetaylari])

  async function performansiGetir() {
    setYukleniyor(true)
    setHata(null)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(sessionError.message)
      }

      const user = session?.user

      if (!user) {
        router.replace("/portal/giris")
        return
      }

      const { data: personelData, error: personelError } = await supabase
        .from("personeller")
        .select("id, ad, soyad, auth_id, kullanici_id")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
        .maybeSingle()

      if (personelError) {
        throw new Error(`Personel kaydı: ${personelError.message}`)
      }

      if (!personelData) {
        throw new Error(
          "Giriş yapan kullanıcıya bağlı personel kaydı bulunamadı. auth_id / kullanici_id eşleşmesini kontrol edin.",
        )
      }

      const [yillikReq, aylikReq, sikayetReq] = await Promise.all([
        supabase.rpc("performans_benim_yillik", {
          p_yil: yil,
        }),

        supabase.rpc("performans_benim_aylik", {
          p_yil: yil,
        }),

        supabase.rpc("performans_benim_sikayet_detay", {
          p_yil: yil,
        }),
      ])

      if (yillikReq.error) {
        throw new Error(`Yıllık performans: ${yillikReq.error.message}`)
      }

      if (aylikReq.error) {
        throw new Error(`Aylık performans: ${aylikReq.error.message}`)
      }

      if (sikayetReq.error) {
        throw new Error(`Şikayet detayı: ${sikayetReq.error.message}`)
      }

      const yillikListe = (yillikReq.data || []) as YillikPerformans[]

      const aylikListe = (aylikReq.data || []) as AylikPerformans[]

      const sikayetListe = (sikayetReq.data || []) as SikayetDetay[]

      setYillikPerformans(yillikListe[0] || null)

      setAylikPerformanslar(
        [...aylikListe].sort((a, b) => Number(b.ay) - Number(a.ay)),
      )

      setSikayetDetaylari(
        [...sikayetListe].sort((a, b) => Number(b.ay) - Number(a.ay)),
      )
    } catch (error) {
      setYillikPerformans(null)
      setAylikPerformanslar([])
      setSikayetDetaylari([])

      setHata(
        error instanceof Error
          ? error.message
          : "Performans bilgisi alınamadı.",
      )
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    performansiGetir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yil])

  if (yukleniyor) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-4">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

            <p className="mt-4 font-bold text-slate-800">
              Performansın yükleniyor...
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main
      id="performansim-page"
      className="min-h-screen bg-slate-50 px-3 py-4"
    >
      <style jsx global>{`
        #performansim-page,
        #performansim-page p,
        #performansim-page span,
        #performansim-page h1,
        #performansim-page h2,
        #performansim-page h3,
        #performansim-page button {
          opacity: 1;
        }

        #performansim-page select {
          color: #0f172a !important;
          background-color: #ffffff !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #0f172a !important;
        }

        #performansim-page select option {
          color: #0f172a !important;
          background-color: #ffffff !important;
        }
      `}</style>

      <div className="mx-auto max-w-md space-y-4">
        <section className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">
              FeyRoute
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              Performansım
            </h1>
          </div>

          <select
            value={yil}
            onChange={(event) => setYil(Number(event.target.value))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </section>

        {hata && (
          <section className="rounded-2xl border border-red-300 bg-red-50 p-4">
            <p className="font-black text-red-900">
              Performans bilgisi alınamadı
            </p>

            <p className="mt-2 text-sm leading-6 text-red-800">{hata}</p>
          </section>
        )}

        {!hata && !yillikPerformans && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-black text-slate-600">
              —
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-950">
              Performans kaydın henüz hazır değil
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              Performans hesabın gerçek personel kaydınla eşleştiğinde burada
              yalnızca kendi sonucunu göreceksin.
            </p>
          </section>
        )}

        {yillikPerformans && (
          <>
            <section
              className={`rounded-3xl border p-5 shadow-sm ${anaKartClass(
                yillikPerformans.harf_notu,
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                    {yillikPerformans.yil} Genel Performans
                  </p>

                  <p className="mt-2 truncate text-lg font-black text-slate-950">
                    {yillikPerformans.teknisyen_gorunen_ad}
                  </p>
                </div>

                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl font-black shadow-sm ${harfClass(
                    yillikPerformans.harf_notu,
                  )}`}
                >
                  {yillikPerformans.harf_notu}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Sıralamam
                  </p>

                  <p className="mt-2 text-4xl font-black text-slate-950">
                    {yillikPerformans.performans_sirasi}.
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {yillikPerformans.toplam_teknisyen_sayisi} teknisyen içinde
                  </p>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Puanım
                  </p>

                  <p className="mt-2 text-4xl font-black text-slate-950">
                    {formatNumber(yillikPerformans.toplam_puan)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    Yıllık performans
                  </p>
                </div>
              </div>

              <div
                className={`mt-4 rounded-2xl border p-4 text-center ${primClass(
                  yillikPerformans.prim_hakki,
                )}`}
              >
                <p className="text-xs font-black uppercase tracking-wider">
                  Prim Durumu
                </p>

                <p className="mt-1 text-xl font-black">
                  {yillikPerformans.prim_durumu}
                </p>

                <p className="mt-1 text-xs font-bold opacity-80">
                  {yillikPerformans.prim_hakki
                    ? "A, B ve C performans grupları prim kapsamındadır."
                    : "D ve E performans grupları prim kapsamında değildir."}
                </p>
              </div>

              {degisim && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-3 text-center">
                  <p
                    className={`text-lg font-black ${
                      degisim.fark >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {degisim.fark >= 0 ? "▲" : "▼"}{" "}
                    {degisim.fark >= 0 ? "+" : ""}
                    {formatNumber(degisim.fark)} puan
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {aylar[degisim.oncekiAy]} ayına göre{" "}
                    {aylar[degisim.sonAy]} değişimi
                  </p>
                </div>
              )}
            </section>

            {gucluAlan && gelisimAlani && (
              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-800">
                    Güçlü Alanım
                  </p>

                  <p className="mt-2 min-h-10 font-black leading-5 text-emerald-950">
                    {gucluAlan.label}
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-900">
                    {formatNumber(gucluAlan.puan)}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Gelişim Alanım
                  </p>

                  <p className="mt-2 min-h-10 font-black leading-5 text-amber-950">
                    {gelisimAlani.label}
                  </p>

                  <p className="mt-2 text-2xl font-black text-amber-900">
                    {formatNumber(gelisimAlani.puan)}
                  </p>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Performans Detayım
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Yıllık performans alanlarının güncel puanları.
              </p>

              <div className="mt-4 space-y-3">
                {metrikleriOlustur(yillikPerformans).map((metrik) => (
                  <div
                    key={metrik.label}
                    className={`rounded-2xl border p-4 ${metrikKartClass(
                      metrik.puan,
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p
                          className={`font-black ${metrikBaslikClass(
                            metrik.puan,
                          )}`}
                        >
                          {metrik.label}
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
                          {metrikAciklama(metrik.puan)}
                        </p>
                      </div>

                      <p className="shrink-0 text-2xl font-black text-slate-950">
                        {formatNumber(metrik.puan)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 px-1">
                <h2 className="text-lg font-black text-slate-950">
                  Aylık Performansım
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Yalnızca Randevuya Uyum kaydın bulunan çalıştığın aylar
                  gösterilir.
                </p>
              </div>

              <div className="space-y-3">
                {aylikPerformanslar.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <p className="font-bold text-slate-700">
                      Bu yıl için aylık performans kaydı bulunmuyor.
                    </p>
                  </div>
                ) : (
                  aylikPerformanslar.map((row) => {
                    const acik = acikAy === row.ay

                    const sikayet = sikayetMap.get(row.ay)

                    const detaylar = sikayetDetayListesi(
                      sikayet?.sikayet_detaylari,
                    )
                      .sort(
                        (a, b) =>
                          Number(b.adet || 0) - Number(a.adet || 0),
                      )
                      .slice(0, 5)

                    const zayifAlanlar = jsonStringList(row.zayif_alanlar)

                    const gucluAlanlar = jsonStringList(row.guclu_alanlar)

                    return (
                      <article
                        key={`${row.yil}-${row.ay}`}
                        className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                          row.harf_notu === "D" || row.harf_notu === "E"
                            ? "border-red-400"
                            : "border-slate-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setAcikAy(acik ? null : row.ay)}
                          className={`flex w-full items-center justify-between p-4 text-left ${
                            row.harf_notu === "D" || row.harf_notu === "E"
                              ? "bg-red-50"
                              : "bg-white"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                              {row.yil}
                            </p>

                            <h3 className="mt-1 text-xl font-black text-slate-950">
                              {aylar[row.ay] || row.ay}
                            </h3>

                            <p
                              className={`mt-1 text-sm font-black ${
                                row.harf_notu === "D" || row.harf_notu === "E"
                                  ? "text-red-800"
                                  : "text-slate-700"
                              }`}
                            >
                              {formatNumber(row.toplam_puan)} puan
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black ${harfClass(
                                row.harf_notu,
                              )}`}
                            >
                              {row.harf_notu}
                            </div>

                            <span className="text-2xl font-black text-slate-600">
                              {acik ? "−" : "+"}
                            </span>
                          </div>
                        </button>

                        {acik && (
                          <div className="border-t border-slate-200 p-4">
                            <div className="space-y-2">
                              <AylikMetrik label="NPS" value={row.nps_puan} />

                              <AylikMetrik
                                label="Randevuya Uyum"
                                value={row.randevu_puan}
                              />

                              <AylikMetrik
                                label="Şikayet"
                                value={row.sikayet_puan}
                              />

                              <AylikMetrik
                                label="Tamamlayıcı"
                                value={row.tamamlayici_puan}
                              />

                              <AylikMetrik
                                label="Ek Garanti"
                                value={row.ek_garanti_puan}
                              />
                            </div>

                            <div
                              className={`mt-4 rounded-2xl border p-3 text-center ${primClass(
                                row.prim_hakki,
                              )}`}
                            >
                              <p className="text-sm font-black">
                                {row.prim_durumu}
                              </p>
                            </div>

                            {(gucluAlanlar.length > 0 ||
                              zayifAlanlar.length > 0) && (
                              <div className="mt-4 grid grid-cols-1 gap-3">
                                {gucluAlanlar.length > 0 && (
                                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-800">
                                      Güçlü Alanlar
                                    </p>

                                    <p className="mt-2 text-sm font-bold leading-6 text-emerald-950">
                                      {gucluAlanlar.join(", ")}
                                    </p>
                                  </div>
                                )}

                                {zayifAlanlar.length > 0 && (
                                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                                      Gelişim Alanları
                                    </p>

                                    <p className="mt-2 text-sm font-bold leading-6 text-amber-950">
                                      {zayifAlanlar.join(", ")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {sikayet && (
                              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                                <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                                  Şikayet Durumum
                                </p>

                                <div className="mt-3 space-y-3">
                                  <BilgiSatiri
                                    label="Bana ait şikayet"
                                    value={formatNumber(sikayet.sikayet_deger)}
                                  />

                                  <BilgiSatiri
                                    label="Servis toplam şikayeti"
                                    value={formatNumber(
                                      sikayet.sikayet_servis_toplam,
                                    )}
                                  />

                                  <BilgiSatiri
                                    label="Şikayet oranım"
                                    value={`%${formatNumber(
                                      sikayet.sikayet_oran,
                                    )}`}
                                  />

                                  <BilgiSatiri
                                    label="Şikayet puanım"
                                    value={formatNumber(sikayet.sikayet_puan)}
                                  />
                                </div>

                                {detaylar.length > 0 && (
                                  <div className="mt-4 border-t border-amber-300 pt-4">
                                    <p className="text-sm font-black text-amber-950">
                                      Öne çıkan şikayet konuları
                                    </p>

                                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                                      Şikayet nedenleri puanını değiştirmez.
                                      Gelişim alanlarını görmen için gösterilir.
                                    </p>

                                    <div className="mt-3 space-y-2">
                                      {detaylar.map((detay, index) => (
                                        <div
                                          key={`${detay.sikayet_nedeni}-${index}`}
                                          className="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3"
                                        >
                                          <p className="text-sm font-semibold leading-5 text-slate-800">
                                            {detay.sikayet_nedeni ||
                                              "Şikayet detayı"}
                                          </p>

                                          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                                            {formatNumber(detay.adet)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {row.kisa_rapor && (
                              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 p-4">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                                  Performans Özeti
                                </p>

                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                                  {row.kisa_rapor}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    )
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function AylikMetrik({
  label,
  value,
}: {
  label: string
  value: number | null | undefined
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <span className="text-base font-black text-slate-950">
        {formatNumber(value)}
      </span>
    </div>
  )
}

function BilgiSatiri({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold text-amber-900">{label}</span>

      <span className="shrink-0 text-sm font-black text-amber-950">
        {value}
      </span>
    </div>
  )
}