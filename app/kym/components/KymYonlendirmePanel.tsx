"use client"

import { useMemo, useState } from "react"

import {
  kymBasvuruYapildiKaydet,
  type KymBasvuruYonlendirme,
} from "@/lib/services/kym-guidance-service"

type KymYonlendirmePanelProps = {
  yonlendirme: KymBasvuruYonlendirme
  onKapat: () => void
  onGuncellendi?: () => void | Promise<void>
}

function basvuruKanaliEtiketi(
  kanal?: string | null,
): string {
  if (kanal === "online") {
    return "Online"
  }

  if (kanal === "e_devlet") {
    return "e-Devlet"
  }

  if (kanal === "kurum_portali") {
    return "Kurum Portalı"
  }

  if (kanal === "yuz_yuze") {
    return "Yüz Yüze"
  }

  if (kanal === "posta") {
    return "Posta"
  }

  if (kanal === "kep") {
    return "KEP"
  }

  if (kanal === "e_tebligat") {
    return "E-Tebligat"
  }

  if (kanal === "sirket_ici") {
    return "Şirket İçi"
  }

  if (kanal === "marka_sistemi") {
    return "Marka Sistemi"
  }

  if (kanal === "karma") {
    return "Birden Fazla Kanal"
  }

  return "Doğrulama Gerekli"
}

