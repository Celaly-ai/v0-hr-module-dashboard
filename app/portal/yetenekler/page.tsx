"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata" | "bilgi"
  metin: string
}

export default function YetenekPage() {
  const router = useRouter()

  const [yetenekler, setYetenekler] = useState<any[]>([])
  const [personeller, setPersoneller] = useState<any[]>([])
  const [seciliPersonel, setSeciliPersonel] = useState("")
  const [personelYetenekleri, setPersonelYetenekleri] = useState<any[]>([])

  const [urunGrubu, setUrunGrubu] = useState("")
  const [islem, setIslem] = useState("")
  const [aciklama, setAciklama] = useState("")

  const [arama, setArama] = useState("")
  const [urunFiltre, setUrunFiltre] = useState("")
  const [durumFiltre, setDurumFiltre] = useState("tumu")

  const [excelDosya, setExcelDosya] = useState<File | null>(null)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  const verileriYukle = useCallback(async () => {
    setLoading(true)

    const supabase = createClient()

    const { data: yData, error: yError } = await supabase
      .from("yetenekler")
      .select("id, urun_grubu, islem, aciklama")
      .eq("aktif", true)
      .order("urun_grubu", { ascending: true })
      .order("islem", { ascending: true })

    if (yError) {
      setMesaj({ tip: "hata", metin: "Yetenekler alınamadı: " + yError.message })
      setLoading(false)
      return
    }

    const { data: pData, error: pError } = await supabase
      .from("personeller")
      .select("id, ad, soyad, durum")
      .order("ad", { ascending: true })

    if (pError) {
      setMesaj({ tip: "hata", metin: "Personeller alınamadı: " + pError.message })
      setLoading(false)
      return
    }

    setYetenekler(yData || [])
    setPersoneller(pData || [])
    setLoading(false)
  }, [])

  const personelYetenekleriniGetir = useCallback(async (personelId: string) => {
    if (!personelId) {
      setPersonelYetenekleri([])
      return
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from("personel_yetenekleri")
      .select("id, yetenek_id, yapabilir")
      .eq("personel_id", personelId)

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Personel yetenekleri alınamadı: " + error.message,
      })
      return
    }

    setPersonelYetenekleri(data || [])
  }, [])

  useEffect(() => {
    void verileriYukle()
  }, [verileriYukle])

  useEffect(() => {
    void personelYetenekleriniGetir(seciliPersonel)
  }, [seciliPersonel, personelYetenekleriniGetir])

  const urunGruplari = useMemo(() => {
    const set = new Set<string>()
    yetenekler.forEach((y) => {
      if (y?.urun_grubu) set.add(y.urun_grubu)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"))
  }, [yetenekler])

  const getPersonelYetenek = useCallback((yetenekId: string) => {
    return personelYetenekleri.find((x) => x.yetenek_id === yetenekId)
  }, [personelYetenekleri])

  const getDurum = useCallback((yetenekId: string) => {
    const kayit = getPersonelYetenek(yetenekId)
    if (!kayit) return null
    return kayit.yapabilir
  }, [getPersonelYetenek])

  const filtreliYetenekler = useMemo(() => {
    return yetenekler.filter((y) => {
      const metin = `${y?.urun_grubu || ""} ${y?.islem || ""} ${y?.aciklama || ""}`.toLocaleLowerCase("tr-TR")
      const durum = getDurum(y.id)

      if (arama && !metin.includes(arama.toLocaleLowerCase("tr-TR"))) return false
      if (urunFiltre && y?.urun_grubu !== urunFiltre) return false

      if (durumFiltre === "yapabilir" && durum !== true) return false
      if (durumFiltre === "yapamaz" && durum !== false) return false
      if (durumFiltre === "tanimsiz" && durum !== null) return false

      return true
    })
  }, [yetenekler, arama, urunFiltre, durumFiltre, getDurum])

  async function yetenekEkle() {
    setMesaj(null)

    if (!urunGrubu.trim()) {
      setMesaj({ tip: "hata", metin: "Ürün grubu zorunludur." })
      return
    }

    if (!islem.trim()) {
      setMesaj({ tip: "hata", metin: "İşlem zorunludur." })
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    const temizUrun = urunGrubu.trim()
    const temizIslem = islem.trim()

    const { error } = await supabase.from("yetenekler").insert({
      urun_grubu: temizUrun,
      islem: temizIslem,
      yetenek_adi: `${temizUrun} / ${temizIslem}`,
      kategori: temizUrun,
      aciklama: aciklama.trim() || null,
      aktif: true,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setMesaj({ tip: "hata", metin: "Yetenek eklenemedi: " + error.message })
      setKaydediliyor(false)
      return
    }

    setUrunGrubu("")
    setIslem("")
    setAciklama("")
    setMesaj({ tip: "basari", metin: "Yetenek havuzuna eklendi." })

    await verileriYukle()
    setKaydediliyor(false)
  }

  async function excelYukle() {
    setMesaj(null)

    if (!excelDosya) {
      setMesaj({ tip: "hata", metin: "Lütfen Excel dosyası seçiniz." })
      return
    }

    setExcelYukleniyor(true)

    try {
      const formData = new FormData()
      formData.append("file", excelDosya)

      const response = await fetch("/api/admin/yetenek-havuzu-yukle", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setMesaj({ tip: "hata", metin: data.error || "Excel yüklenemedi." })
        setExcelYukleniyor(false)
        return
      }

      setMesaj({
        tip: "basari",
        metin: `Excel yüklendi. Eklenen: ${data.eklenen}, Güncellenen: ${data.guncellenen}, Hatalı: ${data.hatali}`,
      })

      setExcelDosya(null)
      await verileriYukle()
    } catch (error: any) {
      setMesaj({
        tip: "hata",
        metin: "Excel yükleme sırasında hata oluştu: " + (error?.message || "Bilinmeyen hata"),
      })
    }

    setExcelYukleniyor(false)
  }

  async function yetenekPasifeAl(yetenekId: string) {
    const supabase = createClient()

    const { error } = await supabase
      .from("yetenekler")
      .update({
        aktif: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", yetenekId)

    if (error) {
      setMesaj({ tip: "hata", metin: "Yetenek pasife alınamadı: " + error.message })
      return
    }

    setMesaj({ tip: "basari", metin: "Yetenek pasife alındı." })
    await verileriYukle()
  }

  async function yetenekDurumuKaydet(yetenekId: string, yapabilir: boolean) {
    if (!seciliPersonel) {
      setMesaj({ tip: "hata", metin: "Önce personel seçiniz." })
      return
    }

    const supabase = createClient()
    const mevcut = getPersonelYetenek(yetenekId)

    if (mevcut) {
      const { error } = await supabase
        .from("personel_yetenekleri")
        .update({
          yapabilir,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mevcut.id)

      if (error) {
        setMesaj({ tip: "hata", metin: "Yetenek güncellenemedi: " + error.message })
        return
      }
    } else {
      const { error } = await supabase.from("personel_yetenekleri").insert({
        personel_id: seciliPersonel,
        yetenek_id: yetenekId,
        yapabilir,
      })

      if (error) {
        setMesaj({ tip: "hata", metin: "Yetenek atanamadı: " + error.message })
        return
      }
    }

    await personelYetenekleriniGetir(seciliPersonel)
  }

  function mesajClass(tip: Mesaj["tip"]) {
    if (tip === "basari") return "bg-green-50 border-green-300 text-green-900"
    if (tip === "hata") return "bg-red-50 border-red-300 text-red-900"
    return "bg-blue-50 border-blue-300 text-blue-900"
  }

  const seciliPersonelObj = personeller.find((p) => p.id === seciliPersonel)

  const sayilar = useMemo(() => {
    let yapabilir = 0
    let yapamaz = 0
    let tanimsiz = 0

    yetenekler.forEach((y) => {
      const durum = getDurum(y.id)
      if (durum === true) yapabilir++
      else if (durum === false) yapamaz++
      else tanimsiz++
    })

    return { yapabilir, yapamaz, tanimsiz }
  }, [yetenekler, getDurum])

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
          <h1 className="text-xl font-black text-gray-900">Yetenek Matrisi</h1>
          <p className="text-xs font-semibold text-gray-700">
            Personel bazlı yapabilir / yapamaz yetenek yönetimi
          </p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {mesaj && (
          <div className={`rounded-xl border p-4 text-sm font-bold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">1. Yetenek Havuzu Tanımı</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Ürün Grubu</label>
              <input
                value={urunGrubu}
                onChange={(e) => setUrunGrubu(e.target.value)}
                placeholder="Klima, Buzdolabı, Nakliye"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">İşlem / Yetenek</label>
              <input
                value={islem}
                onChange={(e) => setIslem(e.target.value)}
                placeholder="Montaj, Arıza, Taşıma"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-sm font-bold text-gray-900">Açıklama</label>
              <input
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                placeholder="Opsiyonel açıklama"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="button"
                onClick={yetenekEkle}
                disabled={kaydediliyor}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {kaydediliyor ? "Ekleniyor..." : "Havuza Ekle"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">Excel ile Toplu Yetenek Yükle</h2>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setExcelDosya(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900"
          />

          <button
            type="button"
            onClick={excelYukle}
            disabled={excelYukleniyor}
            className="w-full rounded-lg bg-green-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {excelYukleniyor ? "Yükleniyor..." : "Excel Yükle"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">2. Personel ve Filtreler</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="mb-1 block text-sm font-bold text-gray-900">Personel</label>
              <select
                value={seciliPersonel}
                onChange={(e) => setSeciliPersonel(e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
              >
                <option value="">Personel seçiniz</option>
                {personeller.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ad} {p.soyad} {p.durum ? `- ${p.durum}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Ürün Grubu</label>
              <select
                value={urunFiltre}
                onChange={(e) => setUrunFiltre(e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
              >
                <option value="">Tümü</option>
                {urunGruplari.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Durum</label>
              <select
                value={durumFiltre}
                onChange={(e) => setDurumFiltre(e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
              >
                <option value="tumu">Tümü</option>
                <option value="yapabilir">Yapabilir</option>
                <option value="yapamaz">Yapamaz</option>
                <option value="tanimsiz">Tanımsız</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Arama</label>
              <input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Ara"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          {seciliPersonel && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-green-50 border border-green-300 p-3">
                <p className="text-xs font-bold text-green-800">Yapabilir</p>
                <p className="text-2xl font-black text-green-900">{sayilar.yapabilir}</p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-300 p-3">
                <p className="text-xs font-bold text-red-800">Yapamaz</p>
                <p className="text-2xl font-black text-red-900">{sayilar.yapamaz}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-300 p-3">
                <p className="text-xs font-bold text-gray-800">Tanımsız</p>
                <p className="text-2xl font-black text-gray-900">{sayilar.tanimsiz}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">
            {seciliPersonel
              ? `${seciliPersonelObj?.ad || ""} ${seciliPersonelObj?.soyad || ""} Yetenekleri`
              : "Yetenek Havuzu Listesi"}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200 text-gray-900">
                  <th className="border border-gray-400 p-2 text-left font-black">Ürün Grubu</th>
                  <th className="border border-gray-400 p-2 text-left font-black">İşlem / Yetenek</th>
                  <th className="border border-gray-400 p-2 text-left font-black">Açıklama</th>
                  <th className="border border-gray-400 p-2 text-left font-black">Mevcut Durum</th>
                  <th className="border border-gray-400 p-2 text-left font-black">İşlem</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="border border-gray-400 p-4 text-center font-bold">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : filtreliYetenekler.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border border-gray-400 p-4 text-center font-bold text-gray-700">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtreliYetenekler.map((y) => {
                    const durum = getDurum(y.id)

                    return (
                      <tr key={y.id} className="odd:bg-white even:bg-gray-50">
                        <td className="border border-gray-400 p-2 font-bold text-gray-900">{y.urun_grubu || "-"}</td>
                        <td className="border border-gray-400 p-2 font-bold text-gray-900">{y.islem || "-"}</td>
                        <td className="border border-gray-400 p-2 text-gray-900">{y.aciklama || "-"}</td>

                        <td className="border border-gray-400 p-2 font-black">
                          {durum === true && <span className="rounded bg-green-100 px-2 py-1 text-green-900">Yapabilir</span>}
                          {durum === false && <span className="rounded bg-red-100 px-2 py-1 text-red-900">Yapamaz</span>}
                          {durum === null && <span className="rounded bg-gray-100 px-2 py-1 text-gray-900">Tanımsız</span>}
                        </td>

                        <td className="border border-gray-400 p-2">
                          {seciliPersonel ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => yetenekDurumuKaydet(y.id, true)}
                                className={`rounded px-3 py-1 text-xs font-black ${
                                  durum === true ? "bg-green-700 text-white" : "bg-gray-200 text-gray-900"
                                }`}
                              >
                                Yapabilir
                              </button>

                              <button
                                type="button"
                                onClick={() => yetenekDurumuKaydet(y.id, false)}
                                className={`rounded px-3 py-1 text-xs font-black ${
                                  durum === false ? "bg-red-700 text-white" : "bg-gray-200 text-gray-900"
                                }`}
                              >
                                Yapamaz
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => yetenekPasifeAl(y.id)}
                              className="rounded bg-red-700 px-3 py-1 text-xs font-black text-white"
                            >
                              Pasife Al
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
