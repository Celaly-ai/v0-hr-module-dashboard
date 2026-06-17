"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Props = {
  klasor: string
  etiket?: string
  onUploaded: (url: string) => void
}

function temizDosyaAdi(value: string) {
  return String(value || "foto")
    .replaceAll(" ", "-")
    .replaceAll("/", "-")
    .replaceAll("\\", "-")
    .replaceAll(":", "-")
    .replaceAll("*", "-")
    .replaceAll("?", "-")
    .replaceAll('"', "-")
    .replaceAll("<", "-")
    .replaceAll(">", "-")
    .replaceAll("|", "-")
}

export default function FotoYukleyici({ klasor, etiket = "Fotoğraf", onUploaded }: Props) {
  const [foto, setFoto] = useState<File | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState("")
  const [url, setUrl] = useState("")

  async function yukle() {
    setHata("")

    if (!foto) {
      setHata("Lütfen fotoğraf seçin.")
      return
    }

    if (!foto.type.startsWith("image/")) {
      setHata("Lütfen geçerli bir görsel dosyası seçin.")
      return
    }

    const maxBoyut = 10 * 1024 * 1024

    if (foto.size > maxBoyut) {
      setHata("Fotoğraf boyutu 10 MB'den büyük olamaz.")
      return
    }

    setYukleniyor(true)

    const supabase = createClient()
    const uzanti = foto.name.split(".").pop() || "jpg"
    const temizAd = temizDosyaAdi(foto.name.replace(/\.[^/.]+$/, ""))
    const dosyaAdi = `${temizDosyaAdi(klasor)}/${Date.now()}-${temizAd}.${uzanti}`

    const { error } = await supabase.storage
      .from("cihazlar")
      .upload(dosyaAdi, foto, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      setHata("Fotoğraf yüklenemedi: " + error.message)
      setYukleniyor(false)
      return
    }

    const { data } = supabase.storage.from("cihazlar").getPublicUrl(dosyaAdi)

    setUrl(data.publicUrl)
    onUploaded(data.publicUrl)
    setFoto(null)
    setYukleniyor(false)
  }

  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {etiket}
      </p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFoto(e.target.files?.[0] || null)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900"
      />

      {foto && (
        <p className="mt-2 text-xs font-bold text-slate-600">
          Seçilen: {foto.name}
        </p>
      )}

      {hata && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">
          {hata}
        </div>
      )}

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-black text-emerald-900"
        >
          Fotoğraf yüklendi. Açmak için dokun.
        </a>
      )}

      <button
        type="button"
        onClick={() => void yukle()}
        disabled={yukleniyor || !foto}
        className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300 disabled:text-slate-600"
      >
        {yukleniyor ? "Yükleniyor..." : "Fotoğrafı Yükle"}
      </button>
    </div>
  )
}
