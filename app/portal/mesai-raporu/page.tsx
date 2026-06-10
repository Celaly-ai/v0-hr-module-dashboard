"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const YEMEK_MOLASI_DAKIKA = 60
const GEC_KALMA_TOLERANS_DAKIKA = 15
const GEC_KALMA_KRITIK_DAKIKA = 30

type Personel = {
  id: string
  ad: string | null
  soyad: string | null
  departman: string | null
  durum: string | null
  personel_kodu: string | null
}

type Vardiya = {
  id: string
  personel_id: string
  tarih: string
  baslangic_saati: string | null
  bitis_saati: string | null
  calisma_gunu: boolean | null
  durum: string | null
  aciklama: string | null
}

type GirisCikis = {
  id: string
  personel_id: string
  tip: string
  created_at: string
}

type IzinTalebi = {
  id: string
  personel_id: string
  izin_turu: string | null
  izin_baslangic: string | null
  izin_bitis: string | null
  izin_periyodu: string | null
  izin_saat: number | null
  izin_baslangic_saati: string | null
  izin_bitis_saati: string | null
  durum: string | null
}

type MesaiKaydi = {
  personel_id: string
  ad: string | null
  soyad: string | null
  departman: string | null
  tarih: string
  vardiya_durumu: string
  vardiya_aciklama: string | null
  vardiya_baslangic: string | null
  vardiya_bitis: string | null
  ilk_giris: string | null
  son_cikis: string | null
  giris_durumu: string
  gecikme_dakika: number | null
  toplam_calisma_dakika: number | null
  planlanan_dakika: number | null
  net_calisma_dakika: number | null
  eksik_dakika: number | null
  fazla_mesai_dakika: number | null
  puantaj_durumu: string
  eksik_cikis: boolean
  mesai_hesaplanir: boolean
}

function bugun() {
  return new Date().toISOString().slice(0, 10)
}

function ayBasi() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function tarihFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString("tr-TR")
}

function saatFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function temizSaat(value?: string | null) {
  if (!value) return "-"
  return String(value).slice(0, 5)
}

function dakikaSaat(value?: number | null) {
  const dakika = Number(value || 0)
  if (!dakika) return "-"
  const saat = Math.floor(dakika / 60)
  const kalan = Math.round(dakika % 60)
  if (saat <= 0) return `${kalan} dk`
  return `${saat} sa ${kalan} dk`
}

