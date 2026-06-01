"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type MesajTipi = "basari" | "hata" | "bilgi"

type Mesaj = {
  tip: MesajTipi
  metin: string
}

function getDaysArray(start: Date, count: number) {
  const arr: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    arr.push(d)
  }
  return arr
}

function formatISO(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function durumClass(durum: string) {
  if (durum === "calisma") return "bg-green-100 text-green-800 border-green-300"
  if (durum === "izinli") return "bg-blue-100 text-blue-800 border-blue-300"
  if (durum === "raporlu") return "bg-red-100 text-red-800 border-red-300"
  if (durum === "egitim") return "bg-purple-100 text-purple-800 border-purple-300"
  if (durum === "hafta_tatili") return "bg-gray-200 text-gray-800 border-gray-300"
  if (durum === "resmi_tatil") return "bg-yellow-100 text-yellow-800 border-yellow-300"
  return "bg-white text-gray-900 border-gray-300"
}

function mesajClass(tip: MesajTipi) {
  if (tip === "basari") return "border-green-300 bg-green-50 text-green-800"
  if (tip === "hata") return "border-red-300 bg-red-50 text-red-800"
  return "border-blue-300 bg-blue-50 text-blue-900"
}

export default function VardiyaPage() {
  const router = useRouter()

  const [personeller, setPersoneller] = useState<any[]>([])
  const [seciliPersonel, setSeciliPersonel] = useState("")
  const [gunSayisi, setGunSayisi] = useState(7)
  const [baslangicTarih, setBaslangicTarih] = useState(formatISO(new Date()))
  const [vardiyalar, setVardiyalar] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  useEffect(() => {
    const yukle = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("personeller")
        .select("id, ad, soyad, rol, durum")
        .in("durum", ["aktif", "active", "izinli", "izınli"])
        .order("ad", { ascending: true })

      if (error) {
        setMesaj({
          tip: "hata",
          metin: "Personel listesi alınamadı: " + error.message,
        })
        return
      }

      setPersoneller(data || [])
    }

    yukle()
  }, [])

  const getir = async () => {
    setMesaj(null)

    if (!seciliPersonel) {
      setMesaj({ tip: "hata", metin: "Lütfen personel seçin." })
      return
    }

    if (!gunSayisi || gunSayisi < 1) {
      setMesaj({ tip: "hata", metin: "Gün sayısı en az 1 olmalıdır." })
      return
    }

    setLoading(true)
    setMesaj({ tip: "bilgi", metin: "Vardiya planı getiriliyor..." })

    const supabase = createClient()

    const start = new Date(`${baslangicTarih}T00:00:00`)
    const days = getDaysArray(start, gunSayisi)
    const tarihList = days.map((d) => formatISO(d))

    const { data, error } = await supabase
      .from("vardiya_planlari")
      .select("id, tarih, durum, baslangic_saati, bitis_saati, aciklama")
      .eq("personel_id", seciliPersonel)
      .in("tarih", tarihList)

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Vardiya kayıtları alınamadı: " + error.message,
      })
      setLoading(false)
      return
    }

    const map = new Map<string, any>()
    data?.forEach((v) => {
      map.set(v.tarih, v)
    })

    const liste = days.map((d) => {
      const iso = formatISO(d)

      return (
        map.get(iso) || {
          tarih: iso,
          durum: "calisma",
          baslangic_saati: "09:00",
          bitis_saati: "18:00",
          aciklama: "",
        }
      )
    })

    setVardiyalar(liste)
    setMesaj({
      tip: "basari",
      metin: `${liste.length} günlük vardiya planı hazırlandı.`,
    })
    setLoading(false)
  }

  const guncelle = (index: number, field: string, value: any) => {
    const kopya = [...vardiyalar]

    kopya[index] = {
      ...kopya[index],
      [field]: value,
    }

    if (field === "durum" && value !== "calisma") {
      kopya[index].baslangic_saati = null
      kopya[index].bitis_saati = null
    }

    if (field === "durum" && value === "calisma") {
      kopya[index].baslangic_saati = kopya[index].baslangic_saati || "09:00"
      kopya[index].bitis_saati = kopya[index].bitis_saati || "18:00"
    }

    setVardiyalar(kopya)
  }

  const kaydet = async () => {
    setMesaj(null)

    if (!seciliPersonel) {
      setMesaj({ tip: "hata", metin: "Lütfen personel seçin." })
      return
    }

    if (vardiyalar.length === 0) {
      setMesaj({
        tip: "hata",
        metin: "Kaydedilecek vardiya listesi yok. Önce Getir butonuna basın.",
      })
      return
    }

    setLoading(true)
    setMesaj({ tip: "bilgi", metin: "Vardiya planı kaydediliyor..." })

    const supabase = createClient()

    const payload = vardiyalar.map((v) => ({
      personel_id: seciliPersonel,
      tarih: v.tarih,
      baslangic_saati: v.durum === "calisma" ? v.baslangic_saati : null,
      bitis_saati: v.durum === "calisma" ? v.bitis_saati : null,
      durum: v.durum,
      calisma_gunu: v.durum === "calisma",
      aciklama: v.aciklama || null,
    }))

    const { error } = await supabase.from("vardiya_planlari").upsert(payload, {
      onConflict: "personel_id,tarih",
    })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Vardiya planı kaydedilemedi: " + error.message,
      })
      setLoading(false)
      return
    }

    setMesaj({
      tip: "basari",
      metin: "Vardiya planı başarıyla kaydedildi.",
    })

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold text-gray-700"
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vardiya Yönetimi</h1>
          <p className="text-sm text-gray-600">
            Personel seçin, gün sayısını belirleyin ve vardiya planını hızlıca düzenleyin.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-3 bg-white p-5 rounded-2xl border shadow-sm">
          <select
            value={seciliPersonel}
            onChange={(e) => {
              setSeciliPersonel(e.target.value)
              setVardiyalar([])
              setMesaj(null)
            }}
            className="border border-gray-400 bg-white text-gray-900 font-semibold p-3 rounded-lg"
          >
            <option value="">Personel seç</option>
            {personeller.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad} {p.soyad} {p.rol ? `- ${p.rol}` : ""}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={baslangicTarih}
            onChange={(e) => {
              setBaslangicTarih(e.target.value)
              setVardiyalar([])
              setMesaj(null)
            }}
            className="border border-gray-400 bg-white text-gray-900 font-semibold p-3 rounded-lg"
          />

          <input
            type="number"
            value={gunSayisi}
            min={1}
            max={31}
            onChange={(e) => {
              setGunSayisi(Number(e.target.value))
              setVardiyalar([])
              setMesaj(null)
            }}
            className="border border-gray-400 bg-white text-gray-900 font-semibold p-3 rounded-lg"
            placeholder="Gün sayısı"
          />

          <button
            onClick={getir}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 font-bold disabled:opacity-50"
          >
            {loading ? "Yükleniyor..." : "Getir"}
          </button>
        </div>

        {mesaj && (
          <div
            className={`rounded-xl border p-4 font-semibold ${mesajClass(
              mesaj.tip,
            )}`}
          >
            {mesaj.metin}
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm overflow-auto">
          <table className="w-full text-sm min-w-[850px]">
            <thead className="bg-gray-200 text-gray-900">
              <tr>
                <th className="p-3 text-left font-bold border">Tarih</th>
                <th className="p-3 text-left font-bold border">Durum</th>
                <th className="p-3 text-left font-bold border">Başlangıç</th>
                <th className="p-3 text-left font-bold border">Bitiş</th>
                <th className="p-3 text-left font-bold border">Açıklama</th>
              </tr>
            </thead>

            <tbody>
              {vardiyalar.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-gray-600 font-semibold border"
                  >
                    Personel seçip “Getir” butonuna basın.
                  </td>
                </tr>
              ) : (
                vardiyalar.map((v, i) => (
                  <tr key={v.tarih} className="border-t hover:bg-gray-50">
                    <td className="p-3 border font-bold text-gray-900">
                      {v.tarih}
                    </td>

                    <td className="p-3 border">
                      <select
                        value={v.durum}
                        onChange={(e) => guncelle(i, "durum", e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 font-bold ${durumClass(
                          v.durum,
                        )}`}
                      >
                        <option value="calisma">Çalışma</option>
                        <option value="izinli">İzinli</option>
                        <option value="raporlu">Raporlu</option>
                        <option value="egitim">Eğitim</option>
                        <option value="hafta_tatili">Hafta Tatili</option>
                        <option value="resmi_tatil">Resmi Tatil</option>
                      </select>
                    </td>

                    <td className="p-3 border">
                      <input
                        type="time"
                        value={v.baslangic_saati || ""}
                        disabled={v.durum !== "calisma"}
                        onChange={(e) =>
                          guncelle(i, "baslangic_saati", e.target.value)
                        }
                        className="w-full border border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-bold disabled:bg-gray-200 disabled:text-gray-500"
                      />
                    </td>

                    <td className="p-3 border">
                      <input
                        type="time"
                        value={v.bitis_saati || ""}
                        disabled={v.durum !== "calisma"}
                        onChange={(e) =>
                          guncelle(i, "bitis_saati", e.target.value)
                        }
                        className="w-full border border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-bold disabled:bg-gray-200 disabled:text-gray-500"
                      />
                    </td>

                    <td className="p-3 border">
                      <input
                        value={v.aciklama || ""}
                        onChange={(e) => guncelle(i, "aciklama", e.target.value)}
                        placeholder="Açıklama"
                        className="w-full border border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={kaydet}
          disabled={loading || vardiyalar.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50"
        >
          {loading ? "İşlem yapılıyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  )
}
