"use client"

import { FormEvent, useState } from "react"

import {
  aktiflestirKymOzelYukumluluk,
  createKymOzelYukumluluk,
} from "@/lib/services/kym-service"

type ManuelYukumlulukFormProps = {
  isletmeId: string
  onTamamlandi?: () => void | Promise<void>
}

export default function ManuelYukumlulukForm({
  isletmeId,
  onTamamlandi,
}: ManuelYukumlulukFormProps) {
  const [baslik, setBaslik] = useState("")
  const [kategori, setKategori] = useState("")
  const [aciklama, setAciklama] = useState("")
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<string | null>(null)

  async function formuGonder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!baslik.trim() || !kategori.trim()) {
      setMesaj("Başlık ve kategori zorunludur.")
      return
    }

    setKaydediliyor(true)
    setMesaj(null)

    const yeniKayit = await createKymOzelYukumluluk({
      isletme_id: isletmeId,
      kaynak_tipi: "manuel",
      kayit_tipi: "belge",
      baslik: baslik.trim(),
      kategori: kategori.trim(),
      aciklama: aciklama.trim() || null,
      zorunluluk_tipi: "manuel",
      risk_puani: 50,
      oncelik: "P3",
      ai_ogrenme_havuzuna_alinsin: true,
      aktif: true,
    })

    if (!yeniKayit) {
      setMesaj("Yükümlülük kaydedilemedi.")
      setKaydediliyor(false)
      return
    }

    const belgeTanimId = await aktiflestirKymOzelYukumluluk(
      yeniKayit.id,
    )

    if (!belgeTanimId) {
      setMesaj(
        "Kayıt oluşturuldu ancak KYM belge listesine aktarılamadı.",
      )
      setKaydediliyor(false)
      return
    }

    setBaslik("")
    setKategori("")
    setAciklama("")
    setMesaj("Yeni yükümlülük KYM listesine eklendi.")

    await onTamamlandi?.()

    setKaydediliyor(false)
  }

  return (
    <form
      onSubmit={formuGonder}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Özel kayıt
        </p>

        <h2 className="mt-2 text-xl font-bold text-slate-950">
          Yeni Belge veya Yükümlülük Ekle
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          KYM listesinde bulunmayan belge, ruhsat, izin, sözleşme veya
          kurum talebini sisteme ekleyin. Belge durumu kullanıcı
          tarafından seçilmez.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Başlık
          </span>

          <input
            value={baslik}
            onChange={(event) => setBaslik(event.target.value)}
            placeholder="Örnek: Yetkili servis faaliyet yazısı"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Kategori
          </span>

          <input
            value={kategori}
            onChange={(event) => setKategori(event.target.value)}
            placeholder="Örnek: Ruhsat"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">
          Açıklama
        </span>

        <textarea
          value={aciklama}
          onChange={(event) => setAciklama(event.target.value)}
          rows={4}
          placeholder="Belgenin veya yükümlülüğün neden sisteme eklendiğini yazın."
          className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />
      </label>

      {mesaj && (
        <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {mesaj}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={kaydediliyor}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {kaydediliyor
            ? "KYM Kaydı Oluşturuluyor..."
            : "KYM Listesine Ekle"}
        </button>
      </div>
    </form>
  )
}