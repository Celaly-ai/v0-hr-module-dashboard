"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata" | "bilgi"
  metin: string
}

export default function VarlikFotografPage() {
  const router = useRouter()
  const params = useParams()

  const varlikId = useMemo(() => {
    const id = params?.id
    if (Array.isArray(id)) return id[0] || ""
    return String(id || "")
  }, [params])

  const [varlik, setVarlik] = useState<any>(null)
  const [fotograflar, setFotograflar] = useState<any[]>([])
  const [foto, setFoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [siliniyorId, setSiliniyorId] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  const verileriYukle = useCallback(async () => {
    setLoading(true)
    setMesaj(null)

    if (!varlikId) {
      setMesaj({ tip: "hata", metin: "Geçersiz varlık bağlantısı." })
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data: varlikData, error: varlikError } = await supabase
      .from("varliklar")
      .select("id, demirbas_no, ad, kategori, alt_kategori, durum, mevcut_personel_id")
      .eq("id", varlikId)
      .maybeSingle()

    if (varlikError || !varlikData) {
      setMesaj({ tip: "hata", metin: "Varlık kaydı bulunamadı." })
      setVarlik(null)
      setFotograflar([])
      setLoading(false)
      return
    }

    const { data: fotoData, error: fotoError } = await supabase
      .from("varlik_fotograflari")
      .select("id, dosya_url, created_at")
      .eq("varlik_id", varlikId)
      .order("created_at", { ascending: false })

    if (fotoError) {
      setMesaj({
        tip: "hata",
        metin: "Fotoğraflar alınamadı: " + fotoError.message,
      })
      setVarlik(varlikData)
      setFotograflar([])
      setLoading(false)
      return
    }

    setVarlik(varlikData)
    setFotograflar(fotoData || [])
    setLoading(false)
  }, [varlikId])

  useEffect(() => {
    void verileriYukle()
  }, [verileriYukle])

  function temizDosyaAdi(value: string) {
    return String(value || "varlik")
      .replaceAll(" ", "-")
      .replaceAll("/", "-")
      .replaceAll("\\", "-")
      .replaceAll(":", "-")
      .replaceAll("*", "-")
      .replaceAll("?", "-")
      .replaceAll('"', "-")
      .replaceAll("<", "-")
      .replaceAll(">", "-")
      .replaceAll("|", "-")
  }

  function dosyaYolunuUrlDenBul(url: string) {
    const marker = "/storage/v1/object/public/varlik-fotograflari/"
    const index = String(url || "").indexOf(marker)

    if (index === -1) return ""

    return decodeURIComponent(String(url).slice(index + marker.length))
  }

  async function fotografYukle() {
    setMesaj(null)

    if (!varlikId) {
      setMesaj({ tip: "hata", metin: "Geçersiz varlık bağlantısı." })
      return
    }

    if (!varlik) {
      setMesaj({ tip: "hata", metin: "Varlık bilgisi yüklenmeden fotoğraf eklenemez." })
      return
    }

    if (!foto) {
      setMesaj({ tip: "hata", metin: "Lütfen fotoğraf seçin." })
      return
    }

    if (!foto.type.startsWith("image/")) {
      setMesaj({ tip: "hata", metin: "Lütfen geçerli bir görsel dosyası seçin." })
      return
    }

    const maxBoyut = 10 * 1024 * 1024

    if (foto.size > maxBoyut) {
      setMesaj({ tip: "hata", metin: "Fotoğraf boyutu 10 MB'den büyük olamaz." })
      return
    }

    setYukleniyor(true)

    const supabase = createClient()

    const uzanti = foto.name.split(".").pop() || "jpg"
    const temizDemirbas = temizDosyaAdi(varlik?.demirbas_no || "varlik")
    const dosyaAdi = `${varlikId}/${temizDemirbas}-${Date.now()}.${uzanti}`

    const { error: uploadError } = await supabase.storage
      .from("varlik-fotograflari")
      .upload(dosyaAdi, foto, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      setMesaj({
        tip: "hata",
        metin: "Fotoğraf yüklenemedi: " + uploadError.message,
      })
      setYukleniyor(false)
      return
    }

    const { data: publicData } = supabase.storage
      .from("varlik-fotograflari")
      .getPublicUrl(dosyaAdi)

    const { error: dbError } = await supabase.from("varlik_fotograflari").insert({
      varlik_id: varlikId,
      dosya_url: publicData.publicUrl,
      aciklama: "Varlık fotoğrafı",
    })

    if (dbError) {
      await supabase.storage.from("varlik-fotograflari").remove([dosyaAdi])

      setMesaj({
        tip: "hata",
        metin: "Fotoğraf yüklendi ama kayıt bağlantısı oluşturulamadı: " + dbError.message,
      })
      setYukleniyor(false)
      return
    }

    await supabase.from("varlik_hareketleri").insert({
      varlik_id: varlikId,
      personel_id: varlik?.mevcut_personel_id || null,
      islem: "fotograf_eklendi",
      aciklama: "Varlığa fotoğraf eklendi.",
    })

    setFoto(null)
    setMesaj({ tip: "basari", metin: "Fotoğraf başarıyla yüklendi." })
    await verileriYukle()
    setYukleniyor(false)
  }

  async function fotografSil(f: any) {
    const onay = window.confirm("Bu fotoğraf silinsin mi?")
    if (!onay) return

    setMesaj(null)
    setSiliniyorId(f?.id || null)

    const supabase = createClient()
    const dosyaYolu = dosyaYolunuUrlDenBul(f?.dosya_url)

    if (dosyaYolu) {
      await supabase.storage.from("varlik-fotograflari").remove([dosyaYolu])
    }

    const { error } = await supabase
      .from("varlik_fotograflari")
      .delete()
      .eq("id", f.id)

    if (error) {
      setMesaj({ tip: "hata", metin: "Fotoğraf silinemedi: " + error.message })
      setSiliniyorId(null)
      return
    }

    await supabase.from("varlik_hareketleri").insert({
      varlik_id: varlikId,
      personel_id: varlik?.mevcut_personel_id || null,
      islem: "fotograf_silindi",
      aciklama: "Varlıktan fotoğraf silindi.",
    })

    setMesaj({ tip: "basari", metin: "Fotoğraf silindi." })
    await verileriYukle()
    setSiliniyorId(null)
  }

  function mesajClass(tip: Mesaj["tip"]) {
    if (tip === "basari") return "bg-green-50 border-green-300 text-green-900"
    if (tip === "hata") return "bg-red-50 border-red-300 text-red-900"
    return "bg-blue-50 border-blue-300 text-blue-900"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="font-bold text-gray-700">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal/varliklar")}
          className="text-2xl font-bold text-gray-800"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Varlık Fotoğrafları</h1>
          <p className="text-xs font-medium text-gray-600">
            {varlik?.demirbas_no || "-"} / {varlik?.ad || "-"}
          </p>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {mesaj && (
          <div className={`rounded-xl border p-4 font-semibold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        {!varlik ? (
          <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4">
            <p className="text-sm font-bold text-red-700">Varlık kaydı bulunamadı.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Varlık Bilgisi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <p><b>Demirbaş No:</b> {varlik?.demirbas_no || "-"}</p>
                <p><b>Varlık:</b> {varlik?.ad || "-"}</p>
                <p><b>Kategori:</b> {varlik?.kategori || "-"} {varlik?.alt_kategori ? `/ ${varlik.alt_kategori}` : ""}</p>
                <p><b>Durum:</b> {varlik?.durum || "-"}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Yeni Fotoğraf Ekle</h2>
                <p className="text-xs font-medium text-gray-600">
                  Bu ekrandan varlığa sonradan fotoğraf ekleyebilirsiniz.
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
                className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium bg-white"
              />

              {foto && (
                <p className="text-xs font-semibold text-gray-600">
                  Seçilen dosya: {foto.name}
                </p>
              )}

              <button
                type="button"
                onClick={fotografYukle}
                disabled={yukleniyor}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-3 font-bold disabled:opacity-50"
              >
                {yukleniyor ? "Yükleniyor..." : "Fotoğrafı Yükle"}
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Kayıtlı Fotoğraflar</h2>
                <p className="text-xs font-medium text-gray-600">
                  Bu varlığa ait fotoğraf kayıtları
                </p>
              </div>

              {fotograflar.length === 0 ? (
                <p className="text-sm font-semibold text-gray-600">
                  Henüz fotoğraf eklenmemiş.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {fotograflar.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl border border-gray-300 bg-gray-50 p-2 space-y-2"
                    >
                      <a href={f.dosya_url} target="_blank" rel="noreferrer">
                        <img
                          src={f.dosya_url}
                          alt="Varlık fotoğrafı"
                          className="h-32 w-full rounded-lg object-cover"
                        />
                      </a>

                      <div className="flex gap-2">
                        <a
                          href={f.dosya_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded bg-gray-700 px-2 py-1 text-center text-xs font-bold text-white"
                        >
                          Aç
                        </a>

                        <button
                          type="button"
                          onClick={() => fotografSil(f)}
                          disabled={siliniyorId === f.id}
                          className="flex-1 rounded bg-red-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {siliniyorId === f.id ? "..." : "Sil"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
