"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type MesajTipi = "basari" | "hata" | "bilgi"
type Mesaj = { tip: MesajTipi; metin: string }
type Kayit = Record<string, any>

const TUM_PERSONELLER = "__tum_personeller__"

function formatISO(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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

function adSoyad(p: Kayit) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || "Personel"
}

function pazarMi(date: Date) {
  return date.getDay() === 0
}

function normalizeDurum(value?: string | null) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
}

function onayliMi(durum?: string | null) {
  const d = normalizeDurum(durum)
  return d === "onaylandi" || d === "approved"
}

function tarihAraligindaMi(
  tarih: string,
  baslangic?: string | null,
  bitis?: string | null,
) {
  if (!baslangic || !bitis) return false

  const b1 = String(baslangic).slice(0, 10)
  const b2 = String(bitis).slice(0, 10)

  return tarih >= b1 && tarih <= b2
}

function durumClass(durum: string) {
  if (durum === "calisma") return "bg-green-100 text-green-800 border-green-300"
  if (durum === "izinli") return "bg-blue-100 text-blue-800 border-blue-300"
  if (durum === "raporlu") return "bg-red-100 text-red-800 border-red-300"
  if (durum === "hafta_tatili") return "bg-gray-200 text-gray-800 border-gray-300"
  if (durum === "resmi_tatil") return "bg-yellow-100 text-yellow-800 border-yellow-300"
  return "bg-white text-gray-900 border-gray-300"
}

function mesajClass(tip: MesajTipi) {
  if (tip === "basari") return "border-green-300 bg-green-50 text-green-900"
  if (tip === "hata") return "border-red-300 bg-red-50 text-red-900"
  return "border-blue-300 bg-blue-50 text-blue-900"
}

