"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  riskSeviyesiEtiketi,
  riskSeviyesiSinifi,
} from "@/lib/bayi-operasyon-utils"
import {
  createBayiKart,
  bayiKartCariBagla,
  listBayiCariOzetleri,
  listBayiKartlariDetayli,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiCariOzet, BayiKartOzet } from "@/lib/types/bayi-operasyon"

const inputSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
const labelSinifi = "mb-1 block text-xs font-bold text-slate-700"

export default function BayiListesiPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [durumFiltre, setDurumFiltre] = useState("")
  const [formAcik, setFormAcik] = useState(false)
  const [cariAcik, setCariAcik] = useState(false)
  const [cariler, setCariler] = useState<BayiCariOzet[]>([])
  const [cariYukleniyor, setCariYukleniyor] = useState(false)
  const [bayiler, setBayiler] = useState<BayiKartOzet[]>([])
  const [form, setForm] = useState({
    bayi_adi: "",
    yetkili_kisi: "",
    telefon: "",
    whatsapp: "",
    email: "",
    magaza_adresi: "",
    depo_adresi: "",
  })

  const yukle = useCallback(async () => {
    setLoading(true)
    setHata(null)
    const sonuc = await listBayiKartlariDetayli(durumFiltre)
    if (!sonuc.ok) {
      setHata(sonuc.error)
      setBayiler([])
    } else {
      setBayiler(sonuc.data)
    }
    setLoading(false)
  }, [durumFiltre])

  useEffect(() => {
    void yukle()
  }, [yukle])

  async function carileriYukle() {
    setCariYukleniyor(true)
    const sonuc = await listBayiCariOzetleri()
    setCariYukleniyor(false)
    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }
    setCariler(sonuc.data)
    setCariAcik(true)
  }

  async function caridenBagla(cariId: string) {
    setKaydediliyor(true)
    const sonuc = await bayiKartCariBagla(cariId)
    setKaydediliyor(false)
    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }
    setMesaj(`${sonuc.data.bayi_adi} cari kaydından içe aktarıldı.`)
    setCariAcik(false)
    await yukle()
  }

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setHata(null)
    setMesaj(null)

    const sonuc = await createBayiKart(form)
    setKaydediliyor(false)

    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }

    setMesaj("Bayi kartı oluşturuldu.")
    setForm({
      bayi_adi: "",
      yetkili_kisi: "",
      telefon: "",
      whatsapp: "",
      email: "",
      magaza_adresi: "",
      depo_adresi: "",
    })
    setFormAcik(false)
    await yukle()
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-5xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-950">Bayi Listesi</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Bayi kartları, risk ve performans özeti
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div>
            <label className={labelSinifi} htmlFor="durum">
              Durum
            </label>
            <select
              id="durum"
              value={durumFiltre}
              onChange={(e) => setDurumFiltre(e.target.value)}
              className={inputSinifi}
            >
              <option value="">Tümü</option>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setFormAcik((v) => !v)}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            {formAcik ? "Formu Kapat" : "+ Yeni Bayi Ekle"}
          </button>
          <button
            type="button"
            disabled={cariYukleniyor || kaydediliyor}
            onClick={() => void carileriYukle()}
            className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {cariYukleniyor ? "Yükleniyor..." : "Cariden İçe Aktar"}
          </button>
        </div>

        {cariAcik && (
          <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-black text-indigo-950">Muhasebe Bayi Carileri</h2>
              <button
                type="button"
                onClick={() => setCariAcik(false)}
                className="text-xs font-black text-indigo-800"
              >
                Kapat
              </button>
            </div>
            {cariler.length === 0 ? (
              <p className="text-sm font-semibold text-indigo-800">Bayi cari kaydı bulunamadı.</p>
            ) : (
              cariler.map((cari) => (
                <div
                  key={cari.id}
                  className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900">{cari.cari_adi}</p>
                    <p className="text-xs font-semibold text-slate-600">
                      {cari.telefon || "-"} · {cari.adres || "-"}
                    </p>
                  </div>
                  {cari.zaten_bagli ? (
                    <span className="text-xs font-black text-emerald-700">Bağlı</span>
                  ) : (
                    <button
                      type="button"
                      disabled={kaydediliyor}
                      onClick={() => void caridenBagla(cari.id)}
                      className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                    >
                      Kart Oluştur
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {formAcik && (
          <form
            onSubmit={kaydet}
            className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3"
          >
            <h2 className="text-base font-black">Yeni Bayi Kartı</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelSinifi}>Bayi Adı *</label>
                <input
                  required
                  value={form.bayi_adi}
                  onChange={(e) => setForm((f) => ({ ...f, bayi_adi: e.target.value }))}
                  className={inputSinifi}
                />
              </div>
              <div>
                <label className={labelSinifi}>Yetkili Kişi</label>
                <input
                  value={form.yetkili_kisi}
                  onChange={(e) => setForm((f) => ({ ...f, yetkili_kisi: e.target.value }))}
                  className={inputSinifi}
                />
              </div>
              <div>
                <label className={labelSinifi}>Telefon</label>
                <input
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                  className={inputSinifi}
                />
              </div>
              <div>
                <label className={labelSinifi}>WhatsApp</label>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  className={inputSinifi}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelSinifi}>E-posta</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputSinifi}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelSinifi}>Mağaza Adresi</label>
                <input
                  value={form.magaza_adresi}
                  onChange={(e) => setForm((f) => ({ ...f, magaza_adresi: e.target.value }))}
                  className={inputSinifi}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {kaydediliyor ? "Kaydediliyor..." : "Bayi Kartı Oluştur"}
            </button>
          </form>
        )}

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}
        {mesaj && (
          <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-sm font-bold text-green-900">
            {mesaj}
          </div>
        )}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          {loading ? (
            <p className="text-sm font-semibold text-slate-600">Yükleniyor...</p>
          ) : bayiler.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">Bayi kaydı yok.</p>
          ) : (
            bayiler.map((bayi) => (
              <button
                key={bayi.id}
                type="button"
                onClick={() => router.push(`/portal/bayi-operasyon-merkezi/bayiler/${bayi.id}`)}
                className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-black text-slate-900">{bayi.bayi_adi}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-black border ${riskSeviyesiSinifi(bayi.risk_seviyesi || "dusuk")}`}
                  >
                    {riskSeviyesiEtiketi(bayi.risk_seviyesi || "dusuk")}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {bayi.yetkili_kisi || "-"} · {bayi.telefon || "-"}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 sm:grid-cols-4">
                  <p>Açık: {bayi.acik_talep}</p>
                  <p>Tamamlanan: {bayi.tamamlanan_talep}</p>
                  <p>Performans: {bayi.performans_puani ?? 0}/100</p>
                  <p>Risk: {bayi.risk_skoru ?? 0}/100</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
