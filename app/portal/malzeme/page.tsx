"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function MalzemePage() {
  const router = useRouter()
  const [personel, setPersonel] = useState<any>(null)
  const [talepler, setTalepler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null)
  const [aciklama, setAciklama] = useState("")
  const [dosyalar, setDosyalar] = useState<File[]>([])
  const dosyaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const yukle = async () => {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: p, error: personelError } = await supabase
        .from("personeller")
        .select("id, sirket_id")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
        .maybeSingle()

      if (personelError || !p) {
        router.replace("/login")
        return
      }

      setPersonel(p)

      const { data: t } = await supabase
        .from("calisan_talepler")
        .select("id, baslik, aciklama, durum, created_at")
        .eq("personel_id", p.id)
        .eq("tip", "malzeme")
        .order("created_at", { ascending: false })

      setTalepler(t || [])
      setYukleniyor(false)
    }

    yukle()
  }, [router])

  const talepleriYenile = async (personelId: string) => {
    const supabase = createClient()

    const { data: t } = await supabase
      .from("calisan_talepler")
      .select("id, baslik, aciklama, durum, created_at")
      .eq("personel_id", personelId)
      .eq("tip", "malzeme")
      .order("created_at", { ascending: false })

    setTalepler(t || [])
  }

  const handleKaydet = async () => {
    if (!aciklama.trim()) {
      setMesaj({ tip: "hata", metin: "Lütfen malzeme / avadanlık talebinizi yazınız." })
      return
    }

    if (!personel?.id) {
      setMesaj({ tip: "hata", metin: "Personel bilgisi bulunamadı." })
      return
    }

    setKaydediliyor(true)
    setMesaj(null)

    const supabase = createClient()
    const medyaUrls: string[] = []

    for (const dosya of dosyalar) {
      const dosyaAdi = `${personel.id}/${Date.now()}_${dosya.name}`

      const { data, error } = await supabase.storage
        .from("calisan-medya")
        .upload(dosyaAdi, dosya)

      if (error) {
        setMesaj({ tip: "hata", metin: `Dosya yüklenemedi: ${error.message}` })
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

    const { error } = await supabase.from("calisan_talepler").insert([
      {
        sirket_id: personel.sirket_id,
        personel_id: personel.id,
        tip: "malzeme",
        baslik: "Malzeme / Avadanlık Talebi",
        aciklama,
        durum: "Beklemede",
        medya_urls: medyaUrls,
      },
    ])

    if (error) {
      setMesaj({ tip: "hata", metin: `Talep kaydedilemedi: ${error.message}` })
      setKaydediliyor(false)
      return
    }

    setAciklama("")
    setDosyalar([])
    setMesaj({ tip: "basari", metin: "✅ Malzeme talebiniz iletildi!" })

    await talepleriYenile(personel.id)
    setKaydediliyor(false)
  }

  if (yukleniyor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/portal")} className="text-2xl text-gray-800">
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900">Malzeme / Avadanlık</h1>
      </div>

      <div className="p-4 max-w-sm mx-auto space-y-4">
        {mesaj && (
          <div
            className={`rounded-xl p-3 text-center border ${
              mesaj.tip === "basari"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <p className="text-sm font-medium">{mesaj.metin}</p>
          </div>
        )}

        <div className="bg-white border border-gray-300 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-gray-900">Yeni Malzeme Talebi</h3>

          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="İhtiyaç duyduğunuz malzeme veya avadanlığı yazınız..."
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white placeholder:text-gray-400 resize-none"
            rows={4}
          />

          <input
            ref={dosyaRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setDosyalar(Array.from(e.target.files || []))}
          />

          <button
            onClick={() => dosyaRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-600 text-sm"
          >
            📷 Fotoğraf / Video Ekle {dosyalar.length > 0 && `(${dosyalar.length} dosya)`}
          </button>

          <button
            onClick={handleKaydet}
            disabled={kaydediliyor}
            className="w-full bg-blue-500 text-white rounded-xl py-3 font-bold disabled:opacity-50"
          >
            {kaydediliyor ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">Geçmiş Malzeme Talepleri</h3>

          {talepler.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-500">
              <p className="text-3xl mb-2">📭</p>
              <p>Henüz malzeme talebiniz yok</p>
            </div>
          ) : (
            talepler.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="font-bold text-gray-900">{t.baslik}</p>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{t.aciklama}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(t.created_at).toLocaleDateString("tr-TR")}
                </p>
                <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                  ⏳ {t.durum}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
