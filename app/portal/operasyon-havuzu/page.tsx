import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type SearchParams = { ekip?: string }

type Operasyon = {
  id: string
  fis_no: string | null
  musteri_adi: string | null
  telefon: string | null
  il: string | null
  ilce: string | null
  urun_adi: string | null
  is_tipi: string | null
  randevu_tarihi: string | null
  zaman_slotu: string | null
  rota_sirasi: number | null
  kritik_cagri: boolean | null
  toplam_is_zorluk_puani: number | null
  toplu_musteri: boolean | null
  toplu_musteri_urun_sayisi: number | null
  basvuru_notu: string | null
  ai_oneri_1_ekip_id: string | null
  ai_oneri_1_ekip_adi: string | null
  ai_oneri_1_skor: number | null
  ai_oneri_2_ekip_id: string | null
  ai_oneri_2_ekip_adi: string | null
  ai_oneri_2_skor: number | null
  ai_oneri_3_ekip_id: string | null
  ai_oneri_3_ekip_adi: string | null
  ai_oneri_3_skor: number | null
}

type Ekip = { id: string; ekip_adi: string | null }

function skor(v: number | null) {
  return v == null ? "-" : Number(v).toFixed(0)
}

function isKisa(v: string | null) {
  const t = (v ?? "").toUpperCase()
  const nakliye = t.includes("NAKLIYE") || t.includes("NAKLİYE")
  const montaj = t.includes("MONTAJ")
  if (nakliye && montaj) return "NM"
  if (nakliye) return "N"
  if (montaj) return "M"
  return v ?? "-"
}

function saat(v: string | null, slot: string | null) {
  if (slot) return slot
  if (!v) return "-"
  return new Date(v).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
}

function ekipValue(id: string | null, ad: string | null, puan: number | null) {
  if (!id || !ad) return ""
  return `${id}|${ad}|${puan ?? 0}`
}