function tarihleriOlustur(baslangic: string, bitis: string) {
  const liste: string[] = []
  const start = new Date(`${baslangic}T00:00:00`)
  const end = new Date(`${bitis}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return liste

  const d = new Date(start)
  while (d <= end) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const gun = String(d.getDate()).padStart(2, "0")
    liste.push(`${y}-${m}-${gun}`)
    d.setDate(d.getDate() + 1)
  }

  return liste
}

function saatDakika(value?: string | null) {
  if (!value) return 0
  const [saat, dakika] = String(value).slice(0, 5).split(":").map(Number)
  return Number(saat || 0) * 60 + Number(dakika || 0)
}

function kayitDakika(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.getHours() * 60 + d.getMinutes()
}

function tarihKey(value: string) {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const gun = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${gun}`
}

function gunBaslangicISO(tarih: string) {
  return new Date(`${tarih}T00:00:00`).toISOString()
}

function gunBitisISO(tarih: string) {
  return new Date(`${tarih}T23:59:59.999`).toISOString()
}

function durumEtiketi(durum?: string | null) {
  switch (durum) {
    case "calisma":
      return "Çalışma"
    case "izinli":
      return "İzinli"
    case "raporlu":
      return "Raporlu"
    case "egitim":
      return "Eğitim"
    case "hafta_tatili":
      return "Hafta Tatili"
    case "resmi_tatil":
      return "Resmi Tatil"
    default:
      return "Plan Yok"
  }
}

function durumRenk(durum?: string | null) {
  const d = String(durum || "").toLocaleLowerCase("tr-TR")

  if (d.includes("izinli")) return "bg-blue-100 text-blue-800 border-blue-300"
  if (d.includes("raporlu")) return "bg-red-100 text-red-800 border-red-300"
  if (d.includes("hafta")) return "bg-gray-200 text-gray-800 border-gray-300"
  if (d.includes("resmi")) return "bg-yellow-100 text-yellow-800 border-yellow-300"
  if (d.includes("eğitim")) return "bg-purple-100 text-purple-800 border-purple-300"
  if (d.includes("geç")) return "bg-amber-100 text-amber-800 border-amber-300"
  if (d.includes("gelmedi")) return "bg-red-100 text-red-800 border-red-300"
  if (d.includes("zaman")) return "bg-emerald-100 text-emerald-800 border-emerald-300"

  return "bg-slate-100 text-slate-700 border-slate-300"
}

function aktifPersonelMi(p: Personel) {
  const d = String(p.durum || "").toLocaleLowerCase("tr-TR")
  return !d.includes("pasif") && !d.includes("isten_ayrildi")
}

function onayliMi(durum?: string | null) {
  const d = String(durum || "").trim()
  return d === "Onaylandı" || d === "Onaylandi" || d === "approved"
}

function tarihAraligindaMi(tarih: string, baslangic?: string | null, bitis?: string | null) {
  if (!baslangic || !bitis) return false
  return tarih >= baslangic && tarih <= bitis
}

function izinDakikaHesapla(izin: IzinTalebi, planlananDakika: number) {
  const periyod = izin.izin_periyodu || "tam_gun"

  if (periyod === "tam_gun") return planlananDakika
  if (periyod === "sabah_yarim_gun") return Math.min(240, planlananDakika)
  if (periyod === "ogleden_sonra_yarim_gun") return Math.min(240, planlananDakika)
  if (periyod === "saatlik") return Math.min(Math.round(Number(izin.izin_saat || 0) * 60), planlananDakika)

  return 0
}

function kismiIzinMi(izinler: IzinTalebi[]) {
  return izinler.some((izin) =>
    ["sabah_yarim_gun", "ogleden_sonra_yarim_gun", "saatlik"].includes(
      izin.izin_periyodu || "",
    ),
  )
}

function izinAciklama(izin: IzinTalebi, izinDakika: number) {
  const tur = izin.izin_turu || "İzin"
  const periyod = izin.izin_periyodu || "tam_gun"

  if (periyod === "sabah_yarim_gun") return `${tur}: sabah yarım gün`
  if (periyod === "ogleden_sonra_yarim_gun") return `${tur}: öğleden sonra yarım gün`
  if (periyod === "saatlik") {
    const bas = String(izin.izin_baslangic_saati || "").slice(0, 5)
    const bit = String(izin.izin_bitis_saati || "").slice(0, 5)
    return `${tur}: ${Math.round(izinDakika / 60 * 100) / 100} saat${bas && bit ? ` (${bas}-${bit})` : ""}`
  }

  return `Onaylı izin: ${tur}`
}

export default function MesaiRaporuPage() {
  const supabase = useMemo(() => createClient(), [])

  const [kayitlar, setKayitlar] = useState<MesaiKaydi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [baslangicTarihi, setBaslangicTarihi] = useState(ayBasi())
  const [bitisTarihi, setBitisTarihi] = useState(bugun())
  const [personelArama, setPersonelArama] = useState("")
  const [durumFiltresi, setDurumFiltresi] = useState("tum")

  const [personelFormu, setPersonelFormu] = useState(false)

  function raporYazdir() {
    setPersonelFormu(false)
    document.body.classList.remove("personel-puantaj-print")
    setTimeout(() => window.print(), 100)
  }

  function personelPuantajFormuYazdir() {
    setPersonelFormu(true)
    document.body.classList.add("personel-puantaj-print")
    setTimeout(() => window.print(), 100)
  }

  async function verileriGetir() {
    setLoading(true)
    setError(null)

    try {
      const tarihListe = tarihleriOlustur(baslangicTarihi, bitisTarihi)

      if (tarihListe.length === 0) {
        setKayitlar([])
        setError("Tarih aralığı geçersiz.")
        setLoading(false)
        return
      }

      const { data: personellerData, error: personelError } = await supabase
        .from("personeller")
        .select("id, ad, soyad, departman, durum, personel_kodu")
        .order("ad", { ascending: true })

      if (personelError) throw personelError

      const personeller = ((personellerData || []) as Personel[]).filter(aktifPersonelMi)
      const personelIds = personeller.map((p) => p.id)

      if (personelIds.length === 0) {
        setKayitlar([])
        setLoading(false)
        return
      }

      const { data: vardiyaData, error: vardiyaError } = await supabase
        .from("vardiya_planlari")
        .select("id, personel_id, tarih, baslangic_saati, bitis_saati, calisma_gunu, durum, aciklama")
        .in("personel_id", personelIds)
        .gte("tarih", baslangicTarihi)
        .lte("tarih", bitisTarihi)

      if (vardiyaError) throw vardiyaError

      const { data: girisCikisData, error: girisCikisError } = await supabase
        .from("giris_cikis_kayitlari")
        .select("id, personel_id, tip, created_at")
        .in("personel_id", personelIds)
        .gte("created_at", gunBaslangicISO(baslangicTarihi))
        .lte("created_at", gunBitisISO(bitisTarihi))
        .order("created_at", { ascending: true })

      if (girisCikisError) throw girisCikisError

      const { data: izinData, error: izinError } = await supabase
        .from("calisan_talepler")
        .select("id, personel_id, izin_turu, izin_baslangic, izin_bitis, izin_periyodu, izin_saat, izin_baslangic_saati, izin_bitis_saati, durum")
        .in("personel_id", personelIds)
        .eq("tip", "izin")
        .lte("izin_baslangic", bitisTarihi)
        .gte("izin_bitis", baslangicTarihi)

      if (izinError) throw izinError

      const vardiyaMap = new Map<string, Vardiya>()
      for (const v of (vardiyaData || []) as Vardiya[]) {
        vardiyaMap.set(`${v.personel_id}-${v.tarih}`, v)
      }

      const hareketMap = new Map<string, GirisCikis[]>()
      for (const h of (girisCikisData || []) as GirisCikis[]) {
        const key = `${h.personel_id}-${tarihKey(h.created_at)}`
        const onceki = hareketMap.get(key) || []
        onceki.push(h)
        hareketMap.set(key, onceki)
      }

      const izinMap = new Map<string, IzinTalebi[]>()
      const onayliIzinler = ((izinData || []) as IzinTalebi[]).filter((x) => onayliMi(x.durum))

      for (const izin of onayliIzinler) {
        for (const tarih of tarihListe) {
          if (izin.personel_id && tarihAraligindaMi(tarih, izin.izin_baslangic, izin.izin_bitis)) {
            const key = `${izin.personel_id}-${tarih}`
            const onceki = izinMap.get(key) || []
            onceki.push(izin)
            izinMap.set(key, onceki)
          }
        }
      }

      const rapor: MesaiKaydi[] = []

      for (const personel of personeller) {
        for (const tarih of tarihListe) {
          const vardiya = vardiyaMap.get(`${personel.id}-${tarih}`) || null
          const hareketler = hareketMap.get(`${personel.id}-${tarih}`) || []
          const gunIzinleri = izinMap.get(`${personel.id}-${tarih}`) || []
          const sirali = [...hareketler].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )

          const girisler = sirali.filter((x) => x.tip === "giris")
          const cikislar = sirali.filter((x) => x.tip === "cikis")

          const ilkGiris = girisler[0]?.created_at || null
          const sonCikis = cikislar[cikislar.length - 1]?.created_at || null

          const vardiyaDurumu = vardiya?.durum || "plan_yok"
          const mesaiHesaplanir =
            vardiyaDurumu === "calisma" && vardiya?.calisma_gunu !== false

          let girisDurumu = "Plan Yok"
          let gecikmeDakika: number | null = null
          let toplamCalismaDakika: number | null = null
          let planlananDakika: number | null = null
          let netCalismaDakika: number | null = null
          let eksikDakika: number | null = null
          let fazlaMesaiDakika: number | null = null
          let puantajDurumu = girisDurumu
          let vardiyaEkAciklama: string | null = null
          let eksikCikis = false

          if (!vardiya && gunIzinleri.length > 0) {
            const izinMetni = gunIzinleri
              .map((izin) => izinAciklama(izin, Math.round(Number(izin.izin_saat || 0) * 60)))
              .join(" · ")

            const kismi = kismiIzinMi(gunIzinleri)
            girisDurumu = kismi ? "Kısmi İzinli" : "İzinli"
            puantajDurumu = kismi ? "KISMİ İZİNLİ" : "İzinli"
            vardiyaEkAciklama = izinMetni
          } else if (!vardiya) {
            girisDurumu = ilkGiris ? "Plansız Giriş" : "Plan Yok"
          } else if (!mesaiHesaplanir) {
            girisDurumu = durumEtiketi(vardiyaDurumu)
          } else if (!ilkGiris) {
            girisDurumu = "Gelmedi"
            gecikmeDakika = 0
          } else {
            const vardiyaBas = saatDakika(vardiya.baslangic_saati)
            const ilkGirisDakika = kayitDakika(ilkGiris)
            const gec = ilkGirisDakika !== null ? Math.max(0, ilkGirisDakika - vardiyaBas) : 0

            if (gec <= GEC_KALMA_TOLERANS_DAKIKA) {
              gecikmeDakika = 0
              girisDurumu = "Zamanında"
            } else if (gec <= GEC_KALMA_KRITIK_DAKIKA) {
              gecikmeDakika = gec
              girisDurumu = "Geç Geldi"
            } else {
              gecikmeDakika = gec
              girisDurumu = "Eksik / Geç"
            }
          }

          if (mesaiHesaplanir) {
            const vardiyaBas = saatDakika(vardiya?.baslangic_saati)
            const vardiyaBit = saatDakika(vardiya?.bitis_saati)
            const vardiyaDakika = Math.max(0, vardiyaBit - vardiyaBas)
            const yemekDusulmusPlan =
              vardiyaDakika > YEMEK_MOLASI_DAKIKA
                ? vardiyaDakika - YEMEK_MOLASI_DAKIKA
                : vardiyaDakika

            const izinDakika = gunIzinleri.reduce(
              (toplam, izin) => toplam + izinDakikaHesapla(izin, yemekDusulmusPlan),
              0,
            )

            planlananDakika = Math.max(0, yemekDusulmusPlan - izinDakika) || null

            if (gunIzinleri.length > 0) {
              const izinMetni = gunIzinleri
                .map((izin) => izinAciklama(izin, izinDakikaHesapla(izin, yemekDusulmusPlan)))
                .join(" · ")

              vardiyaEkAciklama = izinMetni
            }
          }

          if (mesaiHesaplanir && planlananDakika === null && gunIzinleri.length > 0) {
            const kismi = kismiIzinMi(gunIzinleri)
            girisDurumu = kismi ? "Kısmi İzinli" : "İzinli"
            puantajDurumu = kismi ? "KISMİ İZİNLİ" : "İzinli"
          }

          if (mesaiHesaplanir && ilkGiris && !sonCikis && planlananDakika !== null) {
            eksikCikis = true
          }

          if (mesaiHesaplanir) {
            let toplam = 0

            for (let i = 0; i < sirali.length; i += 1) {
              const mevcut = sirali[i]
              const sonraki = sirali[i + 1]

              if (mevcut?.tip === "giris" && sonraki?.tip === "cikis") {
                const g = kayitDakika(mevcut.created_at)
                const c = kayitDakika(sonraki.created_at)
                if (g !== null && c !== null && c > g) toplam += c - g
              }
            }

            toplamCalismaDakika = toplam || null
            netCalismaDakika = toplam || null

            if (!ilkGiris) {
              puantajDurumu = "DEVAMSIZ"
              eksikDakika = planlananDakika
              fazlaMesaiDakika = null
            } else if (eksikCikis) {
              puantajDurumu = "EKSİK ÇIKIŞ"
              eksikDakika = planlananDakika
              fazlaMesaiDakika = null
            } else {
              const plan = Number(planlananDakika || 0)
              const net = Number(netCalismaDakika || 0)

              eksikDakika = plan > net ? plan - net : null
              fazlaMesaiDakika = net > plan ? net - plan : null

              if (fazlaMesaiDakika) {
                puantajDurumu = "FAZLA MESAİ"
              } else if (eksikDakika) {
                puantajDurumu = girisDurumu === "Eksik / Geç" ? "EKSİK / GEÇ" : "EKSİK"
              } else {
                puantajDurumu = "TAM"
              }
            }
          } else {
            puantajDurumu = girisDurumu
          }

          rapor.push({
            personel_id: personel.id,
            ad: personel.ad,
            soyad: personel.soyad,
            departman: personel.departman,
            tarih,
            vardiya_durumu: vardiyaDurumu,
            vardiya_aciklama: vardiya?.aciklama || vardiyaEkAciklama || null,
            vardiya_baslangic: vardiya?.baslangic_saati || null,
            vardiya_bitis: vardiya?.bitis_saati || null,
            ilk_giris: mesaiHesaplanir ? ilkGiris : null,
            son_cikis: mesaiHesaplanir ? sonCikis : null,
            giris_durumu: girisDurumu,
            gecikme_dakika: mesaiHesaplanir ? gecikmeDakika : null,
            toplam_calisma_dakika: mesaiHesaplanir ? toplamCalismaDakika : null,
            planlanan_dakika: mesaiHesaplanir ? planlananDakika : null,
            net_calisma_dakika: mesaiHesaplanir ? netCalismaDakika : null,
            eksik_dakika: mesaiHesaplanir ? eksikDakika : null,
            fazla_mesai_dakika: mesaiHesaplanir ? fazlaMesaiDakika : null,
            puantaj_durumu: puantajDurumu,
            eksik_cikis: eksikCikis,
            mesai_hesaplanir: mesaiHesaplanir,
          })
        }
      }

      setKayitlar(
        rapor.sort((a, b) => {
          const tarihFark = new Date(b.tarih).getTime() - new Date(a.tarih).getTime()
          if (tarihFark !== 0) return tarihFark
          return `${a.ad || ""} ${a.soyad || ""}`.localeCompare(`${b.ad || ""} ${b.soyad || ""}`, "tr")
        }),
      )
    } catch (err: any) {
      setError(err?.message || "Mesai raporu alınamadı.")
      setKayitlar([])
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriGetir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtreliKayitlar = useMemo(() => {
    const arama = personelArama.trim().toLocaleLowerCase("tr-TR")

    return kayitlar.filter((k) => {
      const adSoyad = `${k.ad || ""} ${k.soyad || ""}`.toLocaleLowerCase("tr-TR")
      const durum = String(k.giris_durumu || "").toLocaleLowerCase("tr-TR")

      const personelUyar = !arama || adSoyad.includes(arama)

      const durumUyar =
        durumFiltresi === "tum" ||
        (durumFiltresi === "zamaninda" && durum.includes("zaman")) ||
        (durumFiltresi === "gec" && durum.includes("geç")) ||
        (durumFiltresi === "gelmedi" && durum.includes("gelmedi")) ||
        (durumFiltresi === "izinli" && durum.includes("izinli")) ||
        (durumFiltresi === "raporlu" && durum.includes("raporlu")) ||
        (durumFiltresi === "tatil" && (durum.includes("tatil") || durum.includes("resmi"))) ||
        (durumFiltresi === "eksik_cikis" && k.eksik_cikis)

      return personelUyar && durumUyar
    })
  }, [kayitlar, personelArama, durumFiltresi])

  const ozet = useMemo(() => {
    const toplam = filtreliKayitlar.length
    const calismaGunu = filtreliKayitlar.filter((k) => k.mesai_hesaplanir).length
    const gelen = filtreliKayitlar.filter((k) => k.mesai_hesaplanir && k.ilk_giris).length
    const gelmeyen = filtreliKayitlar.filter((k) =>
      String(k.giris_durumu || "").toLocaleLowerCase("tr-TR").includes("gelmedi"),
    ).length
    const gec = filtreliKayitlar.filter((k) => Number(k.gecikme_dakika || 0) > 0).length
    const eksikCikis = filtreliKayitlar.filter((k) => k.eksik_cikis).length
    const izinli = filtreliKayitlar.filter((k) =>
      String(k.giris_durumu || "").toLocaleLowerCase("tr-TR").includes("izinli"),
    ).length
    const tamGun = filtreliKayitlar.filter((k) => k.puantaj_durumu === "TAM").length
    const eksikGun = filtreliKayitlar.filter((k) =>
      ["EKSİK", "EKSİK / GEÇ", "EKSİK ÇIKIŞ"].includes(k.puantaj_durumu),
    ).length
    const devamsizGun = filtreliKayitlar.filter((k) => k.puantaj_durumu === "DEVAMSIZ").length
    const fazlaMesailiGun = filtreliKayitlar.filter((k) => k.puantaj_durumu === "FAZLA MESAİ").length
    const tatilGun = filtreliKayitlar.filter((k) =>
      ["Hafta Tatili", "Resmi Tatil"].includes(k.puantaj_durumu),
    ).length

    const planlananDakika = filtreliKayitlar.reduce(
      (sum, k) => sum + Number(k.planlanan_dakika || 0),
      0,
    )

    const toplamDakika = filtreliKayitlar.reduce(
      (sum, k) => sum + Number(k.net_calisma_dakika || 0),
      0,
    )
    const eksikDakika = filtreliKayitlar.reduce(
      (sum, k) => sum + Number(k.eksik_dakika || 0),
      0,
    )
    const fazlaDakika = filtreliKayitlar.reduce(
      (sum, k) => sum + Number(k.fazla_mesai_dakika || 0),
      0,
    )

    return {
      toplam,
      calismaGunu,
      gelen,
      gelmeyen,
      gec,
      eksikCikis,
      izinli,
      tamGun,
      eksikGun,
      devamsizGun,
      fazlaMesailiGun,
      tatilGun,
      planlananDakika,
      toplamDakika,
      eksikDakika,
      fazlaDakika,
    }
  }, [filtreliKayitlar])


  const aylikPuantajOzeti = useMemo(() => {
    const map = new Map<string, {
      personel_id: string
      adSoyad: string
      departman: string
      calismaGunu: number
      izinliGun: number
      tatilGun: number
      devamsizGun: number
      eksikGun: number
      fazlaMesailiGun: number
      planlananDakika: number
      netDakika: number
      eksikDakika: number
      fazlaDakika: number
    }>()

    for (const k of filtreliKayitlar) {
      const key = k.personel_id
      const mevcut = map.get(key) || {
        personel_id: k.personel_id,
        adSoyad: `${k.ad || ""} ${k.soyad || ""}`.trim() || "Personel",
        departman: k.departman || "-",
        calismaGunu: 0,
        izinliGun: 0,
        tatilGun: 0,
        devamsizGun: 0,
        eksikGun: 0,
        fazlaMesailiGun: 0,
        planlananDakika: 0,
        netDakika: 0,
        eksikDakika: 0,
        fazlaDakika: 0,
      }

      if (k.mesai_hesaplanir) mevcut.calismaGunu += 1
      if (
        k.puantaj_durumu === "İzinli" ||
        k.puantaj_durumu === "KISMİ İZİNLİ" ||
        k.puantaj_durumu === "Kısmi İzinli"
      ) mevcut.izinliGun += 1
      if (["Hafta Tatili", "Resmi Tatil"].includes(k.puantaj_durumu)) mevcut.tatilGun += 1
      if (k.puantaj_durumu === "DEVAMSIZ") mevcut.devamsizGun += 1
      if (["EKSİK", "EKSİK / GEÇ", "EKSİK ÇIKIŞ"].includes(k.puantaj_durumu)) mevcut.eksikGun += 1
      if (k.puantaj_durumu === "FAZLA MESAİ") mevcut.fazlaMesailiGun += 1

      mevcut.planlananDakika += Number(k.planlanan_dakika || 0)
      mevcut.netDakika += Number(k.net_calisma_dakika || 0)
      mevcut.eksikDakika += Number(k.eksik_dakika || 0)
      mevcut.fazlaDakika += Number(k.fazla_mesai_dakika || 0)

      map.set(key, mevcut)
    }

    return Array.from(map.values()).sort((a, b) =>
      a.adSoyad.localeCompare(b.adSoyad, "tr"),
    )
  }, [filtreliKayitlar])

  return (
    <div className="space-y-5 p-4 md:p-6">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }

          .print-hide {
            display: none !important;
          }

          body.personel-puantaj-print .genel-rapor-alani,
          body.personel-puantaj-print .print-signature {
            display: none !important;
          }

          body:not(.personel-puantaj-print) .personel-puantaj-formu {
            display: none !important;
          }

          .print-area {
            color: black !important;
          }

          .print-area * {
            color: black !important;
            background: white !important;
            box-shadow: none !important;
          }

          .print-card {
            border: 1px solid #222 !important;
            border-radius: 0 !important;
          }

          table {
            border-collapse: collapse !important;
          }

          th,
          td {
            border: 1px solid #333 !important;
            padding: 6px !important;
            font-size: 11px !important;
          }

          .print-signature {
            display: grid !important;
          }

          .print-only {
            display: block !important;
          }

          .kpi-section {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .kpi-section {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }

        .print-signature {
          display: none;
        }

        .print-only {
          display: none;
        }

        .print-only {
          display: none;
        }
      `}</style>

      <div className="print-area">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="print-only mb-4 text-center">
              <p className="text-sm font-black">FEYROUTE SERVİS YÖNETİM SİSTEMİ</p>
              <p className="mt-1 text-lg font-black">MESAİ GİRİŞ / ÇIKIŞ VE PUANTAJ RAPORU</p>
              <p className="mt-2 text-xs font-semibold">
                Rapor Dönemi: {tarihFormat(baslangicTarihi)} - {tarihFormat(bitisTarihi)}
              </p>
              <p className="text-xs font-semibold">
                Oluşturma Tarihi: {new Date().toLocaleDateString("tr-TR")} {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <h1 className="text-2xl font-black tracking-tight print-hide">
              Mesai Giriş / Çıkış Raporu
            </h1>
            <p className="mt-1 text-sm text-muted-foreground print-hide">
              Vardiya, izin, giriş/çıkış ve puantaj durumunu birlikte gösterir.
            </p>
          </div>

          <div className="print-hide flex gap-2">
            <button
              type="button"
              onClick={raporYazdir}
              className="rounded-lg border px-4 py-2 text-sm font-black"
            >
              PDF İndir
            </button>
            <button
              type="button"
              onClick={personelPuantajFormuYazdir}
              className="rounded-lg border px-4 py-2 text-sm font-black"
            >
              Personel Puantaj Formu
            </button>
            <button
              type="button"
              onClick={raporYazdir}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-black text-background"
            >
              Yazdır
            </button>
          </div>
        </div>
      </div>

      <div className="print-hide grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-5">
        <div>
          <label className="text-xs font-bold text-muted-foreground">Başlangıç</label>
          <input
            type="date"
            value={baslangicTarihi}
            onChange={(e) => setBaslangicTarihi(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Bitiş</label>
          <input
            type="date"
            value={bitisTarihi}
            onChange={(e) => setBitisTarihi(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Personel</label>
          <input
            value={personelArama}
            onChange={(e) => setPersonelArama(e.target.value)}
            placeholder="Ad soyad ara"
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Durum</label>
          <select
            value={durumFiltresi}
            onChange={(e) => setDurumFiltresi(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="tum">Tümü</option>
            <option value="zamaninda">Zamanında</option>
            <option value="gec">Geç Gelen</option>
            <option value="gelmedi">Gelmedi</option>
            <option value="izinli">İzinli</option>
            <option value="raporlu">Raporlu</option>
            <option value="tatil">Tatil</option>
            <option value="eksik_cikis">Eksik Çıkış</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void verileriGetir()}
            disabled={loading}
            className="min-h-10 w-full rounded-lg bg-foreground px-4 text-sm font-black text-background disabled:opacity-60"
          >
            {loading ? "Yükleniyor..." : "Filtrele"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          Rapor verisi alınamadı: {error}
        </div>
      )}

      <div className="kpi-section grid grid-cols-2 gap-3 md:grid-cols-8">
        <Kpi title="Toplam Satır" value={ozet.toplam} />
        <Kpi title="Çalışma Günü" value={ozet.calismaGunu} />
        <Kpi title="Gelen" value={ozet.gelen} />
        <Kpi title="Geç Kalan" value={ozet.gec} />
        <Kpi title="Gelmeyen" value={ozet.gelmeyen} />
        <Kpi title="İzinli" value={ozet.izinli} />
        <Kpi title="Eksik Çıkış" value={ozet.eksikCikis} />
        <Kpi title="Tam Gün" value={ozet.tamGun} />
        <Kpi title="Eksik Gün" value={ozet.eksikGun} />
        <Kpi title="Devamsız Gün" value={ozet.devamsizGun} />
        <Kpi title="Fazla Mesaili Gün" value={ozet.fazlaMesailiGun} />
        <Kpi title="Tatil Gün" value={ozet.tatilGun} />
        <Kpi title="Planlanan Süre" value={dakikaSaat(ozet.planlananDakika)} />
        <Kpi title="Toplam Süre" value={dakikaSaat(ozet.toplamDakika)} />
        <Kpi title="Eksik Süre" value={dakikaSaat(ozet.eksikDakika)} />
        <Kpi title="Fazla Mesai" value={dakikaSaat(ozet.fazlaDakika)} />
      </div>


      <div className="genel-rapor-alani overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-black">Aylık Puantaj Özeti</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Aktif tarih ve personel filtrelerine göre personel bazlı toplam puantaj.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left">Personel</th>
                <th className="p-3 text-left">Departman</th>
                <th className="p-3 text-center">Çalışma</th>
                <th className="p-3 text-center">İzin</th>
                <th className="p-3 text-center">Tatil</th>
                <th className="p-3 text-center">Devamsız</th>
                <th className="p-3 text-center">Eksik Gün</th>
                <th className="p-3 text-center">Fazla Mesaili Gün</th>
                <th className="p-3 text-center">Planlanan</th>
                <th className="p-3 text-center">Net</th>
                <th className="p-3 text-center">Eksik Süre</th>
                <th className="p-3 text-center">Fazla Mesai</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : aylikPuantajOzeti.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-muted-foreground">
                    Özet oluşturulacak kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                aylikPuantajOzeti.map((k) => (
                  <tr key={k.personel_id} className="border-t">
                    <td className="p-3 font-bold">{k.adSoyad}</td>
                    <td className="p-3">{k.departman}</td>
                    <td className="p-3 text-center">{k.calismaGunu}</td>
                    <td className="p-3 text-center">{k.izinliGun}</td>
                    <td className="p-3 text-center">{k.tatilGun}</td>
                    <td className="p-3 text-center font-bold text-red-700">{k.devamsizGun}</td>
                    <td className="p-3 text-center font-bold text-amber-700">{k.eksikGun}</td>
                    <td className="p-3 text-center">{k.fazlaMesailiGun}</td>
                    <td className="p-3 text-center">{dakikaSaat(k.planlananDakika)}</td>
                    <td className="p-3 text-center">{dakikaSaat(k.netDakika)}</td>
                    <td className="p-3 text-center font-bold text-amber-700">{dakikaSaat(k.eksikDakika)}</td>
                    <td className="p-3 text-center font-bold text-blue-700">{dakikaSaat(k.fazlaDakika)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="genel-rapor-alani overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-black">Detaylı Mesai Tablosu</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            İzinli, raporlu ve tatil günleri mesai/geç kalma hesabına dahil edilmez.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left">Personel</th>
                <th className="p-3 text-left">Departman</th>
                <th className="p-3 text-center">Tarih</th>
                <th className="p-3 text-center">Vardiya</th>
                <th className="p-3 text-center">İlk Giriş</th>
                <th className="p-3 text-center">Son Çıkış</th>
                <th className="p-3 text-center">Durum</th>
                <th className="p-3 text-center">Açıklama</th>
                <th className="p-3 text-center">Geç Kalma</th>
                <th className="p-3 text-center">Planlanan</th>
                <th className="p-3 text-center">Net Süre</th>
                <th className="p-3 text-center">Eksik Süre</th>
                <th className="p-3 text-center">Fazla Mesai</th>
                <th className="p-3 text-center">Puantaj</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtreliKayitlar.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-muted-foreground">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtreliKayitlar.map((k, index) => (
                  <tr key={`${k.personel_id}-${k.tarih}-${index}`} className="border-t">
                    <td className="p-3 font-bold">
                      {k.ad || "-"} {k.soyad || ""}
                    </td>
                    <td className="p-3">{k.departman || "-"}</td>
                    <td className="p-3 text-center">{tarihFormat(k.tarih)}</td>
                    <td className="p-3 text-center">
                      {k.puantaj_durumu === "İzinli"
                        ? "İzinli"
                        : k.puantaj_durumu === "KISMİ İZİNLİ" || k.puantaj_durumu === "Kısmi İzinli"
                          ? "Kısmi İzinli"
                          : k.mesai_hesaplanir
                            ? `${temizSaat(k.vardiya_baslangic)} - ${temizSaat(k.vardiya_bitis)}`
                            : durumEtiketi(k.vardiya_durumu)}
                    </td>
                    <td className="p-3 text-center">{saatFormat(k.ilk_giris)}</td>
                    <td className="p-3 text-center">{saatFormat(k.son_cikis)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${durumRenk(k.giris_durumu)}`}>
                        {k.giris_durumu || "-"}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs font-semibold">
                      {k.vardiya_aciklama || "-"}
                    </td>
                    <td className="p-3 text-center">{dakikaSaat(k.gecikme_dakika)}</td>
                    <td className="p-3 text-center">{dakikaSaat(k.planlanan_dakika)}</td>
                    <td className="p-3 text-center">{dakikaSaat(k.net_calisma_dakika)}</td>
                    <td className="p-3 text-center">{dakikaSaat(k.eksik_dakika)}</td>
                    <td className="p-3 text-center">{dakikaSaat(k.fazla_mesai_dakika)}</td>
                    <td className="p-3 text-center font-bold">{k.puantaj_durumu}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      <div className="personel-puantaj-formu hidden print:block">
        <div className="mb-4 text-center">
          <p className="text-sm font-black">FEYROUTE SERVİS YÖNETİM SİSTEMİ</p>
          <p className="mt-1 text-lg font-black">PERSONEL PUANTAJ FORMU</p>
          <p className="mt-2 text-xs font-semibold">
            Dönem: {tarihFormat(baslangicTarihi)} - {tarihFormat(bitisTarihi)}
          </p>
        </div>

        <table className="mb-4 w-full text-sm">
          <tbody>
            <tr>
              <td className="font-black">Personel</td>
              <td>{aylikPuantajOzeti[0]?.adSoyad || "-"}</td>
              <td className="font-black">Departman</td>
              <td>{aylikPuantajOzeti[0]?.departman || "-"}</td>
            </tr>
            <tr>
              <td className="font-black">Çalışma Günü</td>
              <td>{aylikPuantajOzeti[0]?.calismaGunu || 0}</td>
              <td className="font-black">İzin</td>
              <td>{aylikPuantajOzeti[0]?.izinliGun || 0}</td>
            </tr>
            <tr>
              <td className="font-black">Devamsız</td>
              <td>{aylikPuantajOzeti[0]?.devamsizGun || 0}</td>
              <td className="font-black">Eksik Gün</td>
              <td>{aylikPuantajOzeti[0]?.eksikGun || 0}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-xs">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Vardiya</th>
              <th>İlk Giriş</th>
              <th>Son Çıkış</th>
              <th>Durum</th>
              <th>Açıklama</th>
              <th>Net Süre</th>
              <th>Puantaj</th>
            </tr>
          </thead>
          <tbody>
            {filtreliKayitlar.map((k, index) => (
              <tr key={`puantaj-${k.personel_id}-${k.tarih}-${index}`}>
                <td>{tarihFormat(k.tarih)}</td>
                <td>
                  {k.puantaj_durumu === "İzinli"
                    ? "İzinli"
                    : k.puantaj_durumu === "KISMİ İZİNLİ" || k.puantaj_durumu === "Kısmi İzinli"
                      ? "Kısmi İzinli"
                      : k.mesai_hesaplanir
                        ? `${temizSaat(k.vardiya_baslangic)} - ${temizSaat(k.vardiya_bitis)}`
                        : durumEtiketi(k.vardiya_durumu)}
                </td>
                <td>{saatFormat(k.ilk_giris)}</td>
                <td>{saatFormat(k.son_cikis)}</td>
                <td>{k.giris_durumu}</td>
                <td>{k.vardiya_aciklama || "-"}</td>
                <td>{dakikaSaat(k.net_calisma_dakika)}</td>
                <td>{k.puantaj_durumu}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-4 gap-8 text-sm">
          <div className="space-y-10">
            <p className="font-black">Personel</p>
            <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
          </div>
          <div className="space-y-10">
            <p className="font-black">Birim Sorumlusu</p>
            <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
          </div>
          <div className="space-y-10">
            <p className="font-black">İK Yetkilisi</p>
            <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
          </div>
          <div className="space-y-10">
            <p className="font-black">Onay</p>
            <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
          </div>
        </div>
      </div>

      <div className="print-signature mt-10 grid-cols-4 gap-8 text-sm">
        <div className="space-y-10">
          <p className="font-black">Personel</p>
          <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
        </div>

        <div className="space-y-10">
          <p className="font-black">Birim Sorumlusu</p>
          <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
        </div>

        <div className="space-y-10">
          <p className="font-black">İK Yetkilisi</p>
          <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
        </div>

        <div className="space-y-10">
          <p className="font-black">Onay</p>
          <div className="border-t border-black pt-2">Ad Soyad / İmza</div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}
