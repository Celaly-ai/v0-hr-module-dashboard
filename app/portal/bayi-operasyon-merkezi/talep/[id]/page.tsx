"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DURUM_ETIKETLERI,
  HIZLI_YANIT_SABLONLARI,
  TALEP_TURU_ETIKETLERI,
  mesajGonderenEtiketi,
  mesajGonderenSinifi,
  ocrGuvenEtiketi,
  operasyonaAktarilabilirTur,
  tarihSaat,
} from "@/lib/bayi-operasyon-utils"
import {
  createBayiTalepMesaj,
  getBayiTalep,
  listBayiTalepBelgeleri,
  listBayiTalepMesajlari,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiTalep, BayiTalepBelge, BayiTalepMesaj, BayiAiYanitOneri } from "@/lib/types/bayi-operasyon"

function deger(value?: string | null) {
  if (!value?.trim()) return "-"
  return value
}

export default function BayiTalepDetayPage() {
  const router = useRouter()
  const params = useParams()

  const talepId = useMemo(() => {
    const value = params?.id
    return Array.isArray(value) ? value[0] || "" : String(value || "")
  }, [params])

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [talep, setTalep] = useState<BayiTalep | null>(null)
  const [mesajlar, setMesajlar] = useState<BayiTalepMesaj[]>([])
  const [belgeler, setBelgeler] = useState<BayiTalepBelge[]>([])
  const [yeniMesaj, setYeniMesaj] = useState("")
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [mesajHata, setMesajHata] = useState<string | null>(null)
  const [aktariliyor, setAktariliyor] = useState(false)
  const [aiOneri, setAiOneri] = useState<BayiAiYanitOneri | null>(null)
  const [aiYukleniyor, setAiYukleniyor] = useState(false)
  const [aiHata, setAiHata] = useState<string | null>(null)
  const [aiGonderiliyor, setAiGonderiliyor] = useState("")

  const yukle = useCallback(async () => {
    if (!talepId) {
      setHata("Geçersiz talep bağlantısı.")
      setLoading(false)
      return
    }

    setLoading(true)
    setHata(null)

    const [talepSonuc, mesajSonuc, belgeSonuc] = await Promise.all([
      getBayiTalep(talepId),
      listBayiTalepMesajlari(talepId),
      listBayiTalepBelgeleri(talepId),
    ])

    if (!talepSonuc.ok) {
      setHata(talepSonuc.error)
      setTalep(null)
      setMesajlar([])
      setBelgeler([])
      setLoading(false)
      return
    }

    setTalep(talepSonuc.data)

    if (!mesajSonuc.ok) {
      setMesajlar([])
    } else {
      setMesajlar(mesajSonuc.data)
    }

    if (!belgeSonuc.ok) {
      setBelgeler([])
    } else {
      setBelgeler(belgeSonuc.data)
    }

    setLoading(false)
  }, [talepId])

  const aiAlanlar = useMemo(() => {
    const alanlar = talep?.ai_analiz_json?.alanlar
    if (!alanlar || typeof alanlar !== "object") return []
    return Object.entries(alanlar as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1])
    )
  }, [talep?.ai_analiz_json])

  useEffect(() => {
    void yukle()
  }, [yukle])

  async function mesajGonder(icerik?: string) {
    const metin = (icerik ?? yeniMesaj).trim()
    if (!metin) {
      setMesajHata("Mesaj yazın veya hızlı yanıt seçin.")
      return
    }

    setGonderiliyor(true)
    setMesajHata(null)

    const sonuc = await createBayiTalepMesaj(talepId, { mesaj_icerik: metin })
    setGonderiliyor(false)

    if (!sonuc.ok) {
      setMesajHata(sonuc.error)
      return
    }

    setYeniMesaj("")
    setMesajlar((onceki) => [...onceki, sonuc.data])
  }

  async function aiYanitOner() {
    setAiYukleniyor(true)
    setAiHata(null)

    try {
      const response = await fetch("/api/bayi-operasyon/ai-yanit-oneri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talep_id: talepId }),
      })
      const data = await response.json()

      if (!data.success) {
        setAiHata(data.error || "AI öneri alınamadı.")
        setAiOneri(null)
      } else {
        setAiOneri(data.data as BayiAiYanitOneri)
      }
    } catch {
      setAiHata("AI öneri sırasında bağlantı hatası.")
    }

    setAiYukleniyor(false)
  }

  async function aiYanitGonder(metin: string, bilgilendir = false) {
    setAiGonderiliyor(metin)
    setMesajHata(null)

    try {
      const response = await fetch("/api/bayi-operasyon/ai-yanit-gonder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talep_id: talepId, mesaj: metin, bilgilendir }),
      })
      const data = await response.json()

      if (!data.success) {
        setMesajHata(data.error || "Yanıt gönderilemedi.")
        setAiGonderiliyor("")
        return
      }

      if (data.data?.mesaj) {
        setMesajlar((onceki) => [...onceki, data.data.mesaj])
      }
      setYeniMesaj("")
    } catch {
      setMesajHata("Yanıt gönderimi sırasında bağlantı hatası.")
    }

    setAiGonderiliyor("")
  }

  async function operasyonaAktar() {
    setAktariliyor(true)
    setHata(null)

    try {
      const response = await fetch("/api/bayi-operasyon/operasyon-havuzuna-aktar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talep_id: talepId }),
      })
      const data = await response.json()

      if (!data.success) {
        setHata(data.error || "Operasyon aktarımı başarısız.")
        setAktariliyor(false)
        return
      }

      await yukle()
    } catch {
      setHata("Operasyon aktarımı sırasında bağlantı hatası.")
    }

    setAktariliyor(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="font-bold text-slate-700">Yükleniyor...</p>
      </div>
    )
  }

  if (hata || !talep) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/portal/bayi-operasyon-merkezi/talepler")}
          className="text-2xl font-bold"
        >
          ←
        </button>
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
          {hata || "Talep bulunamadı."}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-3xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/talepler")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-900">
                {TALEP_TURU_ETIKETLERI[talep.talep_turu]}
              </span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-900">
                {DURUM_ETIKETLERI[talep.durum]}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-black text-slate-950">
              {talep.musteri_adi || "Talep Detayı"}
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              {talep.talep_no || "-"} · {tarihSaat(talep.created_at)}
            </p>
            <button
              type="button"
              onClick={() => router.push("/portal/bayi-operasyon-merkezi/mesajlar")}
              className="mt-2 text-xs font-black text-blue-700"
            >
              Mesaj Merkezi →
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
          <p className="text-sm font-bold text-emerald-900">
            Talep alındı ve takibe alındı. Durum değiştikçe bu ekranda güncellenecek.
          </p>
          {talep.operasyon_aktarildi_mi && talep.operasyon_fis_no && (
            <p className="text-sm font-bold text-teal-900">
              Operasyon havuzu: {talep.operasyon_fis_no}
            </p>
          )}
          {operasyonaAktarilabilirTur(talep.talep_turu) && !talep.operasyon_aktarildi_mi && (
            <button
              type="button"
              disabled={aktariliyor}
              onClick={() => void operasyonaAktar()}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {aktariliyor ? "Aktarılıyor..." : "Operasyon Havuzuna Aktar"}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-base font-black text-slate-950">Talep Bilgileri</h2>
          <div className="grid grid-cols-1 gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
            <p>Telefon: {deger(talep.telefon)}</p>
            <p>Alt. Telefon: {deger(talep.alternatif_telefon)}</p>
            <p>Öncelik: {deger(talep.oncelik)}</p>
            <p>Departman: {deger(talep.sorumlu_departman)}</p>
            <p>SLA: {talep.sla_hedef_dk ? `${talep.sla_hedef_dk} dk` : "-"}</p>
            <p>Oluşturan: {deger(talep.olusturan_kisi)}</p>
            <p>Ürün: {deger(talep.urun_turu)}</p>
            <p>Model: {deger(talep.model)}</p>
            <p>Seri No: {deger(talep.seri_no)}</p>
          </div>
          <p className="text-sm font-semibold text-slate-700">Adres: {deger(talep.adres)}</p>
          <p className="text-sm font-semibold text-slate-700">
            İl/İlçe/Mahalle: {[talep.il, talep.ilce, talep.mahalle].filter(Boolean).join(" / ") || "-"}
          </p>
          <p className="text-sm font-semibold text-slate-700">Açıklama: {deger(talep.aciklama)}</p>
          {talep.personel_notu && (
            <p className="text-sm font-semibold text-slate-700">Dahili Not: {talep.personel_notu}</p>
          )}
        </div>

        {(talep.ai_analiz_json || talep.ai_guven_skoru != null) && (
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 shadow-sm space-y-2">
            <h2 className="text-base font-black text-blue-950">AI Görsel Analizi</h2>
            {talep.ai_guven_skoru != null && (
              <p className="text-sm font-bold text-blue-900">
                {ocrGuvenEtiketi(talep.ai_guven_skoru)} ({talep.ai_guven_skoru}%)
              </p>
            )}
            {typeof talep.ai_analiz_json?.mesaj === "string" && (
              <p className="text-sm font-semibold text-blue-800">{talep.ai_analiz_json.mesaj}</p>
            )}
            {aiAlanlar.map(([alan, deger]) => (
              <p key={alan} className="text-sm font-semibold text-blue-900">
                {alan.replace(/_/g, " ")}: {deger}
              </p>
            ))}
          </div>
        )}

        {belgeler.length > 0 && (
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-950">Ekli Görseller</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {belgeler.map((belge) => (
                <div key={belge.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {belge.public_url ? (
                    <a href={belge.public_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={belge.public_url}
                        alt={belge.dosya_adi || "Talep görseli"}
                        className="max-h-40 w-full rounded-lg object-contain bg-white"
                      />
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-600">{belge.dosya_adi || "Görsel"}</p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {belge.dosya_adi || "-"} · {tarihSaat(belge.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-base font-black text-slate-950">Mesajlar</h2>

          {mesajlar.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">Henüz mesaj yok.</p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {mesajlar.map((mesaj) => (
                <div
                  key={mesaj.id}
                  className={`rounded-xl border px-3 py-2 ${mesajGonderenSinifi(mesaj.gonderen_tip)}`}
                >
                  <p className="text-xs font-black text-slate-700">
                    {mesajGonderenEtiketi(mesaj.gonderen_tip)} ·{" "}
                    {mesaj.gonderen_ad || "-"} · {tarihSaat(mesaj.created_at)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{mesaj.mesaj_icerik}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black text-slate-700">AI Yanıt Önerisi</p>
              <button
                type="button"
                disabled={aiYukleniyor}
                onClick={() => void aiYanitOner()}
                className="rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
              >
                {aiYukleniyor ? "..." : "Öneri Üret"}
              </button>
            </div>

            {aiHata && <p className="text-xs font-bold text-red-700">{aiHata}</p>}

            {aiOneri && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-purple-200 px-2 py-0.5 text-[10px] font-black text-purple-900 uppercase">
                    {aiOneri.mode === "ai" ? "Claude AI" : "Kural Motoru"}
                  </span>
                  <span className="text-xs font-bold text-purple-800">{aiOneri.ozet}</span>
                  <span className="text-[10px] font-semibold text-purple-700">
                    Güven: {aiOneri.guven_skoru}%
                  </span>
                </div>
                {aiOneri.oncelikli_aksiyon && (
                  <p className="text-xs font-bold text-amber-900 bg-amber-100 rounded-lg px-2 py-1">
                    Aksiyon: {aiOneri.oncelikli_aksiyon}
                  </p>
                )}
                <div className="space-y-2">
                  {aiOneri.oneriler.map((oneri) => (
                    <div key={oneri} className="rounded-xl border border-purple-200 bg-white p-2 space-y-2">
                      <p className="text-[11px] font-bold text-purple-950">{oneri}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={gonderiliyor || aiGonderiliyor === oneri}
                          onClick={() => setYeniMesaj(oneri)}
                          className="rounded-lg bg-purple-100 px-2 py-1 text-[10px] font-black text-purple-900 disabled:opacity-50"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          disabled={gonderiliyor || !!aiGonderiliyor}
                          onClick={() => void aiYanitGonder(oneri, false)}
                          className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-black text-white disabled:opacity-50"
                        >
                          {aiGonderiliyor === oneri ? "..." : "Gönder"}
                        </button>
                        <button
                          type="button"
                          disabled={gonderiliyor || !!aiGonderiliyor}
                          onClick={() => void aiYanitGonder(oneri, true)}
                          className="rounded-lg bg-teal-700 px-2 py-1 text-[10px] font-black text-white disabled:opacity-50"
                        >
                          Gönder + Bilgilendir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <p className="text-xs font-black text-slate-700">Hızlı Yanıtlar</p>
            <div className="flex flex-wrap gap-2">
              {HIZLI_YANIT_SABLONLARI.map((sablon) => (
                <button
                  key={sablon}
                  type="button"
                  disabled={gonderiliyor}
                  onClick={() => void mesajGonder(sablon)}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-bold text-slate-800 disabled:opacity-50"
                >
                  {sablon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700" htmlFor="yeni_mesaj">
              Personel Yanıtı
            </label>
            <textarea
              id="yeni_mesaj"
              value={yeniMesaj}
              onChange={(e) => setYeniMesaj(e.target.value)}
              placeholder="Bayiye iletilecek yanıtı yazın..."
              className="w-full min-h-[90px] resize-y rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold text-slate-900"
            />
            {mesajHata && (
              <p className="text-xs font-bold text-red-700">{mesajHata}</p>
            )}
            <button
              type="button"
              disabled={gonderiliyor || !yeniMesaj.trim()}
              onClick={() => void mesajGonder()}
              className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {gonderiliyor ? "Gönderiliyor..." : "Mesaj Gönder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
