"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function EkiplerPage() {
  const router = useRouter()

  const [personel, setPersonel] = useState<any>(null)
  const [profileRole, setProfileRole] = useState("")
  const [personeller, setPersoneller] = useState<any[]>([])
  const [aracVarliklari, setAracVarliklari] = useState<any[]>([])
  const [ekipler, setEkipler] = useState<any[]>([])
  const [uyeler, setUyeler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const aktifRol = (profileRole || personel?.rol || "").toLocaleLowerCase("tr-TR")

  const yoneticiMi = [
    "admin",
    "yonetici",
    "yönetici",
    "servis_yoneticisi",
    "ik_yoneticisi",
  ].includes(aktifRol)

  const yukle = useCallback(async () => {
    setLoading(true)

    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    if (!user) {
      router.replace("/portal/giris")
      return
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    setProfileRole(profileData?.role || "")

    const { data: p, error: personelError } = await supabase
      .from("personeller")
      .select("id, rol")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    if (personelError || !p) {
      router.replace("/portal/giris")
      return
    }

    setPersonel(p)

    const { data: personelData } = await supabase
      .from("personeller")
      .select("id, ad, soyad, rol, durum, lokasyon, bolge")
      .order("ad", { ascending: true })

    const { data: aracData } = await supabase
      .from("varliklar")
      .select("id, ad, plaka, marka, model")
      .eq("kategori", "Araç")
      .order("ad", { ascending: true })

    const { data: ekipData } = await supabase
      .from("ekipler")
      .select("id, ekip_adi, lider_personel_id, sorumlu_personel_id, arac_varlik_id, bolge, gorev, durum, aciklama, created_at")
      .eq("durum", "aktif")
      .order("created_at", { ascending: false })

    const { data: uyeData } = await supabase
      .from("ekip_uyeleri")
      .select("id, ekip_id, personel_id, rol, durum, created_at")
      .eq("durum", "aktif")
      .order("created_at", { ascending: true })

    setPersoneller(personelData || [])
    setAracVarliklari(aracData || [])
    setEkipler(ekipData || [])
    setUyeler(uyeData || [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    void yukle()
  }, [yukle])

  function personelAdi(id?: string | null) {
    const p = personeller.find((x) => x.id === id)
    if (!p) return "-"
    return `${p.ad || ""} ${p.soyad || ""}`.trim()
  }

  function aracAdi(id?: string | null) {
    const a = aracVarliklari.find((x) => x.id === id)
    if (!a) return "-"
    return a.plaka
      ? `${a.plaka} - ${a.marka || ""} ${a.model || ""}`
      : a.ad || "-"
  }

  function ekipUyeleri(ekipId: string) {
    return uyeler.filter((u) => u.ekip_id === ekipId)
  }

  const benimEkiplerim = useMemo(() => {
    if (!personel?.id) return []

    const dahilOldugumEkipIds = uyeler
      .filter((u) => u.personel_id === personel.id)
      .map((u) => u.ekip_id)

    return ekipler.filter(
      (e) =>
        dahilOldugumEkipIds.includes(e.id) ||
        e.lider_personel_id === personel.id ||
        e.sorumlu_personel_id === personel.id,
    )
  }, [ekipler, uyeler, personel])

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
          <h1 className="text-xl font-black text-gray-900">Ekibim</h1>
          <p className="text-xs font-semibold text-gray-700">
            Bağlı olduğunuz ekip, lider, araç ve görev bilgileri
          </p>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {yoneticiMi && (
          <button
            type="button"
            onClick={() => router.push("/portal/yonetim/ekipler")}
            className="w-full rounded-2xl bg-blue-700 p-4 text-left text-white shadow-md active:scale-95 transition-transform"
          >
            <p className="text-lg font-black">Ekip Yönetimine Git</p>
            <p className="text-sm opacity-90">
              Ekip oluşturma, düzenleme ve personel ekleme
            </p>
          </button>
        )}

        {benimEkiplerim.length === 0 ? (
          <div className="rounded-2xl border border-gray-300 bg-white p-6 text-center">
            <p className="text-4xl mb-2">👥</p>
            <p className="font-black text-gray-900">Aktif ekip bulunmuyor</p>
            <p className="mt-1 text-sm font-semibold text-gray-600">
              Şu anda bağlı olduğunuz bir ekip yok.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {benimEkiplerim.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl border border-blue-300 bg-blue-50 p-4 shadow-sm"
              >
                <div className="rounded-xl bg-white border border-blue-200 p-4">
                  <p className="text-xs font-bold text-blue-800">Ekip Adı</p>
                  <p className="text-2xl font-black text-gray-900">
                    {e.ekip_adi}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-bold text-gray-600">Görev</p>
                      <p className="font-black text-gray-900">
                        {e.gorev || "-"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-bold text-gray-600">Bölge</p>
                      <p className="font-black text-gray-900">
                        {e.bolge || "-"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-bold text-gray-600">Araç</p>
                      <p className="font-black text-gray-900">
                        {aracAdi(e.arac_varlik_id)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-bold text-gray-600">Durum</p>
                      <p className="font-black text-green-800">
                        {e.durum || "aktif"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-xs font-bold text-gray-600">Lider</p>
                      <p className="font-black text-gray-900">
                        {personelAdi(e.lider_personel_id)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-xs font-bold text-gray-600">Sorumlu</p>
                      <p className="font-black text-gray-900">
                        {personelAdi(e.sorumlu_personel_id)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-black text-gray-800 mb-2">
                      Ekip Üyeleri
                    </p>

                    {ekipUyeleri(e.id).length === 0 ? (
                      <p className="text-xs font-semibold text-gray-600">
                        Üye yok.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {ekipUyeleri(e.id).map((u) => (
                          <div
                            key={u.id}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                          >
                            <p className="text-sm font-black text-gray-900">
                              {personelAdi(u.personel_id)}
                            </p>
                            <p className="text-xs font-semibold text-gray-600">
                              Rol: {u.rol}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {e.aciklama && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-xs font-bold text-gray-600">Açıklama</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {e.aciklama}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
