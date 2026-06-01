"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type MesajTipi = "basari" | "hata" | "bilgi"
type Mesaj = { tip: MesajTipi; metin: string }
type Kayit = Record<string, any>

const TUM_PERSONELLER = "__tum_personeller__"

const DINI_TATILLER: Record<string, string> = {
  "2026-03-19": "Ramazan Bayramı Arefesi",
  "2026-03-20": "Ramazan Bayramı 1. Gün",
  "2026-03-21": "Ramazan Bayramı 2. Gün",
  "2026-03-22": "Ramazan Bayramı 3. Gün",
  "2026-05-26": "Kurban Bayramı Arefesi",
  "2026-05-27": "Kurban Bayramı 1. Gün",
  "2026-05-28": "Kurban Bayramı 2. Gün",
  "2026-05-29": "Kurban Bayramı 3. Gün",
  "2026-05-30": "Kurban Bayramı 4. Gün",

  "2027-03-08": "Ramazan Bayramı Arefesi",
  "2027-03-09": "Ramazan Bayramı 1. Gün",
  "2027-03-10": "Ramazan Bayramı 2. Gün",
  "2027-03-11": "Ramazan Bayramı 3. Gün",
  "2027-05-15": "Kurban Bayramı Arefesi",
  "2027-05-16": "Kurban Bayramı 1. Gün",
  "2027-05-17": "Kurban Bayramı 2. Gün",
  "2027-05-18": "Kurban Bayramı 3. Gün",
  "2027-05-19": "Kurban Bayramı 4. Gün",

  "2028-02-26": "Ramazan Bayramı Arefesi",
  "2028-02-27": "Ramazan Bayramı 1. Gün",
  "2028-02-28": "Ramazan Bayramı 2. Gün",
  "2028-02-29": "Ramazan Bayramı 3. Gün",
  "2028-05-04": "Kurban Bayramı Arefesi",
  "2028-05-05": "Kurban Bayramı 1. Gün",
  "2028-05-06": "Kurban Bayramı 2. Gün",
  "2028-05-07": "Kurban Bayramı 3. Gün",
  "2028-05-08": "Kurban Bayramı 4. Gün",
}

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

function sabitResmiTatilAdi(tarih: string) {
  const ayGun = tarih.slice(5)

  const sabitler: Record<string, string> = {
    "01-01": "Yılbaşı",
    "04-23": "Ulusal Egemenlik ve Çocuk Bayramı",
    "05-01": "Emek ve Dayanışma Günü",
    "05-19": "Atatürk’ü Anma, Gençlik ve Spor Bayramı",
    "07-15": "Demokrasi ve Millî Birlik Günü",
    "08-30": "Zafer Bayramı",
    "10-29": "Cumhuriyet Bayramı",
  }

  return sabitler[ayGun] || ""
}

function resmiTatilAdi(tarih: string) {
  return DINI_TATILLER[tarih] || sabitResmiTatilAdi(tarih)
}

function pazarMi(date: Date) {
  return date.getDay() === 0
}

function tarihAraligindaMi(tarih: string, baslangic?: string | null, bitis?: string | null) {
  if (!baslangic || !bitis) return false
  return tarih >= baslangic && tarih <= bitis
}

