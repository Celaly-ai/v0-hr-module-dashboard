"use client"

import { useRouter } from "next/navigation"
import { Store } from "lucide-react"
import { TALEP_MERKEZI_BUTONLARI, TALEP_TURU_ETIKETLERI } from "@/lib/bayi-operasyon-utils"

export default function BayiTalepMerkeziPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-lg px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-700" />
              <h1 className="text-xl font-black text-slate-950">Talep Merkezi</h1>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Mesaj yazmayın — işlem oluşturun
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-900">
            Her buton bir kayıt açar. Talep kapanana kadar takip edilir.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {TALEP_MERKEZI_BUTONLARI.map((buton) => (
            <button
              key={buton.tur}
              type="button"
              onClick={() =>
                router.push(`/portal/bayi-operasyon-merkezi/talep/yeni/${buton.tur}`)
              }
              className={`rounded-2xl px-4 py-5 text-left text-white shadow-sm transition ${buton.sinif}`}
            >
              <p className="text-base font-black">{TALEP_TURU_ETIKETLERI[buton.tur]}</p>
              <p className="mt-1 text-xs font-semibold text-white/90">{buton.aciklama}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
