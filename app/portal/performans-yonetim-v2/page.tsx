"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import type { AppRole } from "@/lib/modules"

type DonemTipi = "aylik" | "yillik"

type PerformansSonuc = {
  id: string
  yil: number
  ay: number | null
  donem_tipi: DonemTipi
  teknisyen_anahtar: string
  teknisyen_gorunen_ad: string | null
  teknisyen_ad_soyad: string | null
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
  hesaplama_detayi: Record<string, unknown> | null
}

const YONETICI_ROLLER: AppRole[] = [
  "admin",
  "servis_yoneticisi",
  "ik_yoneticisi",
]

const AYLAR: Record<number, string> = {
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

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "-"
  }
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("ş", "s")
    .replaceAll("Ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("Ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("Ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("Ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("Ç", "c")
    .trim()
}

function teknisyenAdi(row: PerformansSonuc) {
  return (
    row.teknisyen_gorunen_ad?.trim() ||
    row.teknisyen_ad_soyad?.trim() ||
    row.teknisyen_anahtar
  )
}

function isV2Kayit(row: PerformansSonuc) {
  const detay = row.hesaplama_detayi
  if (!detay || typeof detay !== "object") return false
  if (detay.motor === "v2") return true
  if (typeof detay.yillik_hesap_kurali === "string") return true
  return false
}

function calisilanAySayisi(row: PerformansSonuc) {
  const detay = row.hesaplama_detayi
  if (!detay || typeof detay !== "object") return null
  const sayi = Number(detay.calisilan_ay_sayisi)
  return Number.isFinite(sayi) ? sayi : null
}

function puanClass(puan: number | null | undefined) {
  if (puan === null || puan === undefined || !Number.isFinite(Number(puan))) {
    return "text-slate-500"
  }
  const value = Number(puan)
  if (value >= 100) return "text-emerald-700 font-semibold"
  if (value >= 75) return "text-amber-700 font-semibold"
  return "text-red-700 font-semibold"
}

export default function PerformansYonetimV2Page() {
  const supabase = useMemo(() => createClient(), [])
  const { profile, loading: authLoading } = useAuth()

  const [sekme, setSekme] = useState<DonemTipi>("yillik")
  const [yil, setYil] = useState(new Date().getFullYear())
  const [ayFiltre, setAyFiltre] = useState<number | "all">("all")
  const [aranan, setAranan] = useState("")

  const [kayitlar, setKayitlar] = useState<PerformansSonuc[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState<string | null>(null)

  const yoneticiMi = profile?.role
    ? YONETICI_ROLLER.includes(profile.role as AppRole)
    : false

  const verileriGetir = useCallback(async () => {
    setYukleniyor(true)
    setHata(null)

    try {
      const pageSize = 1000
      let from = 0
      const tumKayitlar: PerformansSonuc[] = []

      while (true) {
        const { data, error } = await supabase
          .from("performans_puan_sonuclari")
          .select(
            "id,yil,ay,donem_tipi,teknisyen_anahtar,teknisyen_gorunen_ad,teknisyen_ad_soyad,nps_deger,nps_referans,nps_puan,randevu_deger,randevu_referans,randevu_puan,sikayet_deger,sikayet_servis_toplam,sikayet_oran,sikayet_puan,tamamlayici_deger,tamamlayici_referans,tamamlayici_puan,ek_garanti_deger,ek_garanti_referans,ek_garanti_puan,toplam_puan,hesaplama_detayi",
          )
          .eq("yil", yil)
          .order("toplam_puan", { ascending: false, nullsFirst: false })
          .range(from, from + pageSize - 1)

        if (error) {
          throw new Error(error.message)
        }

        const batch = (data || []) as PerformansSonuc[]
        tumKayitlar.push(...batch)
        if (batch.length < pageSize) break
        from += pageSize
      }

      setKayitlar(tumKayitlar.filter(isV2Kayit))
    } catch (error) {
      setKayitlar([])
      setHata(
        error instanceof Error
          ? error.message
          : "Performans sonuçları okunamadı.",
      )
    } finally {
      setYukleniyor(false)
    }
  }, [supabase, yil])

  useEffect(() => {
    if (authLoading) return
    if (!yoneticiMi) {
      setYukleniyor(false)
      return
    }
    void verileriGetir()
  }, [authLoading, yoneticiMi, verileriGetir])

  const sekmeKayitlari = useMemo(() => {
    const query = normalizeText(aranan)

    return kayitlar
      .filter((row) => row.donem_tipi === sekme)
      .filter((row) => {
        if (sekme !== "aylik" || ayFiltre === "all") return true
        return Number(row.ay) === ayFiltre
      })
      .filter((row) => {
        if (!query) return true
        const metin = normalizeText(
          `${teknisyenAdi(row)} ${row.teknisyen_anahtar}`,
        )
        return metin.includes(query)
      })
      .sort((a, b) => {
        if (sekme === "aylik") {
          const ayFark = Number(b.ay || 0) - Number(a.ay || 0)
          if (ayFark !== 0) return ayFark
        }
        const puanFark =
          Number(b.toplam_puan ?? -1) - Number(a.toplam_puan ?? -1)
        if (puanFark !== 0) return puanFark
        return teknisyenAdi(a).localeCompare(teknisyenAdi(b), "tr")
      })
  }, [kayitlar, sekme, aranan, ayFiltre])

  const ozet = useMemo(() => {
    const puanlar = sekmeKayitlari
      .map((row) => row.toplam_puan)
      .filter((v): v is number => v !== null && Number.isFinite(Number(v)))
      .map(Number)

    const ortalama =
      puanlar.length > 0
        ? puanlar.reduce((s, v) => s + v, 0) / puanlar.length
        : null

    return {
      teknisyenSayisi: sekmeKayitlari.length,
      ortalamaPuan: ortalama,
    }
  }, [sekmeKayitlari])

  const yillikSayisi = kayitlar.filter((r) => r.donem_tipi === "yillik").length

  const yilSecenekleri = useMemo(() => {
    const current = new Date().getFullYear()
    const liste: number[] = []
    for (let y = current - 2; y <= current + 1; y++) {
      liste.push(y)
    }
    return liste
  }, [])
  const aylikSayisi = kayitlar.filter((r) => r.donem_tipi === "aylik").length

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <p className="text-slate-600">Oturum kontrol ediliyor...</p>
      </main>
    )
  }

  if (!yoneticiMi) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          Bu modüle yalnızca yöneticiler erişebilir.
        </div>
      </main>
    )
  }

  return (
    <main
      id="performans-yonetim-v2-page"
      className="min-h-screen bg-slate-50 p-3 md:p-8"
    >
      <style jsx global>{`
        #performans-yonetim-v2-page input,
        #performans-yonetim-v2-page select {
          color: #0f172a !important;
          background-color: #ffffff !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #0f172a !important;
        }

        #performans-yonetim-v2-page input::placeholder {
          color: #64748b !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #64748b !important;
        }

        #performans-yonetim-v2-page select option {
          color: #0f172a !important;
          background-color: #ffffff !important;
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Performans Yönetimi
              </p>
              <h1 className="text-2xl font-black text-slate-900">
                Performans Yönetim V2
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Kaynak: performans_puan_sonuclari — salt okunur V2 sonuç görünümü
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              Hesaplama yok · V2 okuma
            </span>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Yıllık kayıt ({yil})</p>
            <p className="text-2xl font-bold text-slate-900">{yillikSayisi}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Aylık kayıt ({yil})</p>
            <p className="text-2xl font-bold text-slate-900">{aylikSayisi}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">
              {sekme === "yillik" ? "Listelenen teknisyen" : "Listelenen kayıt"}
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {ozet.teknisyenSayisi}
            </p>
            <p className="text-xs text-slate-500">
              Ort. toplam puan: {formatNumber(ozet.ortalamaPuan)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSekme("yillik")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  sekme === "yillik"
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Yıllık
              </button>
              <button
                type="button"
                onClick={() => setSekme("aylik")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  sekme === "aylik"
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Aylık
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-sm text-slate-600">
                Yıl
                <select
                  value={yil}
                  onChange={(e) => setYil(Number(e.target.value))}
                  className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {yilSecenekleri.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              {sekme === "aylik" && (
                <label className="text-sm text-slate-600">
                  Ay
                  <select
                    value={ayFiltre}
                    onChange={(e) =>
                      setAyFiltre(
                        e.target.value === "all"
                          ? "all"
                          : Number(e.target.value),
                      )
                    }
                    className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="all">Tümü</option>
                    {Object.entries(AYLAR).map(([ayNo, ayAd]) => (
                      <option key={ayNo} value={ayNo}>
                        {ayAd}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <input
                type="search"
                value={aranan}
                onChange={(e) => setAranan(e.target.value)}
                placeholder="Teknisyen ara..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {hata && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
            {hata}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {yukleniyor ? (
            <p className="p-6 text-slate-600">Veriler yükleniyor...</p>
          ) : sekmeKayitlari.length === 0 ? (
            <p className="p-6 text-slate-600">
              Seçilen filtreler için V2 performans kaydı bulunamadı.
            </p>
          ) : sekme === "yillik" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Sıra</th>
                    <th className="px-4 py-3">Teknisyen</th>
                    <th className="px-4 py-3">Çalışılan Ay</th>
                    <th className="px-4 py-3">Toplam Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {sekmeKayitlari.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {teknisyenAdi(row)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.teknisyen_anahtar}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {calisilanAySayisi(row) ?? "-"}
                      </td>
                      <td
                        className={`px-4 py-3 ${puanClass(row.toplam_puan)}`}
                      >
                        {formatNumber(row.toplam_puan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-3">Ay</th>
                    <th className="px-3 py-3">Teknisyen</th>
                    <th className="px-3 py-3">NPS</th>
                    <th className="px-3 py-3">Randevu</th>
                    <th className="px-3 py-3">Şikayet</th>
                    <th className="px-3 py-3">Tamamlayıcı</th>
                    <th className="px-3 py-3">Ek Garanti</th>
                    <th className="px-3 py-3">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {sekmeKayitlari.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        {AYLAR[Number(row.ay)] || row.ay}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">
                          {teknisyenAdi(row)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.teknisyen_anahtar}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <PuanHucre puan={row.nps_puan} deger={row.nps_deger} />
                      </td>
                      <td className="px-3 py-3">
                        <PuanHucre
                          puan={row.randevu_puan}
                          deger={row.randevu_deger}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <PuanHucre
                          puan={row.sikayet_puan}
                          deger={row.sikayet_deger}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <PuanHucre
                          puan={row.tamamlayici_puan}
                          deger={row.tamamlayici_deger}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <PuanHucre
                          puan={row.ek_garanti_puan}
                          deger={row.ek_garanti_deger}
                        />
                      </td>
                      <td
                        className={`px-3 py-3 ${puanClass(row.toplam_puan)}`}
                      >
                        {formatNumber(row.toplam_puan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function PuanHucre({
  puan,
  deger,
}: {
  puan: number | null
  deger: number | null
}) {
  return (
    <div>
      <div className={puanClass(puan)}>{formatNumber(puan)}</div>
      <div className="text-xs text-slate-500">{formatNumber(deger)}</div>
    </div>
  )
}
