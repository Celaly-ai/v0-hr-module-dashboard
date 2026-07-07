"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Camera, Check, ChevronDown, FileText, ImagePlus, MessageCircle, Send, X } from "lucide-react"

type Personel = {
  id: string
  personel_kodu: string | null
  ad: string | null
  soyad: string | null
  auth_id: string | null
  kullanici_id?: string | null
  rol: string | null
  unvan?: string | null
  durum: string | null
  sirket_id?: string | null
  email?: string | null
  tel?: string | null
}

type Konu = {
  id: string
  baslik: string | null
  son_mesaj_at: string | null
  son_mesaj_gonderen_personel_id?: string | null
  created_at: string | null
}

type Mesaj = {
  id: string
  konu_id: string
  gonderen_personel_id: string
  mesaj_icerik: string | null
  created_at: string | null
  sistem_mesaji_mi: boolean | null
}

type Katilim = {
  konu_id: string
  personel_id: string
  son_okuma_at: string | null
}

const MAKS_GORUSME = 3
const MAKS_MESAJ = 10
const CEvRIMICI_ESIK_MS = 2 * 60 * 1000
const SAYFA_BASLIK = "FeyRoute İletişim"

const YONETICI_ROLLERI = [
  "admin",
  "ceo",
  "servis_yoneticisi",
  "ik_yoneticisi",
  "muhasebe",
]

let rehberOnbellek: {
  anahtar: string
  ben: Personel
  rehber: Personel[]
} | null = null

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

function normalizeRol(value?: string | null) {
  return (value || "").trim().toLocaleLowerCase("tr-TR")
}

function yoneticiMi(rol?: string | null) {
  return YONETICI_ROLLERI.includes(normalizeRol(rol))
}

function adSoyad(p?: Personel | null) {
  return `${p?.ad || ""} ${p?.soyad || ""}`.trim() || "Personel"
}

