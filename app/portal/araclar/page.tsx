"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

const BOS_FORM = {
  plaka: "",
  marka: "",
  model: "",
  yil: "",
  guncel_km: "",
  durum: "Aktif",
  aciklama: "",
}

export default function AraclarPage() {
  const router = useRouter()
  const dosyaRef = useRef<HTMLInputElement>(null)

  const [araclar, setAraclar] = useState<any[]>([])
  const [fotograflar, setFotograflar] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [form, setForm] = useState(BOS_FORM)

  useEffect(() => {
    araclariYukle()
  }, [])

  async function araclariYukle() {
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("araclar")
      .select("id, plaka, marka, model, yil, guncel_km, durum, foto_urls, varlik_id")
      .order("plaka", { ascending: true })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Araçlar alınamadı: " + error.message,
      })
      setLoading(false)
      return
    }

    setAraclar(data || [])
    setLoading(false)
  }

  function formGuncelle(field: string, value: string) {
    setForm((onceki) => ({ ...onceki, [field]: value }))
  }

  function temizle() {
    setForm(BOS_FORM)
    setFotograflar([])
    setMesaj(null)
  }

  async function aracEkle() {
    setMesaj(null)

    if (!form.plaka.trim()) {
      setMesaj({ tip: "hata", metin: "Plaka zorunludur." })
      return
    }

    if (!form.marka.trim()) {
      setMesaj({ tip: "hata", metin: "Marka zorunludur." })
      return
    }

    if (!form.model.trim()) {
      setMesaj({ tip: "hata", metin: "Model zorunludur." })
      return
    }

    if (fotograflar.length < 5) {
      setMesaj({
        tip: "hata",
        metin: `En az 5 fotoğraf yüklemelisiniz. Şu an: ${fotograflar.length}`,
      })
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      setMesaj({
        tip: "hata",
        metin: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
      })
      setKaydediliyor(false)
      return
    }

    const { data: sirketKaydi } = await supabase
      .from("personeller")
      .select("sirket_id")
      .or(`auth_id.eq.${session.user.id},kullanici_id.eq.${session.user.id}`)
      .limit(1)
      .maybeSingle()

    const sirketId = sirketKaydi?.sirket_id || null

    if (!sirketId) {
      setMesaj({
        tip: "hata",
        metin: "Şirket ID bulunamadı. Giriş yapan kullanıcı personel kaydında sirket_id dolu olmalı.",
      })
      setKaydediliyor(false)
      return
    }

    const plaka = form.plaka.trim().toUpperCase()
    const temizPlaka = plaka.replace(/\s+/g, "")
    const fotoUrls: string[] = []

    for (const foto of fotograflar) {
      const dosyaAdi = `araclar/${temizPlaka}/${Date.now()}_${foto.name}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("calisan-medya")
        .upload(dosyaAdi, foto)

      if (uploadError) {
        setMesaj({
          tip: "hata",
          metin: "Araç fotoğrafı yüklenemedi: " + uploadError.message,
        })
        setKaydediliyor(false)
        return
      }

      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("calisan-medya")
          .getPublicUrl(dosyaAdi)

        fotoUrls.push(urlData.publicUrl)
      }
    }

    const aracAdi = `${plaka} ${form.marka.trim()} ${form.model.trim()}`

    const { data: varlikData, error: varlikError } = await supabase
      .from("varliklar")
      .insert({
        sirket_id: sirketId,
        ad: aracAdi,
        kategori: "Araç",
        alt_kategori: "Şirket Aracı",
        marka: form.marka.trim(),
        model: form.model.trim(),
        seri_no: plaka,
        demirbas_no: `ARAC-${temizPlaka}`,
        plaka,
        durum: "aktif",
        lokasyon: "Merkez",
        aciklama: form.aciklama.trim() || null,
        zimmet_durumu: "zimmette_degil",
        foto_urls: fotoUrls,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle()

    if (varlikError || !varlikData?.id) {
      setMesaj({
        tip: "hata",
        metin: "Araç varlık kaydı oluşturulamadı: " + (varlikError?.message || "Bilinmeyen hata"),
      })
      setKaydediliyor(false)
      return
    }

    const { data: aracData, error: aracError } = await supabase
      .from("araclar")
      .insert({
        sirket_id: sirketId,
        plaka,
        marka: form.marka.trim(),
        model: form.model.trim(),
        yil: form.yil ? Number(form.yil) : null,
        guncel_km: form.guncel_km ? Number(form.guncel_km) : null,
        durum: form.durum,
        varlik_id: varlikData.id,
        foto_urls: fotoUrls,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle()

    if (aracError || !aracData?.id) {
      await supabase.from("varliklar").delete().eq("id", varlikData.id)

      setMesaj({
        tip: "hata",
        metin: "Araç kaydı oluşturulamadı: " + (aracError?.message || "Bilinmeyen hata"),
      })
      setKaydediliyor(false)
      return
    }

    await supabase
      .from("varliklar")
      .update({
        arac_id: aracData.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", varlikData.id)

    setMesaj({
      tip: "basari",
      metin: "Araç kaydı oluşturuldu, fotoğraflar yüklendi ve varlıklara aktarıldı.",
    })

    setForm(BOS_FORM)
    setFotograflar([])
    await araclariYukle()
    setKaydediliyor(false)
  }

  function mesajClass(tip: Mesaj["tip"]) {
    if (tip === "basari") return "bg-green-50 border-green-300 text-green-900"
    return "bg-red-50 border-red-300 text-red-900"
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
          <h1 className="text-xl font-black text-gray-900">Araç Yönetimi</h1>
          <p className="text-xs font-semibold text-gray-700">
            Yeni araç kaydı, zorunlu fotoğraf ve varlıklara aktarma
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
          <div>
            <h2 className="text-lg font-black text-gray-900">Yeni Araç Girişi</h2>
            <p className="text-xs font-semibold text-gray-700">
              Araç fotoğrafı zorunludur. Kayıt aynı anda Varlıklar/Demirbaş tablosuna aktarılır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Plaka *</label>
              <input
                value={form.plaka}
                onChange={(e) => formGuncelle("plaka", e.target.value)}
                placeholder="21 ABC 123"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Marka *</label>
              <input
                value={form.marka}
                onChange={(e) => formGuncelle("marka", e.target.value)}
                placeholder="Fiat"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Model *</label>
              <input
                value={form.model}
                onChange={(e) => formGuncelle("model", e.target.value)}
                placeholder="Doblo"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Yıl</label>
              <input
                type="number"
                value={form.yil}
                onChange={(e) => formGuncelle("yil", e.target.value)}
                placeholder="2024"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Güncel KM</label>
              <input
                type="number"
                value={form.guncel_km}
                onChange={(e) => formGuncelle("guncel_km", e.target.value)}
                placeholder="125000"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Durum</label>
              <select
                value={form.durum}
                onChange={(e) => formGuncelle("durum", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-bold text-gray-900"
              >
                <option value="Aktif">Aktif</option>
                <option value="Bakımda">Bakımda</option>
                <option value="Arızalı">Arızalı</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>

            <div className="md:col-span-12">
              <label className="mb-1 block text-sm font-bold text-gray-900">Araç Fotoğrafları *</label>

              <input
                ref={dosyaRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const yeniSecilenler = Array.from(e.target.files || [])
                  setFotograflar((onceki) => [...onceki, ...yeniSecilenler])
                  e.currentTarget.value = ""
                }}
              />

              <button
                type="button"
                onClick={() => dosyaRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-400 bg-gray-50 px-4 py-4 text-sm font-black text-gray-800"
              >
                📷 Fotoğraf Seç {fotograflar.length > 0 && `(${fotograflar.length} fotoğraf)`}
              </button>

              {fotograflar.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {fotograflar.map((foto, index) => (
                    <div key={index} className="rounded-xl border border-gray-300 bg-white p-2">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {index + 1}. {foto.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-12">
              <label className="mb-1 block text-sm font-bold text-gray-900">Açıklama</label>
              <input
                value={form.aciklama}
                onChange={(e) => formGuncelle("aciklama", e.target.value)}
                placeholder="Opsiyonel not"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={temizle}
              className="rounded-xl border border-gray-400 bg-white px-4 py-3 text-sm font-black text-gray-900"
            >
              Temizle
            </button>

            <button
              type="button"
              onClick={aracEkle}
              disabled={kaydediliyor}
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {kaydediliyor ? "Kaydediliyor..." : "Araç Kaydet"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-3 overflow-x-auto">
          <div>
            <h2 className="text-lg font-black text-gray-900">Araç Listesi</h2>
            <p className="text-xs font-semibold text-gray-700">
              Toplam araç: {araclar.length}
            </p>
          </div>

          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-900">
                <th className="border border-gray-400 p-2 text-left font-black">Plaka</th>
                <th className="border border-gray-400 p-2 text-left font-black">Marka</th>
                <th className="border border-gray-400 p-2 text-left font-black">Model</th>
                <th className="border border-gray-400 p-2 text-left font-black">Yıl</th>
                <th className="border border-gray-400 p-2 text-left font-black">KM</th>
                <th className="border border-gray-400 p-2 text-left font-black">Durum</th>
                <th className="border border-gray-400 p-2 text-left font-black">Fotoğraf</th>
                <th className="border border-gray-400 p-2 text-left font-black">Varlık</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="border border-gray-400 p-4 text-center font-bold">
                    Yükleniyor...
                  </td>
                </tr>
              ) : araclar.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-gray-400 p-4 text-center font-bold text-gray-700">
                    Araç kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                araclar.map((a) => (
                  <tr key={a.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-400 p-2 font-black">{a.plaka || "-"}</td>
                    <td className="border border-gray-400 p-2">{a.marka || "-"}</td>
                    <td className="border border-gray-400 p-2">{a.model || "-"}</td>
                    <td className="border border-gray-400 p-2">{a.yil || "-"}</td>
                    <td className="border border-gray-400 p-2">
                      {a.guncel_km ? Number(a.guncel_km).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td className="border border-gray-400 p-2">{a.durum || "-"}</td>
                    <td className="border border-gray-400 p-2 font-bold">
                      {Array.isArray(a.foto_urls) && a.foto_urls.length > 0
                        ? `${a.foto_urls.length} foto`
                        : "Yok"}
                    </td>
                    <td className="border border-gray-400 p-2 font-bold">
                      {a.varlik_id ? "Aktarıldı" : "Yok"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
          Araç kaydı için fotoğraf zorunludur. Zimmet işlemleri Varlıklar modülünden yapılmalıdır.
        </div>
      </div>
    </div>
  )
}
