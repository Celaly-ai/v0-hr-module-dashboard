"use client"

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react"

import KymYonlendirmePanel from "@/app/kym/components/KymYonlendirmePanel"

import ManuelYukumlulukForm from "@/app/kym/yukumluluk/ManuelYukumlulukForm"

import {
  getKymDashboardOzet,
  getKymIsletmeler,
  getKymKritikEksikler,
  getKymTumBelgeler,
  yukleKymBelgesi,
} from "@/lib/services/kym-service"

import {
  cevaplaKymProfilSorusu,
  getKymBekleyenProfilSorulari,
  getKymProfilTamamlamaOzeti,
  type KymProfilSorusu,
  type KymProfilTamamlamaOzeti,
} from "@/lib/services/kym-profile-service"

import {
  getKymEksikBelgeYonlendirmesi,
  type KymBasvuruYonlendirme,
} from "@/lib/services/kym-guidance-service"

import type {
  KymBelgeDurumu,
  KymBelgeSatiri,
  KymDashboardOzet,
  KymIsletme,
} from "@/lib/types/kym"

const durumEtiketleri: Record<
  KymBelgeDurumu,
  string
> = {
  yok: "Belge Yok",
  yuklendi_incelemede: "Yüklendi / İncelemede",
  dogrulandi_guncel: "Doğrulandı / Güncel",
  suresi_yaklasiyor: "Süresi Yaklaşıyor",
  yanlis_belge: "Yanlış Belge",
  eksik_bilgi_var: "Eksik Bilgi Var",
  suresi_doldu: "Süresi Doldu",
  manuel_inceleme_gerekli:
    "Bilgi / İnceleme Gerekli",
  basvuru_yapildi: "Başvuru Yapıldı",
  uygulanmiyor: "Kapsam Dışı",
}

function durumEtiketi(
  durum: KymBelgeDurumu,
): string {
  return durumEtiketleri[durum] ?? durum
}

function durumRengi(
  durum: KymBelgeDurumu,
): string {
  if (durum === "dogrulandi_guncel") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  }

  if (durum === "suresi_yaklasiyor") {
    return "bg-amber-50 text-amber-700 ring-amber-200"
  }

  if (durum === "yuklendi_incelemede") {
    return "bg-blue-50 text-blue-700 ring-blue-200"
  }

  if (
    durum ===
    "manuel_inceleme_gerekli"
  ) {
    return "bg-violet-50 text-violet-700 ring-violet-200"
  }

  if (durum === "basvuru_yapildi") {
    return "bg-sky-50 text-sky-700 ring-sky-200"
  }

  if (durum === "uygulanmiyor") {
    return "bg-slate-100 text-slate-600 ring-slate-200"
  }

  if (durum === "suresi_doldu") {
    return "bg-orange-50 text-orange-700 ring-orange-200"
  }

  return "bg-red-50 text-red-700 ring-red-200"
}

function riskSeviyesi(
  puan: number,
): string {
  if (puan >= 95) return "Çok Kritik"
  if (puan >= 80) return "Yüksek"
  if (puan >= 60) return "Orta"

  return "Düşük"
}

