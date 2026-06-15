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
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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

  const aktifKonu = konular.find((k) => k.id === aktifKonuId)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
          <h1 className="text-3xl font-black">Personel İletişim Merkezi</h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            Personel arası mesajlaşma ve hızlı iç iletişim.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/60 p-4 text-sm font-bold text-red-100">
            {hata}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center font-bold text-slate-300">
            Yükleniyor...
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-4">
              <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl">
                <h2 className="text-lg font-black">Yeni Sohbet</h2>

                <select
                  value={seciliPersonelId}
                  onChange={(e) => setSeciliPersonelId(e.target.value)}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm font-bold text-white outline-none"
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
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/40 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Sohbet Başlat
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl">
                <h2 className="text-lg font-black">Sohbetler</h2>

                <div className="mt-4 space-y-3">
                  {konular.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">
                      Henüz sohbet yok.
                    </p>
                  ) : (
                    konular.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setAktifKonuId(k.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          aktifKonuId === k.id
                            ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-950/50"
                            : "border-white/10 bg-slate-950 text-white hover:bg-slate-800"
                        }`}
                      >
                        <p className="font-black">{k.baslik || "Sohbet"}</p>
                        <p className="mt-1 text-xs text-slate-300">{tarih(k.son_mesaj_at || k.created_at)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="flex min-h-[700px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="border-b border-white/10 bg-slate-900 p-5">
                  <h2 className="text-xl font-black text-white">
                    {aktifKonu?.baslik || "Sohbet seçilmedi"}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-300">
                    Oturum: {adSoyad(ben)}
                  </p>
                </div>

                <div className="flex-1 space-y-4 overflow-auto bg-slate-950 p-5">
                  {aktifMesajlar.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
                      Mesaj yok.
                    </div>
                  ) : (
                    aktifMesajlar.map((m) => {
                      const benim = m.gonderen_personel_id === ben?.id
                      const gonderen = personelMap.get(m.gonderen_personel_id)

                      return (
                        <div key={m.id} className={`flex ${benim ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] rounded-3xl border p-4 ${
                              benim
                                ? "border-blue-400/30 bg-blue-600 text-white"
                                : m.sistem_mesaji_mi
                                  ? "border-slate-600 bg-slate-800 text-white"
                                  : "border-white/10 bg-slate-800 text-white"
                            }`}
                          >
                            <p className="text-xs font-black text-blue-100">
                              {m.sistem_mesaji_mi ? "Sistem" : adSoyad(gonderen)}
                            </p>
                            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed">
                              {m.mesaj_icerik}
                            </p>
                            <p className="mt-3 text-[11px] font-semibold text-slate-300">
                              {tarih(m.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="border-t border-white/10 bg-slate-900 p-5">
                  <div className="flex gap-3">
                    <textarea
                      value={mesaj}
                      onChange={(e) => setMesaj(e.target.value)}
                      disabled={!aktifKonuId}
                      placeholder="Mesaj yaz..."
                      className="min-h-20 flex-1 rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 disabled:bg-slate-800"
                    />

                    <button
                      type="button"
                      onClick={mesajGonder}
                      disabled={kaydediliyor || !aktifKonuId || !mesaj.trim()}
                      className="w-32 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/40 disabled:bg-slate-700 disabled:text-slate-400"
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
