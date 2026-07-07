import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  HAVUZ_IS_SELECT,
  aronKaynakMi,
  kpiHesapla,
  type HavuzIs,
} from "@/lib/services/akilli-atama-merkezi-service"
import { IsKarti } from "./IsKarti"
import { OneriYenileButonu } from "./OneriYenileButonu"

export const dynamic = "force-dynamic"

type SearchParams = {
  ekip?: string
  atama?: string
  islem?: string
}

function ekipAktifMi(ekip: {
  aktif?: boolean | null
  durum?: string | null
}) {
  if (typeof ekip.aktif === "boolean") return ekip.aktif
  return ekip.durum !== "pasif"
}

function jokerMi(ekip: { calisma_tipi?: string | null }) {
  return ekip.calisma_tipi === "joker"
}

function jokerEkipSec<T extends { calisma_tipi?: string | null; oncelik?: number | null }>(
  ekipler: T[],
): T | null {
  const jokerEkipler = ekipler.filter(jokerMi)
  if (jokerEkipler.length === 0) return null

  return jokerEkipler.reduce((enIyi, ekip) => {
    const enIyiOncelik = enIyi.oncelik ?? 50
    const adayOncelik = ekip.oncelik ?? 50
    return adayOncelik < enIyiOncelik ? ekip : enIyi
  })
}

function islemMesaji(atama?: string, islem?: string) {
  if (atama === "ok") return "Atama onaylandı. Zimmet kaydı oluşturuldu."
  if (atama === "hata") return "Atama işlemi tamamlanamadı."
  if (atama === "eksik") return "Atama için gerekli bilgiler eksik."
  if (atama === "yetkisiz") return "Bu işlem için operasyon yöneticisi yetkisi gerekir."
  if (atama === "zaten_atandi") return "Bu iş zaten bir ekibe atanmış."
  if (islem === "randevu_bekliyor") return "İş randevu beklemeye alındı."
  if (islem === "atama_disi") return "İş atama dışı bırakıldı."
  if (islem === "hata") return "İşlem tamamlanamadı."
  if (islem === "eksik") return "İşlem için gerekli bilgiler eksik."
  if (islem === "yok") return "Operasyon kaydı bulunamadı."
  if (islem === "yetkisiz") return "Bu işlem için operasyon yöneticisi yetkisi gerekir."
  if (islem === "zaten_atandi") return "Bu iş zaten bir ekibe atanmış."
  if (islem === "atama_yok") return "Bu iş artık atama bekleyen listede değil."
  return null
}

