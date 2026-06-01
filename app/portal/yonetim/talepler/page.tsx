"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

export default function YonetimTaleplerPage() {
  const router = useRouter()

  const [talepler, setTalepler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [islemId, setIslemId] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [notlar, setNotlar] = useState<Record<string, string>>({})

  async function verileriYukle() {
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("calisan_talepler")
      .select(`
        *,
        personeller:personel_id (
          id,
          ad,
          soyad,
          tel,
          rol
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Talepler alınamadı: " + error.message,
      })
      setLoading(false)
      return
    }

    setTalepler(data || [])

    const ilkNotlar: Record<string, string> = {}
    ;(data || []).forEach((t: any) => {
      ilkNotlar[t.id] = t.yonetici_notu || ""
    })
    setNotlar(ilkNotlar)

    setLoading(false)
  }

  useEffect(() => {
    verileriYukle()
  }, [])

  function personelAdi(talep: any) {
    const p = talep?.personeller
    if (!p) return "Personel bilgisi yok"
    return `${p.ad || ""} ${p.soyad || ""}`.trim() || "Personel bilgisi yok"
  }

  function tarihYaz(value?: string | null) {
    if (!value) return "-"
    return new Date(value).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function durumRenk(durum?: string | null) {
    if (durum === "Onaylandı" || durum === "Onaylandi") {
      return "bg-green-100 text-green-900 border-green-300"
    }

    if (durum === "Reddedildi") {
      return "bg-red-100 text-red-900 border-red-300"
    }

    return "bg-yellow-100 text-yellow-900 border-yellow-300"
  }

  function medyaListesi(talep: any) {
    if (Array.isArray(talep.medya_urls)) return talep.medya_urls
    if (Array.isArray(talep.foto_urls)) return talep.foto_urls
    if (typeof talep.medya_url === "string" && talep.medya_url) return [talep.medya_url]
    if (typeof talep.foto_url === "string" && talep.foto_url) return [talep.foto_url]
    return []
  }

  function medyaTipi(url: string) {
    const temiz = url.toLowerCase().split("?")[0]

    if (
      temiz.endsWith(".mp4") ||
      temiz.endsWith(".mov") ||
      temiz.endsWith(".webm") ||
      temiz.endsWith(".m4v")
    ) {
      return "video"
    }

    return "foto"
  }

  async function talepGuncelle(id: string, durum: "Onaylandı" | "Reddedildi") {
    setIslemId(id)
    setMesaj(null)

    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    let degerlendirenPersonelId: string | null = null

    if (user?.id) {
      const { data: p } = await supabase
        .from("personeller")
        .select("id")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
        .maybeSingle()

      degerlendirenPersonelId = p?.id || null
    }

    const yoneticiNotu = (notlar[id] || "").trim()

    if (durum === "Reddedildi" && !yoneticiNotu) {
      setMesaj({
        tip: "hata",
        metin: "Reddedilen talepler için yönetici notu / red sebebi zorunludur.",
      })
      setIslemId(null)
      return
    }

    const { error } = await supabase
      .from("calisan_talepler")
      .update({
        durum,
        yonetici_notu: yoneticiNotu || null,
        degerlendirme_tarihi: new Date().toISOString(),
        degerlendiren_personel_id: degerlendirenPersonelId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Talep güncellenemedi: " + error.message,
      })
      setIslemId(null)
      return
    }

    setMesaj({
      tip: "basari",
      metin:
        durum === "Onaylandı"
          ? "Talep onaylandı ve yönetici notu kaydedildi."
          : "Talep reddedildi ve red sebebi kaydedildi.",
    })

    await verileriYukle()
    setIslemId(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold text-gray-900"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-black text-gray-900">Yönetim Talepleri</h1>
          <p className="text-xs font-semibold text-gray-700">
            Personelden gelen izin, malzeme, araç ve diğer talepleri değerlendir
          </p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {mesaj && (
          <div
            className={`rounded-xl border p-4 text-sm font-bold ${
              mesaj.tip === "basari"
                ? "bg-green-50 border-green-300 text-green-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            {mesaj.metin}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white border border-gray-300 p-6 text-center font-bold text-gray-700">
            Yükleniyor...
          </div>
        ) : talepler.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-300 p-6 text-center font-bold text-gray-600">
            Henüz talep yok.
          </div>
        ) : (
          <div className="space-y-3">
            {talepler.map((talep) => {
              const medya = medyaListesi(talep)

              return (
                <div
                  key={talep.id}
                  className="rounded-2xl bg-white border border-gray-300 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-gray-600">
                        Talep Sahibi
                      </p>
                      <p className="text-lg font-black text-gray-900">
                        {personelAdi(talep)}
                      </p>
                      <p className="text-xs font-semibold text-gray-600">
                        {talep?.personeller?.rol || "-"} · {talep?.personeller?.tel || "-"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${durumRenk(
                        talep.durum,
                      )}`}
                    >
                      {talep.durum || "Beklemede"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                      <p className="text-xs font-bold text-gray-600">Talep Türü</p>
                      <p className="font-black text-gray-900">{talep.tip || "-"}</p>
                    </div>

                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                      <p className="text-xs font-bold text-gray-600">Başlık</p>
                      <p className="font-black text-gray-900">{talep.baslik || "-"}</p>
                    </div>

                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                      <p className="text-xs font-bold text-gray-600">Talep Tarihi</p>
                      <p className="font-black text-gray-900">
                        {tarihYaz(talep.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-xs font-bold text-gray-600">Açıklama</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 whitespace-pre-line">
                      {talep.aciklama || "-"}
                    </p>
                  </div>

                  {medya.length > 0 && (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                      <p className="text-xs font-bold text-gray-600 mb-2">
                        Ekli Fotoğraf / Video
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {medya.map((url: string, index: number) => (
                          <div
                            key={`${url}-${index}`}
                            className="rounded-xl border border-gray-300 bg-white p-2"
                          >
                            {medyaTipi(url) === "video" ? (
                              <video
                                src={url}
                                controls
                                className="h-32 w-full rounded-lg object-cover bg-black"
                              />
                            ) : (
                              <a href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={`Talep medya ${index + 1}`}
                                  className="h-32 w-full rounded-lg object-cover"
                                />
                              </a>
                            )}

                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block text-center text-xs font-black text-blue-700 underline"
                            >
                              Aç
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <label className="text-xs font-bold text-blue-800">
                      Yönetici Notu / Red Sebebi
                    </label>
                    <textarea
                      value={notlar[talep.id] || ""}
                      onChange={(e) =>
                        setNotlar((onceki) => ({
                          ...onceki,
                          [talep.id]: e.target.value,
                        }))
                      }
                      placeholder="Onay veya red açıklaması yazınız..."
                      className="mt-2 w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
                      rows={3}
                    />
                    <p className="mt-1 text-xs font-semibold text-blue-900">
                      Red işlemlerinde bu alan zorunludur. Onay işleminde de açıklama yazabilirsiniz.
                    </p>
                  </div>

                  {talep.yonetici_notu && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                      <p className="text-xs font-bold text-blue-800">Kayıtlı Yönetici Notu</p>
                      <p className="mt-1 text-sm font-semibold text-blue-900 whitespace-pre-line">
                        {talep.yonetici_notu}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-blue-800">
                        Değerlendirme: {tarihYaz(talep.degerlendirme_tarihi)}
                      </p>
                    </div>
                  )}

                  {(talep.durum === "Beklemede" || !talep.durum) && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => talepGuncelle(talep.id, "Onaylandı")}
                        disabled={islemId === talep.id}
                        className="rounded-xl bg-green-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                      >
                        {islemId === talep.id ? "İşleniyor..." : "Onayla"}
                      </button>

                      <button
                        type="button"
                        onClick={() => talepGuncelle(talep.id, "Reddedildi")}
                        disabled={islemId === talep.id}
                        className="rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                      >
                        {islemId === talep.id ? "İşleniyor..." : "Reddet"}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
