"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DURUM_ETIKETLERI,
  TALEP_TURU_ETIKETLERI,
  mesajGonderenEtiketi,
  tarihSaat,
  talepAcikMi,
} from "@/lib/bayi-operasyon-utils"
import { listBayiMesajMerkezi } from "@/lib/services/bayi-operasyon-service"
import type { BayiMesajMerkeziOzet } from "@/lib/types/bayi-operasyon"

type FiltreTip = "tumu" | "acik" | "kapali"

export default function BayiMesajMerkeziPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [konusmalar, setKonusmalar] = useState<BayiMesajMerkeziOzet[]>([])
  const [filtre, setFiltre] = useState<FiltreTip>("acik")
  const [arama, setArama] = useState("")

  const yukle = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const sonuc = await listBayiMesajMerkezi({
      acik: filtre === "tumu" ? null : filtre === "acik",
      arama: arama.trim() || undefined,
    })

    if (!sonuc.ok) {
      setHata(sonuc.error)
      setKonusmalar([])
    } else {
      setKonusmalar(sonuc.data)
    }

    setLoading(false)
  }, [filtre, arama])

  useEffect(() => {
    const zamanlayici = setTimeout(() => {
      void yukle()
    }, arama ? 300 : 0)
    return () => clearTimeout(zamanlayici)
  }, [yukle, arama])

  const istatistik = useMemo(() => {
    const acik = konusmalar.filter((k) => talepAcikMi(k.talep.durum)).length
    const mesajli = konusmalar.filter((k) => k.mesaj_sayisi > 0).length
    return { toplam: konusmalar.length, acik, mesajli }
  }, [konusmalar])

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-4xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-950">Mesaj Merkezi</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Talebe bağlı bayi iletişimi ve durum mesajları
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-900">
            V1: WhatsApp yerine talep bazlı mesajlaşma. Personel yanıtları buradan kaydedilir;
            WhatsApp entegrasyonu Faz 2&apos;de.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-300 bg-white p-3 text-center">
            <p className="text-xs font-bold text-slate-500">Konuşma</p>
            <p className="text-xl font-black text-slate-900">{istatistik.toplam}</p>
          </div>
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-center">
            <p className="text-xs font-bold text-emerald-700">Açık Talep</p>
            <p className="text-xl font-black text-emerald-900">{istatistik.acik}</p>
          </div>
          <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-3 text-center">
            <p className="text-xs font-bold text-indigo-700">Mesajlı</p>
            <p className="text-xl font-black text-indigo-900">{istatistik.mesajli}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "acik", etiket: "Açık Talepler" },
                { key: "tumu", etiket: "Tümü" },
                { key: "kapali", etiket: "Kapalı" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFiltre(item.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  filtre === item.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {item.etiket}
              </button>
            ))}
          </div>

          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Talep no, müşteri, telefon ara..."
            className="w-full rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold text-slate-900"
          />
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm font-bold text-slate-600">Yükleniyor...</p>
        ) : konusmalar.length === 0 ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Bu filtrede konuşma bulunamadı.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {konusmalar.map(({ talep, son_mesaj, mesaj_sayisi }) => (
              <button
                key={talep.id}
                type="button"
                onClick={() =>
                  router.push(`/portal/bayi-operasyon-merkezi/talep/${talep.id}`)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-left shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-900">
                        {TALEP_TURU_ETIKETLERI[talep.talep_turu]}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-700">
                        {DURUM_ETIKETLERI[talep.durum]}
                      </span>
                      {mesaj_sayisi > 0 && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-black text-white">
                          {mesaj_sayisi}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate font-black text-slate-950">
                      {talep.musteri_adi || talep.talep_no || "Talep"}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {talep.talep_no || "-"} · {talep.telefon || "-"}
                    </p>
                    {son_mesaj ? (
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-700">
                        <span className="font-black text-slate-800">
                          {mesajGonderenEtiketi(son_mesaj.gonderen_tip)}:
                        </span>{" "}
                        {son_mesaj.mesaj_icerik}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        Henüz mesaj yok — talep detayından yazın.
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-[11px] font-bold text-slate-500">
                    {tarihSaat(son_mesaj?.created_at || talep.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
