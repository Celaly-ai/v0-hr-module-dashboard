"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

type AiSonuc = {
  hazir_yazi: string
}

const KANIT_PLACEHOLDER = `Örnek (her satır ayrı etiketli veri):
220 Volt
12000 BTU/h
25 m²
5 aylık cihaz
dış ortam 45
iç ortam 32
atış sıcaklığı 12
foto fişte`

const AMAC_PLACEHOLDER = `Örnek:
müşteri ısrarla değişim istiyor
değişmezse sürekli şikayet edecek
hakem heyetine gidecek
ben ne yapacağım`

const textareaSinifi =
  "w-full min-h-[220px] rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-semibold leading-relaxed text-slate-900 placeholder:text-slate-400"

const inputSinifi =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400"

export default function AiKanitliYazismaAsistaniPage() {
  const [kanit, setKanit] = useState("")
  const [kime, setKime] = useState("")
  const [amac, setAmac] = useState("")
  const [sonuc, setSonuc] = useState<AiSonuc | null>(null)
  const [olusturuluyor, setOlusturuluyor] = useState(false)
  const [hata, setHata] = useState("")
  const [kopyalandi, setKopyalandi] = useState(false)

  const olusturulabilir = useMemo(
    () => kanit.trim().length > 0 || amac.trim().length > 0,
    [kanit, amac],
  )

  async function profesyonelYaziOlustur() {
    if (!olusturulabilir) {
      setHata("Kanıt veya amaç alanından en az birini doldurun.")
      return
    }

    setOlusturuluyor(true)
    setHata("")
    setSonuc(null)
    setKopyalandi(false)

    try {
      const response = await fetch("/portal/ai-kanitli-yazisma-asistani/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanit, kime, amac }),
      })

      const json = (await response.json()) as {
        success?: boolean
        data?: AiSonuc
      }

      if (json.success && json.data?.hazir_yazi) {
        setSonuc(json.data)
        return
      }

      setHata("Yanıt alınamadı. Lütfen tekrar deneyin.")
    } catch (err) {
      console.error("AI kanitli yazisma istemci hatasi:", err)
      setHata("Bağlantı hatası. Lütfen tekrar deneyin.")
    } finally {
      setOlusturuluyor(false)
    }
  }

  async function kopyala() {
    if (!sonuc?.hazir_yazi) return

    try {
      await navigator.clipboard.writeText(sonuc.hazir_yazi)
      setKopyalandi(true)
      window.setTimeout(() => setKopyalandi(false), 2000)
    } catch {
      setHata("Panoya kopyalanamadı. Metni elle seçip kopyalayın.")
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-12 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-violet-700">FeyRoute · V1</p>
              <h1 className="text-2xl font-black">AI Kanıtlı Yazışma Asistanı</h1>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Kanıt ve talebe dayalı, eksiksiz kurumsal profesyonel yazı üretir
              </p>
            </div>
            <Link
              href="/portal"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
            >
              Portal
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">1. Gelen Yazı / Kanıt / Dayanak</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Tüm ölçüm değerleri, fotoğraflar ve teknik bulgular — hiçbiri yazıda atlanmaz
          </p>
          <textarea
            className={`${textareaSinifi} mt-3 min-h-[260px]`}
            value={kanit}
            onChange={(e) => setKanit(e.target.value)}
            placeholder={KANIT_PLACEHOLDER}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">2. Bizim Cevabımız / Talebimiz</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Saha notu — yazım hataları olabilir. AI anlamı okur ve profesyonel dile çevirir.
          </p>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Kime yazılacak?
            </span>
            <input
              className={inputSinifi}
              value={kime}
              onChange={(e) => setKime(e.target.value)}
              placeholder="kadir be, Kadir Bey, Bölge Müdürlüğü..."
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Amacınız / ham notunuz
            </span>
            <textarea
              className={`${textareaSinifi} min-h-[200px]`}
              value={amac}
              onChange={(e) => setAmac(e.target.value)}
              placeholder={AMAC_PLACEHOLDER}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">3. Profesyonel Yazı</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Okuyan kişi fişi açmadan olayın tamamını anlayabilmeli
              </p>
            </div>
            <button
              type="button"
              onClick={() => void profesyonelYaziOlustur()}
              disabled={olusturuluyor || !olusturulabilir}
              className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {olusturuluyor ? "Yazı hazırlanıyor..." : "Profesyonel Yazı Oluştur"}
            </button>
          </div>

          {hata && <p className="mt-3 text-sm font-bold text-red-700">{hata}</p>}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Profesyonel Yazı
              </h3>
              <button
                type="button"
                onClick={() => void kopyala()}
                disabled={!sonuc?.hazir_yazi}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black disabled:opacity-50"
              >
                {kopyalandi ? "Kopyalandı ✓" : "📋 Kopyala"}
              </button>
            </div>
            <textarea
              readOnly
              className={`${textareaSinifi} min-h-[420px] bg-white`}
              value={sonuc?.hazir_yazi ?? ""}
              placeholder={
                olusturuluyor
                  ? "Profesyonel yazı hazırlanıyor..."
                  : "Profesyonel yazı burada görünecek."
              }
            />
          </div>
        </section>
      </div>
    </main>
  )
}
