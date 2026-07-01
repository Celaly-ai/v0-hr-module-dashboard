import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type SearchParams = { ekip?: string }

type Is = {
  id: string
  fis_no: string | null
  musteri_adi: string | null
  il: string | null
  ilce: string | null
  urun_adi: string | null
  is_tipi: string | null
  operasyon_asamasi: string | null
  kesin_atanan_ekip_id: string | null
  kesin_atanan_ekip_adi: string | null
  kesin_atama_skoru: number | null
  kesin_atama_tarihi: string | null
  toplam_is_zorluk_puani: number | null
  ekip_lideri_ekranina_aktar: boolean | null
}

type EkipOzet = {
  kesin_atanan_ekip_adi: string | null
  is_adedi: number
  toplam_yuk: number
}

type Ekip = { id: string; ekip_adi: string | null }

function tarih(v: string | null) {
  return v ? new Date(v).toLocaleString("tr-TR") : "-"
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const seciliEkip = params.ekip ?? "all"
  const supabase = await createClient()
  if (!supabase) return <div>Supabase bağlantısı yok</div>

  let query = supabase
    .from("aktif_operasyon_havuzu_v2")
    .select("id,fis_no,musteri_adi,il,ilce,urun_adi,is_tipi,operasyon_asamasi,kesin_atanan_ekip_id,kesin_atanan_ekip_adi,kesin_atama_skoru,kesin_atama_tarihi,toplam_is_zorluk_puani,ekip_lideri_ekranina_aktar")
    .not("kesin_atanan_ekip_id", "is", null)
    .order("kesin_atama_tarihi", { ascending: false })

  if (seciliEkip !== "all") query = query.eq("kesin_atanan_ekip_id", seciliEkip)

  const { data } = await query.limit(200)
  const { data: ekiplerRaw } = await supabase.from("ekipler").select("id,ekip_adi").eq("aktif", true).order("ekip_adi")

  const isler = (data ?? []) as Is[]
  const ekipler = (ekiplerRaw ?? []) as Ekip[]

  const ozetMap = new Map<string, EkipOzet>()
  for (const item of isler) {
    const key = item.kesin_atanan_ekip_adi ?? "Bilinmeyen"
    const eski = ozetMap.get(key) ?? { kesin_atanan_ekip_adi: key, is_adedi: 0, toplam_yuk: 0 }
    eski.is_adedi += 1
    eski.toplam_yuk += Number(item.toplam_is_zorluk_puani ?? 0)
    ozetMap.set(key, eski)
  }
  const ozet = Array.from(ozetMap.values())

  return (
    <div className="min-h-screen bg-white p-2 text-[11px] text-black">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Atanmış İşler</h1>
        <div className="flex gap-1">
          <Link className="rounded border px-2 py-1" href="/portal/operasyon-havuzu">Atanacak</Link>
          <Link className="rounded border px-2 py-1" href="/portal/operasyon-havuzu/atanmis">Atanmış</Link>
        </div>
      </div>

      <form className="mb-2 flex items-center gap-2">
        <label className="font-semibold">Ekip filtresi:</label>
        <select name="ekip" defaultValue={seciliEkip} className="rounded border px-2 py-1">
          <option value="all">Tüm ekipler</option>
          {ekipler.map(e => <option key={e.id} value={e.id}>{e.ekip_adi}</option>)}
        </select>
        <button className="rounded border px-3 py-1">Uygula</button>
      </form>

      <div className="mb-2 grid grid-cols-3 gap-1">
        <div className="rounded border bg-gray-50 p-2">Atanmış: <b>{isler.length}</b></div>
        <div className="rounded border bg-gray-50 p-2">Toplam yük: <b>{isler.reduce((t, i) => t + Number(i.toplam_is_zorluk_puani ?? 0), 0)}</b></div>
        <div className="rounded border bg-gray-50 p-2">Lider ekranına aktarılan: <b>{isler.filter(i => i.ekip_lideri_ekranina_aktar).length}</b></div>
      </div>

      <div className="mb-2 rounded border">
        <div className="border-b bg-gray-100 px-2 py-1 font-semibold">Atanan Ekip Yük Özeti</div>
        <table className="w-full border-collapse">
          <thead><tr><th className="border px-1 py-1 text-left">Ekip</th><th className="border px-1 py-1 text-right">İş</th><th className="border px-1 py-1 text-right">Toplam Yük</th></tr></thead>
          <tbody>
            {ozet.map(e => (
              <tr key={e.kesin_atanan_ekip_adi ?? "x"}>
                <td className="border px-1 py-1 font-semibold">{e.kesin_atanan_ekip_adi}</td>
                <td className="border px-1 py-1 text-right">{e.is_adedi}</td>
                <td className="border px-1 py-1 text-right font-bold">{e.toplam_yuk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full min-w-[1250px] border-collapse">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              {["Fiş","Müşteri","Konum","Ürün","İş","Durum","Kesin Ekip","Skor","Yük","Atama Tarihi","Lider"].map(h => (
                <th key={h} className="border px-1 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isler.map(i => (
              <tr key={i.id} className="h-7 hover:bg-yellow-50">
                <td className="border px-1 py-0.5">{i.fis_no}</td>
                <td className="border px-1 py-0.5 truncate max-w-[130px]">{i.musteri_adi}</td>
                <td className="border px-1 py-0.5">{[i.il, i.ilce].filter(Boolean).join(" / ")}</td>
                <td className="border px-1 py-0.5 truncate max-w-[300px]" title={i.urun_adi ?? ""}>{i.urun_adi}</td>
                <td className="border px-1 py-0.5">{i.is_tipi}</td>
                <td className="border px-1 py-0.5">{i.operasyon_asamasi}</td>
                <td className="border px-1 py-0.5 font-semibold">{i.kesin_atanan_ekip_adi}</td>
                <td className="border px-1 py-0.5 text-right">{i.kesin_atama_skoru}</td>
                <td className="border px-1 py-0.5 text-right font-bold">{i.toplam_is_zorluk_puani}</td>
                <td className="border px-1 py-0.5">{tarih(i.kesin_atama_tarihi)}</td>
                <td className="border px-1 py-0.5">{i.ekip_lideri_ekranina_aktar ? "Aktarıldı" : "Bekliyor"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
