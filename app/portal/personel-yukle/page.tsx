"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

const BOS_FORM = {
  personel_kodu: "",
  ad: "",
  soyad: "",
  telefon: "",
  rol: "calisan",
  durum: "active",
  lokasyon: "Merkez",
  bolge: "Merkez",
  ise_giris_tarihi: "",
  notlar: "",
}

function normalizePhone(value: string) {
  let digits = String(value || "").replace(/\D/g, "")
  if (digits.startsWith("90")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(-10)
}

export default function PersonelYuklePage() {
  const router = useRouter()

  const [personeller, setPersoneller] = useState<any[]>([])
  const [dosya, setDosya] = useState<File | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sifreIslemId, setSifreIslemId] = useState<string | null>(null)
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null)
  const [sonuc, setSonuc] = useState<any>(null)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [geciciSifre, setGeciciSifre] = useState<string | null>(null)

  const [form, setForm] = useState(BOS_FORM)

  const [filtre, setFiltre] = useState({
    arama: "",
    rol: "",
    durum: "",
    lokasyon: "",
  })

  const personelleriYukle = useCallback(async () => {
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("personeller")
      .select("id, sirket_id, personel_kodu, ad, soyad, tel, telefon_normalized, auth_id, rol, durum, lokasyon, bolge, ise_giris_tarihi, notlar")
      .order("ad", { ascending: true })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Personeller alınamadı: " + error.message,
      })
      setLoading(false)
      return
    }

    setPersoneller(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void personelleriYukle()
  }, [personelleriYukle])

  const filtreliPersoneller = useMemo(() => {
    return personeller.filter((p) => {
      const metin = `${p.personel_kodu || ""} ${p.ad || ""} ${p.soyad || ""} ${p.tel || ""} ${p.telefon_normalized || ""}`.toLocaleLowerCase("tr-TR")

      if (filtre.arama && !metin.includes(filtre.arama.toLocaleLowerCase("tr-TR"))) return false
      if (filtre.rol && p.rol !== filtre.rol) return false
      if (filtre.durum && p.durum !== filtre.durum) return false
      if (filtre.lokasyon && p.lokasyon !== filtre.lokasyon) return false

      return true
    })
  }, [personeller, filtre])

  const roller = useMemo(() => {
    return Array.from(new Set(personeller.map((p) => p.rol).filter(Boolean))).sort()
  }, [personeller])

  const durumlar = useMemo(() => {
    return Array.from(new Set(personeller.map((p) => p.durum).filter(Boolean))).sort()
  }, [personeller])

  const lokasyonlar = useMemo(() => {
    return Array.from(new Set(personeller.map((p) => p.lokasyon).filter(Boolean))).sort()
  }, [personeller])

  async function excelYukle() {
    setMesaj(null)
    setSonuc(null)
    setGeciciSifre(null)

    if (!dosya) {
      setMesaj({ tip: "hata", metin: "Lütfen Excel dosyası seçiniz." })
      return
    }

    setYukleniyor(true)

    try {
      const formData = new FormData()
      formData.append("file", dosya)

      const response = await fetch("/api/admin/personel-excel-yukle", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setMesaj({
          tip: "hata",
          metin: data.error || "Personel Excel yükleme başarısız.",
        })
        setYukleniyor(false)
        return
      }

      setSonuc(data)
      setDosya(null)
      setMesaj({
        tip: "basari",
        metin: `Excel işlendi. Eklenen: ${data.eklenen}, Güncellenen: ${data.guncellenen}, Hatalı: ${data.hatali}`,
      })

      await personelleriYukle()
    } catch (error: any) {
      setMesaj({
        tip: "hata",
        metin: error?.message || "Beklenmeyen hata oluştu.",
      })
    }

    setYukleniyor(false)
  }

  function formGuncelle(field: string, value: string) {
    setForm((onceki) => ({ ...onceki, [field]: value }))
  }

  function temizle() {
    setDuzenlenenId(null)
    setForm(BOS_FORM)
    setMesaj(null)
    setGeciciSifre(null)
  }

  function duzenle(p: any) {
    setDuzenlenenId(p.id)
    setForm({
      personel_kodu: p.personel_kodu || "",
      ad: p.ad || "",
      soyad: p.soyad || "",
      telefon: p.tel || p.telefon || p.telefon_normalized || "",
      rol: p.rol || "calisan",
      durum: p.durum || "active",
      lokasyon: p.lokasyon || "Merkez",
      bolge: p.bolge || "Merkez",
      ise_giris_tarihi: p.ise_giris_tarihi || "",
      notlar: p.notlar || "",
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function sifreSifirla(p: any) {
    setMesaj(null)
    setGeciciSifre(null)

    if (!p.auth_id) {
      setMesaj({
        tip: "hata",
        metin: "Bu personelin portal hesabı yok. Önce hesap açılmalıdır.",
      })
      return
    }

    setSifreIslemId(p.id)

    try {
      const response = await fetch("/api/admin/sifre-sifirla", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_id: p.auth_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMesaj({
          tip: "hata",
          metin: data.error || "Şifre sıfırlanamadı.",
        })
        setSifreIslemId(null)
        return
      }

      setGeciciSifre(data.yeni_sifre)
      setMesaj({
        tip: "basari",
        metin: `${p.ad || ""} ${p.soyad || ""} için yeni geçici şifre üretildi. Kullanıcı ilk girişte şifre değiştirmeye yönlendirilecek.`,
      })
    } catch (error: any) {
      setMesaj({
        tip: "hata",
        metin: error?.message || "Şifre sıfırlama sırasında hata oluştu.",
      })
    }

    setSifreIslemId(null)
  }

  async function manuelKaydet() {
    setMesaj(null)
    setGeciciSifre(null)

    if (!form.personel_kodu.trim()) {
      setMesaj({ tip: "hata", metin: "Personel kodu zorunludur." })
      return
    }

    if (!form.ad.trim()) {
      setMesaj({ tip: "hata", metin: "Ad zorunludur." })
      return
    }

    if (!form.soyad.trim()) {
      setMesaj({ tip: "hata", metin: "Soyad zorunludur." })
      return
    }

    const cleanPhone = normalizePhone(form.telefon)

    if (cleanPhone.length !== 10) {
      setMesaj({ tip: "hata", metin: "Geçerli telefon numarası giriniz." })
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    let sirketId: string | null = null

    if (duzenlenenId) {
      const mevcut = personeller.find((p) => p.id === duzenlenenId)
      sirketId = mevcut?.sirket_id || null
    }

    if (!sirketId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user?.id) {
        const { data: sirketKaydi } = await supabase
          .from("personeller")
          .select("sirket_id")
          .or(`auth_id.eq.${session.user.id},kullanici_id.eq.${session.user.id}`)
          .limit(1)
          .maybeSingle()

        sirketId = sirketKaydi?.sirket_id || null
      }
    }

    if (!sirketId) {
      setMesaj({
        tip: "hata",
        metin: "Şirket ID bulunamadı. Giriş yapan yönetici personel kaydında sirket_id dolu olmalı.",
      })
      setKaydediliyor(false)
      return
    }

    const payload = {
      sirket_id: sirketId,
      personel_kodu: form.personel_kodu.trim(),
      ad: form.ad.trim(),
      soyad: form.soyad.trim(),
      tel: `0${cleanPhone}`,
      telefon_normalized: cleanPhone,
      rol: form.rol,
      durum: form.durum,
      lokasyon: form.lokasyon.trim() || null,
      bolge: form.bolge.trim() || null,
      ise_giris_tarihi: form.ise_giris_tarihi || null,
      notlar: form.notlar.trim() || null,
      updated_at: new Date().toISOString(),
    }

    if (duzenlenenId) {
      const { error } = await supabase
        .from("personeller")
        .update(payload)
        .eq("id", duzenlenenId)

      if (error) {
        setMesaj({
          tip: "hata",
          metin: "Personel güncellenemedi: " + error.message,
        })
        setKaydediliyor(false)
        return
      }

      setMesaj({ tip: "basari", metin: "Personel başarıyla güncellendi." })
    } else {
      const { error } = await supabase.from("personeller").insert(payload)

      if (error) {
        setMesaj({
          tip: "hata",
          metin: "Personel eklenemedi: " + error.message,
        })
        setKaydediliyor(false)
        return
      }

      setMesaj({ tip: "basari", metin: "Personel başarıyla eklendi." })
    }

    temizle()
    await personelleriYukle()
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
          <h1 className="text-xl font-black text-gray-900">Personel Yönetimi</h1>
          <p className="text-xs font-semibold text-gray-700">
            Manuel personel ekleme, düzenleme, filtreleme, Excel yükleme ve portal şifre işlemleri
          </p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {mesaj && (
          <div className={`rounded-xl border p-4 text-sm font-bold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        {geciciSifre && (
          <div className="rounded-2xl border border-yellow-400 bg-yellow-50 p-4 text-yellow-950">
            <p className="text-sm font-black">Yeni geçici şifre</p>
            <p className="mt-2 rounded-xl border border-yellow-300 bg-white p-3 text-2xl font-black tracking-wider">
              {geciciSifre}
            </p>
            <p className="mt-2 text-xs font-bold">
              Bu şifreyi personele ilet. Kullanıcı giriş yaptıktan sonra kalıcı şifre değiştirme ekranına yönlendirilecek.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900">
                {duzenlenenId ? "Personel Düzenle" : "Manuel Personel Ekle"}
              </h2>
              <p className="text-xs font-semibold text-gray-700">
                Excel dışında tekil personel kaydı ekleyebilir veya mevcut kaydı düzenleyebilirsiniz.
              </p>
            </div>

            {duzenlenenId && (
              <button
                type="button"
                onClick={temizle}
                className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-black text-white"
              >
                Yeni Kayıt
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Personel Kodu *</label>
              <input
                value={form.personel_kodu}
                onChange={(e) => formGuncelle("personel_kodu", e.target.value)}
                placeholder="FEY0001"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Ad *</label>
              <input
                value={form.ad}
                onChange={(e) => formGuncelle("ad", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Soyad *</label>
              <input
                value={form.soyad}
                onChange={(e) => formGuncelle("soyad", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-sm font-bold text-gray-900">Telefon *</label>
              <input
                value={form.telefon}
                onChange={(e) => formGuncelle("telefon", e.target.value)}
                placeholder="+905XXXXXXXXX veya 05XXXXXXXXX"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Rol</label>
              <select
                value={form.rol}
                onChange={(e) => formGuncelle("rol", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-bold text-gray-900"
              >
                <option value="admin">admin</option>
                <option value="calisan">calisan</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Durum</label>
              <select
                value={form.durum}
                onChange={(e) => formGuncelle("durum", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-bold text-gray-900"
              >
                <option value="active">active</option>
                <option value="aktif">aktif</option>
                <option value="pasif">pasif</option>
                <option value="izinli">izinli</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Lokasyon</label>
              <input
                value={form.lokasyon}
                onChange={(e) => formGuncelle("lokasyon", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Bölge</label>
              <input
                value={form.bolge}
                onChange={(e) => formGuncelle("bolge", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">İşe Giriş</label>
              <input
                type="date"
                value={form.ise_giris_tarihi}
                onChange={(e) => formGuncelle("ise_giris_tarihi", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
              />
            </div>

            <div className="md:col-span-10">
              <label className="mb-1 block text-sm font-bold text-gray-900">Notlar</label>
              <input
                value={form.notlar}
                onChange={(e) => formGuncelle("notlar", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={manuelKaydet}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : duzenlenenId ? "Personeli Güncelle" : "Personel Ekle"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Excel ile Toplu Personel Yükle</h2>
            <p className="text-xs font-semibold text-gray-700">
              Kolonlar: personel_kodu, ad, soyad, telefon, rol, durum, lokasyon, bolge, ise_giris_tarihi
            </p>
          </div>

          {sonuc && (
            <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-bold text-green-900">
              Toplam: {sonuc.toplam} · Eklenen: {sonuc.eklenen} · Güncellenen: {sonuc.guncellenen} · Hatalı: {sonuc.hatali}
            </div>
          )}

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setDosya(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900"
          />

          <button
            type="button"
            onClick={excelYukle}
            disabled={yukleniyor}
            className="w-full rounded-xl bg-green-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {yukleniyor ? "Yükleniyor..." : "Excel Personel Yükle"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Filtreler</h2>
            <p className="text-xs font-semibold text-gray-700">
              Personel listesinde arama ve filtreleme yapabilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <label className="mb-1 block text-sm font-bold text-gray-900">Arama</label>
              <input
                value={filtre.arama}
                onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })}
                placeholder="Kod, ad, soyad veya telefon ara..."
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Rol</label>
              <select
                value={filtre.rol}
                onChange={(e) => setFiltre({ ...filtre, rol: e.target.value })}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-bold text-gray-900"
              >
                <option value="">Tümü</option>
                {roller.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-900">Durum</label>
              <select
                value={filtre.durum}
                onChange={(e) => setFiltre({ ...filtre, durum: e.target.value })}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-bold text-gray-900"
              >
                <option value="">Tümü</option>
                {durumlar.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-bold text-gray-900">Lokasyon</label>
              <select
                value={filtre.lokasyon}
                onChange={(e) => setFiltre({ ...filtre, lokasyon: e.target.value })}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm font-bold text-gray-900"
              >
                <option value="">Tümü</option>
                {lokasyonlar.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-3 overflow-x-auto">
          <div>
            <h2 className="text-lg font-black text-gray-900">Personel Listesi</h2>
            <p className="text-xs font-semibold text-gray-700">
              Gösterilen: {filtreliPersoneller.length} / Toplam: {personeller.length}
            </p>
          </div>

          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-900">
                <th className="border border-gray-400 p-2 text-left font-black">Kod</th>
                <th className="border border-gray-400 p-2 text-left font-black">Personel</th>
                <th className="border border-gray-400 p-2 text-left font-black">Telefon</th>
                <th className="border border-gray-400 p-2 text-left font-black">Rol</th>
                <th className="border border-gray-400 p-2 text-left font-black">Durum</th>
                <th className="border border-gray-400 p-2 text-left font-black">Lokasyon</th>
                <th className="border border-gray-400 p-2 text-left font-black">Bölge</th>
                <th className="border border-gray-400 p-2 text-left font-black">İşe Giriş</th>
                <th className="border border-gray-400 p-2 text-left font-black">Hesap</th>
                <th className="border border-gray-400 p-2 text-left font-black">İşlem</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="border border-gray-400 p-4 text-center font-bold">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtreliPersoneller.length === 0 ? (
                <tr>
                  <td colSpan={10} className="border border-gray-400 p-4 text-center font-bold text-gray-700">
                    Personel bulunamadı.
                  </td>
                </tr>
              ) : (
                filtreliPersoneller.map((p) => (
                  <tr key={p.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-400 p-2 font-bold">{p.personel_kodu || "-"}</td>
                    <td className="border border-gray-400 p-2 font-bold">{p.ad || "-"} {p.soyad || ""}</td>
                    <td className="border border-gray-400 p-2">{p.tel || p.telefon_normalized || "-"}</td>
                    <td className="border border-gray-400 p-2">{p.rol || "-"}</td>
                    <td className="border border-gray-400 p-2">{p.durum || "-"}</td>
                    <td className="border border-gray-400 p-2">{p.lokasyon || "-"}</td>
                    <td className="border border-gray-400 p-2">{p.bolge || "-"}</td>
                    <td className="border border-gray-400 p-2">{p.ise_giris_tarihi || "-"}</td>
                    <td className="border border-gray-400 p-2 font-bold">
                      {p.auth_id ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-green-900">
                          Var
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-1 text-red-900">
                          Yok
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-400 p-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => duzenle(p)}
                          className="rounded bg-blue-700 px-3 py-1 text-xs font-black text-white"
                        >
                          Düzenle
                        </button>

                        {p.auth_id ? (
                          <button
                            type="button"
                            onClick={() => sifreSifirla(p)}
                            disabled={sifreIslemId === p.id}
                            className="rounded bg-orange-600 px-3 py-1 text-xs font-black text-white disabled:opacity-50"
                          >
                            {sifreIslemId === p.id ? "Sıfırlanıyor..." : "Şifre Sıfırla"}
                          </button>
                        ) : (
                          <span className="rounded bg-gray-200 px-3 py-1 text-xs font-black text-gray-700">
                            Hesap Yok
                          </span>
                        )}
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
