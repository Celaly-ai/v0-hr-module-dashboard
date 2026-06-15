"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Personel = {
  id: string
  personel_kodu: string | null
  ad: string | null
  soyad: string | null
  auth_id: string | null
  rol: string | null
  durum: string | null
  sirket_id: string | null
}

type Konu = {
  id: string
  baslik: string | null
  son_mesaj_at: string | null
  created_at: string | null
}

type Mesaj = {
  id: string
  konu_id: string
  gonderen_personel_id: string
  mesaj_icerik: string | null
  created_at: string | null
  sistem_mesaji_mi: boolean | null
}

function adSoyad(p?: Personel | null) {
  return `${p?.ad || ""} ${p?.soyad || ""}`.trim() || "Personel"
}

function tarih(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

export default function IletisimPage() {
  const supabase = useMemo(() => createClient(), [])

  const [ben, setBen] = useState<Personel | null>(null)
  const [rehber, setRehber] = useState<Personel[]>([])
  const [konular, setKonular] = useState<Konu[]>([])
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([])
  const [aktifKonuId, setAktifKonuId] = useState("")
  const [seciliPersonelId, setSeciliPersonelId] = useState("")
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const personelMap = useMemo(() => {
    const map = new Map<string, Personel>()
    rehber.forEach((p) => map.set(p.id, p))
    if (ben) map.set(ben.id, ben)
    return map
  }, [rehber, ben])

  const aktifMesajlar = mesajlar.filter((m) => m.konu_id === aktifKonuId)

  async function yukle() {
    setLoading(true)
    setHata("")

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setHata("Oturum bulunamadı.")
      setLoading(false)
      return
    }

    const { data: benData, error: benError } = await supabase
      .from("v_iletisim_personel_rehberi")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle()

    if (benError || !benData) {
      setHata("Personel iletişim kaydı bulunamadı.")
      setLoading(false)
      return
    }

    setBen(benData)

    const { data: rehberData, error: rehberError } = await supabase
      .from("v_iletisim_personel_rehberi")
      .select("*")
      .eq("sirket_id", benData.sirket_id)
      .eq("durum", "aktif")
      .order("ad")

    if (rehberError) {
      setHata("Rehber okunamadı: " + rehberError.message)
      setLoading(false)
      return
    }

    setRehber(rehberData || [])

    const { data: katilimlar, error: katilimError } = await supabase
      .from("iletisim_katilimcilari")
      .select("konu_id")
      .eq("personel_id", benData.id)

    if (katilimError) {
      setHata("Sohbetler okunamadı: " + katilimError.message)
      setLoading(false)
      return
    }

    const konuIds = (katilimlar || []).map((k) => k.konu_id)

    if (konuIds.length === 0) {
      setKonular([])
      setMesajlar([])
      setAktifKonuId("")
      setLoading(false)
      return
    }

    const { data: konuData } = await supabase
      .from("iletisim_konulari")
      .select("id, baslik, son_mesaj_at, created_at")
      .in("id", konuIds)
      .order("son_mesaj_at", { ascending: false })

    const { data: mesajData } = await supabase
      .from("iletisim_mesajlari")
      .select("id, konu_id, gonderen_personel_id, mesaj_icerik, created_at, sistem_mesaji_mi")
      .in("konu_id", konuIds)
      .order("created_at", { ascending: true })

    setKonular(konuData || [])
    setMesajlar(mesajData || [])

    if (!aktifKonuId && konuData?.[0]?.id) setAktifKonuId(konuData[0].id)

    setLoading(false)
  }

  useEffect(() => {
    void yukle()
  }, [])

  async function sohbetBaslat() {
    if (!ben || !seciliPersonelId) return

    setKaydediliyor(true)
    setHata("")

    const diger = rehber.find((p) => p.id === seciliPersonelId)
    const baslik = `${adSoyad(ben)} - ${adSoyad(diger)}`

    const { data: konu, error: konuError } = await supabase
      .from("iletisim_konulari")
      .insert({
        sirket_id: ben.sirket_id,
        konu_tipi: "personel_mesaj",
        baslik,
        olusturan_personel_id: ben.id,
        durum: "aktif",
        son_mesaj_at: new Date().toISOString(),
        son_mesaj_gonderen_personel_id: ben.id,
      })
      .select("id")
      .single()

    if (konuError || !konu?.id) {
      setHata("Sohbet başlatılamadı: " + (konuError?.message || ""))
      setKaydediliyor(false)
      return
    }

    const { error: katilimError } = await supabase.from("iletisim_katilimcilari").insert([
      { konu_id: konu.id, personel_id: ben.id, katilimci_rolu: "olusturan", son_okuma_at: new Date().toISOString() },
      { konu_id: konu.id, personel_id: seciliPersonelId, katilimci_rolu: "katilimci" },
    ])

    if (katilimError) {
      setHata("Katılımcılar oluşturulamadı: " + katilimError.message)
      setKaydediliyor(false)
      return
    }

    await supabase.from("iletisim_mesajlari").insert({
      konu_id: konu.id,
      gonderen_personel_id: ben.id,
      mesaj_tipi: "metin",
      mesaj_icerik: "Sohbet başlatıldı.",
      onem_derecesi: "normal",
      sistem_mesaji_mi: true,
      ai_mesaji_mi: false,
    })

    setSeciliPersonelId("")
    setAktifKonuId(konu.id)
    await yukle()
    setKaydediliyor(false)
  }

  async function mesajGonder() {
    if (!ben || !aktifKonuId || !mesaj.trim()) return

    setKaydediliyor(true)
    setHata("")

    const simdi = new Date().toISOString()

    const { error } = await supabase.from("iletisim_mesajlari").insert({
      konu_id: aktifKonuId,
      gonderen_personel_id: ben.id,
      mesaj_tipi: "metin",
      mesaj_icerik: mesaj.trim(),
      onem_derecesi: "normal",
      sistem_mesaji_mi: false,
      ai_mesaji_mi: false,
    })

    if (error) {
      setHata("Mesaj gönderilemedi: " + error.message)
      setKaydediliyor(false)
      return
    }

    await supabase
      .from("iletisim_konulari")
      .update({
        son_mesaj_at: simdi,
        son_mesaj_gonderen_personel_id: ben.id,
      })
      .eq("id", aktifKonuId)

    setMesaj("")
    await yukle()
    setKaydediliyor(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Personel İletişim Merkezi</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Personel arası mesajlaşma ve hızlı iç iletişim.
          </p>
        </div>

        {hata && <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">{hata}</div>}

        {loading ? (
          <div className="rounded-2xl border bg-white p-10 text-center font-bold">Yükleniyor...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-4">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h2 className="font-black text-slate-950">Yeni Sohbet</h2>
                <select
                  value={seciliPersonelId}
                  onChange={(e) => setSeciliPersonelId(e.target.value)}
                  className="mt-3 w-full rounded-lg border p-3 text-sm font-bold"
                >
                  <option value="">Personel seç</option>
                  {rehber
                    .filter((p) => p.id !== ben?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {adSoyad(p)} - {p.rol || "-"}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={sohbetBaslat}
                  disabled={kaydediliyor || !seciliPersonelId}
                  className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  Sohbet Başlat
                </button>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h2 className="font-black text-slate-950">Sohbetler</h2>
                <div className="mt-3 space-y-2">
                  {konular.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-500">
                      Henüz sohbet yok.
                    </p>
                  ) : (
                    konular.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setAktifKonuId(k.id)}
                        className={`w-full rounded-xl border p-3 text-left ${
                          aktifKonuId === k.id ? "bg-slate-950 text-white" : "bg-white text-slate-950"
                        }`}
                      >
                        <p className="font-black">{k.baslik || "Sohbet"}</p>
                        <p className="mt-1 text-xs opacity-70">{tarih(k.son_mesaj_at || k.created_at)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="flex min-h-[650px] flex-col rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-4">
                  <h2 className="font-black text-slate-950">
                    {konular.find((k) => k.id === aktifKonuId)?.baslik || "Sohbet seçilmedi"}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">Oturum: {adSoyad(ben)}</p>
                </div>

                <div className="flex-1 space-y-3 overflow-auto p-4">
                  {aktifMesajlar.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">
                      Mesaj yok.
                    </div>
                  ) : (
                    aktifMesajlar.map((m) => {
                      const benim = m.gonderen_personel_id === ben?.id
                      const gonderen = personelMap.get(m.gonderen_personel_id)
                      return (
                        <div key={m.id} className={`flex ${benim ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl border p-3 ${benim ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
                            <p className="text-xs font-black opacity-70">{m.sistem_mesaji_mi ? "Sistem" : adSoyad(gonderen)}</p>
                            <p className="mt-1 whitespace-pre-line text-sm font-semibold">{m.mesaj_icerik}</p>
                            <p className="mt-2 text-[11px] opacity-70">{tarih(m.created_at)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <textarea
                      value={mesaj}
                      onChange={(e) => setMesaj(e.target.value)}
                      disabled={!aktifKonuId}
                      placeholder="Mesaj yaz..."
                      className="min-h-20 flex-1 rounded-xl border p-3 text-sm font-semibold disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={mesajGonder}
                      disabled={kaydediliyor || !aktifKonuId || !mesaj.trim()}
                      className="w-32 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      Gönder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
