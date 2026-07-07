"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  HIZMET_SURE_SELECT,
  type HizmetSureKaydi,
  isTipindenKod,
} from "@/lib/services/hizmet-sure-katalogu-service"

type FormState = {
  hizmet_kodu: string
  hizmet_adi: string
  is_tipi: string
  gerekli_yetenek: string
  referans_sure_dk: string
  zorluk_katsayisi: string
  aciklama: string
  aktif: boolean
}

const bosForm: FormState = {
  hizmet_kodu: "",
  hizmet_adi: "",
  is_tipi: "",
  gerekli_yetenek: "",
  referans_sure_dk: "60",
  zorluk_katsayisi: "1",
  aciklama: "",
  aktif: true,
}

const inputSinifi =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900"

export default function HizmetSureKataloguPage() {
  const supabase = useMemo(() => createClient(), [])
  const [kayitlar, setKayitlar] = useState<HizmetSureKaydi[]>([])
  const [form, setForm] = useState<FormState>(bosForm)
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")

  const yukle = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("hizmet_sure_katalogu")
      .select(HIZMET_SURE_SELECT)
      .order("hizmet_kodu", { ascending: true })

    if (error) {
      setHata(error.message)
      setKayitlar([])
    } else {
      setKayitlar((data ?? []) as HizmetSureKaydi[])
      setHata("")
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void yukle()
  }, [yukle])

  function formuDoldur(kayit: HizmetSureKaydi) {
    setDuzenleId(kayit.id)
    setForm({
      hizmet_kodu: kayit.hizmet_kodu,
      hizmet_adi: kayit.hizmet_adi,
      is_tipi: kayit.is_tipi ?? "",
      gerekli_yetenek: kayit.gerekli_yetenek ?? "",
      referans_sure_dk: String(kayit.referans_sure_dk),
      zorluk_katsayisi: String(kayit.zorluk_katsayisi ?? 1),
      aciklama: kayit.aciklama ?? "",
      aktif: kayit.aktif !== false,
    })
    setMesaj("")
    setHata("")
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setMesaj("")
    setHata("")

    const sure = Number(form.referans_sure_dk)
    const katsayi = Number(form.zorluk_katsayisi)

    if (!form.hizmet_kodu.trim() || !form.hizmet_adi.trim()) {
      setHata("Hizmet kodu ve adı zorunludur.")
      setKaydediliyor(false)
      return
    }

    if (!Number.isFinite(sure) || sure <= 0) {
      setHata("Referans süre pozitif bir dakika değeri olmalıdır.")
      setKaydediliyor(false)
      return
    }

    const payload = {
      hizmet_kodu: form.hizmet_kodu.trim().toUpperCase(),
      hizmet_adi: form.hizmet_adi.trim(),
      is_tipi: form.is_tipi.trim() || null,
      gerekli_yetenek: form.gerekli_yetenek.trim() || null,
      referans_sure_dk: sure,
      zorluk_katsayisi: Number.isFinite(katsayi) && katsayi > 0 ? katsayi : 1,
      aciklama: form.aciklama.trim() || null,
      aktif: form.aktif,
      kaynak: "manuel" as const,
      updated_at: new Date().toISOString(),
    }

    const sonuc = duzenleId
      ? await supabase
          .from("hizmet_sure_katalogu")
          .update(payload)
          .eq("id", duzenleId)
      : await supabase.from("hizmet_sure_katalogu").insert(payload)

    setKaydediliyor(false)

    if (sonuc.error) {
      setHata(sonuc.error.message)
      return
    }

    setForm(bosForm)
    setDuzenleId(null)
    setMesaj(duzenleId ? "Kayıt güncellendi." : "Yeni hizmet süresi eklendi.")
    void yukle()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-10 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-700">FeyRoute Operasyon</p>
              <h1 className="text-2xl font-black">Hizmet Süre Kataloğu</h1>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Manuel referans süreler · İleride atama motoru kaynağı
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/portal"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Portal
              </Link>
              <Link
                href="/portal/akilli-atama-merkezi"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Atama Merkezi
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">
            {duzenleId ? "Kaydı Düzenle" : "Yeni Referans Süre"}
          </h2>
          <form onSubmit={(e) => void kaydet(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Hizmet Kodu">
              <input
                className={inputSinifi}
                value={form.hizmet_kodu}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hizmet_kodu: e.target.value.toUpperCase() }))
                }
                placeholder="NM, M_KLIMA..."
                required
              />
            </Field>
            <Field label="Hizmet Adı">
              <input
                className={inputSinifi}
                value={form.hizmet_adi}
                onChange={(e) => setForm((f) => ({ ...f, hizmet_adi: e.target.value }))}
                required
              />
            </Field>
            <Field label="İş Tipi (N/M/NM)">
              <select
                className={inputSinifi}
                value={form.is_tipi}
                onChange={(e) => setForm((f) => ({ ...f, is_tipi: e.target.value }))}
              >
                <option value="">Seçilmedi</option>
                <option value="N">N — Nakliye</option>
                <option value="M">M — Montaj</option>
                <option value="NM">NM — Nakliye + Montaj</option>
              </select>
            </Field>
            <Field label="Gerekli Yetenek">
              <input
                className={inputSinifi}
                value={form.gerekli_yetenek}
                onChange={(e) => setForm((f) => ({ ...f, gerekli_yetenek: e.target.value }))}
                placeholder="klima, beyaz..."
              />
            </Field>
            <Field label="Referans Süre (dk)">
              <input
                type="number"
                min={1}
                className={inputSinifi}
                value={form.referans_sure_dk}
                onChange={(e) => setForm((f) => ({ ...f, referans_sure_dk: e.target.value }))}
                required
              />
            </Field>
            <Field label="Zorluk Katsayısı">
              <input
                type="number"
                min={0.1}
                step={0.1}
                className={inputSinifi}
                value={form.zorluk_katsayisi}
                onChange={(e) => setForm((f) => ({ ...f, zorluk_katsayisi: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Açıklama">
                <textarea
                  className={`${inputSinifi} min-h-[80px]`}
                  value={form.aciklama}
                  onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm((f) => ({ ...f, aktif: e.target.checked }))}
              />
              Aktif kayıt
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={kaydediliyor}
                className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {kaydediliyor ? "Kaydediliyor..." : duzenleId ? "Güncelle" : "Ekle"}
              </button>
              {duzenleId && (
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black"
                  onClick={() => {
                    setDuzenleId(null)
                    setForm(bosForm)
                  }}
                >
                  İptal
                </button>
              )}
            </div>
          </form>
          {mesaj && <p className="mt-3 text-sm font-bold text-green-700">{mesaj}</p>}
          {hata && <p className="mt-3 text-sm font-bold text-red-700">{hata}</p>}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Katalog ({kayitlar.length})</h2>
          {loading ? (
            <p className="mt-3 text-sm font-bold text-slate-600">Yükleniyor...</p>
          ) : kayitlar.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-slate-600">
              Kayıt yok. SQL scriptini çalıştırdıysanız tablo erişimini kontrol edin.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {kayitlar.map((k) => (
                <article
                  key={k.id}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-blue-700">{k.hizmet_kodu}</p>
                      <p className="text-base font-black">{k.hizmet_adi}</p>
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        {k.is_tipi ? `İş: ${k.is_tipi}` : "İş tipi genel"}
                        {k.gerekli_yetenek ? ` · Yetenek: ${k.gerekli_yetenek}` : ""}
                        {k.is_tipi && !k.gerekli_yetenek
                          ? ` · Eşleşme: ${isTipindenKod(k.is_tipi) ?? k.is_tipi}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">
                        {k.referans_sure_dk} dk
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Katsayı: {k.zorluk_katsayisi ?? 1}
                      </p>
                    </div>
                  </div>
                  {k.aciklama && (
                    <p className="mt-2 text-xs font-bold text-slate-600">{k.aciklama}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${
                        k.aktif !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {k.aktif !== false ? "Aktif" : "Pasif"}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                      {k.kaynak ?? "manuel"}
                    </span>
                    <button
                      type="button"
                      onClick={() => formuDoldur(k)}
                      className="ml-auto text-xs font-black text-blue-700"
                    >
                      Düzenle
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}
