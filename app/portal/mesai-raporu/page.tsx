"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

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
  tip: "giris" | "cikis" | string
  created_at: string
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
  eksik_cikis: boolean
  mesai_hesaplanir: boolean
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

function bugun() {
  return new Date().toISOString().slice(0, 10)
}

function ayBasi() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
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
  const temiz = String(value).slice(0, 5)
  const [saat, dakika] = temiz.split(":").map(Number)
  return Number(saat || 0) * 60 + Number(dakika || 0)
}

function kayitDakika(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.getHours() * 60 + d.getMinutes()
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
  if (d.includes("plan")) return "bg-slate-100 text-slate-700 border-slate-300"

  return "bg-slate-100 text-slate-700 border-slate-300"
}

function gunBaslangicISO(tarih: string) {
  return new Date(`${tarih}T00:00:00`).toISOString()
}

function gunBitisISO(tarih: string) {
  return new Date(`${tarih}T23:59:59.999`).toISOString()
}

function adSoyad(p: Personel) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || "Personel"
}

function aktifPersonelMi(p: Personel) {
  const d = String(p.durum || "").toLocaleLowerCase("tr-TR")
  return !d.includes("pasif") && !d.includes("isten_ayrildi")
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

      const vardiyaMap = new Map<string, Vardiya>()
      for (const v of (vardiyaData || []) as Vardiya[]) {
        vardiyaMap.set(`${v.personel_id}-${v.tarih}`, v)
      }

      const hareketMap = new Map<string, GirisCikis[]>()
      for (const h of (girisCikisData || []) as GirisCikis[]) {
        const tarih = new Date(h.created_at).toISOString().slice(0, 10)
        const key = `${h.personel_id}-${tarih}`
        const onceki = hareketMap.get(key) || []
        onceki.push(h)
        hareketMap.set(key, onceki)
      }

      const rapor: MesaiKaydi[] = []

      for (const personel of personeller) {
        for (const tarih of tarihListe) {
          const vardiya = vardiyaMap.get(`${personel.id}-${tarih}`) || null
          const hareketler = hareketMap.get(`${personel.id}-${tarih}`) || []

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
          let eksikCikis = false

          if (!vardiya) {
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

            gecikmeDakika = gec
            girisDurumu = gec > 0 ? "Geç Geldi" : "Zamanında"
          }

          if (mesaiHesaplanir && ilkGiris && !sonCikis) {
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
          }

          rapor.push({
            personel_id: personel.id,
            ad: personel.ad,
            soyad: personel.soyad,
            departman: personel.departman,
            tarih,
            vardiya_durumu: vardiyaDurumu,
            vardiya_aciklama: vardiya?.aciklama || null,
            vardiya_baslangic: vardiya?.baslangic_saati || null,
            vardiya_bitis: vardiya?.bitis_saati || null,
            ilk_giris: mesaiHesaplanir ? ilkGiris : null,
            son_cikis: mesaiHesaplanir ? sonCikis : null,
            giris_durumu: girisDurumu,
            gecikme_dakika: mesaiHesaplanir ? gecikmeDakika : null,
            toplam_calisma_dakika: mesaiHesaplanir ? toplamCalismaDakika : null,
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
      const adSoyadText = `${k.ad || ""} ${k.soyad || ""}`.toLocaleLowerCase("tr-TR")
      const durum = String(k.giris_durumu || "").toLocaleLowerCase("tr-TR")

      const personelUyar = !arama || adSoyadText.includes(arama)

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
    const toplamDakika = filtreliKayitlar.reduce(
      (sum, k) => sum + Number(k.toplam_calisma_dakika || 0),
      0,
    )

    return { toplam, calismaGunu, gelen, gelmeyen, gec, eksikCikis, izinli, toplamDakika }
  }, [filtreliKayitlar])

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          Mesai Giriş / Çıkış Raporu
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vardiya, izin, giriş/çıkış ve puantaj durumunu birlikte gösterir.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-5">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-8">
        <Kpi title="Toplam Satır" value={ozet.toplam} />
        <Kpi title="Çalışma Günü" value={ozet.calismaGunu} />
        <Kpi title="Gelen" value={ozet.gelen} />
        <Kpi title="Geç Kalan" value={ozet.gec} />
        <Kpi title="Gelmeyen" value={ozet.gelmeyen} />
        <Kpi title="İzinli" value={ozet.izinli} />
        <Kpi title="Eksik Çıkış" value={ozet.eksikCikis} />
        <Kpi title="Toplam Süre" value={dakikaSaat(ozet.toplamDakika)} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-black">Detaylı Mesai Tablosu</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            İzinli, raporlu ve tatil günleri mesai/geç kalma hesabına dahil edilmez.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
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
                <th className="p-3 text-center">Toplam Süre</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtreliKayitlar.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-muted-foreground">
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
                      {k.mesai_hesaplanir
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
                    <td className="p-3 text-center">{dakikaSaat(k.toplam_calisma_dakika)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
