"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Kategori = {
  id: string
  ad: string
  tur: string
}

export default function MuhasebeEklePage() {
  const router = useRouter()

  const [kategoriler, setKategoriler] = useState<Kategori[]>([])
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState("")

  const [form, setForm] = useState({
    tur: "gider",
    kategori_id: "",
    tutar: "",
    odeme_yontemi: "nakit",
    aciklama: "",
    detay_aciklama: "",
    fatura_no: "",
    belge_no: "",
    islem_yapan_ad_soyad: "",
    masrafi_yapan_ad_soyad: "",
    avans_personel_ad_soyad: "",
    masraf_yeri: "",
    belge_var_mi: false,
  })

  useEffect(() => {
    kategorileriYukle()
  }, [])

  async function kategorileriYukle() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_kategorileri")
      .select("id, ad, tur")
      .eq("aktif", true)
      .order("ad", { ascending: true })

    if (error) {
      setMesaj("Kategoriler alınamadı: " + error.message)
      return
    }

    setKategoriler(data || [])
  }

  function formGuncelle(alan: string, deger: any) {
    setForm((onceki) => ({
      ...onceki,
      [alan]: deger,
    }))
  }

  async function kaydet() {
    setMesaj("")

    if (!form.tutar || Number(form.tutar) <= 0) {
      setMesaj("Geçerli bir tutar giriniz.")
      return
    }

    if ((form.tur === "gelir" || form.tur === "gider") && !form.kategori_id) {
      setMesaj("Gelir / gider kaydında kategori seçimi zorunludur.")
      return
    }

    if (form.tur === "avans" && !form.avans_personel_ad_soyad.trim()) {
      setMesaj("Avans kaydında avans verilen personel adı zorunludur.")
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setKaydediliyor(false)
      setMesaj("Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.")
      return
    }

    const { data: personel, error: personelError } = await supabase
      .from("personeller")
      .select("id, sirket_id, ad_soyad")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    if (personelError || !personel?.sirket_id) {
      setKaydediliyor(false)
      setMesaj("Şirket bilgisi bulunamadı. Muhasebe kaydı oluşturulamadı.")
      return
    }

    const kategori = kategoriler.find((k) => k.id === form.kategori_id)
    const tutar = Number(form.tutar)

    const giderTurleri = ["gider", "odeme", "avans", "maas", "yemek", "kesinti"]
    const gelirTurleri = ["gelir", "tahsilat", "ek_odeme"]

    const { error } = await supabase.from("muhasebe_hareketleri").insert({
      sirket_id: personel.sirket_id,
      personel_id: personel.id,

      tarih: new Date().toISOString().slice(0, 10),
      islem_tarihi: new Date().toISOString().slice(0, 10),

      tur: form.tur,
      hareket_tipi: form.tur,

      kategori_id: form.kategori_id || null,
      kategori_ad: kategori?.ad || null,

      tutar,
      borc_tutar: giderTurleri.includes(form.tur) ? tutar : 0,
      alacak_tutar: gelirTurleri.includes(form.tur) ? tutar : 0,

      odeme_yontemi: form.odeme_yontemi,
      odeme_tipi: form.odeme_yontemi,

      aciklama: form.aciklama.trim() || null,
      detay_aciklama: form.detay_aciklama.trim() || null,

      fatura_no: form.fatura_no.trim() || null,
      belge_no: form.belge_no.trim() || null,

      islem_yapan_ad_soyad:
        form.islem_yapan_ad_soyad.trim() || personel.ad_soyad || null,

      masrafi_yapan_ad_soyad: form.masrafi_yapan_ad_soyad.trim() || null,
      avans_personel_ad_soyad: form.avans_personel_ad_soyad.trim() || null,
      masraf_yeri: form.masraf_yeri.trim() || null,
      belge_var_mi: form.belge_var_mi,

      kaynak: "manuel",
      kaynak_modul: "manuel",
      onay_durumu: "onaylandi",
      odeme_durumu: "odendi",
      durum: "aktif",
    })

    setKaydediliyor(false)

    if (error) {
      setMesaj("Kayıt oluşturulamadı: " + error.message)
      return
    }

    router.push("/portal/muhasebe")
  }

  const filtreliKategoriler = kategoriler.filter((k) => k.tur === form.tur)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal/muhasebe")}
          className="text-2xl font-bold text-gray-900"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-black text-gray-900">Muhasebe Hareketi Ekle</h1>
          <p className="text-xs font-semibold text-gray-700">
            Gelir, gider, ödeme, tahsilat ve personel avansı
          </p>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {mesaj && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {mesaj}
          </div>
        )}

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">Tür</label>
            <select
              value={form.tur}
              onChange={(e) =>
                setForm({
                  ...form,
                  tur: e.target.value,
                  kategori_id: "",
                })
              }
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
            >
              <option value="gider">Gider</option>
              <option value="gelir">Gelir</option>
              <option value="tahsilat">Tahsilat</option>
              <option value="odeme">Ödeme</option>
              <option value="avans">Personel Avans</option>
              <option value="maas">Maaş</option>
              <option value="yemek">Yemek Kartı</option>
              <option value="kesinti">Kesinti</option>
              <option value="ek_odeme">Ek Ödeme</option>
            </select>
          </div>

          {(form.tur === "gelir" || form.tur === "gider") && (
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-900">
                Kategori
              </label>
              <select
                value={form.kategori_id}
                onChange={(e) => formGuncelle("kategori_id", e.target.value)}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
              >
                <option value="">Kategori seçiniz</option>
                {filtreliKategoriler.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">Tutar</label>
            <input
              type="number"
              value={form.tutar}
              onChange={(e) => formGuncelle("tutar", e.target.value)}
              placeholder="Örn: 1250"
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Ödeme Yöntemi
            </label>
            <select
              value={form.odeme_yontemi}
              onChange={(e) => formGuncelle("odeme_yontemi", e.target.value)}
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
            >
              <option value="nakit">Nakit</option>
              <option value="banka">Banka</option>
              <option value="pos">POS</option>
              <option value="kredi_karti">Kredi Kartı</option>
              <option value="havale">Havale / EFT</option>
              <option value="yemek_karti">Yemek Kartı</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-900">
                Fatura No
              </label>
              <input
                value={form.fatura_no}
                onChange={(e) => formGuncelle("fatura_no", e.target.value)}
                placeholder="Varsa fatura no"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-900">
                Belge / Dekont No
              </label>
              <input
                value={form.belge_no}
                onChange={(e) => formGuncelle("belge_no", e.target.value)}
                placeholder="Varsa belge no"
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold"
              />
            </div>
          </div>

          {form.tur === "avans" && (
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-900">
                Avans Verilen Personel
              </label>
              <input
                value={form.avans_personel_ad_soyad}
                onChange={(e) =>
                  formGuncelle("avans_personel_ad_soyad", e.target.value)
                }
                placeholder="Örn: Mehmet Kaymaz"
                className="w-full rounded-lg border border-red-500 bg-red-50 px-3 py-3 text-sm font-bold text-gray-900"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Masrafı Yapan Personel
            </label>
            <input
              value={form.masrafi_yapan_ad_soyad}
              onChange={(e) =>
                formGuncelle("masrafi_yapan_ad_soyad", e.target.value)
              }
              placeholder="Örn: Yakıtı alan / masrafı yapan kişi"
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              İşlemi Giren / Yapan Kişi
            </label>
            <input
              value={form.islem_yapan_ad_soyad}
              onChange={(e) =>
                formGuncelle("islem_yapan_ad_soyad", e.target.value)
              }
              placeholder="Boş kalırsa giriş yapan personel alınır"
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Masraf Yeri / Araç / Şube / Görev
            </label>
            <input
              value={form.masraf_yeri}
              onChange={(e) => formGuncelle("masraf_yeri", e.target.value)}
              placeholder="Örn: Depo, servis aracı, müşteri işi"
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Kısa Açıklama
            </label>
            <textarea
              value={form.aciklama}
              onChange={(e) => formGuncelle("aciklama", e.target.value)}
              placeholder="Kısa açıklama yazınız..."
              rows={3}
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Detay Açıklama
            </label>
            <textarea
              value={form.detay_aciklama}
              onChange={(e) => formGuncelle("detay_aciklama", e.target.value)}
              placeholder="Avans kime verildi, gideri kim yaptı, hangi iş için yapıldı?"
              rows={4}
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <input
              type="checkbox"
              checked={form.belge_var_mi}
              onChange={(e) => formGuncelle("belge_var_mi", e.target.checked)}
            />
            Bu işleme ait fiş, fatura veya dekont var.
          </label>

          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  )
}
