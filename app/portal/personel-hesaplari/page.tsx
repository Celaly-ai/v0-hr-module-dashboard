"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function PersonelHesaplariPage() {
  const router = useRouter()

  const [personeller, setPersoneller] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [islemId, setIslemId] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")
  const [sonuc, setSonuc] = useState<any>(null)

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    const supabase = createClient()

    const { data, error } = await supabase
      .from("personeller")
      .select("id, ad, soyad, tel, email, telefon_normalized, auth_id, rol, durum")
      .order("ad", { ascending: true })

    if (error) {
      setHata("Personeller alınamadı: " + error.message)
      setLoading(false)
      return
    }

    setPersoneller(data || [])
    setLoading(false)
  }

  useEffect(() => {
    verileriYukle()
  }, [])

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
      `Hesap oluşturuldu. Email: ${data.email || "-"} | Auth ID: ${data.auth_id || "-"}`
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
            Personeller için tek tıkla portal giriş hesabı oluşturma
          </p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
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

        {sonuc && (
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

        <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-200">
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
                  <td colSpan={7} className="border border-gray-400 p-4 text-center font-bold">
                    Yükleniyor...
                  </td>
                </tr>
              ) : personeller.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-400 p-4 text-center font-bold">
                    Personel bulunamadı.
                  </td>
                </tr>
              ) : (
                personeller.map((p) => (
                  <tr key={p.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border border-gray-400 p-2 font-bold">
                      {p.ad || "-"} {p.soyad || ""}
                    </td>
                    <td className="border border-gray-400 p-2">
                      {p.telefon_normalized ? `0${p.telefon_normalized}` : p.tel || "-"}
                    </td>
                    <td className="border border-gray-400 p-2">{p.email || "-"}</td>
                    <td className="border border-gray-400 p-2">{p.rol || "-"}</td>
                    <td className="border border-gray-400 p-2">{p.durum || "-"}</td>
                    <td className="border border-gray-400 p-2 font-bold">
                      {p.auth_id ? "Var" : "Yok"}
                    </td>
                    <td className="border border-gray-400 p-2">
                      <button
                        type="button"
                        onClick={() => hesapOlustur(p.id)}
                        disabled={Boolean(p.auth_id) || islemId === p.id}
                        className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {islemId === p.id
                          ? "Oluşturuluyor..."
                          : p.auth_id
                            ? "Hesap Var"
                            : "Hesap Oluştur"}
                      </button>
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