export default function VardiyaPage() {
  const router = useRouter()

  const [personeller, setPersoneller] = useState<Kayit[]>([])
  const [seciliPersonel, setSeciliPersonel] = useState(TUM_PERSONELLER)
  const [baslangicTarih, setBaslangicTarih] = useState(formatISO(new Date()))
  const [gunSayisi, setGunSayisi] = useState(7)

  const [standartBaslangic, setStandartBaslangic] = useState("09:00")
  const [standartBitis, setStandartBitis] = useState("18:00")
  const [pazarTatil, setPazarTatil] = useState(true)
  const [ozelDurumUygula, setOzelDurumUygula] = useState(true)

  const [vardiyalar, setVardiyalar] = useState<Kayit[]>([])
  const [loading, setLoading] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  useEffect(() => {
    void personelleriYukle()
  }, [])

  async function personelleriYukle() {
    try {
      const response = await fetch("/api/yonetim/personeller?durum=aktif", {
        cache: "no-store",
      })

      const sonuc = await response.json()

      if (!response.ok) {
        setMesaj({
          tip: "hata",
          metin: "Personel listesi alınamadı: " + (sonuc?.error || "Bilinmeyen hata"),
        })
        return
      }

      setPersoneller(sonuc.personeller || [])
    } catch (err: any) {
      setMesaj({
        tip: "hata",
        metin: "Personel listesi alınamadı: " + (err?.message || "Bağlantı hatası"),
      })
    }
  }

  const seciliPersoneller = useMemo(() => {
    if (seciliPersonel === TUM_PERSONELLER) {
      return personeller
    }

    return personeller.filter((p) => p.id === seciliPersonel)
  }, [personeller, seciliPersonel])

  async function izinleriGetir(personelIds: string[]) {
    if (!ozelDurumUygula || personelIds.length === 0) return []

    const supabase = createClient()

    const { data, error } = await supabase
      .from("calisan_talepler")
      .select(
        "id, personel_id, tip, baslik, izin_turu, durum, izin_baslangic, izin_bitis, devamsizlik_turu",
      )
      .in("personel_id", personelIds)
      .eq("tip", "izin")

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "İzin kayıtları okunamadı: " + error.message,
      })
      return []
    }

    return (data || []).filter((x) => onayliMi(x.durum))
  }

  function izinBul(personelId: string, tarih: string, izinler: Kayit[]) {
    return izinler.find((izin) => {
      return (
        izin.personel_id === personelId &&
        tarihAraligindaMi(tarih, izin.izin_baslangic, izin.izin_bitis)
      )
    })
  }

  async function getir() {
    setMesaj(null)

    if (seciliPersoneller.length === 0) {
      setMesaj({ tip: "hata", metin: "Planlanacak personel bulunamadı." })
      return
    }

    if (!standartBaslangic || !standartBitis) {
      setMesaj({ tip: "hata", metin: "Standart çalışma saatleri zorunludur." })
      return
    }

    setLoading(true)

    try {
      const start = new Date(`${baslangicTarih}T00:00:00`)
      const days = getDaysArray(start, gunSayisi)
      const personelIds = seciliPersoneller.map((p) => p.id)
      const izinler = await izinleriGetir(personelIds)

      const liste: Kayit[] = []

      for (const personel of seciliPersoneller) {
        for (const day of days) {
          const tarih = formatISO(day)
          const izin = izinBul(personel.id, tarih, izinler)

          let durum = "calisma"
          let baslangicSaati: string | null = standartBaslangic
          let bitisSaati: string | null = standartBitis
          let aciklama = ""

          if (izin) {
            const izinTuru = izin.izin_turu || izin.baslik || "İzin"
            const devamsizlik = String(izin.devamsizlik_turu || "").toLocaleLowerCase("tr-TR")

            durum =
              devamsizlik === "rapor" || izinTuru === "Hastalık / Rapor"
                ? "raporlu"
                : "izinli"

            baslangicSaati = null
            bitisSaati = null
            aciklama =
              durum === "raporlu"
                ? `Onaylı rapor: ${izinTuru}`
                : `Onaylı izin: ${izinTuru}`
          } else if (pazarTatil && pazarMi(day)) {
            durum = "hafta_tatili"
            baslangicSaati = null
            bitisSaati = null
            aciklama = "Pazar hafta tatili"
          }

          liste.push({
            personel_id: personel.id,
            personel_adi: adSoyad(personel),
            personel_kodu: personel.personel_kodu || "",
            rol: personel.rol || "",
            tarih,
            durum,
            baslangic_saati: baslangicSaati,
            bitis_saati: bitisSaati,
            calisma_gunu: durum === "calisma",
            aciklama,
          })
        }
      }

      setVardiyalar(liste)

      setMesaj({
        tip: "basari",
        metin: `${seciliPersoneller.length} personel için ${gunSayisi} günlük vardiya planı hazırlandı. Okunan onaylı izin: ${izinler.length}`,
      })
    } catch (err: any) {
      setMesaj({
        tip: "hata",
        metin: err?.message || "Vardiya planı hazırlanamadı.",
      })
    }

    setLoading(false)
  }

  function guncelle(index: number, field: string, value: any) {
    const kopya = [...vardiyalar]
    kopya[index] = { ...kopya[index], [field]: value }

    if (field === "durum" && value !== "calisma") {
      kopya[index].baslangic_saati = null
      kopya[index].bitis_saati = null
      kopya[index].calisma_gunu = false
    }

    if (field === "durum" && value === "calisma") {
      kopya[index].baslangic_saati = standartBaslangic
      kopya[index].bitis_saati = standartBitis
      kopya[index].calisma_gunu = true
    }

    setVardiyalar(kopya)
  }

  async function kaydet() {
    setMesaj(null)

    if (vardiyalar.length === 0) {
      setMesaj({ tip: "hata", metin: "Kaydedilecek vardiya yok." })
      return
    }

    setLoading(true)

    const supabase = createClient()

    const payload = vardiyalar.map((v) => ({
      personel_id: v.personel_id,
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
        metin: "Vardiya kaydedilemedi: " + error.message,
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
          type="button"
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold text-gray-700"
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-black text-gray-900">Vardiya Yönetimi</h1>
          <p className="text-sm font-semibold text-gray-600">
            Şirket standart çalışma saatine göre toplu vardiya planla.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <select
              value={seciliPersonel}
              onChange={(e) => {
                setSeciliPersonel(e.target.value)
                setVardiyalar([])
              }}
              className="border border-gray-400 bg-white font-semibold p-3 rounded-lg"
            >
              <option value={TUM_PERSONELLER}>Tüm aktif personeller</option>
              {personeller.map((p) => (
                <option key={p.id} value={p.id}>
                  {adSoyad(p)} {p.rol ? `- ${p.rol}` : ""}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={baslangicTarih}
              onChange={(e) => {
                setBaslangicTarih(e.target.value)
                setVardiyalar([])
              }}
              className="border border-gray-400 bg-white font-semibold p-3 rounded-lg"
            />

            <input
              type="number"
              value={gunSayisi}
              min={1}
              max={62}
              onChange={(e) => {
                setGunSayisi(Number(e.target.value))
                setVardiyalar([])
              }}
              className="border border-gray-400 bg-white font-semibold p-3 rounded-lg"
            />

            <input
              type="time"
              value={standartBaslangic}
              onChange={(e) => setStandartBaslangic(e.target.value)}
              className="border border-gray-400 bg-white font-semibold p-3 rounded-lg"
            />

            <input
              type="time"
              value={standartBitis}
              onChange={(e) => setStandartBitis(e.target.value)}
              className="border border-gray-400 bg-white font-semibold p-3 rounded-lg"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 rounded-xl border bg-gray-50 p-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={pazarTatil}
                onChange={(e) => setPazarTatil(e.target.checked)}
              />
              Pazar tatil
            </label>

            <label className="flex items-center gap-2 rounded-xl border bg-gray-50 p-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={ozelDurumUygula}
                onChange={(e) => setOzelDurumUygula(e.target.checked)}
              />
              İzin/rapor/eğitim
            </label>

            <button
              type="button"
              onClick={getir}
              disabled={loading}
              className="bg-blue-700 text-white rounded-lg px-4 py-3 font-black disabled:opacity-50"
            >
              {loading ? "Yükleniyor..." : "Getir / Planla"}
            </button>
          </div>
        </div>

        {mesaj && (
          <div className={`rounded-xl border p-4 font-bold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        {vardiyalar.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center font-bold text-gray-600 shadow-sm">
            Plan oluşturmak için Getir / Planla butonuna basın.
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {vardiyalar.map((v, i) => (
                <div
                  key={`mobil-${v.personel_id}-${v.tarih}`}
                  className="rounded-2xl border bg-white p-4 shadow-sm"
                >
                  <div className="mb-3">
                    <p className="text-base font-black text-gray-950">{v.personel_adi}</p>
                    <p className="text-xs font-semibold text-gray-500">
                      {v.personel_kodu || ""} {v.rol ? `· ${v.rol}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-black text-blue-800">{v.tarih}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-600">Durum</label>
                      <select
                        value={v.durum}
                        onChange={(e) => guncelle(i, "durum", e.target.value)}
                        className={`w-full rounded-xl border px-3 py-3 text-base font-black ${durumClass(v.durum)}`}
                      >
                        <option value="calisma">Çalışma</option>
                        <option value="izinli">İzinli</option>
                        <option value="raporlu">Raporlu</option>
                        <option value="hafta_tatili">Hafta Tatili</option>
                        <option value="resmi_tatil">Resmi Tatil</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-black text-gray-600">Başlangıç</label>
                        <input
                          type="time"
                          value={v.baslangic_saati || ""}
                          disabled={v.durum !== "calisma"}
                          onChange={(e) => guncelle(i, "baslangic_saati", e.target.value)}
                          className="w-full rounded-xl border px-3 py-3 text-base font-bold disabled:bg-gray-200"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-black text-gray-600">Bitiş</label>
                        <input
                          type="time"
                          value={v.bitis_saati || ""}
                          disabled={v.durum !== "calisma"}
                          onChange={(e) => guncelle(i, "bitis_saati", e.target.value)}
                          className="w-full rounded-xl border px-3 py-3 text-base font-bold disabled:bg-gray-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-600">Açıklama</label>
                      <input
                        value={v.aciklama || ""}
                        onChange={(e) => guncelle(i, "aciklama", e.target.value)}
                        className="w-full rounded-xl border px-3 py-3 text-base font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden rounded-2xl border bg-white shadow-sm md:block md:overflow-auto">
              <table className="w-full text-sm md:min-w-[1120px]">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-3 text-left font-black border">Personel</th>
                    <th className="p-3 text-left font-black border">Tarih</th>
                    <th className="p-3 text-left font-black border">Durum</th>
                    <th className="p-3 text-left font-black border">Başlangıç</th>
                    <th className="p-3 text-left font-black border">Bitiş</th>
                    <th className="p-3 text-left font-black border">Açıklama</th>
                  </tr>
                </thead>

                <tbody>
                  {vardiyalar.map((v, i) => (
                    <tr key={`${v.personel_id}-${v.tarih}`} className="border-t hover:bg-gray-50">
                      <td className="p-3 border font-bold">
                        {v.personel_adi}
                        <p className="text-xs text-gray-500">
                          {v.personel_kodu || ""} {v.rol ? `· ${v.rol}` : ""}
                        </p>
                      </td>

                      <td className="p-3 border font-bold">{v.tarih}</td>

                      <td className="p-3 border">
                        <select
                          value={v.durum}
                          onChange={(e) => guncelle(i, "durum", e.target.value)}
                          className={`w-full border rounded-lg px-3 py-2 font-black ${durumClass(v.durum)}`}
                        >
                          <option value="calisma">Çalışma</option>
                          <option value="izinli">İzinli</option>
                          <option value="raporlu">Raporlu</option>
                          <option value="hafta_tatili">Hafta Tatili</option>
                          <option value="resmi_tatil">Resmi Tatil</option>
                        </select>
                      </td>

                      <td className="p-3 border">
                        <input
                          type="time"
                          value={v.baslangic_saati || ""}
                          disabled={v.durum !== "calisma"}
                          onChange={(e) => guncelle(i, "baslangic_saati", e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 font-bold disabled:bg-gray-200"
                        />
                      </td>

                      <td className="p-3 border">
                        <input
                          type="time"
                          value={v.bitis_saati || ""}
                          disabled={v.durum !== "calisma"}
                          onChange={(e) => guncelle(i, "bitis_saati", e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 font-bold disabled:bg-gray-200"
                        />
                      </td>

                      <td className="p-3 border">
                        <input
                          value={v.aciklama || ""}
                          onChange={(e) => guncelle(i, "aciklama", e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 font-semibold"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={kaydet}
          disabled={loading || vardiyalar.length === 0}
          className="w-full bg-green-700 text-white py-4 rounded-2xl font-black text-lg disabled:opacity-50"
        >
          {loading ? "İşlem yapılıyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  )
}
