"use client"

import { useMemo, useState } from "react"

type UrunSatiri = {
  barkod: string
  seri_no: string
  marka: string
  model: string
}

type Sonuc = {
  fis?: {
    belge_no?: string
    toplam_urun?: number
  }
}

const BOS_URUN: UrunSatiri = {
  barkod: "",
  seri_no: "",
  marka: "",
  model: "",
}

export default function UrunKabulPage() {
  const [kaynakTipi, setKaynakTipi] = useState("bayi_deposu")
  const [kaynakAdi, setKaynakAdi] = useState("")
  const [teslimEdenAdi, setTeslimEdenAdi] = useState("")
  const [teslimEdenTelefon, setTeslimEdenTelefon] = useState("")
  const [teslimAlanAdi, setTeslimAlanAdi] = useState("Servis")
  const [urunler, setUrunler] = useState<UrunSatiri[]>([{ ...BOS_URUN }])
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState("")
  const [basari, setBasari] = useState("")
  const [sonuc, setSonuc] = useState<Sonuc | null>(null)

  const gecerliUrunSayisi = useMemo(() => {
    return urunler.filter((u) => u.barkod.trim() || u.seri_no.trim()).length
  }, [urunler])

  function urunGuncelle(index: number, field: keyof UrunSatiri, value: string) {
    setUrunler((onceki) =>
      onceki.map((u, i) => (i === index ? { ...u, [field]: value } : u)),
    )
  }

  function urunEkle() {
    setUrunler((onceki) => [...onceki, { ...BOS_URUN }])
  }

  function urunSil(index: number) {
    setUrunler((onceki) => {
      if (onceki.length === 1) return onceki
      return onceki.filter((_, i) => i !== index)
    })
  }

  function formuTemizle() {
    setKaynakTipi("bayi_deposu")
    setKaynakAdi("")
    setTeslimEdenAdi("")
    setTeslimEdenTelefon("")
    setTeslimAlanAdi("Servis")
    setUrunler([{ ...BOS_URUN }])
    setSonuc(null)
  }

  async function kaydet() {
    setKaydediliyor(true)
    setHata("")
    setBasari("")
    setSonuc(null)

    const temizUrunler = urunler
      .map((u) => ({
        barkod: u.barkod.trim(),
        seri_no: u.seri_no.trim(),
        marka: u.marka.trim(),
        model: u.model.trim(),
      }))
      .filter((u) => u.barkod || u.seri_no)

    if (temizUrunler.length === 0) {
      setHata("En az bir üründe barkod veya seri no girilmelidir.")
      setKaydediliyor(false)
      return
    }

    const response = await fetch("/api/urun-kabul", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kaynak_tipi: kaynakTipi,
        kaynak_adi: kaynakAdi,
        teslim_eden_adi: teslimEdenAdi,
        teslim_eden_telefon: teslimEdenTelefon,
        teslim_alan_adi: teslimAlanAdi || "Servis",
        urunler: temizUrunler,
      }),
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata(json?.error || "Ürün kabul işlemi başarısız.")
      setKaydediliyor(false)
      return
    }

    setSonuc(json)
    setBasari(
      `${json?.fis?.belge_no || "Fiş"} numaralı ürün hareket fişi oluşturuldu. Toplam ${json?.fis?.toplam_urun || temizUrunler.length} ürün kabul edildi.`,
    )
    setKaydediliyor(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Operasyon
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Ürün Kabul
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Bayi, ortak depo, kargo veya müşteriden gelen cihazları toplu olarak sisteme alın ve ürün hareket fişi oluşturun.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        {basari && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-black text-emerald-900">
            {basari}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Teslim Bilgileri
              </h2>

              <div className="mt-4 space-y-4">
                <Field label="Kaynak Tipi">
                  <select
                    value={kaynakTipi}
                    onChange={(e) => setKaynakTipi(e.target.value)}
                    className="field"
                  >
                    <option value="bayi_deposu">Bayi Deposu</option>
                    <option value="ortak_depo">Ortak Depo</option>
                    <option value="kargo">Kargo</option>
                    <option value="musteri">Müşteri</option>
                    <option value="servise_getirildi">Servise Getirildi</option>
                    <option value="diger">Diğer</option>
                  </select>
                </Field>

                <Field label="Kaynak Adı">
                  <input
                    value={kaynakAdi}
                    onChange={(e) => setKaynakAdi(e.target.value)}
                    placeholder="Örn: ABC Bayisi, Ortak Depo, Yurtiçi Kargo"
                    className="field"
                  />
                </Field>

                <Field label="Teslim Eden">
                  <input
                    value={teslimEdenAdi}
                    onChange={(e) => setTeslimEdenAdi(e.target.value)}
                    placeholder="Teslim eden kişi adı"
                    className="field"
                  />
                </Field>

                <Field label="Teslim Eden Telefon">
                  <input
                    value={teslimEdenTelefon}
                    onChange={(e) => setTeslimEdenTelefon(e.target.value)}
                    placeholder="05xx xxx xx xx"
                    className="field"
                  />
                </Field>

                <Field label="Teslim Alan">
                  <input
                    value={teslimAlanAdi}
                    onChange={(e) => setTeslimAlanAdi(e.target.value)}
                    placeholder="Servis / Ürün sorumlusu / Teknisyen"
                    className="field"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Özet
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Info title="Satır Sayısı" value={urunler.length} />
                <Info title="Geçerli Ürün" value={gecerliUrunSayisi} />
                <Info title="Kaynak" value={kaynakTipi} />
                <Info title="Teslim Alan" value={teslimAlanAdi || "Servis"} />
              </div>

              <button
                type="button"
                onClick={kaydet}
                disabled={kaydediliyor || gecerliUrunSayisi === 0}
                className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600"
              >
                {kaydediliyor ? "Kaydediliyor..." : "Ürün Kabul Et ve Fiş Oluştur"}
              </button>

              <button
                type="button"
                onClick={formuTemizle}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Formu Temizle
              </button>

              {sonuc?.fis?.belge_no && (
                <div className="mt-4 rounded-2xl border border-blue-300 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Oluşan Fiş
                  </p>
                  <p className="mt-1 text-xl font-black text-blue-950">
                    {sonuc.fis.belge_no}
                  </p>
                  <p className="mt-1 text-sm font-bold text-blue-800">
                    Teslim belgesi ekranı sonraki adımda bağlanacak.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Ürün Satırları
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Her satır bir cihazdır. Barkod veya seri no zorunludur.
                </p>
              </div>

              <button
                type="button"
                onClick={urunEkle}
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                + Ürün Ekle
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-14 p-3 text-left">#</th>
                    <th className="p-3 text-left">Barkod</th>
                    <th className="p-3 text-left">Seri No</th>
                    <th className="p-3 text-left">Marka</th>
                    <th className="p-3 text-left">Model</th>
                    <th className="w-24 p-3 text-center">İşlem</th>
                  </tr>
                </thead>

                <tbody>
                  {urunler.map((u, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3 font-black text-slate-500">
                        {index + 1}
                      </td>

                      <td className="p-3">
                        <input
                          value={u.barkod}
                          onChange={(e) => urunGuncelle(index, "barkod", e.target.value)}
                          placeholder="Barkod"
                          className="field"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          value={u.seri_no}
                          onChange={(e) => urunGuncelle(index, "seri_no", e.target.value)}
                          placeholder="Seri no"
                          className="field"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          value={u.marka}
                          onChange={(e) => urunGuncelle(index, "marka", e.target.value)}
                          placeholder="Marka"
                          className="field"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          value={u.model}
                          onChange={(e) => urunGuncelle(index, "model", e.target.value)}
                          placeholder="Model"
                          className="field"
                        />
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => urunSil(index)}
                          disabled={urunler.length === 1}
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-800 disabled:opacity-40"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t bg-slate-50 p-4 text-sm font-bold text-slate-600">
              Bu ilk sürümde barkod fotoğrafı ekleme yapılmadı. Sonraki adımda her satıra barkod fotoğrafı yükleme alanı eklenecek.
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .field {
          min-height: 44px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 700;
          color: rgb(15 23 42);
          outline: none;
        }

        .field:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function Info({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}
