import {
  type AdresHafizaOzet,
  type EkipOneri,
  type HavuzIs,
  durumEtiketi,
  ekipOnerileri,
  ekipSecimDegeri,
  isTipiKisa,
  randevuMetni,
  veriKaliteKontrol,
} from "@/lib/services/akilli-atama-merkezi-service"
import { detayliOneriGerekce, jokerOneriGerekce, jokerOnerisiGerekliMi } from "@/lib/services/atama-motoru-service"
import { AtamaIslemPanel } from "./AtamaIslemPanel"

type AktifEkip = {
  id: string
  ekip_adi: string | null
  gorev: string | null
}

type Props = {
  is: HavuzIs
  aktifEkipler: AktifEkip[]
  jokerEkip: AktifEkip | null
  adresHafiza: AdresHafizaOzet | null
}

function OneriSatiri({ oneri }: { oneri: EkipOneri }) {
  return (
    <p className="text-xs font-bold text-slate-700">
      #{oneri.sira} {oneri.ekip_adi}{" "}
      <span className="text-blue-700">({oneri.skor} puan)</span>
    </p>
  )
}

export function IsKarti({ is, aktifEkipler, jokerEkip, adresHafiza }: Props) {
  const oneriler = ekipOnerileri(is)
  const birinci = oneriler[0]
  const sorunlar = veriKaliteKontrol(is)
  const jokerOner = jokerOnerisiGerekliMi(is)
  const varsayilanSecim = birinci
    ? ekipSecimDegeri(birinci.ekip_id, birinci.ekip_adi, birinci.skor)
    : ""

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Fiş {is.fis_no ?? "-"}
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            {is.musteri_adi ?? "-"}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {durumEtiketi(is)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
          <p className="text-xs font-black text-slate-500">İş</p>
          <p className="text-lg font-black text-slate-900">{isTipiKisa(is.is_tipi)}</p>
        </div>
      </div>

      {sorunlar.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-black text-amber-900">Veri kalite uyarısı</p>
          <ul className="mt-1 space-y-0.5 text-xs font-bold text-amber-800">
            {sorunlar.map((s) => (
              <li key={s.kod}>• {s.mesaj}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Randevu" value={randevuMetni(is)} />
        <Info label="Telefon" value={is.telefon ?? "-"} />
        <Info
          label="Adres"
          value={[is.il, is.ilce, is.mahalle, is.adres].filter(Boolean).join(" / ") || "-"}
        />
        <Info label="Ürün" value={is.urun_adi ?? "-"} />
        <Info label="Model" value={is.urun_model_kodu ?? "-"} />
        <Info label="Seri No" value={is.seri_no ?? "-"} />
        <Info label="Marka" value={is.marka ?? "-"} />
        <Info
          label="Ref. Süre"
          value={is.referans_sure_dk ? `${is.referans_sure_dk} dk` : "-"}
        />
      </div>

      {is.basvuru_notu && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
          <span className="font-black text-slate-900">Operasyon notu:</span>{" "}
          {is.basvuru_notu}
        </div>
      )}

      {jokerOner && (
        <div className="mt-3 rounded-xl border border-orange-300 bg-orange-50 p-3">
          <p className="text-xs font-black text-orange-900">Joker ekip önerisi</p>
          <p className="mt-1 text-xs font-bold text-orange-800">
            {jokerOneriGerekce(is)}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <p className="text-xs font-black uppercase text-blue-800">Ekip önerisi</p>
        {oneriler.length === 0 ? (
          <p className="mt-1 text-xs font-bold text-blue-900">
            Öneri henüz üretilmedi. Aktif ekiplerden manuel seçim yapabilirsiniz.
          </p>
        ) : (
          <div className="mt-2 space-y-1">
            {oneriler.map((o) => (
              <OneriSatiri key={o.ekip_id} oneri={o} />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs font-bold text-blue-900">
          Gerekçe: {detayliOneriGerekce(is, birinci)}
        </p>
      </div>

      {(is.kat_bilgisi || adresHafiza) && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-xs font-black text-violet-900">Adres hafızası</p>
          {is.kat_bilgisi && (
            <p className="mt-1 text-xs font-bold text-violet-800">
              Kat bilgisi: {is.kat_bilgisi}
            </p>
          )}
          {adresHafiza && (
            <div className="mt-2 space-y-0.5 text-xs font-bold text-violet-800">
              {adresHafiza.asansor_durumu && (
                <p>Asansör: {adresHafiza.asansor_durumu}</p>
              )}
              {adresHafiza.park_durumu && <p>Park: {adresHafiza.park_durumu}</p>}
              {adresHafiza.tasima_zorlugu && (
                <p>Taşıma: {adresHafiza.tasima_zorlugu}</p>
              )}
              {adresHafiza.personel_notu && (
                <p>Not: {adresHafiza.personel_notu}</p>
              )}
            </div>
          )}
        </div>
      )}

      <AtamaIslemPanel
        operasyonId={is.id}
        fisNo={is.fis_no}
        oneriler={oneriler}
        aktifEkipler={aktifEkipler}
        jokerEkip={jokerEkip}
        varsayilanSecim={varsayilanSecim}
        veriKaliteSorunSayisi={sorunlar.length}
      />
    </article>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  )
}
