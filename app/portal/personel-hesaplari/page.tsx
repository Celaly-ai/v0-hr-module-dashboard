"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Kayit = Record<string, any>

function durumNormal(value?: string | null) {
  return String(value || "").toLocaleLowerCase("tr-TR").trim()
}

function hesapDurumu(p: Kayit) {
  return p.auth_id ? "Var" : "Yok"
}

function telefonGoster(p: Kayit) {
  if (p.telefon_normalized) return `0${p.telefon_normalized}`
  return p.tel || "-"
}

export default function PersonelHesaplariPage() {
  const router = useRouter()

  const [personeller, setPersoneller] = useState<Kayit[]>([])
  const [loading, setLoading] = useState(true)
  const [islemId, setIslemId] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")
  const [sonuc, setSonuc] = useState<any>(null)
  const [arama, setArama] = useState("")
  const [filtre, setFiltre] = useState<"aktif" | "hepsi" | "hesapsiz">("aktif")

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    try {
      const response = await fetch("/api/admin/personel-listesi", {
        method: "GET",
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setHata(data?.error || "Personeller alınamadı.")
        setLoading(false)
        return
      }

      setPersoneller(data?.personeller || [])
    } catch (error: any) {
      setHata("Personeller alınamadı: " + (error?.message || "Bilinmeyen hata"))
    }

    setLoading(false)
  }

  useEffect(() => {
    verileriYukle()
  }, [])

  const filtreliPersoneller = useMemo(() => {
    const q = arama.toLocaleLowerCase("tr-TR").trim()

    return personeller.filter((p) => {
      const durum = durumNormal(p.durum)

      if (filtre === "aktif" && durum !== "aktif") return false
      if (filtre === "hesapsiz" && p.auth_id) return false

      if (!q) return true

      const metin = [
        p.personel_kodu,
        p.ad,
        p.soyad,
        p.tel,
        p.email,
        p.rol,
        p.durum,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")

      return metin.includes(q)
    })
  }, [arama, filtre, personeller])

  const ozet = useMemo(() => {
    const aktif = personeller.filter((p) => durumNormal(p.durum) === "aktif").length
    const hesapsiz = personeller.filter((p) => !p.auth_id && durumNormal(p.durum) === "aktif").length
    const hesapli = personeller.filter((p) => p.auth_id && durumNormal(p.durum) === "aktif").length

    return {
      toplam: personeller.length,
      aktif,
      hesapli,
      hesapsiz,
    }
  }, [personeller])

  async function hesapOlustur(personelId: string) {
    setIslemId(personelId)
    setMesaj("")
    setHata("")
    setSonuc(null)

    try {
      const response = await fetch("/api/admin/personel-hesap-olustur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personelId }),
      })

      const text = await response.text()

      let data: any = null

      try {
        data = JSON.parse(text)
      } catch {
        setHata("API JSON dönmedi. Gelen cevap: " + text.slice(0, 300))
        setIslemId(null)
        return
      }

      if (!response.ok) {
        setHata(data.error || "Hesap oluşturulamadı.")
        setSonuc(data)
        setIslemId(null)
        return
      }

      setSonuc(data)
      setMesaj(
        `Hesap oluşturuldu. Email: ${data.email || "-"} | Auth ID: ${data.auth_id || "-"}`,
      )

      await verileriYukle()
    } catch (error: any) {
      setHata("İstek sırasında hata oluştu: " + (error?.message || "Bilinmeyen hata"))
    }

    setIslemId(null)
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
          <h1 className="text-xl font-bold text-gray-900">Personel Giriş Hesapları</h1>
          <p className="text-xs font-medium text-gray-600">
            Admin API üzerinden tüm personeller için portal giriş hesabı oluşturma
          </p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-bold">Toplam</p>
            <p className="text-2xl font-black">{ozet.toplam}</p>
          </div>

          <div className="rounded-2xl bg-white border p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-bold">Aktif</p>
            <p className="text-2xl font-black text-green-700">{ozet.aktif}</p>
          </div>

          <div className="rounded-2xl bg-white border p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-bold">Hesaplı Aktif</p>
            <p className="text-2xl font-black text-blue-700">{ozet.hesapli}</p>
          </div>

          <div className="rounded-2xl bg-white border p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-bold">Hesapsız Aktif</p>
            <p className="text-2xl font-black text-orange-700">{ozet.hesapsiz}</p>
          </div>
        </div>

        {hata && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-900">
            {hata}
          </div>
        )}

        {mesaj && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4 font-semibold text-green-900">
            {mesaj}
          </div>
        )}

        {sonuc?.success && (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 space-y-2">
            <p className="font-bold text-blue-900">Personele verilecek giriş bilgisi:</p>
            <p className="text-sm font-semibold text-blue-900">
              Kullanıcı / Telefon e-postası: {sonuc.email}
            </p>
            <p className="text-sm font-semibold text-blue-900">
              Geçici şifre: {sonuc.sifre}
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ad, soyad, telefon, rol ara..."
              className="w-full md:max-w-md rounded-xl border px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-300"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFiltre("aktif")}
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  filtre === "aktif"
                    ? "bg-blue-700 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Aktif
              </button>

              <button
                type="button"
                onClick={() => setFiltre("hesapsiz")}
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  filtre === "hesapsiz"
                    ? "bg-blue-700 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Hesapsız
              </button>

              <button
                type="button"
                onClick={() => setFiltre("hepsi")}
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  filtre === "hepsi"
                    ? "bg-blue-700 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Hepsi
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 p-2 text-left">Kod</th>
                  <th className="border border-gray-400 p-2 text-left">Personel</th>
                  <th className="border border-gray-400 p-2 text-left">Telefon</th>
                  <th className="border border-gray-400 p-2 text-left">E-posta</th>
                  <th className="border border-gray-400 p-2 text-left">Rol</th>
                  <th className="border border-gray-400 p-2 text-left">Durum</th>
                  <th className="border border-gray-400 p-2 text-left">Hesap</th>
                  <th className="border border-gray-400 p-2 text-left">İşlem</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="border border-gray-400 p-4 text-center font-bold">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : filtreliPersoneller.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-gray-400 p-4 text-center font-bold">
                      Personel bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtreliPersoneller.map((p) => {
                    const durum = durumNormal(p.durum)
                    const aktifMi = durum === "aktif"

                    return (
                      <tr key={p.id} className="odd:bg-white even:bg-gray-50">
                        <td className="border border-gray-400 p-2 font-bold">
                          {p.personel_kodu || "-"}
                        </td>
                        <td className="border border-gray-400 p-2 font-bold">
                          {p.ad || "-"} {p.soyad || ""}
                        </td>
                        <td className="border border-gray-400 p-2">
                          {telefonGoster(p)}
                        </td>
                        <td className="border border-gray-400 p-2">{p.email || "-"}</td>
                        <td className="border border-gray-400 p-2">{p.rol || "-"}</td>
                        <td className="border border-gray-400 p-2">{p.durum || "-"}</td>
                        <td className="border border-gray-400 p-2 font-bold">
                          {hesapDurumu(p)}
                        </td>
                        <td className="border border-gray-400 p-2">
                          <button
                            type="button"
                            onClick={() => hesapOlustur(p.id)}
                            disabled={!aktifMi || Boolean(p.auth_id) || islemId === p.id}
                            className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                          >
                            {islemId === p.id
                              ? "Oluşturuluyor..."
                              : p.auth_id
                                ? "Hesap Var"
                                : !aktifMi
                                  ? "Pasif"
                                  : "Hesap Oluştur"}
                          </button>
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
