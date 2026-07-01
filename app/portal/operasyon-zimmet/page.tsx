"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Zimmet = {
  id: string
  ekip_adi: string | null
  rota_sirasi: number | null
  randevu_blok: string | null
  musteri_adi: string | null
  telefon: string | null
  ilce: string | null
  mahalle: string | null
  planlanan_is_tipi: string | null
  toplam_is_zorluk_puani: number | null
  adres_tanimlandi: boolean | null
  adrese_varildi: boolean | null
  operasyon_durumu: string | null
  sonuc_tamamlandi: boolean | null
  durum: string | null
}

type Detay = {
  id: string
  operasyon_zimmet_id: string | null
  fis_no: string | null
  urun_adi: string | null
  mevcut_konum_tipi: string | null
  mevcut_konum_adi: string | null
  zimmete_alindi: boolean | null
  barkod_dogrulandi: boolean | null
  seri_no_dogrulandi: boolean | null
  durum: string | null
}

type Kart = {
  key: string
  zimmetler: Zimmet[]
  urunler: Detay[]
}

export default function OperasyonZimmetPage() {
  const supabase = useMemo(() => createClient(), [])

  const [zimmetler, setZimmetler] = useState<Zimmet[]>([])
  const [detaylar, setDetaylar] = useState<Detay[]>([])
  const [loading, setLoading] = useState(true)
  const [iptalZimmetId, setIptalZimmetId] = useState<string>("")
  const [iptalNedeni, setIptalNedeni] = useState("")
  const [islem, setIslem] = useState(false)

  async function verileriYukle() {
    setLoading(true)

    const { data: zData } = await supabase
      .from("operasyon_zimmetleri")
      .select(`
        id,
        ekip_adi,
        rota_sirasi,
        randevu_blok,
        musteri_adi,
        telefon,
        ilce,
        mahalle,
        planlanan_is_tipi,
        toplam_is_zorluk_puani,
        adres_tanimlandi,
        adrese_varildi,
        operasyon_durumu,
        sonuc_tamamlandi,
        durum
      `)
      .order("rota_sirasi", { ascending: true })

    const { data: dData } = await supabase
      .from("operasyon_zimmet_detaylari")
      .select(`
        id,
        operasyon_zimmet_id,
        fis_no,
        urun_adi,
        mevcut_konum_tipi,
        mevcut_konum_adi,
        zimmete_alindi,
        barkod_dogrulandi,
        seri_no_dogrulandi,
        durum
      `)

    setZimmetler((zData || []) as Zimmet[])
    setDetaylar((dData || []) as Detay[])
    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  const kartlar = useMemo(() => {
    const map = new Map<string, Kart>()

    for (const z of zimmetler) {
      const key = [
        z.ekip_adi || "",
        z.musteri_adi || "",
        z.telefon || "",
        z.ilce || "",
        z.mahalle || "",
      ].join("|")

      const mevcut = map.get(key)

      if (!mevcut) {
        map.set(key, {
          key,
          zimmetler: [z],
          urunler: [],
        })
      } else {
        mevcut.zimmetler.push(z)
      }
    }

    for (const kart of map.values()) {
      const zimmetIds = new Set(kart.zimmetler.map((z) => z.id))
      kart.urunler = detaylar.filter((d) => d.operasyon_zimmet_id && zimmetIds.has(d.operasyon_zimmet_id))
    }

    return Array.from(map.values()).sort((a, b) => {
      const aa = a.zimmetler[0]?.rota_sirasi ?? 9999
      const bb = b.zimmetler[0]?.rota_sirasi ?? 9999
      return aa - bb
    })
  }, [zimmetler, detaylar])

  async function iptalKaydet() {
    if (!iptalZimmetId || !iptalNedeni.trim()) return

    setIslem(true)

    const response = await fetch("/api/operasyon-zimmet/iptal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zimmet_id: iptalZimmetId,
        iptal_nedeni: iptalNedeni.trim(),
      }),
    })

    setIslem(false)

    if (response.ok) {
      setIptalZimmetId("")
      setIptalNedeni("")
      await verileriYukle()
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-950">
      <div className="mx-auto max-w-md space-y-3">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-blue-700">FeyRoute</p>
          <h1 className="text-xl font-black">Operasyon Zimmet Merkezi</h1>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Mobil saha ekranı
          </p>
        </header>

        <section className="grid grid-cols-2 gap-2">
          <Kpi title="Müşteri" value={kartlar.length} />
          <Kpi title="Ürün" value={detaylar.length} />
          <Kpi title="AT" value={zimmetler.filter((z) => z.adres_tanimlandi).length} />
          <Kpi title="Biten" value={zimmetler.filter((z) => z.sonuc_tamamlandi).length} />
        </section>

        {loading && (
          <div className="rounded-2xl bg-white p-4 text-center text-sm font-black">
            Yükleniyor...
          </div>
        )}

        {kartlar.map((kart) => {
          const ilk = kart.zimmetler[0]
          const toplamYuk = kart.zimmetler.reduce((t, z) => t + Number(z.toplam_is_zorluk_puani || 0), 0)
          const dogrulanan = kart.urunler.filter((u) => u.zimmete_alindi).length
          const bekleyen = Math.max(kart.urunler.length - dogrulanan, 0)
          const atTamam = kart.zimmetler.some((z) => z.adres_tanimlandi)
          const adreseVarildi = kart.zimmetler.some((z) => z.adrese_varildi)
          const tamamlandi = kart.zimmetler.every((z) => z.sonuc_tamamlandi)

          return (
            <section key={kart.key} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-500">
                      #{ilk?.rota_sirasi ?? "-"} · {ilk?.randevu_blok ?? "Randevu yok"}
                    </p>
                    <h2 className="mt-1 text-lg font-black leading-tight">
                      {ilk?.musteri_adi || "-"}
                    </h2>
                    <p className="text-sm font-bold text-slate-600">☎ {ilk?.telefon || "-"}</p>
                    <p className="text-sm font-bold text-slate-600">
                      📍 {[ilk?.ilce, ilk?.mahalle].filter(Boolean).join(" / ") || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
                    <p className="text-xs font-black text-blue-700">İş</p>
                    <p className="text-lg font-black text-blue-900">{ilk?.planlanan_is_tipi || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
                  <Info title="Ürün" value={kart.urunler.length} />
                  <Info title="Hazır" value={`${dogrulanan}/${kart.urunler.length}`} />
                  <Info title="Yük" value={toplamYuk} />
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs font-black">
                  <p>
                    Adres:{" "}
                    {atTamam
                      ? "🟢 AT tamamlandı"
                      : adreseVarildi
                        ? "🟡 AT bekliyor"
                        : "🔴 Adrese varılmadı"}
                  </p>
                  <p className="mt-1">
                    Ürün: {bekleyen === 0 && kart.urunler.length > 0 ? "🟢 Tüm ürünler hazır" : `🟡 ${bekleyen} ürün bekliyor`}
                  </p>
                  <p className="mt-1">
                    Durum: {tamamlandi ? "Tamamlandı" : ilk?.operasyon_durumu || ilk?.durum || "-"}
                  </p>
                </div>

                <button
                  disabled={!adreseVarildi || atTamam || tamamlandi}
                  className="w-full rounded-xl bg-slate-900 px-3 py-3 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {atTamam ? "📍 AT ✓" : adreseVarildi ? "📍 AT Yap" : "📍 AT Kilitli"}
                </button>

                <div className="grid grid-cols-4 gap-1">
                  <Sonuc label="🚚🔧 NM" disabled={!atTamam || tamamlandi} />
                  <Sonuc label="🚚 N" disabled={!atTamam || tamamlandi} />
                  <Sonuc label="🔧 M" disabled={!atTamam || tamamlandi} />
                  <button
                    disabled={tamamlandi}
                    onClick={() => setIptalZimmetId(ilk.id)}
                    className="rounded-xl bg-red-600 px-2 py-3 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    ⛔ İ
                  </button>
                </div>
              </div>

              <details className="border-t">
                <summary className="cursor-pointer list-none p-4 text-sm font-black text-blue-700">
                  Ürünler ({kart.urunler.length})
                </summary>

                <div className="space-y-2 border-t bg-slate-50 p-3">
                  {kart.urunler.map((u) => (
                    <div key={u.id} className="rounded-xl border bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-slate-500">{u.fis_no || "-"}</p>
                          <p className="mt-1 text-sm font-black leading-tight">{u.urun_adi || "-"}</p>
                          <p className="mt-2 text-xs font-bold text-slate-600">
                            Konum: {u.mevcut_konum_tipi || "-"} {u.mevcut_konum_adi ? `· ${u.mevcut_konum_adi}` : ""}
                          </p>
                          <p className="text-xs font-bold text-slate-600">
                            Durum: {u.durum || "-"}
                          </p>
                        </div>
                        <div className="text-xl">{u.zimmete_alindi ? "✅" : "□"}</div>
                      </div>

                      <button className="mt-3 w-full rounded-xl border border-blue-700 px-3 py-2 text-sm font-black text-blue-700">
                        📷 Ürünü Teslim Al
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            </section>
          )
        })}
      </div>

      {iptalZimmetId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-3">
          <div className="w-full rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-lg font-black text-red-700">İş İptali</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              İptal nedeni zorunludur.
            </p>

            <textarea
              value={iptalNedeni}
              onChange={(e) => setIptalNedeni(e.target.value)}
              placeholder="İptal nedeni yaz..."
              className="mt-3 min-h-28 w-full rounded-xl border p-3 text-sm font-bold outline-none"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIptalZimmetId("")
                  setIptalNedeni("")
                }}
                className="rounded-xl border px-3 py-3 text-sm font-black"
              >
                Vazgeç
              </button>

              <button
                disabled={!iptalNedeni.trim() || islem}
                onClick={() => void iptalKaydet()}
                className="rounded-xl bg-red-600 px-3 py-3 text-sm font-black text-white disabled:bg-slate-300"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}

function Info({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-2">
      {title}<br />
      <span className="text-base">{value}</span>
    </div>
  )
}

function Sonuc({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className="rounded-xl bg-slate-900 px-2 py-3 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-400"
    >
      {disabled ? `${label} 🔒` : label}
    </button>
  )
}