function RehberListe({
  baslik,
  maddeler,
}: {
  baslik: string
  maddeler: string[]
}) {
  if (maddeler.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-950">
        {baslik}
      </h3>

      <div className="mt-4 space-y-3">
        {maddeler.map((madde, index) => (
          <div
            key={`${baslik}-${index}-${madde}`}
            className="flex gap-3"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {index + 1}
            </div>

            <p className="pt-1 text-sm leading-6 text-slate-700">
              {madde}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function KymYonlendirmePanel({
  yonlendirme,
  onKapat,
  onGuncellendi,
}: KymYonlendirmePanelProps) {
  const [kopyalandi, setKopyalandi] =
    useState(false)

  const [kaydediliyor, setKaydediliyor] =
    useState(false)

  const [mesaj, setMesaj] =
    useState<string | null>(null)

  const resmiKaynakDogrulandi =
    yonlendirme.kaynak_dogrulama_durumu ===
    "resmi_kaynak_dogrulandi"

  const durumBilgisi = useMemo(() => {
    if (resmiKaynakDogrulandi) {
      return {
        baslik: "Resmî kaynak doğrulandı",
        aciklama:
          "Bu rehberin kaynak ve yönlendirme bilgileri KYM kayıtlarında resmî kaynak doğrulaması yapılmış olarak işaretlidir.",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-800",
      }
    }

    if (
      yonlendirme.kaynak_dogrulama_durumu ===
      "guncelleme_gerekli"
    ) {
      return {
        baslik: "Kaynak güncellemesi gerekli",
        aciklama:
          "Bu rehberin kaynak bilgileri yeniden kontrol edilmelidir. Güncel kurum şartlarını doğrulamadan kesin başvuru bilgisi olarak kullanmayın.",
        className:
          "border-orange-200 bg-orange-50 text-orange-800",
      }
    }

    if (
      yonlendirme.kaynak_dogrulama_durumu ===
      "uzman_incelemesi_gerekli"
    ) {
      return {
        baslik: "Uzman incelemesi gerekli",
        aciklama:
          "Belgenin kapsam veya başvuru şartlarında uzman değerlendirmesi gerekmektedir.",
        className:
          "border-violet-200 bg-violet-50 text-violet-800",
      }
    }

    return {
      baslik: "Kaynak doğrulaması bekliyor",
      aciklama:
        "KYM bu belgeyi işletme uyum havuzunda izliyor. Rehber henüz resmî kaynak doğrulamasından geçmediği için kurumun güncel şartları ayrıca kontrol edilmelidir.",
      className:
        "border-amber-200 bg-amber-50 text-amber-800",
    }
  }, [
    resmiKaynakDogrulandi,
    yonlendirme.kaynak_dogrulama_durumu,
  ])

  async function dilekceyiKopyala() {
    if (!yonlendirme.dilekce_metni) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        yonlendirme.dilekce_metni,
      )

      setKopyalandi(true)

      window.setTimeout(() => {
        setKopyalandi(false)
      }, 2000)
    } catch {
      setMesaj(
        "Dilekçe panoya kopyalanamadı.",
      )
    }
  }

  async function basvuruYapildi() {
    if (!yonlendirme.isletme_belge_id) {
      setMesaj(
        "İşletme belge kaydı bulunamadı.",
      )

      return
    }

    setKaydediliyor(true)
    setMesaj(null)

    const sonuc =
      await kymBasvuruYapildiKaydet({
        isletmeBelgeId:
          yonlendirme.isletme_belge_id,
      })

    if (!sonuc.basarili) {
      setMesaj(
        sonuc.hata ??
          "Başvuru durumu kaydedilemedi.",
      )

      setKaydediliyor(false)

      return
    }

    setMesaj(
      "Belge başvuru yapıldı olarak kaydedildi.",
    )

    await onGuncellendi?.()

    setKaydediliyor(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-3 backdrop-blur-sm md:p-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                KYM Başvuru ve Yönlendirme Merkezi
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">
                {yonlendirme.belge_adi}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {yonlendirme.yukumluluk_basligi}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  Risk {yonlendirme.risk_puani}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {yonlendirme.belge_kodu}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {yonlendirme.kategori}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onKapat}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Kapat
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-5 p-5 md:p-8">
            <section
              className={`rounded-2xl border p-5 ${durumBilgisi.className}`}
            >
              <p className="font-bold">
                {durumBilgisi.baslik}
              </p>

              <p className="mt-2 text-sm leading-6">
                {durumBilgisi.aciklama}
              </p>
            </section>

            {mesaj && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800">
                {mesaj}
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Neden gerekli?
                </p>

                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {yonlendirme.neden_gerekli ??
                    "KYM tarafından kurumsal uyum havuzunda izlenmektedir."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Hangi koşullarda?
                </p>

                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {yonlendirme.hangi_kosullarda_gerekli ??
                    "İşletme profili ve faaliyet koşullarına göre değerlendirilir."}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-bold text-slate-950">
                Başvuru Bilgisi
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Resmî kurum
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {yonlendirme.resmi_kurum ??
                      "Doğrulama gerekli"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Başvuru yeri
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {yonlendirme.basvuru_yeri ??
                      "Doğrulama gerekli"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Başvuru kanalı
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {basvuruKanaliEtiketi(
                      yonlendirme.basvuru_kanali,
                    )}
                  </p>
                </div>
              </div>

              {(yonlendirme.tahmini_sure_notu ||
                yonlendirme.ucret_notu) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {yonlendirme.tahmini_sure_notu && (
                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-xs font-semibold text-blue-600">
                        Süre notu
                      </p>

                      <p className="mt-2 text-sm leading-6 text-blue-900">
                        {yonlendirme.tahmini_sure_notu}
                      </p>
                    </div>
                  )}

                  {yonlendirme.ucret_notu && (
                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-xs font-semibold text-blue-600">
                        Ücret notu
                      </p>

                      <p className="mt-2 text-sm leading-6 text-blue-900">
                        {yonlendirme.ucret_notu}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <RehberListe
              baslik="Başvuru Öncesi Kontrol"
              maddeler={
                yonlendirme.on_kontrol_listesi
              }
            />

            <RehberListe
              baslik="Hazırlanacak Belgeler"
              maddeler={
                yonlendirme.gerekli_evraklar_json
              }
            />

            <RehberListe
              baslik="Başvuru Adımları"
              maddeler={
                yonlendirme.basvuru_adimlari_json
              }
            />

            {yonlendirme.ai_eksikler &&
              yonlendirme.ai_eksikler.length > 0 && (
                <RehberListe
                  baslik="AI Tarafından Tespit Edilen Eksikler"
                  maddeler={
                    yonlendirme.ai_eksikler
                  }
                />
              )}

            <RehberListe
              baslik="Dikkat Edilecekler"
              maddeler={
                yonlendirme.dikkat_edilecekler_json
              }
            />

            {yonlendirme.dilekce_metni && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Hazır Başvuru Metni
                    </p>

                    <h3 className="mt-2 text-lg font-bold text-slate-950">
                      {yonlendirme.dilekce_basligi ??
                        "Başvuru Dilekçesi"}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void dilekceyiKopyala()
                    }
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    {kopyalandi
                      ? "Kopyalandı"
                      : "Dilekçeyi Kopyala"}
                  </button>
                </div>

                <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                  {yonlendirme.dilekce_metni}
                </pre>
              </section>
            )}

            {(yonlendirme.resmi_kaynak_url ||
              yonlendirme.online_basvuru_url) && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-bold text-slate-950">
                    Resmî Bağlantılar
                  </h3>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {yonlendirme.resmi_kaynak_url && (
                      <a
                        href={
                          yonlendirme.resmi_kaynak_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
                      >
                        Resmî Kaynağı Aç
                      </a>
                    )}

                    {yonlendirme.online_basvuru_url && (
                      <a
                        href={
                          yonlendirme.online_basvuru_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                      >
                        Başvuru Sayfasını Aç
                      </a>
                    )}
                  </div>
                </section>
              )}

            {yonlendirme.hukuki_uyari && (
              <section className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-sm leading-6 text-slate-600">
                {yonlendirme.hukuki_uyari}
              </section>
            )}

            {yonlendirme.isletme_belge_id && (
              <section className="rounded-2xl bg-slate-950 p-5 text-white">
                <h3 className="text-lg font-bold">
                  Başvuruyu tamamladınız mı?
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Başvuru kuruma gerçekten yapıldıktan
                  sonra bu işlemi kullanın. KYM belgeyi
                  henüz tamamlanmış kabul etmez; yalnız
                  başvuru sürecinde olarak izler.
                </p>

                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() =>
                    void basvuruYapildi()
                  }
                  className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {kaydediliyor
                    ? "Kaydediliyor..."
                    : "Başvuru Yapıldı Olarak Kaydet"}
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}