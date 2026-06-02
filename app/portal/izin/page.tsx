"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = { tip: "basari" | "hata"; metin: string }

type IzinTuru = {
  ad: string
  devamsizlik_turu: string
  ucretli_mi: boolean
  yillik_izinden_duser: boolean
  maxGun: number | null
  bilgi: string
}

const IZIN_TURLERI: IzinTuru[] = [
  {
    ad: "Yıllık İzin",
    devamsizlik_turu: "yillik_izin",
    ucretli_mi: true,
    yillik_izinden_duser: true,
    maxGun: null,
    bilgi: "İşe giriş tarihine göre hak edilen yıllık izin bakiyesinden düşer.",
  },
  {
    ad: "Ücretsiz İzin",
    devamsizlik_turu: "ucretsiz_izin",
    ucretli_mi: false,
    yillik_izinden_duser: false,
    maxGun: null,
    bilgi: "Yıllık izin bakiyesinden düşmez. Ücretsiz devamsızlık olarak takip edilir.",
  },
  {
    ad: "Hastalık / Rapor",
    devamsizlik_turu: "rapor",
    ucretli_mi: false,
    yillik_izinden_duser: false,
    maxGun: null,
    bilgi: "Yıllık izinden düşmez. Raporlu gelmeme günü olarak takip edilir.",
  },
  {
    ad: "Mazeret İzni",
    devamsizlik_turu: "mazeret",
    ucretli_mi: true,
    yillik_izinden_duser: false,
    maxGun: null,
    bilgi: "Yıllık izin bakiyesinden düşmez. Yönetici onayıyla takip edilir.",
  },
  {
    ad: "Evlilik İzni",
    devamsizlik_turu: "evlilik",
    ucretli_mi: true,
    yillik_izinden_duser: false,
    maxGun: 3,
    bilgi: "Evlilik halinde 3 güne kadar ücretli mazeret izni.",
  },
  {
    ad: "Ölüm İzni",
    devamsizlik_turu: "olum",
    ucretli_mi: true,
    yillik_izinden_duser: false,
    maxGun: 3,
    bilgi: "Anne, baba, eş, kardeş veya çocuk vefatı halinde 3 güne kadar ücretli izin.",
  },
  {
    ad: "Babalık İzni",
    devamsizlik_turu: "babalik",
    ucretli_mi: true,
    yillik_izinden_duser: false,
    maxGun: 5,
    bilgi: "Eşin doğum yapması halinde 5 güne kadar ücretli izin.",
  },
]

function onayliMi(durum?: string | null) {
  return durum === "Onaylandı" || durum === "Onaylandi"
}

function beklemedeMi(durum?: string | null) {
  return !durum || durum === "Beklemede" || durum === "Bekliyor"
}

function durumRenk(durum?: string | null) {
  if (onayliMi(durum)) return "bg-green-100 text-green-800 border-green-300"
  if (durum === "Reddedildi") return "bg-red-100 text-red-800 border-red-300"
  return "bg-yellow-100 text-yellow-800 border-yellow-300"
}

function durumIkon(durum?: string | null) {
  if (onayliMi(durum)) return "✅"
  if (durum === "Reddedildi") return "❌"
  return "⏳"
}

function tarihYaz(value?: string | null) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString("tr-TR")
}

