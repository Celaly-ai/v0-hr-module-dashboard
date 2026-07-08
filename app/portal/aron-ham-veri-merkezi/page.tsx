"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  ARON_HAM_VERI_KAYNAKLARI,
  aronHamVeriKaynagiBul,
  jsonChecksum,
  kayitSayisiHesapla,
  tarihAraligiGunSayisi,
  type AronHamVeriKaynagi,
} from "@/lib/aron-ham-veri-kaynaklari"

type ArsivKaydi = {
  id: string
  veri_kaynagi: string
  veri_adi: string
  kaynak_tipi: string
  tarih_baslangic: string | null
  tarih_bitis: string | null
  kayit_sayisi: number
  durum: string
  hata: string | null
  dosya_yolu: string | null
  created_at: string
}

type SonCekimOzeti = {
  created_at: string
  kayit_sayisi: number
  durum: string
}

const inputSinifi =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900"

const btnSinifi =
  "rounded-2xl px-4 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"

function formatTarih(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("tr-TR")
}

function formatTarihAraligi(bas?: string | null, bit?: string | null) {
  if (!bas && !bit) return "-"
  if (bas && bit) return `${bas} → ${bit}`
  return bas || bit || "-"
}

function durumEtiketi(durum: string) {
  if (durum === "basarili") return "Başarılı"
  if (durum === "hatali") return "Hatalı"
  return durum
}

function scriptAciklama(kaynak: AronHamVeriKaynagi) {
  const parcalar = [
    "V1: Doğrudan ARON'dan çekim yapılmaz. Chrome remote debugging ile Node script çalıştırın, JSON'u aşağıdaki Manuel Ham JSON Kaydı bölümüne yapıştırın.",
  ]
  if (kaynak.scriptOneri) {
    parcalar.push(`Önerilen script: node ${kaynak.scriptOneri}`)
  }
  if (kaynak.dosyaOneri) {
    parcalar.push(`Örnek dosya: ${kaynak.dosyaOneri}`)
  }
  return parcalar.join(" ")
}

