import { createClient } from "@/lib/supabase/server"
import { bugunGorevTarihiTr } from "@/lib/services/operasyon-tarih-service"

export const dynamic = "force-dynamic"

type Gorev = {
  id: string
  fis_no: string | null
  ekip_adi: string | null
  gorev_tarihi: string | null
  musteri_adi: string | null
  urun_adi: string | null
  is_tipi: string | null
  il: string | null
  ilce: string | null
  toplam_is_zorluk_puani: number | null
  durum: string | null
  rota_sirasi: number | null
  randevu_blok: string | null
  ise_baslama_zamani: string | null
  is_bitis_zamani: string | null
  notlar: string | null
}

function zaman(value: string | null) {
  return value ? new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-"
}

export default async function EkipLideriGunlukIslerPage() {
  const supabase = await createClient()

  if (!supabase) {
    return <div className="bg-white p-4 text-black">Supabase bağlantısı yok.</div>
  }

  const { data } = await supabase
    .from("ekip_lideri_gunluk_gorevleri")
    .select(`
      id,
      fis_no,
      ekip_adi,
      gorev_tarihi,
      musteri_adi,
      urun_adi,
      is_tipi,
      il,
      ilce,
      toplam_is_zorluk_puani,
      durum,
      rota_sirasi,
      randevu_blok,
      ise_baslama_zamani,
      is_bitis_zamani,
      notlar
    `)
    .eq("gorev_tarihi", bugunGorevTarihiTr())
    .order("ekip_adi", { ascending: true })
    .order("rota_sirasi", { ascending: true })

  const gorevler = (data ?? []) as Gorev[]

  const toplamYuk = gorevler.reduce((t, g) => t + Number(g.toplam_is_zorluk_puani ?? 0), 0)
  const baslayan = gorevler.filter((g) => g.ise_baslama_zamani && !g.is_bitis_zamani).length
  const biten = gorevler.filter((g) => g.is_bitis_zamani).length

  return (
    <div className="min-h-screen bg-white p-2 text-[11px] text-black">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Ekip Lideri - Bugünkü İşler</h1>
      </div>

      <div className="mb-2 grid grid-cols-4 gap-1">
        <div className="rounded border bg-gray-50 p-2">İş: <b>{gorevler.length}</b></div>
        <div className="rounded border bg-gray-50 p-2">Toplam yük: <b>{toplamYuk}</b></div>
        <div className="rounded border bg-gray-50 p-2">Devam eden: <b>{baslayan}</b></div>
        <div className="rounded border bg-gray-50 p-2">Tamamlanan: <b>{biten}</b></div>
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              {["Sıra","Randevu","Fiş","Müşteri","Konum","Ürün","İş","Yük","Durum","Başlama","Bitiş","Not"].map((h) => (
                <th key={h} className="border px-1 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {gorevler.map((g) => (
              <tr key={g.id} className="h-7 hover:bg-yellow-50">
                <td className="border px-1 py-0.5 text-right">{g.rota_sirasi ?? "-"}</td>
                <td className="border px-1 py-0.5 whitespace-nowrap">{g.randevu_blok ?? "-"}</td>
                <td className="border px-1 py-0.5 whitespace-nowrap">{g.fis_no ?? "-"}</td>
                <td className="border px-1 py-0.5 max-w-[140px] truncate">{g.musteri_adi ?? "-"}</td>
                <td className="border px-1 py-0.5 max-w-[120px] truncate">{[g.il, g.ilce].filter(Boolean).join(" / ")}</td>
                <td className="border px-1 py-0.5 max-w-[260px] truncate" title={g.urun_adi ?? ""}>{g.urun_adi ?? "-"}</td>
                <td className="border px-1 py-0.5 whitespace-nowrap">{g.is_tipi ?? "-"}</td>
                <td className="border px-1 py-0.5 text-right font-bold">{g.toplam_is_zorluk_puani ?? 0}</td>
                <td className="border px-1 py-0.5 whitespace-nowrap">{g.durum ?? "-"}</td>
                <td className="border px-1 py-0.5">{zaman(g.ise_baslama_zamani)}</td>
                <td className="border px-1 py-0.5">{zaman(g.is_bitis_zamani)}</td>
                <td className="border px-1 py-0.5 max-w-[200px] truncate">{g.notlar ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
