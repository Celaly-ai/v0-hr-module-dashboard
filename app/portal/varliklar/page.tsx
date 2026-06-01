"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata" | "bilgi"
  metin: string
}

const DURUMLAR = ["aktif", "arızalı", "bakımda", "hurda", "kayıp"]

const BOS_FORM = {
  ad: "",
  kategori: "",
  alt_kategori: "",
  marka: "",
  model: "",
  seri_no: "",
  demirbas_no: "",
  satin_alma_tarihi: "",
  satin_alma_bedeli: "",
  garanti_bitis_tarihi: "",
  durum: "aktif",
  lokasyon: "",
  mevcut_personel_id: "",
  aciklama: "",
}

const BOS_FILTRE = {
  zimmet: "tumu",
  ad: "",
  demirbas_no: "",
  kategori: "",
  alt_kategori: "",
  durum: "",
}

export default function VarliklarPage() {
  const router = useRouter()

  const [varliklar, setVarliklar] = useState<any[]>([])
  const [personeller, setPersoneller] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [altKategoriler, setAltKategoriler] = useState<any[]>([])
  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])
  const [sirketAyari, setSirketAyari] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null)
  const [form, setForm] = useState(BOS_FORM)
  const [filtre, setFiltre] = useState(BOS_FILTRE)

  const toplamTutar = useMemo(() => {
    return varliklar.reduce((toplam, v) => toplam + Number(v?.satin_alma_bedeli || 0), 0)
  }, [varliklar])

  const seciliKategori = kategoriler.find((k) => String(k?.ad || "") === form.kategori)

  const filtreliAltKategoriler = altKategoriler.filter((a) => {
    if (!seciliKategori) return false
    return String(a?.kategori_id || "") === String(seciliKategori?.id || "")
  })

  const filtreAltKategoriler = altKategoriler.filter((a) => {
    if (!filtre.kategori) return true
    const kategori = kategoriler.find((k) => String(k?.ad || "") === filtre.kategori)
    if (!kategori) return true
    return String(a?.kategori_id || "") === String(kategori?.id || "")
  })

  const filtreliVarliklar = useMemo(() => {
    return varliklar.filter((v) => {
      const ad = String(v?.ad || "").toLowerCase()
      const demirbasNo = String(v?.demirbas_no || "").toLowerCase()
      const kategori = String(v?.kategori || "")
      const altKategori = String(v?.alt_kategori || "")
      const durum = String(v?.durum || "")
      const zimmetliMi = Boolean(v?.mevcut_personel_id)

      if (filtre.zimmet === "zimmetli" && !zimmetliMi) return false
      if (filtre.zimmet === "zimmetsiz" && zimmetliMi) return false
      if (filtre.ad && !ad.includes(filtre.ad.toLowerCase())) return false
      if (filtre.demirbas_no && !demirbasNo.includes(filtre.demirbas_no.toLowerCase())) return false
      if (filtre.kategori && kategori !== filtre.kategori) return false
      if (filtre.alt_kategori && altKategori !== filtre.alt_kategori) return false
      if (filtre.durum && durum !== filtre.durum) return false

      return true
    })
  }, [varliklar, filtre])

  function paraYaz(value: number) {
    return Number(value || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    })
  }

  function siradakiDemirbasNo(ayar: any) {
    const prefix = ayar?.demirbas_prefix || "Fey"
    const son = Number(ayar?.demirbas_son_numara || 0) + 1
    return `${prefix}${String(son).padStart(5, "0")}`
  }

  const verileriYukle = useCallback(async () => {
    setLoading(true)

    const supabase = createClient()

    const { data: ayarData } = await supabase
      .from("sirket_ayarlari")
      .select("id, demirbas_prefix, demirbas_son_numara, created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    const { data: varlikData, error: varlikError } = await supabase
      .from("varliklar")
      .select(`
        id,
        ad,
        kategori,
        alt_kategori,
        marka,
        model,
        seri_no,
        demirbas_no,
        satin_alma_tarihi,
        satin_alma_bedeli,
        garanti_bitis_tarihi,
        durum,
        lokasyon,
        mevcut_personel_id,
        aciklama,
        created_at,
        personeller:mevcut_personel_id (
          id,
          ad,
          soyad
        )
      `)
      .order("created_at", { ascending: false })

    if (varlikError) {
      setMesaj({
        tip: "hata",
        metin: "Varlık listesi alınamadı: " + varlikError.message,
      })
      setLoading(false)
      return
    }

    const { data: personelData } = await supabase
      .from("personeller")
      .select("id, ad, soyad")
      .in("durum", ["aktif", "active", "izinli", "izınli"])
      .order("ad", { ascending: true })

    const { data: kategoriData } = await supabase
      .from("varlik_kategorileri")
      .select("id, ad")
      .eq("aktif", true)
      .order("ad", { ascending: true })

    const { data: altKategoriData } = await supabase
      .from("varlik_alt_kategorileri")
      .select("id, ad, kategori_id")
      .eq("aktif", true)
      .order("ad", { ascending: true })

    const { data: lokasyonData } = await supabase
      .from("varlik_lokasyonlari")
      .select("id, ad")
      .eq("aktif", true)
      .order("ad", { ascending: true })

    setSirketAyari(ayarData)
    setVarliklar(varlikData || [])
    setPersoneller(personelData || [])
    setKategoriler(kategoriData || [])
    setAltKategoriler(altKategoriData || [])
    setLokasyonlar(lokasyonData || [])

    setForm((onceki) => ({
      ...onceki,
      demirbas_no: onceki.demirbas_no || siradakiDemirbasNo(ayarData),
    }))

    setLoading(false)
  }, [])

  useEffect(() => {
    void verileriYukle()
  }, [verileriYukle])

  function formGuncelle(field: string, value: string) {
    setForm((onceki) => {
      const yeni = { ...onceki, [field]: value }

      if (field === "kategori") {
        yeni.alt_kategori = ""
      }

      return yeni
    })
  }

  function filtreGuncelle(field: string, value: string) {
    setFiltre((onceki) => {
      const yeni = { ...onceki, [field]: value }

      if (field === "kategori") {
        yeni.alt_kategori = ""
      }

      return yeni
    })
  }

  function formTemizle(sonAyar?: any) {
    setDuzenlenenId(null)
    setForm({
      ...BOS_FORM,
      demirbas_no: siradakiDemirbasNo(sonAyar || sirketAyari),
    })
  }

  async function kaydet() {
    setMesaj(null)

    if (!form.ad.trim()) return setMesaj({ tip: "hata", metin: "Varlık adı zorunludur." })
    if (!form.kategori) return setMesaj({ tip: "hata", metin: "Kategori seçimi zorunludur." })
    if (!form.alt_kategori) return setMesaj({ tip: "hata", metin: "Alt kategori seçimi zorunludur." })
    if (!form.marka.trim()) return setMesaj({ tip: "hata", metin: "Marka zorunludur." })
    if (!form.model.trim()) return setMesaj({ tip: "hata", metin: "Model zorunludur." })
    if (!form.seri_no.trim()) return setMesaj({ tip: "hata", metin: "Seri no zorunludur." })
    if (!form.satin_alma_tarihi) return setMesaj({ tip: "hata", metin: "Satın alma tarihi zorunludur." })
    if (!form.satin_alma_bedeli) return setMesaj({ tip: "hata", metin: "Satın alma bedeli zorunludur." })
    if (!form.garanti_bitis_tarihi) return setMesaj({ tip: "hata", metin: "Garanti bitiş tarihi zorunludur." })
    if (!form.lokasyon) return setMesaj({ tip: "hata", metin: "Lokasyon seçimi zorunludur." })

    setKaydediliyor(true)

    const supabase = createClient()

    if (duzenlenenId) {
      const { error } = await supabase
        .from("varliklar")
        .update({
          ad: form.ad.trim(),
          kategori: form.kategori,
          alt_kategori: form.alt_kategori,
          marka: form.marka.trim(),
          model: form.model.trim(),
          seri_no: form.seri_no.trim(),
          satin_alma_tarihi: form.satin_alma_tarihi,
          satin_alma_bedeli: Number(form.satin_alma_bedeli),
          garanti_bitis_tarihi: form.garanti_bitis_tarihi,
          durum: form.durum,
          lokasyon: form.lokasyon,
          mevcut_personel_id: form.mevcut_personel_id || null,
          aciklama: form.aciklama.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", duzenlenenId)

      if (error) {
        setMesaj({ tip: "hata", metin: "Varlık güncellenemedi: " + error.message })
        setKaydediliyor(false)
        return
      }

      await supabase.from("varlik_hareketleri").insert({
        varlik_id: duzenlenenId,
        personel_id: form.mevcut_personel_id || null,
        islem: "guncellendi",
        aciklama: "Varlık bilgileri güncellendi.",
      })

      setMesaj({ tip: "basari", metin: "Varlık başarıyla güncellendi." })
      formTemizle()
      await verileriYukle()
      setKaydediliyor(false)
      return
    }

    const { data: ayar, error: ayarError } = await supabase
      .from("sirket_ayarlari")
      .select("id, demirbas_prefix, demirbas_son_numara")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (ayarError || !ayar) {
      setMesaj({ tip: "hata", metin: "Şirket demirbaş ayarı bulunamadı." })
      setKaydediliyor(false)
      return
    }

    const yeniNumara = Number(ayar.demirbas_son_numara || 0) + 1
    const demirbasNo = `${ayar.demirbas_prefix || "Fey"}${String(yeniNumara).padStart(5, "0")}`

    const { data, error } = await supabase
      .from("varliklar")
      .insert({
        ad: form.ad.trim(),
        kategori: form.kategori,
        alt_kategori: form.alt_kategori,
        marka: form.marka.trim(),
        model: form.model.trim(),
        seri_no: form.seri_no.trim(),
        demirbas_no: demirbasNo,
        satin_alma_tarihi: form.satin_alma_tarihi,
        satin_alma_bedeli: Number(form.satin_alma_bedeli),
        garanti_bitis_tarihi: form.garanti_bitis_tarihi,
        durum: form.durum,
        lokasyon: form.lokasyon,
        mevcut_personel_id: form.mevcut_personel_id || null,
        aciklama: form.aciklama.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      setMesaj({ tip: "hata", metin: "Varlık kaydedilemedi: " + error.message })
      setKaydediliyor(false)
      return
    }

    await supabase
      .from("sirket_ayarlari")
      .update({
        demirbas_son_numara: yeniNumara,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ayar.id)

    if (data?.id) {
      await supabase.from("varlik_hareketleri").insert({
        varlik_id: data.id,
        personel_id: form.mevcut_personel_id || null,
        islem: "olusturuldu",
        aciklama: `Varlık kaydı oluşturuldu. Demirbaş no: ${demirbasNo}`,
      })
    }

    const yeniAyar = { ...ayar, demirbas_son_numara: yeniNumara }

    setSirketAyari(yeniAyar)
    formTemizle(yeniAyar)
    setMesaj({
      tip: "basari",
      metin: `Varlık başarıyla kaydedildi. Demirbaş No: ${demirbasNo}`,
    })

    await verileriYukle()
    setKaydediliyor(false)
  }

  function duzenle(v: any) {
    setDuzenlenenId(v.id)
    setForm({
      ad: v?.ad || "",
      kategori: v?.kategori || "",
      alt_kategori: v?.alt_kategori || "",
      marka: v?.marka || "",
      model: v?.model || "",
      seri_no: v?.seri_no || "",
      demirbas_no: v?.demirbas_no || "",
      satin_alma_tarihi: v?.satin_alma_tarihi || "",
      satin_alma_bedeli: v?.satin_alma_bedeli ? String(v.satin_alma_bedeli) : "",
      garanti_bitis_tarihi: v?.garanti_bitis_tarihi || "",
      durum: v?.durum || "aktif",
      lokasyon: v?.lokasyon || "",
      mevcut_personel_id: v?.mevcut_personel_id || "",
      aciklama: v?.aciklama || "",
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function personelAdi(varlik: any) {
    const p = varlik?.personeller
    if (!p) return "-"
    return `${p?.ad ?? ""} ${p?.soyad ?? ""}`.trim() || "-"
  }

  function mesajClass(tip: Mesaj["tip"]) {
    if (tip === "basari") return "bg-green-50 border-green-300 text-green-900"
    if (tip === "hata") return "bg-red-50 border-red-300 text-red-900"
    return "bg-blue-50 border-blue-300 text-blue-900"
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold text-gray-800"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Varlık Takibi</h1>
          <p className="text-xs font-medium text-gray-600">
            Şirkete ait cihaz, ekipman, araç ve demirbaş kayıtları
          </p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {mesaj && (
          <div className={`rounded-xl border p-4 font-semibold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-700">Toplam Varlık Tutarı</p>
          <p className="text-2xl font-black text-gray-900">{paraYaz(toplamTutar)}</p>
        </div>

        <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {duzenlenenId ? "Varlık Düzenle" : "Yeni Varlık Kaydı"}
              </h2>
              <p className="text-xs font-medium text-gray-600">
                Kategori, alt kategori ve lokasyon tanımları ayrı panelden yönetilir.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/portal/varliklar/tanimlar")}
                className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-bold text-white"
              >
                Tanımları Yönet
              </button>

              {duzenlenenId && (
                <button
                  type="button"
                  onClick={() => formTemizle()}
                  className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-bold text-white"
                >
                  Yeni Kayıt
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <label className="text-sm font-bold text-gray-800 block mb-1">Varlık Adı *</label>
              <input value={form.ad} onChange={(e) => formGuncelle("ad", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Demirbaş No</label>
              <input value={form.demirbas_no} disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 bg-gray-100" />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Durum *</label>
              <select value={form.durum} onChange={(e) => formGuncelle("durum", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 bg-white">
                {DURUMLAR.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Bedel *</label>
              <input type="number" value={form.satin_alma_bedeli} onChange={(e) => formGuncelle("satin_alma_bedeli", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Kategori *</label>
              <select value={form.kategori} onChange={(e) => formGuncelle("kategori", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 bg-white">
                <option value="">Seçiniz</option>
                {kategoriler.map((k) => <option key={k.id} value={k.ad}>{k.ad}</option>)}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Alt Kategori *</label>
              <select value={form.alt_kategori} onChange={(e) => formGuncelle("alt_kategori", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 bg-white">
                <option value="">Seçiniz</option>
                {filtreliAltKategoriler.map((a) => <option key={a.id} value={a.ad}>{a.ad}</option>)}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Marka *</label>
              <input value={form.marka} onChange={(e) => formGuncelle("marka", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Model *</label>
              <input value={form.model} onChange={(e) => formGuncelle("model", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Seri No *</label>
              <input value={form.seri_no} onChange={(e) => formGuncelle("seri_no", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Lokasyon *</label>
              <select value={form.lokasyon} onChange={(e) => formGuncelle("lokasyon", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 bg-white">
                <option value="">Seçiniz</option>
                {lokasyonlar.map((l) => <option key={l.id} value={l.ad}>{l.ad}</option>)}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Satın Alma Tarihi *</label>
              <input type="date" value={form.satin_alma_tarihi} onChange={(e) => formGuncelle("satin_alma_tarihi", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Garanti Bitiş *</label>
              <input type="date" value={form.garanti_bitis_tarihi} onChange={(e) => formGuncelle("garanti_bitis_tarihi", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold text-gray-800 block mb-1">Zimmetli Personel</label>
              <select value={form.mevcut_personel_id} onChange={(e) => formGuncelle("mevcut_personel_id", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 bg-white">
                <option value="">Zimmetli değil</option>
                {personeller.map((p) => <option key={p.id} value={p.id}>{p.ad} {p.soyad}</option>)}
              </select>
            </div>

            <div className="md:col-span-12">
              <label className="text-sm font-bold text-gray-800 block mb-1">Açıklama</label>
              <textarea value={form.aciklama} onChange={(e) => formGuncelle("aciklama", e.target.value)} rows={2} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium text-gray-900" />
            </div>
          </div>

          <button type="button" onClick={kaydet} disabled={kaydediliyor} className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-3 font-bold disabled:opacity-50">
            {kaydediliyor ? "Kaydediliyor..." : duzenlenenId ? "Varlığı Güncelle" : "Varlığı Kaydet"}
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Filtreler</h2>
            <p className="text-xs font-medium text-gray-600">Kayıtlı varlıkları hızlıca süzebilirsiniz.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Zimmet</label>
              <select value={filtre.zimmet} onChange={(e) => filtreGuncelle("zimmet", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold bg-white">
                <option value="tumu">Tümü</option>
                <option value="zimmetli">Zimmetli</option>
                <option value="zimmetsiz">Zimmetli değil</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Varlık Adı</label>
              <input value={filtre.ad} onChange={(e) => filtreGuncelle("ad", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium" />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Demirbaş No</label>
              <input value={filtre.demirbas_no} onChange={(e) => filtreGuncelle("demirbas_no", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium" />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Kategori</label>
              <select value={filtre.kategori} onChange={(e) => filtreGuncelle("kategori", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold bg-white">
                <option value="">Tümü</option>
                {kategoriler.map((k) => <option key={k.id} value={k.ad}>{k.ad}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Alt Kategori</label>
              <select value={filtre.alt_kategori} onChange={(e) => filtreGuncelle("alt_kategori", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold bg-white">
                <option value="">Tümü</option>
                {filtreAltKategoriler.map((a) => <option key={a.id} value={a.ad}>{a.ad}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-800 block mb-1">Durum</label>
              <select value={filtre.durum} onChange={(e) => filtreGuncelle("durum", e.target.value)} className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold bg-white">
                <option value="">Tümü</option>
                {DURUMLAR.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFiltre(BOS_FILTRE)}
            className="rounded-lg bg-gray-700 px-4 py-2 text-xs font-bold text-white"
          >
            Filtreleri Temizle
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-3 overflow-x-auto">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Kayıtlı Varlıklar</h2>
            <p className="text-xs font-medium text-gray-600">
              Gösterilen kayıt: {filtreliVarliklar.length} / Toplam kayıt: {varliklar.length}
            </p>
          </div>

          <table className="w-full text-sm border-collapse min-w-[1160px]">
            <thead>
              <tr className="bg-gray-200 text-gray-900">
                <th className="border border-gray-400 p-2 text-left font-bold">Demirbaş</th>
                <th className="border border-gray-400 p-2 text-left font-bold">Varlık</th>
                <th className="border border-gray-400 p-2 text-left font-bold">Kategori</th>
                <th className="border border-gray-400 p-2 text-left font-bold">Marka / Model</th>
                <th className="border border-gray-400 p-2 text-left font-bold">Bedel</th>
                <th className="border border-gray-400 p-2 text-left font-bold">Durum</th>
                <th className="border border-gray-400 p-2 text-left font-bold">Lokasyon</th>
                <th className="border border-gray-400 p-2 text-left font-bold">Zimmetli</th>
                <th className="border border-gray-400 p-2 text-left font-bold">İşlem</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="border border-gray-400 p-4 text-center font-semibold">Yükleniyor...</td>
                </tr>
              ) : filtreliVarliklar.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border border-gray-400 p-4 text-center font-semibold text-gray-600">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filtreliVarliklar.map((v) => (
                  <tr key={v.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-400 p-2 font-bold">{v?.demirbas_no || "-"}</td>
                    <td className="border border-gray-400 p-2 font-bold">{v?.ad || "-"}</td>
                    <td className="border border-gray-400 p-2 font-medium">{v?.kategori || "-"} {v?.alt_kategori ? `/ ${v.alt_kategori}` : ""}</td>
                    <td className="border border-gray-400 p-2 font-medium">{(v?.marka || "-") + " / " + (v?.model || "-")}</td>
                    <td className="border border-gray-400 p-2 font-bold">{v?.satin_alma_bedeli ? paraYaz(Number(v.satin_alma_bedeli)) : "-"}</td>
                    <td className="border border-gray-400 p-2 font-bold">{v?.durum || "-"}</td>
                    <td className="border border-gray-400 p-2 font-medium">{v?.lokasyon || "-"}</td>
                    <td className="border border-gray-400 p-2 font-medium">{personelAdi(v)}</td>
                    <td className="border border-gray-400 p-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => duzenle(v)}
                          className="rounded bg-blue-700 px-3 py-1 text-xs font-bold text-white"
                        >
                          Düzenle
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push(`/portal/varliklar/fotograf/${v.id}`)}
                          className="rounded bg-gray-700 px-3 py-1 text-xs font-bold text-white"
                        >
                          Fotoğraf
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