export default function AronHamVeriMerkeziPage() {
  const supabase = useMemo(() => createClient(), [])
  const manuelRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [arsivKayitlari, setArsivKayitlari] = useState<ArsivKaydi[]>([])
  const [sonCekimler, setSonCekimler] = useState<Record<string, SonCekimOzeti>>({})
  const [seciliKaynakKod, setSeciliKaynakKod] = useState(ARON_HAM_VERI_KAYNAKLARI[0]?.kod ?? "")
  const [tarihBaslangic, setTarihBaslangic] = useState("")
  const [tarihBitis, setTarihBitis] = useState("")
  const [hamJsonMetin, setHamJsonMetin] = useState("")
  const [dosyaYolu, setDosyaYolu] = useState("")
  const [bilgi, setBilgi] = useState("")
  const [hata, setHata] = useState("")
  const [scriptBilgiKaynak, setScriptBilgiKaynak] = useState<string | null>(null)

  const seciliKaynak = useMemo(
    () => aronHamVeriKaynagiBul(seciliKaynakKod),
    [seciliKaynakKod],
  )

  const arsiviYukle = useCallback(async () => {
    setLoading(true)
    setHata("")

    const { data, error } = await supabase
      .from("aron_ham_veri_arsivi")
      .select(
        "id, veri_kaynagi, veri_adi, kaynak_tipi, tarih_baslangic, tarih_bitis, kayit_sayisi, durum, hata, dosya_yolu, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      setHata(`Arşiv yüklenemedi: ${error.message}`)
      setArsivKayitlari([])
      setSonCekimler({})
      setLoading(false)
      return
    }

    const kayitlar = (data ?? []) as ArsivKaydi[]
    setArsivKayitlari(kayitlar)

    const son: Record<string, SonCekimOzeti> = {}
    for (const kayit of kayitlar) {
      if (!son[kayit.veri_kaynagi]) {
        son[kayit.veri_kaynagi] = {
          created_at: kayit.created_at,
          kayit_sayisi: kayit.kayit_sayisi,
          durum: kayit.durum,
        }
      }
    }
    setSonCekimler(son)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void arsiviYukle()
  }, [arsiviYukle])

  function kaynagaGit(kod: string) {
    setSeciliKaynakKod(kod)
    setScriptBilgiKaynak(kod)
    setBilgi("")
    setHata("")
    manuelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function manuelKaydet() {
    setHata("")
    setBilgi("")

    const kaynak = aronHamVeriKaynagiBul(seciliKaynakKod)
    if (!kaynak) {
      setHata("Veri kaynağı seçin.")
      return
    }

    if (kaynak.tarihGerekli) {
      if (!tarihBaslangic || !tarihBitis) {
        setHata("Bu veri kaynağı için başlangıç ve bitiş tarihi zorunludur.")
        return
      }
      const gun = tarihAraligiGunSayisi(tarihBaslangic, tarihBitis)
      if (gun === null || gun < 1) {
        setHata("Geçerli bir tarih aralığı girin.")
        return
      }
      if (kaynak.maxGun && gun > kaynak.maxGun) {
        setHata("Bu veri kaynağı en fazla 30 günlük aralıkla çekilebilir.")
        return
      }
    }

    const metin = hamJsonMetin.trim()
    if (!metin) {
      setHata("Ham JSON girin.")
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(metin)
    } catch {
      setHata("JSON geçerli değil. Kayıt oluşturulmadı.")
      return
    }

    setKaydediliyor(true)

    try {
      const checksum = await jsonChecksum(metin)
      const payload = {
        veri_kaynagi: kaynak.kod,
        veri_adi: kaynak.ad,
        kaynak_tipi: "angular_scope",
        tarih_baslangic: kaynak.tarihGerekli ? tarihBaslangic : null,
        tarih_bitis: kaynak.tarihGerekli ? tarihBitis : null,
        kayit_sayisi: kayitSayisiHesapla(parsed),
        ham_json: parsed,
        kaynak_sayfa: null,
        dosya_yolu: dosyaYolu.trim() || null,
        durum: "basarili",
        hata: null,
        checksum,
      }

      const { error } = await supabase.from("aron_ham_veri_arsivi").insert(payload)
      if (error) {
        setHata(`Kayıt oluşturulamadı: ${error.message}`)
        return
      }

      setBilgi(
        `${kaynak.ad} ham verisi arşive kaydedildi (${payload.kayit_sayisi} kayıt). Ham veri silinmez.`,
      )
      setHamJsonMetin("")
      setDosyaYolu("")
      await arsiviYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-10 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">Operasyon</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">ARON Ham Veri Merkezi</h1>
          <p className="mt-3 max-w-4xl text-sm font-semibold text-slate-600">
            Eski ARON&apos;dan ulaşılabilen verileri ham haliyle arşivler. Ham veri silinmez;
            daha sonra analiz ve AI öğrenme için işlenir. V1&apos;de çekim Node scriptleri ile
            yapılır; JSON buraya yapıştırılarak kaydedilir.
          </p>
        </div>

        {(hata || bilgi) && (
          <div
            className={`rounded-2xl border p-4 text-sm font-bold ${
              hata
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            {hata || bilgi}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-black text-slate-950">Veri Kaynakları</h2>

          {loading ? (
            <div className="rounded-2xl border bg-white p-5 text-sm font-bold text-slate-600">
              Arşiv özeti yükleniyor...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ARON_HAM_VERI_KAYNAKLARI.map((kaynak) => {
                const son = sonCekimler[kaynak.kod]
                const scriptAcik = scriptBilgiKaynak === kaynak.kod

                return (
                  <div
                    key={kaynak.kod}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <h3 className="text-lg font-black text-slate-950">{kaynak.ad}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {kaynak.kaynak || "Tarih aralıklı performans verisi"}
                    </p>

                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="font-bold text-slate-500">Tarih gerekli</dt>
                        <dd className="font-black text-slate-900">
                          {kaynak.tarihGerekli ? "Evet" : "Hayır"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="font-bold text-slate-500">30 gün sınırı</dt>
                        <dd className="font-black text-slate-900">
                          {kaynak.maxGun ? "Evet" : "Hayır"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="font-bold text-slate-500">Son çekim</dt>
                        <dd className="text-right font-black text-slate-900">
                          {son ? formatTarih(son.created_at) : "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="font-bold text-slate-500">Son kayıt sayısı</dt>
                        <dd className="font-black text-slate-900">
                          {son ? son.kayit_sayisi : "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="font-bold text-slate-500">Durum</dt>
                        <dd className="font-black text-slate-900">
                          {son ? durumEtiketi(son.durum) : "-"}
                        </dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      onClick={() => kaynagaGit(kaynak.kod)}
                      className={`${btnSinifi} mt-5 w-full bg-blue-700`}
                    >
                      Script ile çek → JSON yapıştır
                    </button>

                    {scriptAcik && (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-950">
                        {scriptAciklama(kaynak)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section
          ref={manuelRef}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-black text-slate-950">Manuel Ham JSON Kaydı</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Script çıktısını yapıştırın. JSON geçerli değilse kayıt oluşturulmaz. Ham veri
            silinmez.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase text-slate-500">
                Veri kaynağı
              </span>
              <select
                value={seciliKaynakKod}
                onChange={(e) => setSeciliKaynakKod(e.target.value)}
                className={inputSinifi}
              >
                {ARON_HAM_VERI_KAYNAKLARI.map((k) => (
                  <option key={k.kod} value={k.kod}>
                    {k.ad}
                  </option>
                ))}
              </select>
            </label>

            {seciliKaynak?.tarihGerekli && (
              <>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-slate-500">
                    Tarih başlangıç
                  </span>
                  <input
                    type="date"
                    value={tarihBaslangic}
                    onChange={(e) => setTarihBaslangic(e.target.value)}
                    className={inputSinifi}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-slate-500">
                    Tarih bitiş
                  </span>
                  <input
                    type="date"
                    value={tarihBitis}
                    onChange={(e) => setTarihBitis(e.target.value)}
                    className={inputSinifi}
                  />
                </label>
                {seciliKaynak.maxGun && (
                  <p className="md:col-span-2 text-xs font-bold text-amber-800">
                    Bu veri kaynağı en fazla 30 günlük aralıkla çekilebilir.
                  </p>
                )}
              </>
            )}

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase text-slate-500">
                Dosya yolu (opsiyonel)
              </span>
              <input
                type="text"
                value={dosyaYolu}
                onChange={(e) => setDosyaYolu(e.target.value)}
                placeholder="~/Downloads/aron-bultenler-formatli.json"
                className={inputSinifi}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase text-slate-500">
                Ham JSON
              </span>
              <textarea
                value={hamJsonMetin}
                onChange={(e) => setHamJsonMetin(e.target.value)}
                rows={12}
                placeholder='[{"...": "..."}]'
                className={`${inputSinifi} font-mono text-xs leading-5`}
              />
            </label>
          </div>

          <button
            type="button"
            disabled={kaydediliyor}
            onClick={() => void manuelKaydet()}
            className={`${btnSinifi} mt-4 w-full bg-emerald-700 md:w-auto`}
          >
            {kaydediliyor ? "Kaydediliyor..." : "Ham Veriyi Arşive Kaydet"}
          </button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Son 50 Ham Veri Arşivi Kaydı</h2>

          {loading ? (
            <p className="mt-4 text-sm font-bold text-slate-600">Yükleniyor...</p>
          ) : arsivKayitlari.length === 0 ? (
            <p className="mt-4 text-sm font-bold text-slate-600">Henüz arşiv kaydı yok.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs font-black uppercase text-slate-500">
                    <th className="px-3 py-3">Veri adı</th>
                    <th className="px-3 py-3">Tarih aralığı</th>
                    <th className="px-3 py-3">Kayıt sayısı</th>
                    <th className="px-3 py-3">Durum</th>
                    <th className="px-3 py-3">Oluşturma</th>
                  </tr>
                </thead>
                <tbody>
                  {arsivKayitlari.map((kayit) => (
                    <tr key={kayit.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-black text-slate-900">{kayit.veri_adi}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">
                        {formatTarihAraligi(kayit.tarih_baslangic, kayit.tarih_bitis)}
                      </td>
                      <td className="px-3 py-3 font-black text-slate-900">
                        {kayit.kayit_sayisi}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-700">
                        {durumEtiketi(kayit.durum)}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-600">
                        {formatTarih(kayit.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