function tarihSaatYaz(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function gunSayisi(baslangic: string, bitis: string) {
  if (!baslangic || !bitis) return 0

  const b1 = new Date(`${baslangic}T00:00:00`)
  const b2 = new Date(`${bitis}T00:00:00`)

  if (Number.isNaN(b1.getTime()) || Number.isNaN(b2.getTime())) return 0

  const fark =
    Math.floor((b2.getTime() - b1.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return Math.max(0, fark)
}

function hizmetYili(personel: any) {
  const giris =
    personel?.ise_giris ||
    personel?.ise_giris_tarihi ||
    personel?.giris_tarihi ||
    personel?.baslama_tarihi ||
    personel?.created_at

  if (!giris) return 0

  const start = new Date(giris)
  const now = new Date()

  if (Number.isNaN(start.getTime())) return 0

  let yil = now.getFullYear() - start.getFullYear()
  const ayFarki = now.getMonth() - start.getMonth()

  if (ayFarki < 0 || (ayFarki === 0 && now.getDate() < start.getDate())) {
    yil -= 1
  }

  return Math.max(0, yil)
}

function yasHesapla(dogumTarihi?: string | null) {
  if (!dogumTarihi) return null

  const dogum = new Date(dogumTarihi)
  const now = new Date()

  if (Number.isNaN(dogum.getTime())) return null

  let yas = now.getFullYear() - dogum.getFullYear()
  const ayFarki = now.getMonth() - dogum.getMonth()

  if (ayFarki < 0 || (ayFarki === 0 && now.getDate() < dogum.getDate())) {
    yas -= 1
  }

  return yas
}

function yillikIzinHakkiHesapla(personel: any) {
  const yil = hizmetYili(personel)
  const yas = yasHesapla(personel?.dogum_tarihi)

  if (yil < 1) return 0

  let hak = 14

  if (yil > 5 && yil < 15) hak = 20
  if (yil >= 15) hak = 26

  if ((yas !== null && yas <= 18) || (yas !== null && yas >= 50)) {
    hak = Math.max(hak, 20)
  }

  return hak
}

function talepGun(t: any) {
  if (t.izin_gun_sayisi) return Number(t.izin_gun_sayisi || 0)
  if (t.izin_baslangic && t.izin_bitis) {
    return gunSayisi(t.izin_baslangic, t.izin_bitis)
  }
  return 0
}

export default function IzinPage() {
  const router = useRouter()

  const [personel, setPersonel] = useState<any>(null)
  const [talepler, setTalepler] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  const [form, setForm] = useState({
    tip: "Yıllık İzin",
    baslangic: "",
    bitis: "",
    aciklama: "",
  })

  const seciliIzinTuru =
    IZIN_TURLERI.find((i) => i.ad === form.tip) || IZIN_TURLERI[0]

  const talepleriYenile = useCallback(async (personelId: string) => {
    const supabase = createClient()

    const { data } = await supabase
      .from("calisan_talepler")
      .select("id, baslik, aciklama, durum, created_at, izin_turu, izin_baslangic, izin_bitis, izin_gun_sayisi, devamsizlik_turu, yillik_izinden_duser")
      .eq("personel_id", personelId)
      .eq("tip", "izin")
      .order("created_at", { ascending: false })

    setTalepler(data || [])
  }, [])

  useEffect(() => {
    async function yukle() {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (!user) {
        setMesaj({ tip: "hata", metin: "Oturum bulunamadı. Lütfen portaldan tekrar giriş yapın." })
        setYukleniyor(false)
        return
      }

      const { data: p, error: personelError } = await supabase
        .from("personeller")
        .select("id, sirket_id, yillik_izin_devir_gunu, dogum_tarihi, ise_giris, ise_giris_tarihi, created_at")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()

      if (personelError || !p) {
        setMesaj({
          tip: "hata",
          metin: "İzin sayfası için personel kaydı bulunamadı: " + (personelError?.message || user.email || user.id),
        })
        setYukleniyor(false)
        return
      }

      setPersonel(p)
      await talepleriYenile(p.id)
      setYukleniyor(false)
    }

    void yukle()
  }, [router, talepleriYenile])

  const istenenGun = useMemo(() => {
    return gunSayisi(form.baslangic, form.bitis)
  }, [form.baslangic, form.bitis])

  const yillikHak = useMemo(() => {
    return yillikIzinHakkiHesapla(personel)
  }, [personel])

  const devirGun = Number(personel?.yillik_izin_devir_gunu || 0)

  const kullanilanYillik = useMemo(() => {
    return talepler
      .filter((t) => onayliMi(t.durum))
      .filter((t) => t.yillik_izinden_duser === true || t.izin_turu === "Yıllık İzin")
      .reduce((toplam, t) => toplam + talepGun(t), 0)
  }, [talepler])

  const ucretsizIzinGun = useMemo(() => {
    return talepler
      .filter((t) => onayliMi(t.durum))
      .filter((t) => t.devamsizlik_turu === "ucretsiz_izin" || t.izin_turu === "Ücretsiz İzin")
      .reduce((toplam, t) => toplam + talepGun(t), 0)
  }, [talepler])

  const raporGun = useMemo(() => {
    return talepler
      .filter((t) => onayliMi(t.durum))
      .filter((t) => t.devamsizlik_turu === "rapor" || t.izin_turu === "Hastalık / Rapor")
      .reduce((toplam, t) => toplam + talepGun(t), 0)
  }, [talepler])

  const mazeretGun = useMemo(() => {
    return talepler
      .filter((t) => onayliMi(t.durum))
      .filter((t) =>
        ["mazeret", "evlilik", "olum", "babalik"].includes(t.devamsizlik_turu),
      )
      .reduce((toplam, t) => toplam + talepGun(t), 0)
  }, [talepler])

  const kalanYillik = Math.max(0, yillikHak + devirGun - kullanilanYillik)

  const bekleyenTalep = useMemo(() => {
    return talepler.find((t) => beklemedeMi(t.durum)) || null
  }, [talepler])

  const sonBirYilTalepler = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)

    return talepler
      .filter((t) => new Date(t.created_at) >= d)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [talepler])

  const sonBirYildaKullanilanIzinler = useMemo(() => {
    return sonBirYilTalepler
      .filter((t) => onayliMi(t.durum))
      .sort((a, b) => {
        const aTarih = a.izin_baslangic || a.created_at
        const bTarih = b.izin_baslangic || b.created_at
        return new Date(bTarih).getTime() - new Date(aTarih).getTime()
      })
  }, [sonBirYilTalepler])

  async function handleKaydet() {
    if (!form.baslangic || !form.bitis) {
      setMesaj({ tip: "hata", metin: "Lütfen başlangıç ve bitiş tarihi seçiniz." })
      return
    }

    if (istenenGun <= 0) {
      setMesaj({ tip: "hata", metin: "Bitiş tarihi başlangıç tarihinden önce olamaz." })
      return
    }

    if (!personel?.id) {
      setMesaj({ tip: "hata", metin: "Personel bilgisi bulunamadı." })
      return
    }

    if (seciliIzinTuru.maxGun && istenenGun > seciliIzinTuru.maxGun) {
      setMesaj({
        tip: "hata",
        metin: `${form.tip} için en fazla ${seciliIzinTuru.maxGun} gün talep oluşturulabilir.`,
      })
      return
    }

    if (form.tip === "Yıllık İzin" && istenenGun > kalanYillik) {
      setMesaj({
        tip: "hata",
        metin: `Yıllık izin bakiyeniz yetersiz. Kalan bakiye: ${kalanYillik} gün.`,
      })
      return
    }

    setKaydediliyor(true)
    setMesaj(null)

    const supabase = createClient()

    const { error } = await supabase.from("calisan_talepler").insert([
      {
        sirket_id: personel.sirket_id,
        personel_id: personel.id,
        tip: "izin",
        baslik: form.tip,
        izin_turu: form.tip,
        izin_baslangic: form.baslangic,
        izin_bitis: form.bitis,
        izin_gun_sayisi: istenenGun,
        devamsizlik_turu: seciliIzinTuru.devamsizlik_turu,
        ucretli_mi: seciliIzinTuru.ucretli_mi,
        yillik_izinden_duser: seciliIzinTuru.yillik_izinden_duser,
        aciklama: form.aciklama.trim() || null,
        durum: "Beklemede",
      },
    ])

    if (error) {
      setMesaj({
        tip: "hata",
        metin: `Talep kaydedilemedi: ${error.message}`,
      })
      setKaydediliyor(false)
      return
    }

    setForm({
      tip: "Yıllık İzin",
      baslangic: "",
      bitis: "",
      aciklama: "",
    })

    setShowForm(false)
    setMesaj({ tip: "basari", metin: "✅ İzin talebiniz iletildi!" })

    await talepleriYenile(personel.id)
    setKaydediliyor(false)
  }

  function BekleyenTalepKarti({ talep }: { talep: any }) {
    if (!talep) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-gray-500">
          Bekleyen izin talebiniz yok.
        </div>
      )
    }

    return (
      <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-yellow-800">Bekleyen Talep</p>
            <p className="text-lg font-black text-gray-900">
              {talep.izin_turu || talep.baslik}
            </p>
            <p className="text-sm font-semibold text-gray-700 mt-1">
              {tarihYaz(talep.izin_baslangic)} - {tarihYaz(talep.izin_bitis)}
            </p>
            <p className="text-xs font-bold text-gray-600 mt-1">
              {talepGun(talep)} gün · Talep tarihi: {tarihSaatYaz(talep.created_at)}
            </p>
          </div>

          <span className={`shrink-0 text-xs px-3 py-1 rounded-full border font-bold ${durumRenk(talep.durum)}`}>
            {durumIkon(talep.durum)} {talep.durum || "Beklemede"}
          </span>
        </div>

        {talep.aciklama && (
          <p className="mt-3 text-sm font-semibold text-gray-800 whitespace-pre-line">
            {talep.aciklama}
          </p>
        )}
      </div>
    )
  }

  function TalepListeSatiri({ talep }: { talep: any }) {
    return (
      <div className="grid grid-cols-12 items-center border-b border-gray-200 bg-white px-2 py-3 text-xs last:border-b-0">
        <div className="col-span-3 font-black text-gray-900 truncate">
          {talep.izin_turu || talep.baslik || "-"}
        </div>

        <div className="col-span-3 font-semibold text-gray-700">
          {tarihYaz(talep.izin_baslangic)}
        </div>

        <div className="col-span-2 font-bold text-gray-900">
          {talepGun(talep)} gün
        </div>

        <div className="col-span-2 font-semibold text-gray-600">
          {tarihSaatYaz(talep.created_at)}
        </div>

        <div className="col-span-2 text-right">
          <span
            className={`rounded-full border px-2 py-1 text-[11px] font-bold ${durumRenk(
              talep.durum,
            )}`}
          >
            {durumIkon(talep.durum)}
          </span>
        </div>
      </div>
    )
  }

  function ListeBaslik() {
    return (
      <div className="grid grid-cols-12 items-center border-b border-gray-300 bg-gray-100 px-2 py-2 text-[11px] font-black text-gray-700">
        <div className="col-span-3">Tür</div>
        <div className="col-span-3">Başlangıç</div>
        <div className="col-span-2">Gün</div>
        <div className="col-span-2">Talep</div>
        <div className="col-span-2 text-right">Durum</div>
      </div>
    )
  }

  if (yukleniyor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 font-bold">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/portal")}
          className="text-2xl text-gray-800"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900">İzin Talebi</h1>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
            <p className="text-xs text-purple-700 font-bold">Hak</p>
            <p className="text-2xl font-black text-purple-900">{yillikHak}</p>
            <p className="text-[11px] text-purple-700">gün</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <p className="text-xs text-blue-700 font-bold">Kullanılan</p>
            <p className="text-2xl font-black text-blue-900">{kullanilanYillik}</p>
            <p className="text-[11px] text-blue-700">gün</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
            <p className="text-xs text-green-700 font-bold">Kalan</p>
            <p className="text-2xl font-black text-green-900">{kalanYillik}</p>
            <p className="text-[11px] text-green-700">gün</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <p className="text-xs text-red-700 font-bold">Ücretsiz</p>
            <p className="text-2xl font-black text-red-900">{ucretsizIzinGun}</p>
            <p className="text-[11px] text-red-700">gün</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
            <p className="text-xs text-orange-700 font-bold">Rapor</p>
            <p className="text-2xl font-black text-orange-900">{raporGun}</p>
            <p className="text-[11px] text-orange-700">gün</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
            <p className="text-xs text-gray-700 font-bold">Mazeret</p>
            <p className="text-2xl font-black text-gray-900">{mazeretGun}</p>
            <p className="text-[11px] text-gray-700">gün</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-black text-gray-900">İzin Hesap Özeti</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">
            İşe giriş: {tarihYaz(personel?.ise_giris_tarihi)}
          </p>
          <p className="text-xs font-semibold text-gray-700">
            Hizmet yılı: {hizmetYili(personel)} yıl
          </p>
          <p className="text-xs font-semibold text-gray-700">
            Devir izin: {devirGun} gün
          </p>
        </div>

        <div>
          <p className="text-sm font-bold text-gray-800 mb-1">Bekleyen Talep</p>
          <BekleyenTalepKarti talep={bekleyenTalep} />
        </div>

        {mesaj && (
          <div
            className={`rounded-xl p-3 text-center border ${
              mesaj.tip === "basari"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <p className="text-sm font-medium">{mesaj.metin}</p>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-purple-600 text-white rounded-2xl py-4 text-lg font-bold active:scale-95 transition-transform"
          >
            + Yeni İzin Talebi
          </button>
        )}

        {showForm && (
          <div className="bg-white border border-gray-300 rounded-2xl p-4 space-y-4 overflow-hidden">
            <h3 className="font-bold text-gray-900">İzin Talebi Oluştur</h3>

            <div>
              <label className="text-sm font-bold text-gray-800 block mb-1">
                İzin Türü
              </label>
              <select
                value={form.tip}
                onChange={(e) => setForm({ ...form, tip: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
              >
                {IZIN_TURLERI.map((izin) => (
                  <option key={izin.ad}>{izin.ad}</option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-black text-blue-900">
                {seciliIzinTuru.ad} Bilgi Kartı
              </p>
              <div className="mt-2 rounded-lg bg-white/70 p-3 border border-blue-200">
  <p className="text-xs leading-5 font-semibold text-blue-950">
    {seciliIzinTuru.bilgi}
  </p>
</div>
              <p className="text-xs text-blue-900 mt-1">
                {seciliIzinTuru.yillik_izinden_duser
                  ? `Kalan yıllık izin bakiyeniz: ${kalanYillik} gün`
                  : "Bu izin yıllık izin bakiyesinden düşmez."}
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-800 block mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={form.baslangic}
                onChange={(e) => setForm({ ...form, baslangic: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-800 block mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={form.bitis}
                onChange={(e) => setForm({ ...form, bitis: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-bold text-gray-800">
                Talep edilen süre: {istenenGun} gün
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-800 block mb-1">
                Açıklama
              </label>
              <textarea
                value={form.aciklama}
                onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                placeholder="Kısa bir not ekleyebilirsiniz..."
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white placeholder:text-gray-400 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border-2 border-gray-300 text-gray-700 rounded-xl py-3 font-medium"
              >
                Vazgeç
              </button>

              <button
                onClick={handleKaydet}
                disabled={kaydediliyor}
                className="flex-1 bg-purple-600 text-white rounded-xl py-3 font-bold disabled:opacity-50"
              >
                {kaydediliyor ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">Son 1 Yılda Kullanılan İzinler</h3>

          {sonBirYildaKullanilanIzinler.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center text-gray-500 border">
              Son 1 yılda onaylanmış izin bulunmuyor.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
              <ListeBaslik />
              {sonBirYildaKullanilanIzinler.map((t) => (
                <TalepListeSatiri key={t.id} talep={t} />
              ))}
            </div>
          )}
        </div>

        
      </div>
    </div>
  )
}