function adSoyad(p: Kayit) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || "Personel"
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
  const [resmiTatilUygula, setResmiTatilUygula] = useState(true)
  const [ozelDurumUygula, setOzelDurumUygula] = useState(true)

  const [vardiyalar, setVardiyalar] = useState<Kayit[]>([])
  const [loading, setLoading] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  useEffect(() => {
    void personelleriYukle()
  }, [])

  async function personelleriYukle() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("personeller")
      .select("id, ad, soyad, rol, durum, personel_kodu, sirket_id")
      .order("ad", { ascending: true })

    if (error) {
      setMesaj({ tip: "hata", metin: "Personel listesi alınamadı: " + error.message })
      return
    }

    setPersoneller(data || [])
  }

  const seciliPersoneller = useMemo(() => {
    if (seciliPersonel === TUM_PERSONELLER) {
      return personeller.filter((p) => {
        const durum = String(p.durum || "").toLocaleLowerCase("tr-TR")
        return !durum.includes("pasif") && !durum.includes("isten_ayrildi")
      })
    }

    return personeller.filter((p) => p.id === seciliPersonel)
  }, [personeller, seciliPersonel])

  async function guvenliOku(tablo: string, personelIds: string[], baslangic: string, bitis: string) {
    if (personelIds.length === 0) return []

    const supabase = createClient()

    const { data, error } = await supabase
      .from(tablo)
      .select("*")
      .in("personel_id", personelIds)
      .lte("baslangic_tarihi", bitis)
      .gte("bitis_tarihi", baslangic)

    if (error) return []
    return data || []
  }

  async function ozelDurumlariGetir(personelIds: string[], baslangic: string, bitis: string) {
    if (!ozelDurumUygula) {
      return { izinler: [], raporlar: [], egitimler: [] }
    }

    const izinler = await guvenliOku("izin_talepleri", personelIds, baslangic, bitis)
    const raporlar = await guvenliOku("saglik_raporlari", personelIds, baslangic, bitis)
    const egitimler = await guvenliOku("egitim_kayitlari", personelIds, baslangic, bitis)

    return { izinler, raporlar, egitimler }
  }

  function ozelDurumBul(personelId: string, tarih: string, izinler: Kayit[], raporlar: Kayit[], egitimler: Kayit[]) {
    const izin = izinler.find((x) => {
      const durum = String(x.durum || "").toLocaleLowerCase("tr-TR")
      const onayli = durum === "onaylandi" || durum === "onaylı" || durum === "approved"
      return x.personel_id === personelId && onayli && tarihAraligindaMi(tarih, x.baslangic_tarihi, x.bitis_tarihi)
    })

    if (izin) return { durum: "izinli", aciklama: `Onaylı izin: ${izin.izin_turu || ""}` }

    const rapor = raporlar.find((x) => {
      const durum = String(x.durum || "").toLocaleLowerCase("tr-TR")
      const aktif = !durum || durum === "onaylandi" || durum === "onaylı" || durum === "aktif" || durum === "approved"
      return x.personel_id === personelId && aktif && tarihAraligindaMi(tarih, x.baslangic_tarihi, x.bitis_tarihi)
    })

    if (rapor) return { durum: "raporlu", aciklama: `Sağlık raporu: ${rapor.aciklama || ""}` }

    const egitim = egitimler.find((x) => {
      const durum = String(x.durum || "").toLocaleLowerCase("tr-TR")
      const aktif = !durum || durum === "planlandi" || durum === "planlandı" || durum === "aktif" || durum === "onaylandi"
      return x.personel_id === personelId && aktif && tarihAraligindaMi(tarih, x.baslangic_tarihi, x.bitis_tarihi)
    })

    if (egitim) return { durum: "egitim", aciklama: `Eğitim: ${egitim.egitim_adi || egitim.baslik || ""}` }

    return null
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
      const tarihList = days.map(formatISO)
      const bitisTarih = tarihList[tarihList.length - 1]
      const personelIds = seciliPersoneller.map((p) => p.id)

      const supabase = createClient()

      const { data: mevcutData, error: mevcutError } = await supabase
        .from("vardiya_planlari")
        .select("*")
        .in("personel_id", personelIds)
        .in("tarih", tarihList)

      if (mevcutError) {
        setMesaj({ tip: "hata", metin: "Mevcut vardiyalar alınamadı: " + mevcutError.message })
        setLoading(false)
        return
      }

      const mevcutMap = new Map<string, Kayit>()
      for (const v of mevcutData || []) mevcutMap.set(`${v.personel_id}-${v.tarih}`, v)

      const { izinler, raporlar, egitimler } = await ozelDurumlariGetir(personelIds, baslangicTarih, bitisTarih)

      const liste: Kayit[] = []

      for (const personel of seciliPersoneller) {
        for (const day of days) {
          const tarih = formatISO(day)
          const mevcut = mevcutMap.get(`${personel.id}-${tarih}`)

          if (mevcut) {
            liste.push({
              ...mevcut,
              personel_adi: adSoyad(personel),
              personel_kodu: personel.personel_kodu || "",
              rol: personel.rol || "",
            })
            continue
          }

          let durum = "calisma"
          let baslangicSaati: string | null = standartBaslangic
          let bitisSaati: string | null = standartBitis
          let aciklama = ""

          const ozelDurum = ozelDurumBul(personel.id, tarih, izinler, raporlar, egitimler)
          const tatilAdi = resmiTatilUygula ? resmiTatilAdi(tarih) : ""

          if (ozelDurum) {
            durum = ozelDurum.durum
            baslangicSaati = null
            bitisSaati = null
            aciklama = ozelDurum.aciklama
          } else if (tatilAdi) {
            durum = "resmi_tatil"
            baslangicSaati = null
            bitisSaati = null
            aciklama = tatilAdi
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
            baslangic_saati: durum === "calisma" ? baslangicSaati : null,
            bitis_saati: durum === "calisma" ? bitisSaati : null,
            calisma_gunu: durum === "calisma",
            aciklama,
          })
        }
      }

      setVardiyalar(liste)
      setMesaj({
        tip: "basari",
        metin: `${seciliPersoneller.length} personel için ${gunSayisi} günlük vardiya planı hazırlandı.`,
      })
    } catch (err: any) {
      setMesaj({ tip: "hata", metin: err?.message || "Vardiya planı hazırlanamadı." })
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
      kopya[index].baslangic_saati = kopya[index].baslangic_saati || standartBaslangic
      kopya[index].bitis_saati = kopya[index].bitis_saati || standartBitis
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
      setMesaj({ tip: "hata", metin: "Vardiya kaydedilemedi: " + error.message })
      setLoading(false)
      return
    }

    setMesaj({ tip: "basari", metin: "Vardiya planı başarıyla kaydedildi." })
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

          <div className="grid md:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 rounded-xl border bg-gray-50 p-3 text-sm font-bold">
              <input type="checkbox" checked={pazarTatil} onChange={(e) => setPazarTatil(e.target.checked)} />
              Pazar tatil
            </label>

            <label className="flex items-center gap-2 rounded-xl border bg-gray-50 p-3 text-sm font-bold">
              <input type="checkbox" checked={resmiTatilUygula} onChange={(e) => setResmiTatilUygula(e.target.checked)} />
              Resmi/dini tatil
            </label>

            <label className="flex items-center gap-2 rounded-xl border bg-gray-50 p-3 text-sm font-bold">
              <input type="checkbox" checked={ozelDurumUygula} onChange={(e) => setOzelDurumUygula(e.target.checked)} />
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

        <div className="bg-white rounded-2xl border shadow-sm overflow-auto">
          <table className="w-full text-sm min-w-[1120px]">
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
              {vardiyalar.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center font-bold text-gray-600 border">
                    Plan oluşturmak için Getir / Planla butonuna basın.
                  </td>
                </tr>
              ) : (
                vardiyalar.map((v, i) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>

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