function mesajBasariliMi(atama?: string, islem?: string) {
  if (atama === "ok") return true
  if (islem === "randevu_bekliyor" || islem === "atama_disi") return true
  return false
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const seciliEkip = params.ekip ?? "all"
  const mesaj = islemMesaji(params.atama, params.islem)

  const supabase = await createClient()
  if (!supabase) {
    return <div className="p-4">Supabase bağlantısı yok</div>
  }

  const { data: tumIslerRaw } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select(HAVUZ_IS_SELECT)
    .or("kaynak.is.null,kaynak.eq.ARON")
    .limit(500)

  const tumAronIsler = ((tumIslerRaw ?? []) as HavuzIs[]).filter((is) =>
    aronKaynakMi(is.kaynak),
  )

  const kpi = kpiHesapla(tumAronIsler)

  let atamaQuery = supabase
    .from("aktif_operasyon_havuzu_v2")
    .select(HAVUZ_IS_SELECT)
    .eq("atama_gerekli", true)
    .is("kesin_atanan_ekip_id", null)
    .or("operasyon_disina_alindi.is.null,operasyon_disina_alindi.eq.false")
    .or("kaynak.is.null,kaynak.eq.ARON")
    .order("kritik_cagri", { ascending: false })
    .order("acik_gun", { ascending: false })
    .order("randevu_tarihi", { ascending: true })
    .order("toplam_is_zorluk_puani", { ascending: false })

  if (seciliEkip !== "all") {
    atamaQuery = atamaQuery.or(
      `ai_oneri_1_ekip_id.eq.${seciliEkip},ai_onerilen_ekip.eq.${seciliEkip}`,
    )
  }

  const { data: atamaIsleriRaw } = await atamaQuery.limit(150)
  const atamaIsleri = ((atamaIsleriRaw ?? []) as HavuzIs[]).filter((is) =>
    aronKaynakMi(is.kaynak),
  )

  const { data: ekiplerRaw } = await supabase
    .from("ekipler")
    .select(
      "id, ekip_adi, gorev, gorev_tipi, calisma_tipi, oncelik, lider_personel_id, sorumlu_personel_id, arac_varlik_id, bolge, aktif, durum",
    )
    .order("ekip_adi")

  const aktifEkipler = (ekiplerRaw ?? []).filter((e) => ekipAktifMi(e))
  const jokerEkip = jokerEkipSec(aktifEkipler)

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-700">FeyRoute Operasyon</p>
              <h1 className="text-2xl font-black">Akıllı Atama Merkezi</h1>
              <p className="mt-1 text-sm font-bold text-slate-600">
                ARON aktif operasyonlar · Motor önerir, sorumlu onaylar
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/portal/operasyon-havuzu"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Klasik Havuz
              </Link>
              <Link
                href="/portal/hizmet-sure-katalogu"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Süre Kataloğu
              </Link>
              <Link
                href="/portal/operasyon-havuzu/atanmis"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Atanmış İşler
              </Link>
            </div>
          </div>
        </header>

        {mesaj && (
          <div
            className={`rounded-2xl border p-4 text-sm font-bold ${
              mesajBasariliMi(params.atama, params.islem)
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {mesaj}
          </div>
        )}

        <OneriYenileButonu />

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          <Kpi title="Toplam Aktif" value={kpi.toplamAktif} />
          <Kpi title="Atama Bekleyen" value={kpi.atamaBekleyen} highlight />
          <Kpi title="Başvuru" value={kpi.basvuru} />
          <Kpi title="Teknisyende" value={kpi.teknisyende} />
          <Kpi title="Randevulu" value={kpi.randevulu} />
          <Kpi title="Malzeme Temin" value={kpi.malzemeTemin} />
          <Kpi title="Servise Bekliyor" value={kpi.serviseGelmesiBekleniyor} />
          <Kpi title="Eksik Veri" value={kpi.eksikVeri} warn />
          <Kpi title="Hatalı Kayıt" value={kpi.hataliKayit} warn />
        </section>

        {kpi.hataliFisNolari.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-black text-amber-900">
              Eksik/hatalı veri fişleri (ilk {kpi.hataliFisNolari.length})
            </p>
            <p className="mt-1 text-xs font-bold text-amber-800">
              {kpi.hataliFisNolari.join(", ")}
            </p>
          </div>
        )}

        <form className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
          <label className="text-sm font-black text-slate-700">Ekip filtresi:</label>
          <select
            name="ekip"
            defaultValue={seciliEkip}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
          >
            <option value="all">Tümü</option>
            {aktifEkipler.map((e) => (
              <option key={e.id} value={e.id}>
                {e.ekip_adi}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
            Uygula
          </button>
        </form>

        <p className="text-sm font-black text-slate-600">
          Atama bekleyen işler ({atamaIsleri.length})
        </p>

        {atamaIsleri.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-slate-600">
            Atama bekleyen ARON işi bulunmuyor.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {atamaIsleri.map((is) => (
              <IsKarti
                key={is.id}
                is={is}
                aktifEkipler={aktifEkipler}
                jokerEkip={jokerEkip}
                adresHafiza={null}
              />
            ))}
        </div>
      </div>
    </main>
  )
}

function Kpi({
  title,
  value,
  highlight,
  warn,
}: {
  title: string
  value: number
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-3 text-center shadow-sm ${
        highlight
          ? "bg-blue-700 text-white"
          : warn
            ? "border border-amber-300 bg-amber-50"
            : "bg-white"
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-wide ${
          highlight ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {title}
      </p>
      <p className={`text-2xl font-black ${highlight ? "text-white" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  )
}
