"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type PerformansTeknisyen = {
  teknisyen_anahtar: string
  teknisyen_gorunen_ad: string
  teknisyen_kodu: string | null
}

type Personel = {
  id: string
  ad: string | null
  soyad: string | null
  personel_kodu?: string | null
  sirket_id?: string | null
  durum?: string | null
  rol?: string | null
  unvan?: string | null
}

type Eslestirme = {
  id: string
  sirket_id: string | null
  personel_id: string
  teknisyen_kodu: string | null
  teknisyen_anahtar: string
  teknisyen_gorunen_ad: string
  kaynak: string
  eslestirme_tipi: string
  guven_skoru: number | null
  durum: "aktif" | "pasif"
  aciklama: string | null
}

function safeString(value: unknown) {
  if (value === null || value === undefined) return ""
  return String(value)
}

function normalizeText(value: unknown) {
  return safeString(value)
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
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function anahtarTemizle(value: unknown) {
  return normalizeText(value).toLocaleUpperCase("tr-TR")
}

function personelAdi(personel: Personel | null | undefined) {
  if (!personel) return "Personel bulunamadı"

  return `${safeString(personel.ad).trim()} ${safeString(personel.soyad).trim()}`
    .replace(/\s+/g, " ")
    .trim()
}

function durumAktifMi(value: unknown) {
  const durum = normalizeText(value)

  if (!durum) return true

  return !(
    durum.includes("pasif") ||
    durum.includes("isten ayrildi") ||
    durum.includes("isten_ayrildi")
  )
}

export default function PerformansEslestirmePage() {
  const supabase = useMemo(() => createClient(), [])

  const [teknisyenler, setTeknisyenler] = useState<PerformansTeknisyen[]>([])
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [eslestirmeler, setEslestirmeler] = useState<Eslestirme[]>([])

  const [secimler, setSecimler] = useState<Record<string, string>>({})

  const [arananTeknisyen, setArananTeknisyen] = useState("")
  const [arananPersonel, setArananPersonel] = useState("")

  const [yukleniyor, setYukleniyor] = useState(true)
  const [islemAnahtari, setIslemAnahtari] = useState<string | null>(null)

  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)

  const personelMap = useMemo(() => {
    return new Map(personeller.map((personel) => [personel.id, personel]))
  }, [personeller])

  const eslestirmeMap = useMemo(() => {
    const map = new Map<string, Eslestirme>()

    eslestirmeler
      .filter((row) => row.durum === "aktif")
      .forEach((row) => {
        map.set(anahtarTemizle(row.teknisyen_anahtar), row)
      })

    return map
  }, [eslestirmeler])

  const filtreliPersoneller = useMemo(() => {
    const query = normalizeText(arananPersonel)

    return personeller
      .filter((personel) => durumAktifMi(personel.durum))
      .filter((personel) => {
        if (!query) return true

        const metin = normalizeText(
          `${personel.ad || ""} ${personel.soyad || ""} ${personel.personel_kodu || ""}`,
        )

        return metin.includes(query)
      })
      .sort((a, b) => personelAdi(a).localeCompare(personelAdi(b), "tr"))
  }, [personeller, arananPersonel])

  const filtreliTeknisyenler = useMemo(() => {
    const query = normalizeText(arananTeknisyen)

    return teknisyenler
      .filter((row) => {
        if (!query) return true

        const metin = normalizeText(
          `${row.teknisyen_gorunen_ad} ${row.teknisyen_anahtar} ${row.teknisyen_kodu || ""}`,
        )

        return metin.includes(query)
      })
      .sort((a, b) =>
        a.teknisyen_gorunen_ad.localeCompare(b.teknisyen_gorunen_ad, "tr"),
      )
  }, [teknisyenler, arananTeknisyen])

  const eslesenSayisi = useMemo(() => {
    return teknisyenler.filter((row) =>
      eslestirmeMap.has(anahtarTemizle(row.teknisyen_anahtar)),
    ).length
  }, [teknisyenler, eslestirmeMap])

  async function verileriGetir() {
    setYukleniyor(true)
    setHata(null)

    try {
      const [puanReq, personelReq, eslestirmeReq, haricReq] = await Promise.all([
        supabase
          .from("performans_puan_sonuclari")
          .select("teknisyen_anahtar, teknisyen_gorunen_ad"),

        supabase
          .from("personeller")
          .select("id, ad, soyad, personel_kodu, sirket_id, durum, rol, unvan")
          .order("ad", { ascending: true })
          .order("soyad", { ascending: true }),

        supabase
          .from("performans_personel_eslestirmeleri")
          .select("*")
          .order("teknisyen_gorunen_ad", { ascending: true }),

        supabase
          .from("performans_haric_teknisyenler")
          .select("teknisyen_anahtar, durum"),
      ])

      if (puanReq.error) {
        throw new Error(`Performans kayıtları okunamadı: ${puanReq.error.message}`)
      }

      if (personelReq.error) {
        throw new Error(`Personel kayıtları okunamadı: ${personelReq.error.message}`)
      }

      if (eslestirmeReq.error) {
        throw new Error(`Eşleştirme kayıtları okunamadı: ${eslestirmeReq.error.message}`)
      }

      if (haricReq.error) {
        throw new Error(`Hesaplama dışı kayıtlar okunamadı: ${haricReq.error.message}`)
      }

      const haricSet = new Set(
        (haricReq.data || [])
          .filter((row: any) => row.durum === "aktif")
          .map((row: any) => anahtarTemizle(row.teknisyen_anahtar)),
      )

      const teknisyenMap = new Map<string, PerformansTeknisyen>()

      ;(puanReq.data || []).forEach((row: any) => {
        const anahtar = anahtarTemizle(row.teknisyen_anahtar)

        if (!anahtar) return
        if (haricSet.has(anahtar)) return

        if (!teknisyenMap.has(anahtar)) {
          teknisyenMap.set(anahtar, {
            teknisyen_anahtar: anahtar,
            teknisyen_gorunen_ad:
              safeString(row.teknisyen_gorunen_ad).trim() || anahtar,
            teknisyen_kodu: null,
          })
        }
      })

      setTeknisyenler(Array.from(teknisyenMap.values()))
      setPersoneller((personelReq.data || []) as Personel[])
      setEslestirmeler((eslestirmeReq.data || []) as Eslestirme[])

      const yeniSecimler: Record<string, string> = {}

      ;((eslestirmeReq.data || []) as Eslestirme[])
        .filter((row) => row.durum === "aktif")
        .forEach((row) => {
          yeniSecimler[anahtarTemizle(row.teknisyen_anahtar)] = row.personel_id
        })

      setSecimler(yeniSecimler)
    } catch (error) {
      setHata(error instanceof Error ? error.message : "Veriler alınamadı.")
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    verileriGetir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function eslestir(teknisyen: PerformansTeknisyen) {
    const anahtar = anahtarTemizle(teknisyen.teknisyen_anahtar)
    const personelId = secimler[anahtar]

    if (!personelId) {
      setHata(`${teknisyen.teknisyen_gorunen_ad} için personel seçin.`)
      return
    }

    const personel = personelMap.get(personelId)

    if (!personel) {
      setHata("Seçilen personel kaydı bulunamadı.")
      return
    }

    setIslemAnahtari(anahtar)
    setHata(null)
    setMesaj(null)

    try {
      const mevcut = eslestirmeMap.get(anahtar)

      const payload = {
        sirket_id: personel.sirket_id || null,
        personel_id: personel.id,
        teknisyen_kodu: teknisyen.teknisyen_kodu,
        teknisyen_anahtar: anahtar,
        teknisyen_gorunen_ad: teknisyen.teknisyen_gorunen_ad,
        kaynak: "manuel",
        eslestirme_tipi: "manuel",
        guven_skoru: 100,
        durum: "aktif",
        aciklama: "Performans eşleştirme modülünden manuel eşleştirildi.",
      }

      if (mevcut) {
        const { error } = await supabase
          .from("performans_personel_eslestirmeleri")
          .update(payload)
          .eq("id", mevcut.id)

        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from("performans_personel_eslestirmeleri")
          .insert(payload)

        if (error) throw new Error(error.message)
      }

      setMesaj(
        `${teknisyen.teknisyen_gorunen_ad} → ${personelAdi(personel)} eşleştirildi.`,
      )

      await verileriGetir()
    } catch (error) {
      setHata(
        `Eşleştirme başarısız: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`,
      )
    } finally {
      setIslemAnahtari(null)
    }
  }

  async function eslestirmeyiKaldir(teknisyen: PerformansTeknisyen) {
    const anahtar = anahtarTemizle(teknisyen.teknisyen_anahtar)
    const mevcut = eslestirmeMap.get(anahtar)

    if (!mevcut) return

    setIslemAnahtari(anahtar)
    setHata(null)
    setMesaj(null)

    try {
      const { error } = await supabase
        .from("performans_personel_eslestirmeleri")
        .update({
          durum: "pasif",
        })
        .eq("id", mevcut.id)

      if (error) throw new Error(error.message)

      setMesaj(`${teknisyen.teknisyen_gorunen_ad} eşleştirmesi kaldırıldı.`)

      await verileriGetir()
    } catch (error) {
      setHata(
        `Eşleştirme kaldırılamadı: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`,
      )
    } finally {
      setIslemAnahtari(null)
    }
  }

  return (
    <main
      id="performans-eslestirme-page"
      className="min-h-screen bg-slate-50 p-3 md:p-8"
    >
      <style jsx global>{`
        #performans-eslestirme-page input,
        #performans-eslestirme-page select {
          color: #0f172a !important;
          background-color: #ffffff !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #0f172a !important;
        }

        #performans-eslestirme-page input::placeholder {
          color: #64748b !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #64748b !important;
        }

        #performans-eslestirme-page select option {
          color: #0f172a !important;
          background-color: #ffffff !important;
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Performans Yönetimi
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950">
                Personel Performans Eşleştirme
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Performans teknisyenini gerçek FeyRoute personel hesabına bir kez bağla.
              </p>
            </div>

            <button
              type="button"
              onClick={verileriGetir}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Yenile
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <OzetKart label="Teknisyen" value={teknisyenler.length} />
            <OzetKart label="Eşleşen" value={eslesenSayisi} />
            <OzetKart
              label="Bekleyen"
              value={Math.max(0, teknisyenler.length - eslesenSayisi)}
            />
          </div>
        </section>

        {hata && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {hata}
          </div>
        )}

        {mesaj && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {mesaj}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-800">
                Teknisyen Ara
              </label>

              <input
                type="text"
                value={arananTeknisyen}
                onChange={(event) => setArananTeknisyen(event.target.value)}
                placeholder="Örn: Onur Kırlı"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-800">
                Personel Listesi Ara
              </label>

              <input
                type="text"
                value={arananPersonel}
                onChange={(event) => setArananPersonel(event.target.value)}
                placeholder="Örn: Tugay"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {yukleniyor ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center font-semibold text-slate-600 shadow-sm">
              Kayıtlar yükleniyor...
            </div>
          ) : filtreliTeknisyenler.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center font-semibold text-slate-600 shadow-sm">
              Gösterilecek teknisyen bulunamadı.
            </div>
          ) : (
            filtreliTeknisyenler.map((teknisyen) => {
              const anahtar = anahtarTemizle(teknisyen.teknisyen_anahtar)
              const eslestirme = eslestirmeMap.get(anahtar)
              const bagliPersonel = eslestirme
                ? personelMap.get(eslestirme.personel_id)
                : null

              const seciliId = secimler[anahtar] || ""
              const islemde = islemAnahtari === anahtar

              return (
                <article
                  key={anahtar}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-950">
                          {teknisyen.teknisyen_gorunen_ad}
                        </h2>

                        {eslestirme ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                            EŞLEŞTİ
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                            BEKLİYOR
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Performans anahtarı: {anahtar}
                      </p>

                      {eslestirme && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-xs font-bold text-emerald-700">
                            Bağlı gerçek personel
                          </p>

                          <p className="mt-1 font-black text-emerald-950">
                            {personelAdi(bagliPersonel)}
                          </p>

                          {bagliPersonel?.personel_kodu && (
                            <p className="mt-1 text-xs text-emerald-800">
                              Personel kodu: {bagliPersonel.personel_kodu}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="w-full md:max-w-md">
                      <label className="mb-1 block text-sm font-bold text-slate-800">
                        Gerçek Personel
                      </label>

                      <select
                        value={seciliId}
                        onChange={(event) =>
                          setSecimler((prev) => ({
                            ...prev,
                            [anahtar]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                      >
                        <option value="">Personel seçin</option>

                        {filtreliPersoneller.map((personel) => (
                          <option key={personel.id} value={personel.id}>
                            {personelAdi(personel)}
                            {personel.personel_kodu
                              ? ` · ${personel.personel_kodu}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => eslestir(teknisyen)}
                          disabled={!seciliId || islemde}
                          className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {islemde
                            ? "İşleniyor..."
                            : eslestirme
                              ? "Eşleşmeyi Güncelle"
                              : "Eşleştir"}
                        </button>

                        <button
                          type="button"
                          onClick={() => eslestirmeyiKaldir(teknisyen)}
                          disabled={!eslestirme || islemde}
                          className="rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Eşleşmeyi Kaldır
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}

function OzetKart({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-slate-100 p-3 text-center">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}