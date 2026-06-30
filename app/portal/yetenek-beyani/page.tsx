"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function YetenekBeyaniPage() {
  const router = useRouter()

  const [personel, setPersonel] = useState<any>(null)
  const [yetenekler, setYetenekler] = useState<any[]>([])
  const [personelYetenekleri, setPersonelYetenekleri] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [kaydediliyorId, setKaydediliyorId] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState("")

  const yukle = useCallback(async () => {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    if (!user) {
      router.replace("/login")
      return
    }

    const { data: p } = await supabase
      .from("personeller")
      .select("id")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    if (!p) {
      router.replace("/login")
      return
    }

    setPersonel(p)

    const { data: y } = await supabase
      .from("yetenekler")
      .select("id, urun_grubu, islem, aciklama")
      .eq("aktif", true)
      .order("urun_grubu", { ascending: true })
      .order("islem", { ascending: true })

    const { data: py } = await supabase
      .from("personel_yetenekleri")
      .select("id, yetenek_id, yapabilir")
      .eq("personel_id", p.id)

    setYetenekler(y || [])
    setPersonelYetenekleri(py || [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    void yukle()
  }, [yukle])

  const mevcutDurum = useCallback((yetenekId: string) => {
    const kayit = personelYetenekleri.find((x) => x.yetenek_id === yetenekId)
    if (!kayit) return null
    return kayit.yapabilir
  }, [personelYetenekleri])

  async function sec(yetenekId: string, yapabilir: boolean) {
    if (!personel?.id) return

    setKaydediliyorId(yetenekId)
    setMesaj("")

    const supabase = createClient()
    const mevcut = personelYetenekleri.find((x) => x.yetenek_id === yetenekId)

    if (mevcut) {
      const { error } = await supabase
        .from("personel_yetenekleri")
        .update({
          yapabilir,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mevcut.id)

      if (error) {
        setMesaj("Kayıt güncellenemedi: " + error.message)
        setKaydediliyorId(null)
        return
      }
    } else {
      const { error } = await supabase.from("personel_yetenekleri").insert({
        personel_id: personel.id,
        yetenek_id: yetenekId,
        yapabilir,
      })

      if (error) {
        setMesaj("Kayıt oluşturulamadı: " + error.message)
        setKaydediliyorId(null)
        return
      }
    }

    await yukle()
    setKaydediliyorId(null)
  }

  const ozet = useMemo(() => {
    let yapabilir = 0
    let yapamaz = 0
    let tanimsiz = 0

    yetenekler.forEach((y) => {
      const durum = mevcutDurum(y.id)
      if (durum === true) yapabilir++
      else if (durum === false) yapamaz++
      else tanimsiz++
    })

    return { yapabilir, yapamaz, tanimsiz }
  }, [yetenekler, mevcutDurum])

  async function tamamla() {
    if (ozet.tanimsiz > 0) {
      setMesaj("Lütfen tüm yetenekler için Yapabilir veya Yapamaz seçiniz.")
      return
    }

    setMesaj("Yetenek beyanınız tamamlandı. Portala yönlendiriliyorsunuz.")

    setTimeout(() => {
      router.replace("/portal")
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="font-bold text-gray-800">Yükleniyor...</p>
      </div>
    )
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
          <h1 className="text-xl font-black text-gray-900">Yetenek Beyanım</h1>
          <p className="text-xs font-semibold text-gray-700">
            Hangi işleri yapabildiğinizi işaretleyiniz
          </p>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {mesaj && (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm font-bold text-blue-900">
            {mesaj}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-green-300 bg-green-50 p-3">
            <p className="text-xs font-bold text-green-800">Yapabilir</p>
            <p className="text-2xl font-black text-green-900">{ozet.yapabilir}</p>
          </div>

          <div className="rounded-xl border border-red-300 bg-red-50 p-3">
            <p className="text-xs font-bold text-red-800">Yapamaz</p>
            <p className="text-2xl font-black text-red-900">{ozet.yapamaz}</p>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-3">
            <p className="text-xs font-bold text-gray-800">Tanımsız</p>
            <p className="text-2xl font-black text-gray-900">{ozet.tanimsiz}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-300 shadow-sm overflow-hidden">
          {yetenekler.length === 0 ? (
            <div className="p-6 text-center font-bold text-gray-600">
              Henüz yetenek tanımı yok.
            </div>
          ) : (
            yetenekler.map((y) => {
              const durum = mevcutDurum(y.id)

              return (
                <div
                  key={y.id}
                  className="border-b border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-black text-gray-900">
                      {y.urun_grubu} / {y.islem}
                    </p>
                    <p className="text-xs font-semibold text-gray-600">
                      {y.aciklama || "-"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => sec(y.id, true)}
                      disabled={kaydediliyorId === y.id}
                      className={`rounded-lg px-4 py-2 text-xs font-black ${
                        durum === true
                          ? "bg-green-700 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      Yapabilir
                    </button>

                    <button
                      type="button"
                      onClick={() => sec(y.id, false)}
                      disabled={kaydediliyorId === y.id}
                      className={`rounded-lg px-4 py-2 text-xs font-black ${
                        durum === false
                          ? "bg-red-700 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      Yapamaz
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <button
          type="button"
          onClick={tamamla}
          className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white"
        >
          Beyanımı Tamamla
        </button>
      </div>
    </div>
  )
}
