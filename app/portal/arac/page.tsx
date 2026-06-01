"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

const TALEP_TURLERI = [
  {
    tip: "arac_hasar",
    baslik: "Kaza / Hasar Bildirimi",
    ikon: "💥",
    renk: "bg-red-600",
    aciklamaPlaceholder: "Hasar nerede, nasıl oldu? Kısaca açıklayın...",
  },
  {
    tip: "arac_bakim",
    baslik: "Bakım / Arıza Talebi",
    ikon: "🔧",
    renk: "bg-yellow-600",
    aciklamaPlaceholder: "Araçtaki arıza veya bakım ihtiyacını yazın...",
  },
]

export default function AracPage() {
  const router = useRouter()

  const [personel, setPersonel] = useState<any>(null)
  const [arac, setArac] = useState<any>(null)
  const [talepler, setTalepler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifForm, setAktifForm] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  const [aciklama, setAciklama] = useState("")
  const [guncelKm, setGuncelKm] = useState("")
  const [olayTarihi, setOlayTarihi] = useState("")
  const [dosyalar, setDosyalar] = useState<File[]>([])

  const dosyaRef = useRef<HTMLInputElement>(null)

  const talepleriYenile = useCallback(async (personelId: string) => {
    const supabase = createClient()

    const { data } = await supabase
      .from("calisan_talepler")
      .select("id, tip, baslik, aciklama, durum, medya_urls, yonetici_notu, created_at")
      .eq("personel_id", personelId)
      .in("tip", ["arac_hasar", "arac_bakim"])
      .order("created_at", { ascending: false })

    setTalepler(data || [])
  }, [])

  const yukle = useCallback(async () => {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    if (!user) {
      router.replace("/portal/giris")
      return
    }

    const { data: p, error: personelError } = await supabase
      .from("personeller")
      .select("id, sirket_id")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    if (personelError || !p) {
      router.replace("/portal/giris")
      return
    }

    setPersonel(p)

    const { data: a } = await supabase
      .from("araclar")
      .select("id, plaka, marka, model, yil, durum, guncel_km")
      .eq("personel_id", p.id)
      .maybeSingle()

    if (!a) {
      router.replace("/portal")
      return
    }

    setArac(a)
    setGuncelKm(a.guncel_km ? String(a.guncel_km) : "")

    await talepleriYenile(p.id)

    setYukleniyor(false)
  }, [router, talepleriYenile])

  useEffect(() => {
    void yukle()
  }, [yukle])

  function formuTemizle() {
    setAktifForm(null)
    setAciklama("")
    setOlayTarihi("")
    setDosyalar([])
    if (arac?.guncel_km) {
      setGuncelKm(String(arac.guncel_km))
    }
  }

  async function handleKaydet(tip: string, baslik: string) {
    setMesaj(null)

    if (!aciklama.trim()) {
      setMesaj({ tip: "hata", metin: "Lütfen açıklama yazınız." })
      return
    }

    if (!personel?.id) {
      setMesaj({ tip: "hata", metin: "Personel bilgisi bulunamadı." })
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()
    const medyaUrls: string[] = []

    for (const dosya of dosyalar) {
      const dosyaAdi = `${personel.id}/arac/${Date.now()}_${dosya.name}`

      const { data, error } = await supabase.storage
        .from("calisan-medya")
        .upload(dosyaAdi, dosya)

      if (error) {
        setMesaj({
          tip: "hata",
          metin: `Dosya yüklenemedi: ${error.message}`,
        })
        setKaydediliyor(false)
        return
      }

      if (data) {
        const { data: url } = supabase.storage
          .from("calisan-medya")
          .getPublicUrl(dosyaAdi)

        medyaUrls.push(url.publicUrl)
      }
    }

    const detayliAciklama = [
      `Araç: ${arac?.plaka || "-"} ${arac?.marka || ""} ${arac?.model || ""}`,
      `Güncel KM: ${guncelKm || "-"}`,
      `Olay / Talep Tarihi: ${olayTarihi || "-"}`,
      "",
      aciklama.trim(),
    ].join("\n")

    const { error } = await supabase.from("calisan_talepler").insert([
      {
        sirket_id: personel.sirket_id,
        personel_id: personel.id,
        tip,
        baslik,
        aciklama: detayliAciklama,
        durum: "Beklemede",
        medya_urls: medyaUrls,
      },
    ])

    if (error) {
      setMesaj({
        tip: "hata",
        metin: `Talep kaydedilemedi: ${error.message}`,
      })
      setKaydediliyor(false)
      return
    }

    if (guncelKm && arac?.id) {
      await supabase
        .from("araclar")
        .update({
          guncel_km: Number(guncelKm),
          updated_at: new Date().toISOString(),
        })
        .eq("id", arac.id)
    }

    formuTemizle()
    setMesaj({ tip: "basari", metin: "✅ Araç talebiniz iletildi!" })

    await talepleriYenile(personel.id)
    setKaydediliyor(false)
  }

  function durumRenk(durum: string) {
    if (durum === "Onaylandi" || durum === "Onaylandı") {
      return "bg-green-100 text-green-800 border-green-300"
    }

    if (durum === "Reddedildi") {
      return "bg-red-100 text-red-800 border-red-300"
    }

    return "bg-yellow-100 text-yellow-800 border-yellow-300"
  }

  function durumIkon(durum: string) {
    if (durum === "Onaylandi" || durum === "Onaylandı") return "✅"
    if (durum === "Reddedildi") return "❌"
    return "⏳"
  }

  function tarihYaz(value?: string | null) {
    if (!value) return "-"
    return new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (yukleniyor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700 font-bold">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/portal")}
          className="text-2xl text-gray-800 font-bold"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Araç & Zimmet</h1>
          <p className="text-xs font-semibold text-gray-600">
            Araç hasar, bakım ve arıza bildirimleri
          </p>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-sm text-orange-700 font-bold mb-1">Zimmetimdeki Araç</p>

          <p className="text-2xl font-black text-orange-900">
            {arac?.plaka || "-"}
          </p>

          <p className="text-base font-bold text-orange-800">
            {arac?.marka || "-"} {arac?.model || ""} {arac?.yil || ""}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl bg-white border border-orange-200 p-3">
              <p className="text-xs font-bold text-orange-700">Güncel KM</p>
              <p className="text-lg font-black text-orange-900">
                {arac?.guncel_km?.toLocaleString("tr-TR") ?? "-"}
              </p>
            </div>

            <div className="rounded-xl bg-white border border-orange-200 p-3">
              <p className="text-xs font-bold text-orange-700">Durum</p>
              <p className="text-lg font-black text-orange-900">
                {arac?.durum || "Aktif"}
              </p>
            </div>
          </div>
        </div>

        {mesaj && (
          <div
            className={`rounded-xl p-3 text-center border ${
              mesaj.tip === "basari"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <p className="text-sm font-bold">{mesaj.metin}</p>
          </div>
        )}

        <div className="space-y-3">
          <p className="font-bold text-gray-800">Ne yapmak istiyorsunuz?</p>

          {TALEP_TURLERI.map((item) => (
            <div key={item.tip}>
              <button
                type="button"
                onClick={() => {
                  setMesaj(null)
                  setAktifForm(aktifForm === item.tip ? null : item.tip)
                }}
                className={`w-full ${item.renk} text-white rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform`}
              >
                <span className="text-3xl">{item.ikon}</span>
                <span className="text-base font-bold">{item.baslik}</span>
              </button>

              {aktifForm === item.tip && (
                <div className="bg-white border border-gray-300 rounded-2xl p-4 mt-2 space-y-3 overflow-hidden">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Güncel KM
                    </label>
                    <input
                      type="number"
                      value={guncelKm}
                      onChange={(e) => setGuncelKm(e.target.value)}
                      placeholder="Örn: 125000"
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Olay / Talep Tarihi
                    </label>
                    <input
                      type="date"
                      value={olayTarihi}
                      onChange={(e) => setOlayTarihi(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      value={aciklama}
                      onChange={(e) => setAciklama(e.target.value)}
                      placeholder={item.aciklamaPlaceholder}
                      className="w-full max-w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white placeholder:text-gray-400 resize-none"
                      rows={4}
                    />
                  </div>

                  <div>
                    <input
                      ref={dosyaRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => setDosyalar(Array.from(e.target.files || []))}
                    />

                    <button
                      type="button"
                      onClick={() => dosyaRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-700 text-sm font-bold bg-gray-50"
                    >
                      📷 Fotoğraf / Video Ekle{" "}
                      {dosyalar.length > 0 && `(${dosyalar.length} dosya)`}
                    </button>

                    {dosyalar.length > 0 && (
                      <div className="mt-2 rounded-xl bg-gray-50 border border-gray-200 p-2">
                        {dosyalar.map((d, index) => (
                          <p key={index} className="text-xs font-semibold text-gray-700 truncate">
                            {index + 1}. {d.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={formuTemizle}
                      className="flex-1 border-2 border-gray-300 text-gray-700 rounded-xl py-3 font-bold"
                    >
                      Vazgeç
                    </button>

                    <button
                      type="button"
                      onClick={() => handleKaydet(item.tip, item.baslik)}
                      disabled={kaydediliyor}
                      className="flex-1 bg-gray-900 text-white rounded-xl py-3 font-bold disabled:opacity-50"
                    >
                      {kaydediliyor ? "Gönderiliyor..." : "Gönder"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">Araç Geçmiş Talepleri</h3>

          {talepler.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-500 border border-gray-200">
              <p className="text-3xl mb-2">📭</p>
              <p>Henüz araç talebiniz yok</p>
            </div>
          ) : (
            talepler.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{t.baslik}</p>

                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                      {t.aciklama}
                    </p>

                    <p className="text-xs text-gray-500 mt-2">
                      {tarihYaz(t.created_at)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-xs px-3 py-1 rounded-full border font-bold ${durumRenk(
                      t.durum,
                    )}`}
                  >
                    {durumIkon(t.durum)} {t.durum || "Beklemede"}
                  </span>
                </div>

                {Array.isArray(t.medya_urls) && t.medya_urls.length > 0 && (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                    <p className="text-xs font-bold text-gray-700 mb-1">
                      Ekli medya: {t.medya_urls.length} dosya
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {t.medya_urls.map((url: string, index: number) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-700 underline"
                        >
                          Dosya {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {t.yonetici_notu && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-700">💬 {t.yonetici_notu}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
