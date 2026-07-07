"use client"

import { useState } from "react"
import type { EkipOneri } from "@/lib/services/akilli-atama-merkezi-service"
import { ekipSecimDegeri } from "@/lib/services/akilli-atama-merkezi-service"

const DONUS_YOLU = "/portal/akilli-atama-merkezi"

type AktifEkip = {
  id: string
  ekip_adi: string | null
  gorev: string | null
  gorev_tipi?: string | null
  calisma_tipi?: string | null
  oncelik?: number | null
  lider_personel_id?: string | null
  sorumlu_personel_id?: string | null
  arac_varlik_id?: string | null
  bolge?: string | null
}

type Props = {
  operasyonId: string
  fisNo: string | null
  oneriler: EkipOneri[]
  aktifEkipler: AktifEkip[]
  jokerEkip: AktifEkip | null
  varsayilanSecim: string
  veriKaliteSorunSayisi: number
}

function manuelEkipEtiketi(ekip: AktifEkip) {
  const ad = ekip.ekip_adi ?? "Ekip"
  const bilgi: string[] = []

  if (ekip.gorev_tipi) bilgi.push(ekip.gorev_tipi)
  if (ekip.calisma_tipi === "joker") bilgi.push("Joker")
  else if (ekip.calisma_tipi) bilgi.push(ekip.calisma_tipi)

  if (bilgi.length === 0) return `Başka ekip: ${ad}`
  return `Başka ekip: ${ad} · ${bilgi.join(" · ")}`
}

function butonSinifi(renk: "yesil" | "kirmizi" | "gri" | "turuncu") {
  const taban =
    "w-full rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
  switch (renk) {
    case "yesil":
      return `${taban} bg-emerald-700 text-white hover:bg-emerald-800`
    case "kirmizi":
      return `${taban} bg-red-600 text-white hover:bg-red-700`
    case "turuncu":
      return `${taban} bg-amber-600 text-white hover:bg-amber-700`
    default:
      return `${taban} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`
  }
}

export function AtamaIslemPanel({
  operasyonId,
  fisNo,
  oneriler,
  aktifEkipler,
  jokerEkip,
  varsayilanSecim,
  veriKaliteSorunSayisi,
}: Props) {
  const [gonderiliyor, setGonderiliyor] = useState(false)

  function onayMesaji() {
    if (veriKaliteSorunSayisi === 0) return true
    return window.confirm(
      `${veriKaliteSorunSayisi} veri kalite uyarısı var. Yine de teknisyene göndermek istiyor musunuz?`,
    )
  }

  function islemOnay(metin: string) {
    return window.confirm(metin)
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        Tek tek onay
      </p>

      <form
        action="/api/operasyon/atama-onayla"
        method="post"
        className="space-y-2"
        onSubmit={(e) => {
          if (!onayMesaji()) {
            e.preventDefault()
            return
          }
          setGonderiliyor(true)
        }}
      >
        <input type="hidden" name="operasyonId" value={operasyonId} />
        <input type="hidden" name="fisNo" value={fisNo ?? ""} />
        <input type="hidden" name="returnPath" value={DONUS_YOLU} />

        <label className="block text-xs font-black text-slate-600">
          Önerilen veya manuel ekip seçimi
        </label>
        <select
          name="ekipSecim"
          defaultValue={varsayilanSecim}
          required
          disabled={gonderiliyor}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900"
        >
          <option value="" disabled>
            Ekip seçin
          </option>
          {oneriler.map((o) => (
            <option
              key={`oneri-${o.ekip_id}`}
              value={ekipSecimDegeri(o.ekip_id, o.ekip_adi, o.skor)}
            >
              Öneri #{o.sira}: {o.ekip_adi} ({o.skor})
            </option>
          ))}
          {aktifEkipler
            .filter((e) => !oneriler.some((o) => o.ekip_id === e.id))
            .map((e) => (
              <option
                key={e.id}
                value={ekipSecimDegeri(e.id, e.ekip_adi ?? "Ekip", 0)}
              >
                {manuelEkipEtiketi(e)}
              </option>
            ))}
        </select>

        <button
          type="submit"
          disabled={gonderiliyor}
          className={butonSinifi("yesil")}
        >
          {gonderiliyor ? "Gönderiliyor..." : "Onayla ve Teknisyene Gönder"}
        </button>
      </form>

      {jokerEkip && (
        <form
          action="/api/operasyon/atama-onayla"
          method="post"
          onSubmit={(e) => {
            if (
              !islemOnay(
                `Fiş ${fisNo ?? "-"} joker ekibe (${jokerEkip.ekip_adi}) verilsin mi?`,
              )
            ) {
              e.preventDefault()
              return
            }
            setGonderiliyor(true)
          }}
        >
          <input type="hidden" name="operasyonId" value={operasyonId} />
          <input type="hidden" name="fisNo" value={fisNo ?? ""} />
          <input type="hidden" name="returnPath" value={DONUS_YOLU} />
          <input
            type="hidden"
            name="ekipSecim"
            value={ekipSecimDegeri(
              jokerEkip.id,
              jokerEkip.ekip_adi ?? "Joker",
              0,
            )}
          />
          <button
            type="submit"
            disabled={gonderiliyor}
            className={butonSinifi("turuncu")}
          >
            Joker Ekibe Ver ({jokerEkip.ekip_adi})
          </button>
        </form>
      )}

      <form
        action="/api/operasyon/randevu-beklet"
        method="post"
        onSubmit={(e) => {
          if (
            !islemOnay(
              `Fiş ${fisNo ?? "-"} randevu beklemeye alınsın mı? Atama kuyruğundan çıkar.`,
            )
          ) {
            e.preventDefault()
            return
          }
          setGonderiliyor(true)
        }}
      >
        <input type="hidden" name="operasyonId" value={operasyonId} />
        <input type="hidden" name="returnPath" value={DONUS_YOLU} />
        <button
          type="submit"
          disabled={gonderiliyor}
          className={butonSinifi("gri")}
        >
          Beklet (Randevu Kuyruğu)
        </button>
      </form>

      <form
        action="/api/operasyon/atama-disi"
        method="post"
        onSubmit={(e) => {
          if (
            !islemOnay(
              `Fiş ${fisNo ?? "-"} atama dışı bırakılsın mı? Bu iş teknisyene gönderilmez.`,
            )
          ) {
            e.preventDefault()
            return
          }
          setGonderiliyor(true)
        }}
      >
        <input type="hidden" name="operasyonId" value={operasyonId} />
        <input type="hidden" name="returnPath" value={DONUS_YOLU} />
        <button
          type="submit"
          disabled={gonderiliyor}
          className={butonSinifi("kirmizi")}
        >
          Atama Dışı Bırak
        </button>
      </form>
    </div>
  )
}