function BelgeDurumRozeti({
  durum,
}: {
  durum: KymBelgeDurumu
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${durumRengi(
        durum,
      )}`}
    >
      {durumEtiketi(durum)}
    </span>
  )
}

export default function KymPage() {
  const [isletmeler, setIsletmeler] =
    useState<KymIsletme[]>([])

  const [
    seciliIsletme,
    setSeciliIsletme,
  ] = useState("")

  const [ozet, setOzet] =
    useState<KymDashboardOzet | null>(
      null,
    )

  const [eksikler, setEksikler] =
    useState<KymBelgeSatiri[]>([])

  const [tumBelgeler, setTumBelgeler] =
    useState<KymBelgeSatiri[]>([])

  const [
    profilSorulari,
    setProfilSorulari,
  ] = useState<KymProfilSorusu[]>([])

  const [
    profilOzeti,
    setProfilOzeti,
  ] =
    useState<KymProfilTamamlamaOzeti | null>(
      null,
    )

  const [
    acikYonlendirme,
    setAcikYonlendirme,
  ] =
    useState<KymBasvuruYonlendirme | null>(
      null,
    )

  const [
    yonlendirmeYukleniyorId,
    setYonlendirmeYukleniyorId,
  ] = useState<string | null>(null)

  const [yukleniyor, setYukleniyor] =
    useState(true)

  const [
    profilCevaplaniyor,
    setProfilCevaplaniyor,
  ] = useState(false)

  const [
    seciliDosyalar,
    setSeciliDosyalar,
  ] = useState<
    Record<string, File | undefined>
  >({})

  const [
    dosyaYukleniyorId,
    setDosyaYukleniyorId,
  ] = useState<string | null>(null)

  const [
    islemMesaji,
    setIslemMesaji,
  ] = useState<string | null>(null)

  const [
    mesajTuru,
    setMesajTuru,
  ] = useState<
    "bilgi" | "basarili" | "uyari"
  >("bilgi")

  const aktifProfilSorusu =
    profilSorulari[0] ?? null

  const enYuksekRiskler = useMemo(
    () => eksikler.slice(0, 3),
    [eksikler],
  )

  const aktifIsletme = useMemo(
    () =>
      isletmeler.find(
        (isletme) =>
          isletme.id === seciliIsletme,
      ) ?? null,
    [
      isletmeler,
      seciliIsletme,
    ],
  )

  const aiOnerisi = useMemo(() => {
    if (aktifProfilSorusu) {
      return `Önce işletme profilini netleştirin. "${aktifProfilSorusu.profil_alani}" bilgisi ${aktifProfilSorusu.etkilenen_belge_sayisi} belgeyi etkiliyor.`
    }

    const ilk = enYuksekRiskler[0]

    if (!ilk) {
      return "Kritik eksik görünmüyor. Belge geçerlilik tarihleri ve yaklaşan yenilemeler izlenmelidir."
    }

    return `Öncelik "${ilk.belge_adi}" belgesinde. Risk puanı ${ilk.risk_puani}. Belgeyi yükleyebilir veya KYM yönlendirme rehberini açabilirsiniz.`
  }, [
    aktifProfilSorusu,
    enYuksekRiskler,
  ])

  async function verileriYukle(
    isletmeId?: string,
  ) {
    const hedefIsletmeId =
      isletmeId || seciliIsletme

    if (!hedefIsletmeId) {
      return
    }

    const [
      dashboardOzet,
      kritikEksikler,
      belgeListesi,
      bekleyenSorular,
      tamamlamaOzeti,
    ] = await Promise.all([
      getKymDashboardOzet(
        hedefIsletmeId,
      ),

      getKymKritikEksikler(
        hedefIsletmeId,
      ),

      getKymTumBelgeler(
        hedefIsletmeId,
      ),

      getKymBekleyenProfilSorulari(
        hedefIsletmeId,
      ),

      getKymProfilTamamlamaOzeti(
        hedefIsletmeId,
      ),
    ])

    setOzet(dashboardOzet)
    setEksikler(kritikEksikler)
    setTumBelgeler(belgeListesi)
    setProfilSorulari(bekleyenSorular)
    setProfilOzeti(tamamlamaOzeti)
  }

  useEffect(() => {
    async function baslat() {
      setYukleniyor(true)

      const isletmeListesi =
        await getKymIsletmeler()

      setIsletmeler(isletmeListesi)

      const ilkIsletme =
        isletmeListesi[0]

      if (ilkIsletme) {
        setSeciliIsletme(
          ilkIsletme.id,
        )

        await verileriYukle(
          ilkIsletme.id,
        )
      }

      setYukleniyor(false)
    }

    void baslat()
  }, [])

  async function profilSorusunuCevapla(
    soru: KymProfilSorusu,
    cevap: boolean,
  ) {
    if (
      !seciliIsletme ||
      profilCevaplaniyor
    ) {
      return
    }

    setProfilCevaplaniyor(true)

    setMesajTuru("bilgi")

    setIslemMesaji(
      "KYM işletme profilini güncelliyor ve belge havuzunu yeniden hesaplıyor...",
    )

    const sonuc =
      await cevaplaKymProfilSorusu({
        isletmeId: seciliIsletme,
        soruId: soru.soru_id,
        cevap,
      })

    if (!sonuc.basarili) {
      setMesajTuru("uyari")

      setIslemMesaji(
        sonuc.hata ??
          "İşletme profil cevabı kaydedilemedi.",
      )

      setProfilCevaplaniyor(false)

      return
    }

    await verileriYukle(
      seciliIsletme,
    )

    setMesajTuru("basarili")

    setIslemMesaji(
      `"${soru.kod}" cevaplandı. KYM ${sonuc.islenenBelgeSayisi ?? 0} belge kaydını yeniden değerlendirdi.`,
    )

    setProfilCevaplaniyor(false)
  }

  async function yonlendirmeyiAc(
    belge: KymBelgeSatiri,
  ) {
    setYonlendirmeYukleniyorId(
      belge.isletme_belge_id,
    )

    const yonlendirme =
      await getKymEksikBelgeYonlendirmesi(
        belge.isletme_belge_id,
      )

    setYonlendirmeYukleniyorId(null)

    if (!yonlendirme) {
      setMesajTuru("uyari")

      setIslemMesaji(
        `"${belge.belge_adi}" için KYM yönlendirme rehberi bulunamadı.`,
      )

      return
    }

    setAcikYonlendirme(
      yonlendirme,
    )
  }

  function dosyaSec(
    belgeId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const dosya =
      event.target.files?.[0]

    setSeciliDosyalar((onceki) => ({
      ...onceki,
      [belgeId]: dosya,
    }))

    setIslemMesaji(null)
  }

  async function belgeyiYukle(
    belge: KymBelgeSatiri,
  ) {
    const dosya =
      seciliDosyalar[
        belge.isletme_belge_id
      ]

    if (!dosya) {
      setMesajTuru("uyari")

      setIslemMesaji(
        `"${belge.belge_adi}" için önce dosya seçmelisiniz.`,
      )

      return
    }

    setDosyaYukleniyorId(
      belge.isletme_belge_id,
    )

    setMesajTuru("bilgi")

    setIslemMesaji(
      `"${belge.belge_adi}" yükleniyor ve AI incelemesi başlatılıyor...`,
    )

    const sonuc =
      await yukleKymBelgesi({
        belge,
        dosya,
        isletmeAdi:
          aktifIsletme?.isletme_adi ??
          null,
      })

    if (!sonuc.basarili) {
      setMesajTuru("uyari")

      setIslemMesaji(
        sonuc.hata ??
          "Belge işlenemedi.",
      )

      setDosyaYukleniyorId(null)

      return
    }

    setSeciliDosyalar((onceki) => ({
      ...onceki,

      [belge.isletme_belge_id]:
        undefined,
    }))

    if (sonuc.analizTamamlandi) {
      setMesajTuru("basarili")

      setIslemMesaji(
        `"${belge.belge_adi}" analiz edildi. Sistem durumu: ${durumEtiketi(
          sonuc.yeniDurum ??
            "manuel_inceleme_gerekli",
        )}. ${sonuc.ozet ?? ""}`.trim(),
      )
    } else {
      setMesajTuru("uyari")

      setIslemMesaji(
        sonuc.ozet ??
          "Belge yüklendi ancak AI analizi tamamlanamadı. İnceleme gerekli.",
      )
    }

    await verileriYukle(
      belge.isletme_id,
    )

    setDosyaYukleniyorId(null)
  }

  async function isletmeSec(
    isletmeId: string,
  ) {
    setSeciliIsletme(isletmeId)
    setIslemMesaji(null)

    await verileriYukle(
      isletmeId,
    )
  }

  if (yukleniyor) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            KYM yükleniyor...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      {acikYonlendirme && (
        <KymYonlendirmePanel
          yonlendirme={acikYonlendirme}
          onKapat={() =>
            setAcikYonlendirme(null)
          }
          onGuncellendi={async () => {
            await verileriYukle(
              seciliIsletme,
            )
          }}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                AI Kurumsal Yönetici
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Kurumsal Yönetim Merkezi
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                KYM işletmeyi tanır, uygulanacak
                yükümlülükleri belirler, eksik
                belgeleri önceliklendirir ve
                tamamlama yolunu gösterir.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void verileriYukle()
              }
              className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
            >
              Verileri Yenile
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-sm font-semibold text-emerald-200">
              KYM Öncelik Önerisi
            </p>

            <p className="mt-2 text-sm leading-6 text-emerald-50">
              {aiOnerisi}
            </p>
          </div>
        </section>

        {aktifProfilSorusu ? (
          <section className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
            <div className="bg-violet-50 px-6 py-4 md:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                    İşletmeyi Tanı
                  </p>

                  <p className="mt-1 text-sm text-violet-700">
                    KYM yalnız karar vermek için
                    ihtiyaç duyduğu bilgileri sorar.
                  </p>
                </div>

                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                  {profilSorulari.length} soru kaldı
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10">
              <div className="mx-auto max-w-4xl text-center">
                <div className="flex justify-center">
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                    {aktifProfilSorusu.kod}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-bold leading-tight text-slate-950 md:text-4xl">
                  {aktifProfilSorusu.soru}
                </h2>

                {aktifProfilSorusu.aciklama && (
                  <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                    {aktifProfilSorusu.aciklama}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
                  <span className="rounded-full bg-blue-50 px-4 py-2 font-semibold text-blue-700">
                    {
                      aktifProfilSorusu.etkilenen_belge_sayisi
                    }{" "}
                    belgeyi etkiliyor
                  </span>

                  <span className="rounded-full bg-red-50 px-4 py-2 font-semibold text-red-700">
                    En yüksek risk{" "}
                    {
                      aktifProfilSorusu.en_yuksek_risk
                    }
                  </span>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={profilCevaplaniyor}
                    onClick={() =>
                      void profilSorusunuCevapla(
                        aktifProfilSorusu,
                        true,
                      )
                    }
                    className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-6 py-7 text-xl font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Evet
                  </button>

                  <button
                    type="button"
                    disabled={profilCevaplaniyor}
                    onClick={() =>
                      void profilSorusunuCevapla(
                        aktifProfilSorusu,
                        false,
                      )
                    }
                    className="rounded-2xl border-2 border-red-400 bg-red-50 px-6 py-7 text-xl font-bold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hayır
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm md:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              İşletme Profili Tamamlandı
            </p>

            <h2 className="mt-3 text-2xl font-bold text-emerald-950">
              KYM işletmenin temel uyum profilini
              tanıyor.
            </h2>
          </section>
        )}

        {islemMesaji && (
          <section
            className={`rounded-2xl border px-5 py-4 text-sm font-medium ${
              mesajTuru === "basarili"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : mesajTuru === "uyari"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            {islemMesaji}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Uyum Puanı
            </p>

            <p className="mt-2 text-4xl font-bold text-slate-950">
              {ozet?.uyum_puani ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Toplam Belge
            </p>

            <p className="mt-2 text-4xl font-bold text-slate-950">
              {ozet?.toplam_belge ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Uygulanır
            </p>

            <p className="mt-2 text-4xl font-bold text-blue-600">
              {profilOzeti?.uygulanir_belge ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Bilgi Gerekli
            </p>

            <p className="mt-2 text-4xl font-bold text-violet-600">
              {profilOzeti?.bilgi_gerekli_belge ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Kapsam Dışı
            </p>

            <p className="mt-2 text-4xl font-bold text-slate-500">
              {profilOzeti?.uygulanmayan_belge ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Kritik Eksik
            </p>

            <p className="mt-2 text-4xl font-bold text-red-600">
              {eksikler.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Süresi Dolan
            </p>

            <p className="mt-2 text-4xl font-bold text-orange-600">
              {ozet?.suresi_dolan_belge ?? 0}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-950">
              Bugün Acil Yapılacaklar
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              KYM en yüksek riskli açıkları
              önceliklendirir ve tamamlama yolunu
              gösterir.
            </p>

            <div className="mt-5 space-y-4">
              {enYuksekRiskler.map(
                (belge, index) => (
                  <div
                    key={
                      belge.isletme_belge_id
                    }
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          {index + 1}.{" "}
                          {belge.belge_adi}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {
                            belge.yukumluluk_basligi
                          }
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Başvuru:{" "}
                          {belge.basvuru_yeri ??
                            "-"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <BelgeDurumRozeti
                            durum={belge.durum}
                          />

                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                            {riskSeviyesi(
                              belge.risk_puani,
                            )}
                          </span>
                        </div>

                        {belge.ai_ozet && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {belge.ai_ozet}
                          </p>
                        )}
                      </div>

                      <div className="w-full lg:max-w-sm">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={(event) =>
                            dosyaSec(
                              belge.isletme_belge_id,
                              event,
                            )
                          }
                          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
                        />

                        <button
                          type="button"
                          disabled={
                            dosyaYukleniyorId ===
                            belge.isletme_belge_id
                          }
                          onClick={() =>
                            void belgeyiYukle(
                              belge,
                            )
                          }
                          className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {dosyaYukleniyorId ===
                          belge.isletme_belge_id
                            ? "Belge Yükleniyor ve AI İnceliyor..."
                            : "Belgeyi Yükle ve AI ile İncele"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            yonlendirmeYukleniyorId ===
                            belge.isletme_belge_id
                          }
                          onClick={() =>
                            void yonlendirmeyiAc(
                              belge,
                            )
                          }
                          className="mt-3 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {yonlendirmeYukleniyorId ===
                          belge.isletme_belge_id
                            ? "Yönlendirme Açılıyor..."
                            : "Yönlendirmeyi Aç"}
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}

              {enYuksekRiskler.length === 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                  Bugün için kritik eksik görünmüyor.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              İşletmeler
            </h2>

            <div className="mt-5 space-y-3">
              {isletmeler.map(
                (isletme) => (
                  <button
                    type="button"
                    key={isletme.id}
                    onClick={() =>
                      void isletmeSec(
                        isletme.id,
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      seciliIsletme ===
                      isletme.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-950">
                      {isletme.isletme_adi}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {isletme.sehir ?? "-"} /{" "}
                      {isletme.ilce ?? "-"}
                    </p>
                  </button>
                ),
              )}
            </div>
          </div>
        </section>

        {seciliIsletme && (
          <ManuelYukumlulukForm
            isletmeId={seciliIsletme}
            onTamamlandi={() =>
              verileriYukle(
                seciliIsletme,
              )
            }
          />
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Tüm Belgeler
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-100 text-left">
                  <th className="p-3">
                    Belge
                  </th>

                  <th className="p-3">
                    Yükümlülük
                  </th>

                  <th className="p-3">
                    Kategori
                  </th>

                  <th className="p-3">
                    Durum
                  </th>

                  <th className="p-3">
                    Risk
                  </th>

                  <th className="p-3">
                    İşlem
                  </th>
                </tr>
              </thead>

              <tbody>
                {tumBelgeler.map(
                  (belge) => (
                    <tr
                      key={
                        belge.isletme_belge_id
                      }
                      className="border-b align-top"
                    >
                      <td className="p-3 font-medium text-slate-950">
                        {belge.belge_adi}
                      </td>

                      <td className="p-3 text-slate-600">
                        {
                          belge.yukumluluk_basligi
                        }
                      </td>

                      <td className="p-3 text-slate-600">
                        {belge.kategori}
                      </td>

                      <td className="p-3">
                        <BelgeDurumRozeti
                          durum={
                            belge.durum
                          }
                        />
                      </td>

                      <td className="p-3 font-semibold text-slate-950">
                        {belge.risk_puani}
                      </td>

                      <td className="p-3">
                        {belge.durum !==
                          "uygulanmiyor" && (
                          <button
                            type="button"
                            disabled={
                              yonlendirmeYukleniyorId ===
                              belge.isletme_belge_id
                            }
                            onClick={() =>
                              void yonlendirmeyiAc(
                                belge,
                              )
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            Yönlendirme
                          </button>
                        )}
                      </td>
                    </tr>
                  ),
                )}

                {tumBelgeler.length ===
                  0 && (
                  <tr>
                    <td
                      className="p-5 text-slate-500"
                      colSpan={6}
                    >
                      Belge kaydı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}