function kisaTarih(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  const bugun = new Date()
  const ayniGun =
    d.getFullYear() === bugun.getFullYear() &&
    d.getMonth() === bugun.getMonth() &&
    d.getDate() === bugun.getDate()

  if (ayniGun) {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  }

  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function konuGorusmeAdi(konu: Konu, ben?: Personel | null) {
  const baslik = (konu.baslik || "").trim()
  if (!baslik) return "Sohbet"

  const parcalar = baslik.split(" - ").map((p) => p.trim()).filter(Boolean)
  if (parcalar.length < 2) return baslik

  const benAd = adSoyad(ben)
  return parcalar.find((p) => p !== benAd) || parcalar[1] || baslik
}

function mesajOzeti(metin?: string | null, limit = 52) {
  const temiz = (metin || "").trim()
  if (!temiz) return "Mesaj yok"
  if (temiz.length <= limit) return temiz
  return `${temiz.slice(0, limit)}…`
}

function mesajGosterilsinMi(m: Mesaj) {
  if (m.sistem_mesaji_mi) return false
  const icerik = (m.mesaj_icerik || "").trim().toLocaleLowerCase("tr-TR")
  if (icerik.includes("sohbet başlatıldı") || icerik.includes("sohbet baslatildi")) {
    return false
  }
  return Boolean(icerik)
}

function dosyaOnizlemeUrl(file: File) {
  if (file.type.startsWith("image/")) {
    return URL.createObjectURL(file)
  }
  return null
}

function dosyaEkMetni(file: File) {
  if (file.type.startsWith("image/")) {
    return `[Fotoğraf eklendi: ${file.name}]`
  }
  return `[Belge eklendi: ${file.name}]`
}

function filigranTarihSaat(tarih: Date) {
  return tarih.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MesajFiligrani({ metin }: { metin: string }) {
  const tekrarlar = Array.from({ length: 24 })

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <div
        className="absolute left-1/2 top-1/2 grid w-[240%] grid-cols-2 gap-x-12 gap-y-10 opacity-[0.09] sm:grid-cols-3"
        style={{ transform: "translate(-50%, -50%) rotate(-26deg)" }}
      >
        {tekrarlar.map((_, index) => (
          <span
            key={index}
            className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-slate-800"
          >
            {metin}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function IletisimPage() {
  const supabase = useMemo(() => createClient(), [])

  const [ben, setBen] = useState<Personel | null>(null)
  const [rehber, setRehber] = useState<Personel[]>([])
  const [konular, setKonular] = useState<Konu[]>([])
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([])
  const [katilimlar, setKatilimlar] = useState<Katilim[]>([])
  const [aktifKonuId, setAktifKonuId] = useState("")
  const [seciliPersonelIds, setSeciliPersonelIds] = useState<string[]>([])
  const [yeniSohbetMesaji, setYeniSohbetMesaji] = useState("")
  const [mesaj, setMesaj] = useState("")
  const [seciliDosya, setSeciliDosya] = useState<File | null>(null)
  const [dosyaOnizleme, setDosyaOnizleme] = useState<string | null>(null)
  const [hata, setHata] = useState("")
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sesAktif, setSesAktif] = useState(false)
  const [canliDurum, setCanliDurum] = useState("Canlı bağlantı hazırlanıyor...")
  const [kullaniciEmail, setKullaniciEmail] = useState("")
  const [sayfaGizli, setSayfaGizli] = useState(false)
  const [filigranSaati, setFiligranSaati] = useState(() => new Date())
  const [personelListeAcik, setPersonelListeAcik] = useState(false)
  const [rehberYukleniyor, setRehberYukleniyor] = useState(true)
  const [rehberHata, setRehberHata] = useState("")

  const bilinenMesajIdleriRef = useRef<Set<string>>(new Set())
  const ilkYuklemeBittiRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mesajListeRef = useRef<HTMLDivElement>(null)
  const mesajKutusuRef = useRef<HTMLDivElement>(null)
  const personelSecimRef = useRef<HTMLDivElement>(null)
  const fotoCekInputRef = useRef<HTMLInputElement>(null)
  const fotoEkleInputRef = useRef<HTMLInputElement>(null)
  const belgeInputRef = useRef<HTMLInputElement>(null)

  const personelMap = useMemo(() => {
    const map = new Map<string, Personel>()
    rehber.forEach((p) => map.set(p.id, p))
    if (ben) map.set(ben.id, ben)
    return map
  }, [rehber, ben])

  const benimKatilimlarim = useMemo(() => {
    if (!ben?.id) return new Map<string, Katilim>()
    return new Map(
      katilimlar.filter((k) => k.personel_id === ben.id).map((k) => [k.konu_id, k]),
    )
  }, [katilimlar, ben?.id])

  const aktifKonu = konular.find((k) => k.id === aktifKonuId)

  const aktifKarsiTarafId = useMemo(() => {
    if (!aktifKonuId || !ben?.id) return null
    const diger = katilimlar.find(
      (k) => k.konu_id === aktifKonuId && k.personel_id !== ben.id,
    )
    return diger?.personel_id || null
  }, [aktifKonuId, ben?.id, katilimlar])

  const aktifMesajlar = useMemo(() => {
    return mesajlar
      .filter((m) => m.konu_id === aktifKonuId && mesajGosterilsinMi(m))
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
      )
  }, [mesajlar, aktifKonuId])

  const gorunenAktifMesajlar = useMemo(() => {
    return aktifMesajlar.slice(-MAKS_MESAJ)
  }, [aktifMesajlar])

  const sonGorusmeler = useMemo(() => {
    return konular.slice(0, MAKS_GORUSME)
  }, [konular])

  const aktifSonOkumaAt = benimKatilimlarim.get(aktifKonuId)?.son_okuma_at || null

  const filigranMetni = useMemo(() => {
    const parcalar = [adSoyad(ben)]
    const email = kullaniciEmail || ben?.email
    if (email) parcalar.push(email)
    parcalar.push(filigranTarihSaat(filigranSaati))
    return parcalar.join(" · ")
  }, [ben, kullaniciEmail, filigranSaati])

  const secilebilirRehber = useMemo(() => {
    return rehber.filter((p) => p.id !== ben?.id)
  }, [rehber, ben?.id])

  const cokluSecimAktif = yoneticiMi(ben?.rol)
  const seciliPersonelSayisi = seciliPersonelIds.length

  function konuSonMesaji(konuId: string) {
    const konuMesajlari = mesajlar
      .filter((m) => m.konu_id === konuId && mesajGosterilsinMi(m))
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
      )

    const son = konuMesajlari[konuMesajlari.length - 1]
    return mesajOzeti(son?.mesaj_icerik)
  }

  function karsiTarafSonAktivite(konuId: string, karsiTarafId: string | null) {
    if (!karsiTarafId) return null

    const katilim = katilimlar.find(
      (k) => k.konu_id === konuId && k.personel_id === karsiTarafId,
    )

    const karsiMesajlar = mesajlar
      .filter((m) => m.konu_id === konuId && m.gonderen_personel_id === karsiTarafId)
      .map((m) => new Date(m.created_at || 0).getTime())

    const konu = konular.find((k) => k.id === konuId)
    const sonMesajZamani =
      konu?.son_mesaj_gonderen_personel_id === karsiTarafId && konu.son_mesaj_at
        ? new Date(konu.son_mesaj_at).getTime()
        : 0

    const okumaZamani = katilim?.son_okuma_at
      ? new Date(katilim.son_okuma_at).getTime()
      : 0

    const enBuyuk = Math.max(...karsiMesajlar, sonMesajZamani, okumaZamani, 0)
    return enBuyuk > 0 ? enBuyuk : null
  }

  function cevrimiciMi(konuId: string, karsiTarafId: string | null) {
    const sonAktivite = karsiTarafSonAktivite(konuId, karsiTarafId)
    if (!sonAktivite) return false
    return Date.now() - sonAktivite <= CEvRIMICI_ESIK_MS
  }

  function mesajOkunmadiMi(m: Mesaj) {
    if (!ben?.id || m.gonderen_personel_id === ben.id) return false
    if (!m.created_at) return false
    if (!aktifSonOkumaAt) return true
    return new Date(m.created_at).getTime() > new Date(aktifSonOkumaAt).getTime()
  }

  function sesHazirla() {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

      if (!AudioCtx) {
        setHata("Bu tarayıcı sesli uyarıyı desteklemiyor.")
        return
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx()
      }

      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume()
      }

      setSesAktif(true)
    } catch {
      setHata("Sesli uyarı başlatılamadı. Tarayıcı izinlerini kontrol edin.")
    }
  }

  function bildirimSesiCal() {
    try {
      if (!sesAktif) return

      const ctx = audioContextRef.current
      if (!ctx) return

      if (ctx.state === "suspended") {
        void ctx.resume()
      }

      const frekanslar = [880, 1175, 880, 1318]
      frekanslar.forEach((freq, index) => {
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        const baslangic = ctx.currentTime + index * 0.18

        oscillator.type = "square"
        oscillator.frequency.value = freq

        gain.gain.setValueAtTime(0.001, baslangic)
        gain.gain.exponentialRampToValueAtTime(0.55, baslangic + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, baslangic + 0.16)

        oscillator.connect(gain)
        gain.connect(ctx.destination)

        oscillator.start(baslangic)
        oscillator.stop(baslangic + 0.17)
      })
    } catch {
      // Ses hatası iletişimi engellemesin.
    }
  }

  const konuyuOkunduIsaretle = useCallback(
    async (konuId: string, personelId: string) => {
      if (!konuId || !personelId) return

      const simdi = new Date().toISOString()

      await supabase
        .from("iletisim_katilimcilari")
        .update({ son_okuma_at: simdi })
        .eq("konu_id", konuId)
        .eq("personel_id", personelId)

      setKatilimlar((onceki) =>
        onceki.map((k) =>
          k.konu_id === konuId && k.personel_id === personelId
            ? { ...k, son_okuma_at: simdi }
            : k,
        ),
      )

      if (document.title.startsWith("Yeni mesaj")) {
        document.title = SAYFA_BASLIK
      }
    },
    [supabase],
  )

  const personelRehberiniYukle = useCallback(async (): Promise<Personel | null> => {
    setRehberYukleniyor(true)
    setRehberHata("")

    const { data: userData, error: authError } = await supabase.auth.getUser()
    const user = userData.user

    if (authError || !user) {
      setRehberHata("Oturum bulunamadı.")
      setRehberYukleniyor(false)
      return null
    }

    setKullaniciEmail(user.email || "")

    if (rehberOnbellek?.anahtar === user.id) {
      setBen(rehberOnbellek.ben)
      setRehber(rehberOnbellek.rehber)
      setRehberYukleniyor(false)
      return rehberOnbellek.ben
    }

    const { data: personelListesi, error: personelError } = await supabase
      .from("personeller")
      .select(
        "id, personel_kodu, ad, soyad, auth_id, kullanici_id, email, rol, unvan, durum, sirket_id",
      )
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email || ""}`)
      .limit(20)

    if (personelError) {
      setRehberHata("Personel kaydı okunamadı: " + personelError.message)
      setRehberYukleniyor(false)
      return null
    }

    const eslesenler = (personelListesi || []) as Personel[]
    const benData =
      eslesenler.find((p) => p.auth_id === user.id) ||
      eslesenler.find((p) => p.kullanici_id === user.id) ||
      eslesenler.find(
        (p) => normalizeEmail(p.email) === normalizeEmail(user.email),
      ) ||
      eslesenler[0] ||
      null

    if (!benData) {
      setRehberHata(
        "Bu kullanıcı için personel kaydı bulunamadı. Auth eşleşmesi veya RLS politikasını kontrol edin.",
      )
      setRehberYukleniyor(false)
      return null
    }

    setBen(benData)

    const { data: rehberHam, error: rehberError } = await supabase
      .from("personeller")
      .select("id, ad, soyad, unvan, rol, email, tel, durum")
      .eq("durum", "aktif")
      .order("ad", { ascending: true })

    if (rehberError) {
      setRehberHata("Personel listesi okunamadı: " + rehberError.message)
      setRehber([])
      setRehberYukleniyor(false)
      return benData
    }

    const aktifRehber = (rehberHam || []) as Personel[]

    if (aktifRehber.length === 0) {
      setRehberHata("Aktif personel bulunamadı. RLS veya durum alanını kontrol edin.")
    }

    setRehber(aktifRehber)
    rehberOnbellek = {
      anahtar: user.id,
      ben: benData,
      rehber: aktifRehber,
    }
    setRehberYukleniyor(false)
    return benData
  }, [supabase])

  const sohbetVerileriniYukle = useCallback(
    async (sessiz = false, personel?: Personel | null) => {
      const benData = personel || ben
      if (!benData?.id) return

      if (!sessiz) {
        setLoading(true)
        setHata("")
      }

      const { data: benKatilimlari, error: katilimError } = await supabase
        .from("iletisim_katilimcilari")
        .select("konu_id, personel_id, son_okuma_at")
        .eq("personel_id", benData.id)

      if (katilimError) {
        setHata("Sohbetler okunamadı: " + katilimError.message)
        setLoading(false)
        return
      }

      const konuIds = (benKatilimlari || []).map((k) => k.konu_id)

      if (konuIds.length === 0) {
        setKonular([])
        setMesajlar([])
        setKatilimlar([])
        setAktifKonuId("")
        setLoading(false)
        ilkYuklemeBittiRef.current = true
        return
      }

      const { data: tumKatilimlar } = await supabase
        .from("iletisim_katilimcilari")
        .select("konu_id, personel_id, son_okuma_at")
        .in("konu_id", konuIds)

      const { data: konuData } = await supabase
        .from("iletisim_konulari")
        .select("id, baslik, son_mesaj_at, son_mesaj_gonderen_personel_id, created_at")
        .in("id", konuIds)
        .order("son_mesaj_at", { ascending: false })

      const { data: mesajData } = await supabase
        .from("iletisim_mesajlari")
        .select("id, konu_id, gonderen_personel_id, mesaj_icerik, created_at, sistem_mesaji_mi")
        .in("konu_id", konuIds)
        .order("created_at", { ascending: true })

      const yeniMesajlar = (mesajData || []).filter(mesajGosterilsinMi)

      const yeniGelenVar =
        ilkYuklemeBittiRef.current &&
        yeniMesajlar.some((m) => {
          return (
            !bilinenMesajIdleriRef.current.has(m.id) &&
            m.gonderen_personel_id !== benData.id
          )
        })

      bilinenMesajIdleriRef.current = new Set(yeniMesajlar.map((m) => m.id))

      setKatilimlar((tumKatilimlar || []) as Katilim[])
      setKonular((konuData || []) as Konu[])
      setMesajlar(yeniMesajlar)

      if (!aktifKonuId && konuData?.[0]?.id) {
        setAktifKonuId(konuData[0].id)
      }

      if (yeniGelenVar) {
        bildirimSesiCal()
        document.title = "Yeni mesaj var"
      }

      ilkYuklemeBittiRef.current = true
      setLoading(false)
    },
    [aktifKonuId, ben, supabase],
  )

  useEffect(() => {
    void (async () => {
      const benData = await personelRehberiniYukle()
      if (benData) {
        await sohbetVerileriniYukle(false, benData)
      } else {
        setLoading(false)
      }
    })()
  }, [personelRehberiniYukle, sohbetVerileriniYukle])

  useEffect(() => {
    document.title = SAYFA_BASLIK
    return () => {
      document.title = SAYFA_BASLIK
    }
  }, [])

  useEffect(() => {
    const zamanlayici = window.setInterval(() => {
      setFiligranSaati(new Date())
    }, 30000)

    return () => window.clearInterval(zamanlayici)
  }, [])

  useEffect(() => {
    const guncelle = () => {
      setSayfaGizli(document.hidden)
    }

    guncelle()
    document.addEventListener("visibilitychange", guncelle)
    return () => document.removeEventListener("visibilitychange", guncelle)
  }, [])

  useEffect(() => {
    if (!ben?.id) return

    const channel = supabase
      .channel(`iletisim-canli-${ben.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "iletisim_mesajlari",
        },
        () => {
          void sohbetVerileriniYukle(true)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "iletisim_konulari",
        },
        () => {
          void sohbetVerileriniYukle(true)
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setCanliDurum("Canlı bağlantı aktif.")
        } else if (status === "CHANNEL_ERROR") {
          setCanliDurum("Canlı bağlantı hatası. Sayfa açıkken otomatik yenileme sınırlı olabilir.")
        } else if (status === "TIMED_OUT") {
          setCanliDurum("Canlı bağlantı zaman aşımına uğradı.")
        } else {
          setCanliDurum("Canlı bağlantı kuruluyor...")
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [ben?.id, supabase, sohbetVerileriniYukle])

  useEffect(() => {
    if (!ben?.id || !aktifKonuId) return
    void konuyuOkunduIsaretle(aktifKonuId, ben.id)
  }, [aktifKonuId, ben?.id, gorunenAktifMesajlar.length, konuyuOkunduIsaretle])

  useEffect(() => {
    const el = mesajListeRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [gorunenAktifMesajlar, aktifKonuId])

  useEffect(() => {
    const engelle = (event: Event) => {
      event.preventDefault()
    }

    const mesajAlani = mesajKutusuRef.current
    if (!mesajAlani) return

    mesajAlani.addEventListener("copy", engelle)
    mesajAlani.addEventListener("cut", engelle)
    mesajAlani.addEventListener("contextmenu", engelle)
    mesajAlani.addEventListener("dragstart", engelle)

    return () => {
      mesajAlani.removeEventListener("copy", engelle)
      mesajAlani.removeEventListener("cut", engelle)
      mesajAlani.removeEventListener("contextmenu", engelle)
      mesajAlani.removeEventListener("dragstart", engelle)
    }
  }, [aktifKonuId, loading])

  useEffect(() => {
    if (!personelListeAcik) return

    const disariTikla = (event: MouseEvent) => {
      if (
        personelSecimRef.current &&
        !personelSecimRef.current.contains(event.target as Node)
      ) {
        setPersonelListeAcik(false)
      }
    }

    document.addEventListener("mousedown", disariTikla)
    return () => document.removeEventListener("mousedown", disariTikla)
  }, [personelListeAcik])

  useEffect(() => {
    return () => {
      if (dosyaOnizleme) {
        URL.revokeObjectURL(dosyaOnizleme)
      }
    }
  }, [dosyaOnizleme])

  function dosyaTemizle() {
    if (dosyaOnizleme) {
      URL.revokeObjectURL(dosyaOnizleme)
    }
    setSeciliDosya(null)
    setDosyaOnizleme(null)
    if (fotoCekInputRef.current) fotoCekInputRef.current.value = ""
    if (fotoEkleInputRef.current) fotoEkleInputRef.current.value = ""
    if (belgeInputRef.current) belgeInputRef.current.value = ""
  }

  function dosyaSec(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (dosyaOnizleme) {
      URL.revokeObjectURL(dosyaOnizleme)
    }

    setSeciliDosya(file)
    setDosyaOnizleme(dosyaOnizlemeUrl(file))
  }

  function personelSecToggle(personelId: string) {
    if (cokluSecimAktif) {
      setSeciliPersonelIds((onceki) =>
        onceki.includes(personelId)
          ? onceki.filter((id) => id !== personelId)
          : [...onceki, personelId],
      )
      return
    }

    setSeciliPersonelIds((onceki) =>
      onceki.includes(personelId) ? [] : [personelId],
    )
    setPersonelListeAcik(false)
  }

  function tumAktifPersonelleriSec() {
    setSeciliPersonelIds(rehber.filter((p) => p.id !== ben?.id).map((p) => p.id))
  }

  function secimiTemizle() {
    setSeciliPersonelIds([])
  }

  async function mevcutBirebirKonuBul(hedefPersonelId: string): Promise<string | null> {
    if (!ben?.id) return null

    const { data: benKatilimlari } = await supabase
      .from("iletisim_katilimcilari")
      .select("konu_id")
      .eq("personel_id", ben.id)

    const benKonuIds = (benKatilimlari || []).map((k) => k.konu_id)
    if (benKonuIds.length === 0) return null

    const { data: hedefKatilimlari } = await supabase
      .from("iletisim_katilimcilari")
      .select("konu_id")
      .eq("personel_id", hedefPersonelId)
      .in("konu_id", benKonuIds)

    const ortakKonuId = hedefKatilimlari?.[0]?.konu_id
    if (!ortakKonuId) return null

    const { data: katilimSayisi } = await supabase
      .from("iletisim_katilimcilari")
      .select("personel_id")
      .eq("konu_id", ortakKonuId)

    if ((katilimSayisi || []).length === 2) {
      return ortakKonuId
    }

    return null
  }

  async function birebirKonuOlustur(hedefPersonelId: string): Promise<string | null> {
    if (!ben) return null

    const diger = rehber.find((p) => p.id === hedefPersonelId)
    const baslik = `${adSoyad(ben)} - ${adSoyad(diger)}`

    const { data: konu, error: konuError } = await supabase
      .from("iletisim_konulari")
      .insert({
        sirket_id: ben.sirket_id,
        konu_tipi: "personel_mesaj",
        baslik,
        olusturan_personel_id: ben.id,
        durum: "aktif",
        son_mesaj_at: new Date().toISOString(),
        son_mesaj_gonderen_personel_id: ben.id,
      })
      .select("id")
      .single()

    if (konuError || !konu?.id) {
      return null
    }

    const { error: katilimError } = await supabase.from("iletisim_katilimcilari").insert([
      {
        konu_id: konu.id,
        personel_id: ben.id,
        katilimci_rolu: "olusturan",
        son_okuma_at: new Date().toISOString(),
      },
      {
        konu_id: konu.id,
        personel_id: hedefPersonelId,
        katilimci_rolu: "katilimci",
      },
    ])

    if (katilimError) {
      return null
    }

    return konu.id
  }

  async function konuyaMesajGonder(konuId: string, icerik: string) {
    if (!ben?.id || !icerik.trim()) return false

    const simdi = new Date().toISOString()

    const { error } = await supabase.from("iletisim_mesajlari").insert({
      konu_id: konuId,
      gonderen_personel_id: ben.id,
      mesaj_tipi: "metin",
      mesaj_icerik: icerik.trim(),
      onem_derecesi: "normal",
      sistem_mesaji_mi: false,
      ai_mesaji_mi: false,
    })

    if (error) return false

    await supabase
      .from("iletisim_konulari")
      .update({
        son_mesaj_at: simdi,
        son_mesaj_gonderen_personel_id: ben.id,
      })
      .eq("id", konuId)

    return true
  }

  async function sohbetBaslat() {
    if (!ben || seciliPersonelIds.length === 0) return

    setKaydediliyor(true)
    setHata("")

    const hedefIds = [...seciliPersonelIds]
    const mesajMetni = yeniSohbetMesaji.trim()
    let sonKonuId = ""
    const basarisiz: string[] = []

    for (const hedefId of hedefIds) {
      let konuId = await mevcutBirebirKonuBul(hedefId)

      if (!konuId) {
        konuId = await birebirKonuOlustur(hedefId)
      }

      if (!konuId) {
        const hedef = rehber.find((p) => p.id === hedefId)
        basarisiz.push(adSoyad(hedef))
        continue
      }

      if (mesajMetni) {
        const gonderildi = await konuyaMesajGonder(konuId, mesajMetni)
        if (!gonderildi) {
          basarisiz.push(adSoyad(rehber.find((p) => p.id === hedefId)))
          continue
        }
      }

      sonKonuId = konuId
    }

    if (basarisiz.length > 0) {
      setHata(`Bazı sohbetler tamamlanamadı: ${basarisiz.join(", ")}`)
    }

    setSeciliPersonelIds([])
    setYeniSohbetMesaji("")

    if (sonKonuId) {
      setAktifKonuId(sonKonuId)
    }

    await sohbetVerileriniYukle(true)
    setKaydediliyor(false)
  }

  async function mesajGonder() {
    if (!ben || !aktifKonuId) return

    let icerik = mesaj.trim()

    if (seciliDosya) {
      const ek = dosyaEkMetni(seciliDosya)
      icerik = icerik ? `${icerik}\n${ek}` : ek
    }

    if (!icerik) return

    setKaydediliyor(true)
    setHata("")

    const simdi = new Date().toISOString()

    const { error } = await supabase.from("iletisim_mesajlari").insert({
      konu_id: aktifKonuId,
      gonderen_personel_id: ben.id,
      mesaj_tipi: "metin",
      mesaj_icerik: icerik,
      onem_derecesi: "normal",
      sistem_mesaji_mi: false,
      ai_mesaji_mi: false,
    })

    if (error) {
      setHata("Mesaj gönderilemedi: " + error.message)
      setKaydediliyor(false)
      return
    }

    await supabase
      .from("iletisim_konulari")
      .update({
        son_mesaj_at: simdi,
        son_mesaj_gonderen_personel_id: ben.id,
      })
      .eq("id", aktifKonuId)

    setMesaj("")
    dosyaTemizle()
    await sohbetVerileriniYukle(true)
    setKaydediliyor(false)
  }

  const gonderilebilir = Boolean(aktifKonuId && (mesaj.trim() || seciliDosya) && !kaydediliyor)
  const karsiTarafCevrimici = cevrimiciMi(aktifKonuId, aktifKarsiTarafId)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-2.5 p-2.5 pb-5 md:space-y-3 md:p-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm md:px-4 md:py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-800">
                FeyRoute İletişim
              </p>
              <h1 className="text-lg font-black text-slate-900 md:text-xl">Personel Mesajlaşma</h1>
              <p className="text-sm font-medium text-slate-700">
                {canliDurum} · {adSoyad(ben)}
              </p>
            </div>
            <button
              type="button"
              onClick={sesHazirla}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black ${
                sesAktif
                  ? "bg-emerald-600 text-white"
                  : "border border-amber-300 bg-amber-50 text-amber-900"
              }`}
            >
              {sesAktif ? "Ses Açık" : "Sesi Aç"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:grid-rows-[auto_auto_auto] md:items-start md:gap-3">
            <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm md:col-start-1 md:row-start-1 md:p-3">
              <h2 className="text-base font-black text-slate-900 md:text-lg">Yeni Sohbet</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-700">
                {cokluSecimAktif
                  ? "Birden fazla personel seçip toplu birebir mesaj gönderebilirsiniz."
                  : "Personel seçerek yeni sohbet başlatın."}
              </p>

              <div ref={personelSecimRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setPersonelListeAcik((acik) => !acik)}
                  disabled={rehberYukleniyor}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left transition hover:border-blue-500 disabled:bg-slate-100"
                >
                  <span className="text-sm font-black text-slate-900">Personel seç</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-700 transition-transform ${
                      personelListeAcik ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {personelListeAcik && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                    {rehberYukleniyor ? (
                      <p className="px-3 py-2 text-sm font-medium text-slate-700">
                        Personel listesi yükleniyor...
                      </p>
                    ) : rehberHata ? (
                      <p className="px-3 py-2 text-sm font-medium text-red-800">{rehberHata}</p>
                    ) : secilebilirRehber.length === 0 ? (
                      <p className="px-3 py-2 text-sm font-medium text-slate-700">
                        Aktif personel bulunamadı.
                      </p>
                    ) : (
                      <>
                        {cokluSecimAktif && (
                          <button
                            type="button"
                            onClick={tumAktifPersonelleriSec}
                            disabled={kaydediliyor}
                            className="mb-1.5 w-full rounded-lg border border-blue-700 bg-blue-50 px-3 py-2.5 text-left text-sm font-black text-blue-900 transition hover:bg-blue-100 disabled:opacity-40"
                          >
                            Tüm aktif personelleri seç
                          </button>
                        )}

                        <div className="space-y-1">
                          {secilebilirRehber.map((p) => {
                            const secili = seciliPersonelIds.includes(p.id)
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => personelSecToggle(p.id)}
                                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                                  secili
                                    ? "border-blue-700 bg-blue-50"
                                    : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"
                                }`}
                              >
                                {cokluSecimAktif && (
                                  <span
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                      secili
                                        ? "border-blue-700 bg-blue-700 text-white"
                                        : "border-slate-300 bg-white text-transparent"
                                    }`}
                                  >
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                  </span>
                                )}
                                <span className="text-sm font-black text-slate-900">
                                  {adSoyad(p)}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!personelListeAcik && rehberHata && !rehberYukleniyor && (
                <p className="mt-1.5 text-sm font-medium text-red-800">{rehberHata}</p>
              )}

              {seciliPersonelSayisi > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {seciliPersonelIds.map((personelId) => {
                    const personel = personelMap.get(personelId)
                    if (!personel) return null

                    return (
                      <span
                        key={personelId}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-900"
                      >
                        {adSoyad(personel)}
                        <button
                          type="button"
                          onClick={() => personelSecToggle(personelId)}
                          className="rounded-full p-0.5 text-blue-800 hover:bg-blue-100"
                          aria-label={`${adSoyad(personel)} seçimini kaldır`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {cokluSecimAktif && (
                <button
                  type="button"
                  onClick={secimiTemizle}
                  disabled={seciliPersonelSayisi === 0 || kaydediliyor}
                  className="mt-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-black text-slate-900 disabled:opacity-40"
                >
                  Seçimi temizle
                </button>
              )}

              {(cokluSecimAktif || seciliPersonelSayisi > 0) && (
                <textarea
                  value={yeniSohbetMesaji}
                  onChange={(e) => setYeniSohbetMesaji(e.target.value)}
                  disabled={seciliPersonelSayisi === 0 || kaydediliyor || rehberYukleniyor}
                  placeholder={
                    cokluSecimAktif && seciliPersonelSayisi > 1
                      ? "Seçilen tüm personele gönderilecek mesaj..."
                      : "İlk mesaj (opsiyonel)..."
                  }
                  rows={2}
                  className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-700 disabled:bg-slate-100"
                />
              )}

              <button
                type="button"
                onClick={() => void sohbetBaslat()}
                disabled={kaydediliyor || seciliPersonelSayisi === 0 || rehberYukleniyor}
                className="mt-2 w-full rounded-lg bg-blue-800 px-3 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:w-auto sm:px-4"
              >
                {cokluSecimAktif && seciliPersonelSayisi > 1
                  ? yeniSohbetMesaji.trim()
                    ? `Gönder (${seciliPersonelSayisi} kişi)`
                    : `Sohbet Başlat (${seciliPersonelSayisi} kişi)`
                  : yeniSohbetMesaji.trim()
                    ? "Sohbet Başlat ve Gönder"
                    : "Sohbet Başlat"}
              </button>
            </section>

            <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:col-start-2 md:row-start-1 md:row-span-2">
              <div className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 md:px-3 md:py-2.5">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 text-blue-800" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-base font-black text-slate-900 md:text-lg">
                        {aktifKonu ? konuGorusmeAdi(aktifKonu, ben) : "Sohbet seçilmedi"}
                      </h2>
                      {aktifKonu && aktifKarsiTarafId && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
                            karsiTarafCevrimici
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {karsiTarafCevrimici ? "Çevrimiçi" : "Çevrimdışı"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      Son {MAKS_MESAJ} mesaj gösterilir
                    </p>
                  </div>
                </div>
              </div>

              <div
                ref={mesajKutusuRef}
                className={`relative transition-[filter] duration-200 ${
                  sayfaGizli ? "blur-md" : ""
                }`}
              >
                <MesajFiligrani metin={filigranMetni} />

                <div
                  ref={mesajListeRef}
                  className="relative z-0 h-56 select-none overflow-y-auto bg-white/95 px-2.5 py-2 md:h-72 md:px-3"
                >
                  {!aktifKonuId ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-700">
                      Sohbet seçin veya yeni sohbet başlatın.
                    </div>
                  ) : loading && gorunenAktifMesajlar.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-700">
                      Sohbetler yükleniyor...
                    </div>
                  ) : gorunenAktifMesajlar.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-700">
                      Mesaj yok.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {gorunenAktifMesajlar.map((m) => {
                        const benim = m.gonderen_personel_id === ben?.id
                        const gonderen = personelMap.get(m.gonderen_personel_id)
                        const gonderenAd = adSoyad(gonderen)
                        const okunmadi = mesajOkunmadiMi(m)

                        return (
                          <div
                            key={m.id}
                            className={`flex ${benim ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[88%] rounded-lg px-2 py-1.5 md:px-2.5 md:py-2 ${
                                benim
                                  ? "bg-blue-800 text-white"
                                  : okunmadi
                                    ? "border border-blue-300 bg-blue-50 text-slate-900"
                                    : "border border-slate-200 bg-slate-50 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <p
                                    className={`truncate text-xs font-black ${
                                      benim ? "text-blue-50" : "text-slate-900"
                                    }`}
                                  >
                                    {gonderenAd}
                                  </p>
                                  {!benim && okunmadi && (
                                    <span className="shrink-0 rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-black text-white">
                                      Yeni
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`shrink-0 text-xs font-medium ${
                                    benim ? "text-blue-100" : "text-slate-500"
                                  }`}
                                >
                                  {kisaTarih(m.created_at)}
                                </p>
                              </div>
                              <p
                                className={`mt-0.5 whitespace-pre-line text-sm font-medium leading-snug ${
                                  benim ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {m.mesaj_icerik}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-2.5 py-2 md:px-3 md:py-2.5">
                {seciliDosya && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5">
                    {dosyaOnizleme ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dosyaOnizleme}
                        alt="Seçilen dosya önizlemesi"
                        className="h-9 w-9 rounded object-cover md:h-10 md:w-10"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-white text-blue-800 md:h-10 md:w-10">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-black text-blue-900">
                        {seciliDosya.name}
                      </p>
                      <p className="text-[10px] font-semibold text-blue-700">
                        Gönderimde metne eklenecek
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={dosyaTemizle}
                      className="text-[10px] font-black text-red-700"
                    >
                      Kaldır
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-1.5 md:gap-2">
                  <input
                    ref={fotoCekInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={dosyaSec}
                  />
                  <input
                    ref={fotoEkleInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={dosyaSec}
                  />
                  <input
                    ref={belgeInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={dosyaSec}
                  />

                  <button
                    type="button"
                    onClick={() => fotoCekInputRef.current?.click()}
                    disabled={!aktifKonuId || kaydediliyor}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-blue-800 disabled:opacity-40 md:h-9 md:w-9"
                    title="Fotoğraf çek"
                  >
                    <Camera className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fotoEkleInputRef.current?.click()}
                    disabled={!aktifKonuId || kaydediliyor}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-blue-800 disabled:opacity-40 md:h-9 md:w-9"
                    title="Fotoğraf ekle"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => belgeInputRef.current?.click()}
                    disabled={!aktifKonuId || kaydediliyor}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-blue-800 disabled:opacity-40 md:h-9 md:w-9"
                    title="Belge ekle"
                  >
                    <FileText className="h-4 w-4" />
                  </button>

                  <textarea
                    value={mesaj}
                    onChange={(e) => setMesaj(e.target.value)}
                    disabled={!aktifKonuId || kaydediliyor}
                    placeholder="Mesaj yazın..."
                    rows={2}
                    className="min-h-[2rem] flex-1 resize-none rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-700 disabled:bg-slate-100 md:min-h-[2.25rem] md:px-2.5 md:py-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        if (gonderilebilir) void mesajGonder()
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => void mesajGonder()}
                    disabled={!gonderilebilir}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-blue-800 px-2.5 text-xs font-black text-white disabled:bg-slate-300 md:h-9 md:px-3"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Gönder
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm md:col-start-1 md:row-start-2 md:p-3">
              <h2 className="text-base font-black text-slate-900 md:text-lg">Son Görüşmeler</h2>
              {sonGorusmeler.length === 0 ? (
                <p className="mt-1.5 text-sm font-medium text-slate-700">Henüz görüşme yok.</p>
              ) : (
                <div className="mt-1.5 grid grid-cols-1 gap-1.5 md:mt-2 md:gap-2">
                  {sonGorusmeler.map((konu) => {
                    const karsiId =
                      katilimlar.find(
                        (k) => k.konu_id === konu.id && k.personel_id !== ben?.id,
                      )?.personel_id || null
                    const online = cevrimiciMi(konu.id, karsiId)

                    return (
                      <button
                        key={konu.id}
                        type="button"
                        onClick={() => setAktifKonuId(konu.id)}
                        className={`rounded-lg border px-2.5 py-1.5 text-left transition md:px-3 md:py-2 ${
                          aktifKonuId === konu.id
                            ? "border-blue-700 bg-blue-50"
                            : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-slate-900">
                            {konuGorusmeAdi(konu, ben)}
                          </p>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black ${
                              online
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {online ? "Çevrimiçi" : "Çevrimdışı"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm font-medium text-slate-700">
                          {konuSonMesaji(konu.id)}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500 md:mt-1">
                          {kisaTarih(konu.son_mesaj_at || konu.created_at)}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="space-y-1.5 md:col-span-2 md:col-start-1 md:row-start-3">
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 md:px-3">
                <p className="text-sm font-black leading-snug text-amber-950">
                  Şirket içi gizli yazışma. İzinsiz ekran görüntüsü almak yasaktır.
                </p>
                <p className="mt-1 text-sm font-medium text-amber-950/90">
                  Mesaj alanı kişisel filigran ile korunur; sekme arka plana alındığında içerik
                  otomatik bulanıklaştırılır.
                </p>
              </div>
              {hata && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-sm font-medium text-red-900">
                  {hata}
                </div>
              )}
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700">
                <p>
                  Yeni mesajlarda ses uyarısı için üst karttan{" "}
                  <span className="font-black text-slate-900">Sesi Aç</span> seçeneğini kullanın.
                </p>
                <p className="mt-1">
                  Fotoğraf ve belgeler gönderim sırasında mesaj metnine eklenir; mevcut depolama
                  entegrasyonu olmadan dosya adı kaydedilir.
                </p>
              </div>
            </section>
          </div>
      </div>
    </div>
  )
}