function EkipSecim({ op }: { op: Operasyon }) {
  return (
    <div className="flex gap-1">
      <form action="/api/operasyon/randevu-beklet" method="post">
        <input type="hidden" name="operasyonId" value={op.id} />
        <button
          type="submit"
          className="h-6 w-6 rounded border border-red-400 bg-white text-xs font-bold text-red-700 hover:bg-red-100"
          title="İşi operasyondan çıkar, randevu beklemeye al"
        >
          İ
        </button>
      </form>

      <form action="/api/operasyon/atama-onayla" method="post" className="flex gap-1">
        <input type="hidden" name="operasyonId" value={op.id} />
        <input type="hidden" name="fisNo" value={op.fis_no ?? ""} />

        <select
          name="ekipSecim"
          defaultValue={ekipValue(op.ai_oneri_1_ekip_id, op.ai_oneri_1_ekip_adi, op.ai_oneri_1_skor)}
          className="h-6 w-[88px] rounded border border-gray-400 bg-white px-1 text-[10px]"
        >
          {op.ai_oneri_1_ekip_id && (
            <option value={ekipValue(op.ai_oneri_1_ekip_id, op.ai_oneri_1_ekip_adi, op.ai_oneri_1_skor)}>
              {op.ai_oneri_1_ekip_adi} / {skor(op.ai_oneri_1_skor)}
            </option>
          )}
          {op.ai_oneri_2_ekip_id && (
            <option value={ekipValue(op.ai_oneri_2_ekip_id, op.ai_oneri_2_ekip_adi, op.ai_oneri_2_skor)}>
              {op.ai_oneri_2_ekip_adi} / {skor(op.ai_oneri_2_skor)}
            </option>
          )}
          {op.ai_oneri_3_ekip_id && (
            <option value={ekipValue(op.ai_oneri_3_ekip_id, op.ai_oneri_3_ekip_adi, op.ai_oneri_3_skor)}>
              {op.ai_oneri_3_ekip_adi} / {skor(op.ai_oneri_3_skor)}
            </option>
          )}
        </select>

        <button
          type="submit"
          className="h-6 rounded border border-green-500 bg-white px-1 text-[10px] font-bold text-green-700 hover:bg-green-100"
        >
          Onay
        </button>
      </form>
    </div>
  )
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const seciliEkip = params.ekip ?? "all"
  const supabase = await createClient()
  if (!supabase) return <div>Supabase bağlantısı yok</div>

  let query = supabase
    .from("aktif_operasyon_havuzu_v2")
    .select(`
      id,
      fis_no,
      musteri_adi,
      telefon,
      il,
      ilce,
      urun_adi,
      is_tipi,
      randevu_tarihi,
      zaman_slotu,
      rota_sirasi,
      kritik_cagri,
      toplam_is_zorluk_puani,
      toplu_musteri,
      toplu_musteri_urun_sayisi,
      basvuru_notu,
      ai_oneri_1_ekip_id,
      ai_oneri_1_ekip_adi,
      ai_oneri_1_skor,
      ai_oneri_2_ekip_id,
      ai_oneri_2_ekip_adi,
      ai_oneri_2_skor,
      ai_oneri_3_ekip_id,
      ai_oneri_3_ekip_adi,
      ai_oneri_3_skor
    `)
    .eq("atama_gerekli", true)
    .is("kesin_atanan_ekip_id", null)
    .or("operasyon_disina_alindi.is.null,operasyon_disina_alindi.eq.false")
    .or("is_tipi.ilike.%NAKLIYE%,is_tipi.ilike.%NAKLİYE%,is_tipi.ilike.%MONTAJ%")
    .order("telefon", { ascending: true })
    .order("musteri_adi", { ascending: true })
    .order("fis_no", { ascending: true })
    .order("randevu_tarihi", { ascending: true })
    .order("rota_sirasi", { ascending: true })
    .order("toplam_is_zorluk_puani", { ascending: false })

  if (seciliEkip !== "all") query = query.eq("ai_oneri_1_ekip_id", seciliEkip)

  const { data } = await query.limit(150)
  const { data: ekiplerRaw } = await supabase
    .from("ekipler")
    .select("id,ekip_adi")
    .eq("aktif", true)
    .order("ekip_adi")

  const operasyonlar = (data ?? []) as Operasyon[]
  const ekipler = (ekiplerRaw ?? []) as Ekip[]
  const toplamYuk = operasyonlar.reduce((t, o) => t + Number(o.toplam_is_zorluk_puani ?? 0), 0)

  return (
    <div className="min-h-screen bg-white p-2 text-[11px] text-black">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Operasyon Havuzu - Atanacak İşler</h1>
        <div className="flex gap-1">
          <Link className="rounded border px-2 py-1" href="/portal/operasyon-havuzu">Atanacak</Link>
          <Link className="rounded border px-2 py-1" href="/portal/operasyon-havuzu/atanmis">Atanmış</Link>
        </div>
      </div>

      <form className="mb-2 flex items-center gap-2">
        <label className="font-semibold">Ekip:</label>
        <select name="ekip" defaultValue={seciliEkip} className="rounded border px-2 py-1">
          <option value="all">Tümü</option>
          {ekipler.map((e) => (
            <option key={e.id} value={e.id}>{e.ekip_adi}</option>
          ))}
        </select>
        <button className="rounded border px-3 py-1">Uygula</button>
      </form>

      <div className="mb-2 grid grid-cols-4 gap-1">
        <div className="rounded border bg-gray-50 p-2">Atanacak: <b>{operasyonlar.length}</b></div>
        <div className="rounded border bg-gray-50 p-2">Toplam yük: <b>{toplamYuk}</b></div>
        <div className="rounded border bg-gray-50 p-2">Kritik: <b>{operasyonlar.filter((o) => o.kritik_cagri).length}</b></div>
        <div className="rounded border bg-gray-50 p-2">Çoklu ürün: <b>{operasyonlar.filter((o) => o.toplu_musteri || Number(o.toplu_musteri_urun_sayisi ?? 0) > 1).length}</b></div>
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full min-w-[1380px] border-collapse">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              {["İşlem", "Fiş", "Saat", "Sıra", "Müşteri", "Telefon", "Konum", "Ürün", "ÇÜ", "İş", "Yük", "Notlar"].map((h) => (
                <th key={h} className="border px-1 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {operasyonlar.map((op) => {
              const cokluUrun = Boolean(op.toplu_musteri) || Number(op.toplu_musteri_urun_sayisi ?? 0) > 1

              return (
                <tr
                  key={op.id}
                  className={`h-7 hover:bg-yellow-50 ${cokluUrun ? "bg-amber-100 font-semibold" : ""}`}
                >
                  <td className="border px-1 py-0.5 whitespace-nowrap">
                    <EkipSecim op={op} />
                  </td>
                  <td className="border px-1 py-0.5 whitespace-nowrap">{op.fis_no}</td>
                  <td className="border px-1 py-0.5 whitespace-nowrap">{saat(op.randevu_tarihi, op.zaman_slotu)}</td>
                  <td className="border px-1 py-0.5 text-right">{op.rota_sirasi ?? "-"}</td>
                  <td className="border px-1 py-0.5 max-w-[90px] truncate" title={op.musteri_adi ?? ""}>{op.musteri_adi}</td>
                  <td className="border px-1 py-0.5 whitespace-nowrap">{op.telefon ?? "-"}</td>
                  <td className="border px-1 py-0.5 max-w-[95px] truncate">{[op.il, op.ilce].filter(Boolean).join(" / ")}</td>
                  <td className="border px-1 py-0.5 max-w-[180px] truncate" title={op.urun_adi ?? ""}>{op.urun_adi}</td>
                  <td className="border px-1 py-0.5 text-center" title="Çoklu ürün">
                    {cokluUrun ? `ÇÜ${op.toplu_musteri_urun_sayisi ? `/${op.toplu_musteri_urun_sayisi}` : ""}` : "-"}
                  </td>
                  <td className="border px-1 py-0.5 text-center font-semibold">{isKisa(op.is_tipi)}</td>
                  <td className="border px-1 py-0.5 text-right font-bold">{op.toplam_is_zorluk_puani}</td>
                  <td className="border px-1 py-0.5 max-w-[220px] truncate" title={op.basvuru_notu ?? ""}>
                    {op.basvuru_notu ?? "-"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
