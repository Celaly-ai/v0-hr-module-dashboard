"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Play,
  Square,
  MapPin,
  Clock,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Timer,
  Navigation,
  Users,
  AlertTriangle,
  ExternalLink,
  PartyPopper,
} from "lucide-react"

import {
  WORK_START_TIME,
  isTimeLate,
  formatDurationBetween,
  buildMapsUrl,
  type GeoLocation,
  type Employee,
} from "@/lib/hr-data"

import { useAuth } from "@/lib/auth-context"
import { listPersonnel } from "@/lib/personnel-repo"
import { createClient } from "@/lib/supabase/client"

const YONETICI_ROLLER = ["admin", "servis_yoneticisi", "ik_yoneticisi"]

type GunlukKayit = {
  personelId: string
  personelAdi: string
  departman: string
  girisZamani: string | null
  cikisZamani: string | null
  girisLat: number | null
  girisLng: number | null
  cikisLat: number | null
  cikisLng: number | null
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatTime24(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatTR(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function getGeolocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Tarayıcınız konum servisini desteklemiyor."))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          label: null,
        }),
      (err) => {
        const messages: Record<number, string> = {
          1: "Konum izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.",
          2: "Konum alınamadı. Lütfen internet bağlantınızı kontrol edin.",
          3: "Konum isteği zaman aşımına uğradı.",
        }

        reject(new Error(messages[err.code] || "Konum alınırken bir hata oluştu."))
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    )
  })
}

function checkVardiyaDurumu(checkInTime: string | null) {
  const [startH, startM] = WORK_START_TIME.split(":").map(Number)

  const now = new Date()
  const vardiyaBaslangic = new Date()
  vardiyaBaslangic.setHours(startH, startM, 0, 0)

  if (!checkInTime) {
    const gecMi = now > vardiyaBaslangic
    const dakika = Math.max(
      0,
      Math.floor((now.getTime() - vardiyaBaslangic.getTime()) / 60000),
    )

    if (gecMi) {
      return {
        gec: true,
        mesaj: `${Math.floor(dakika / 60) > 0 ? Math.floor(dakika / 60) + " SAAT " : ""}${
          dakika % 60
        } DAKİKA GEÇ KALDINIZ`,
        hosgeldin: false,
      }
    }

    return {
      gec: false,
      mesaj: `Hoş geldiniz! Vardiya ${WORK_START_TIME}'de başlıyor, zamanındasınız 🎉`,
      hosgeldin: true,
    }
  }

  const [inH, inM] = checkInTime.split(":").map(Number)

  const girisSaati = new Date()
  girisSaati.setHours(inH, inM, 0, 0)

  const gecMi = girisSaati > vardiyaBaslangic
  const dakika = Math.max(
    0,
    Math.floor((girisSaati.getTime() - vardiyaBaslangic.getTime()) / 60000),
  )

  if (gecMi) {
    return {
      gec: true,
      mesaj: `${Math.floor(dakika / 60) > 0 ? Math.floor(dakika / 60) + " SAAT " : ""}${
        dakika % 60
      } DAKİKA GEÇ BAŞLADINIZ`,
      hosgeldin: false,
    }
  }

  return {
    gec: false,
    mesaj: "Hoş geldiniz! Zamanında başladınız 🎉",
    hosgeldin: true,
  }
}

function StatusBadge({ kayit }: { kayit: GunlukKayit | null }) {
  if (!kayit?.girisZamani) {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground">
        Henüz giriş yok
      </Badge>
    )
  }

  if (!kayit.cikisZamani) {
    return (
      <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/15">
        İşte çalışıyor
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-border text-muted-foreground">
      İş çıkışı yapıldı
    </Badge>
  )
}

export function CheckInOut() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const isYonetici = YONETICI_ROLLER.includes(profile?.role ?? "")

  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [myPersonelId, setMyPersonelId] = useState<string | null>(null)
  const [mySirketId, setMySirketId] = useState<string | null>(null)
  const [gunlukKayitlar, setGunlukKayitlar] = useState<GunlukKayit[]>([])
  const [now, setNow] = useState<Date>(new Date())
  const [loading, setLoading] = useState<"in" | "out" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!feedback) return

    const id = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(id)
  }, [feedback])

  useEffect(() => {
    listPersonnel()
      .then(setAllEmployees)
      .catch(() => setAllEmployees([]))
  }, [])

  useEffect(() => {
    if (!profile?.id) return

    supabase
      .from("personeller")
      .select("id, sirket_id")
      .eq("auth_id", profile.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
          setDataLoading(false)
          return
        }

        if (data) {
          setMyPersonelId(data.id)
          setMySirketId(data.sirket_id)
        } else {
          setMyPersonelId(null)
          setMySirketId(null)
          setDataLoading(false)
        }
      })
  }, [profile?.id, supabase])

  const currentUser = useMemo(() => {
    if (!profile) return allEmployees[0] ?? null

    return (
      allEmployees.find((e) => e.email === profile.email) ??
      allEmployees.find((e) => e.id === myPersonelId) ??
      allEmployees[0] ??
      null
    )
  }, [profile, allEmployees, myPersonelId])

  const fetchGunlukKayitlar = useCallback(async () => {
    setDataLoading(true)

    const bugun = todayStr()
    const baslangic = `${bugun}T00:00:00`
    const bitis = `${bugun}T23:59:59`

    let query = supabase
      .from("giris_cikis_kayitlari")
      .select(
        "*, personeller!giris_cikis_kayitlari_personel_id_fkey(ad, soyad, departman)",
      )
      .gte("created_at", baslangic)
      .lte("created_at", bitis)
      .order("created_at", { ascending: true })

    if (!isYonetici && myPersonelId) {
      query = query.eq("personel_id", myPersonelId)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setGunlukKayitlar([])
      setDataLoading(false)
      return
    }

    const gruplar = new Map<string, GunlukKayit>()

    for (const kayit of data ?? []) {
      const pid = kayit.personel_id

      const personelAdi = kayit.personeller
        ? `${kayit.personeller.ad} ${kayit.personeller.soyad}`
        : "Bilinmiyor"

      const departman = kayit.personeller?.departman ?? "-"

      if (!gruplar.has(pid)) {
        gruplar.set(pid, {
          personelId: pid,
          personelAdi,
          departman,
          girisZamani: null,
          cikisZamani: null,
          girisLat: null,
          girisLng: null,
          cikisLat: null,
          cikisLng: null,
        })
      }

      const grup = gruplar.get(pid)!
      const saatStr = formatTime24(new Date(kayit.created_at))

      if (kayit.tip === "giris") {
        grup.girisZamani = saatStr
        grup.girisLat = kayit.lat
        grup.girisLng = kayit.lng
      }

      if (kayit.tip === "cikis") {
        grup.cikisZamani = saatStr
        grup.cikisLat = kayit.lat
        grup.cikisLng = kayit.lng
      }
    }

    setGunlukKayitlar(Array.from(gruplar.values()))
    setDataLoading(false)
  }, [supabase, isYonetici, myPersonelId])

  useEffect(() => {
    if (isYonetici || myPersonelId) {
      fetchGunlukKayitlar()
    }
  }, [isYonetici, myPersonelId, fetchGunlukKayitlar])

  const myKayit = useMemo(() => {
    return gunlukKayitlar.find((k) => k.personelId === myPersonelId) ?? null
  }, [gunlukKayitlar, myPersonelId])

  const vardiyaDurumu = useMemo(() => {
    return checkVardiyaDurumu(myKayit?.girisZamani ?? null)
  }, [myKayit?.girisZamani])

  const handleCheckIn = async () => {
    if (!myPersonelId || !mySirketId) {
      setError("Personel kaydınız bulunamadı. Lütfen yönetici ile iletişime geçin.")
      return
    }

    setError(null)
    setLoading("in")

    try {
      const loc = await getGeolocation()

      const { error: insertError } = await supabase
        .from("giris_cikis_kayitlari")
        .insert({
          personel_id: myPersonelId,
          sirket_id: mySirketId,
          tip: "giris",
          lat: loc.lat,
          lng: loc.lng,
          basarili: true,
        })

      if (insertError) throw new Error(insertError.message)

      await fetchGunlukKayitlar()
      setFeedback(`Giriş kaydedildi: ${formatTime24(new Date())}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen bir hata oluştu.")
    } finally {
      setLoading(null)
    }
  }

  const handleCheckOut = async () => {
    if (!myKayit?.girisZamani) {
      setError("Önce işe giriş yapmalısınız.")
      return
    }

    if (!myPersonelId || !mySirketId) {
      setError("Personel kaydınız bulunamadı.")
      return
    }

    setError(null)
    setLoading("out")

    try {
      const loc = await getGeolocation()

      const { error: insertError } = await supabase
        .from("giris_cikis_kayitlari")
        .insert({
          personel_id: myPersonelId,
          sirket_id: mySirketId,
          tip: "cikis",
          lat: loc.lat,
          lng: loc.lng,
          basarili: true,
        })

      if (insertError) throw new Error(insertError.message)

      await fetchGunlukKayitlar()
      setFeedback(`Çıkış kaydedildi: ${formatTime24(new Date())}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen bir hata oluştu.")
    } finally {
      setLoading(null)
    }
  }

  const hasCheckedIn = !!myKayit?.girisZamani
  const hasCheckedOut = !!myKayit?.cikisZamani
  const currentTimeText = formatTime24(now)

  const currentDateText = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const dailyLog = useMemo(() => {
    if (isYonetici) {
      const kayitliIds = new Set(gunlukKayitlar.map((k) => k.personelId))

      const eksikler = allEmployees
        .filter((e) => !kayitliIds.has(e.id))
        .map(
          (e): GunlukKayit => ({
            personelId: e.id,
            personelAdi: e.name,
            departman: e.department,
            girisZamani: null,
            cikisZamani: null,
            girisLat: null,
            girisLng: null,
            cikisLat: null,
            cikisLng: null,
          }),
        )

      return [...gunlukKayitlar, ...eksikler].sort((a, b) => {
        const score = (k: GunlukKayit) => {
          if (!k.girisZamani) return 4
          if (k.cikisZamani) return 3
          if (isTimeLate(k.girisZamani)) return 2
          return 1
        }

        return score(a) - score(b)
      })
    }

    if (myKayit) return [myKayit]

    if (currentUser) {
      return [
        {
          personelId: currentUser.id,
          personelAdi: currentUser.name,
          departman: currentUser.department,
          girisZamani: null,
          cikisZamani: null,
          girisLat: null,
          girisLng: null,
          cikisLat: null,
          cikisLng: null,
        },
      ]
    }

    return []
  }, [gunlukKayitlar, allEmployees, isYonetici, myKayit, currentUser])

  const filteredLog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    if (!q) return dailyLog

    return dailyLog.filter(
      (r) =>
        r.personelAdi.toLowerCase().includes(q) ||
        r.departman.toLowerCase().includes(q),
    )
  }, [dailyLog, searchQuery])

  const stats = useMemo(
    () => ({
      total: dailyLog.length,
      checkedIn: dailyLog.filter((r) => !!r.girisZamani).length,
      late: dailyLog.filter((r) => r.girisZamani && isTimeLate(r.girisZamani)).length,
      noShow: dailyLog.filter((r) => !r.girisZamani).length,
    }),
    [dailyLog],
  )

  const girisLoc: GeoLocation | null =
    myKayit?.girisLat && myKayit?.girisLng
      ? {
          lat: myKayit.girisLat,
          lng: myKayit.girisLng,
          accuracy: null,
          label: null,
        }
      : null

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="p-5 sm:p-6 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-12 w-12 border border-border shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  {currentUser.name}
                </h2>
                <StatusBadge kayit={myKayit} />
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {currentUser.position} - {currentUser.department}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end shrink-0">
            <div className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold text-foreground tabular-nums">
              <Clock className="h-5 w-5 text-primary" />
              {currentTimeText}
            </div>

            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {currentDateText}
            </p>
          </div>
        </div>

        {!hasCheckedIn && (
          <div
            className={`mb-5 p-4 rounded-lg border ${
              vardiyaDurumu.gec
                ? "bg-destructive/10 border-destructive/30"
                : "bg-success/10 border-success/30"
            }`}
          >
            {vardiyaDurumu.gec ? (
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <p className="text-destructive font-black text-xl tracking-wide">
                    {vardiyaDurumu.mesaj}
                  </p>
                  <p className="text-sm text-destructive/80 mt-0.5">
                    Lütfen en kısa sürede giriş yapınız.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <PartyPopper className="h-6 w-6 text-success shrink-0" />
                <p className="text-success font-semibold text-base">
                  {vardiyaDurumu.mesaj}
                </p>
              </div>
            )}
          </div>
        )}

        {hasCheckedIn && myKayit?.girisZamani && isTimeLate(myKayit.girisZamani) && (
          <div className="mb-5 p-4 rounded-lg border bg-destructive/10 border-destructive/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <p className="text-destructive font-black text-xl tracking-wide">
                {checkVardiyaDurumu(myKayit.girisZamani).mesaj}
              </p>
            </div>
          </div>
        )}

        <Separator className="mb-5" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            size="lg"
            onClick={handleCheckIn}
            disabled={loading !== null || hasCheckedIn}
            className="h-20 sm:h-24 text-base sm:text-lg bg-success text-success-foreground hover:bg-success/90 disabled:opacity-40 font-semibold flex-col gap-1 sm:flex-row sm:gap-3"
          >
            {loading === "in" ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : hasCheckedIn ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                <span>Giriş Yapıldı</span>
              </>
            ) : (
              <>
                <Play className="h-6 w-6 fill-current" />
                <span>İşe Başlıyorum</span>
              </>
            )}
          </Button>

          <Button
            size="lg"
            onClick={handleCheckOut}
            disabled={loading !== null || !hasCheckedIn || hasCheckedOut}
            className="h-20 sm:h-24 text-base sm:text-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 font-semibold flex-col gap-1 sm:flex-row sm:gap-3"
          >
            {loading === "out" ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : hasCheckedOut ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                <span>Çıkış Yapıldı</span>
              </>
            ) : (
              <>
                <Square className="h-5 w-5 fill-current" />
                <span>İşten Çıkıyorum</span>
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>İşlem başarısız</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {feedback && !error && (
          <Alert className="mt-4 border-success/40 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-foreground">Başarılı</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {feedback}
            </AlertDescription>
          </Alert>
        )}

        {hasCheckedIn && myKayit && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile
              label="Giriş"
              value={myKayit.girisZamani ?? "-"}
              icon={<LogIn className="h-4 w-4 text-success" />}
              hint={
                myKayit.girisZamani && isTimeLate(myKayit.girisZamani)
                  ? "Geç kalındı"
                  : "Zamanında"
              }
              hintTone={
                myKayit.girisZamani && isTimeLate(myKayit.girisZamani)
                  ? "warning"
                  : "success"
              }
            />

            <SummaryTile
              label="Çıkış"
              value={myKayit.cikisZamani ?? "-"}
              icon={<LogOut className="h-4 w-4 text-destructive" />}
              hint={myKayit.cikisZamani ? "Tamamlandı" : "Devam ediyor"}
              hintTone={myKayit.cikisZamani ? "muted" : "success"}
            />

            <SummaryTile
              label="Toplam Süre"
              value={
                myKayit.cikisZamani
                  ? formatDurationBetween(myKayit.girisZamani, myKayit.cikisZamani)
                  : formatDurationBetween(myKayit.girisZamani, currentTimeText)
              }
              icon={<Timer className="h-4 w-4 text-primary" />}
              hint={myKayit.cikisZamani ? "Günlük toplam" : "Şu ana kadar"}
              hintTone="muted"
            />

            <LocationTile location={girisLoc} label="Giriş Konumu" />
          </div>
        )}
      </Card>

      <Card className="border-border overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/15 shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h3 className="font-semibold text-foreground">
                {isYonetici ? "Günlük Giriş/Çıkış Kayıtları" : "Bugünkü Kayıtlarım"}
              </h3>

              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTR(todayStr())}
              </p>
            </div>
          </div>

          {isYonetici && (
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Personel veya departman ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
        </div>

        {isYonetici && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-border">
            <KpiCell label="Toplam Personel" value={stats.total} tone="muted" />
            <KpiCell label="Giriş Yapan" value={stats.checkedIn} tone="success" divider />
            <KpiCell label="Geç Kalan" value={stats.late} tone="warning" divider />
            <KpiCell label="Gelmeyen" value={stats.noShow} tone="destructive" divider />
          </div>
        )}

        <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 text-xs border-b border-border bg-muted/30">
          <span className="text-muted-foreground font-medium">Mesai başlangıcı:</span>

          <Badge variant="outline" className="font-normal">
            <Clock className="h-3 w-3 mr-1" />
            {WORK_START_TIME}
          </Badge>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-muted-foreground">Zamanında</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span className="text-muted-foreground">Geç kalan</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">Giriş yapmadı</span>
          </span>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[240px]">Personel</TableHead>
                    <TableHead>Giriş</TableHead>
                    <TableHead>Çıkış</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Giriş Konumu</TableHead>
                    <TableHead>Çıkış Konumu</TableHead>
                    <TableHead className="text-right">Durum</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredLog.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Kayıt bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLog.map((r) => {
                      const late = !!r.girisZamani && isTimeLate(r.girisZamani)

                      const gLoc: GeoLocation | null =
                        r.girisLat && r.girisLng
                          ? {
                              lat: r.girisLat,
                              lng: r.girisLng,
                              accuracy: null,
                              label: null,
                            }
                          : null

                      const cLoc: GeoLocation | null =
                        r.cikisLat && r.cikisLng
                          ? {
                              lat: r.cikisLat,
                              lng: r.cikisLng,
                              accuracy: null,
                              label: null,
                            }
                          : null

                      return (
                        <TableRow
                          key={r.personelId}
                          className={
                            late
                              ? "border-border bg-warning/10 hover:bg-warning/15"
                              : "border-border"
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-8 w-8 border border-border">
                                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                  {getInitials(r.personelAdi)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {r.personelAdi}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {r.departman}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <TimeCell time={r.girisZamani} late={late} kind="in" />
                          </TableCell>

                          <TableCell>
                            <TimeCell time={r.cikisZamani} kind="out" />
                          </TableCell>

                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {r.girisZamani && r.cikisZamani
                              ? formatDurationBetween(r.girisZamani, r.cikisZamani)
                              : r.girisZamani
                                ? formatDurationBetween(r.girisZamani, currentTimeText)
                                : "-"}
                          </TableCell>

                          <TableCell>
                            <MapLink location={gLoc} />
                          </TableCell>

                          <TableCell>
                            <MapLink location={cLoc} />
                          </TableCell>

                          <TableCell className="text-right">
                            <RowStatusBadge kayit={r} late={late} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {filteredLog.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Kayıt bulunamadı.
                </div>
              ) : (
                filteredLog.map((r) => {
                  const late = !!r.girisZamani && isTimeLate(r.girisZamani)

                  const gLoc: GeoLocation | null =
                    r.girisLat && r.girisLng
                      ? {
                          lat: r.girisLat,
                          lng: r.girisLng,
                          accuracy: null,
                          label: null,
                        }
                      : null

                  const cLoc: GeoLocation | null =
                    r.cikisLat && r.cikisLng
                      ? {
                          lat: r.cikisLat,
                          lng: r.cikisLng,
                          accuracy: null,
                          label: null,
                        }
                      : null

                  return (
                    <div key={r.personelId} className={`p-4 ${late ? "bg-warning/10" : ""}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-9 w-9 border border-border shrink-0">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {getInitials(r.personelAdi)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {r.personelAdi}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.departman}
                            </p>
                          </div>
                        </div>

                        <RowStatusBadge kayit={r} late={late} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Giriş</p>
                          <TimeCell time={r.girisZamani} late={late} kind="in" />
                        </div>

                        <div>
                          <p className="text-muted-foreground mb-0.5">Çıkış</p>
                          <TimeCell time={r.cikisZamani} kind="out" />
                        </div>

                        <div>
                          <p className="text-muted-foreground mb-0.5">Süre</p>
                          <p className="font-medium text-foreground tabular-nums">
                            {r.girisZamani && r.cikisZamani
                              ? formatDurationBetween(r.girisZamani, r.cikisZamani)
                              : r.girisZamani
                                ? formatDurationBetween(r.girisZamani, currentTimeText)
                                : "-"}
                          </p>
                        </div>
                      </div>

                      {(gLoc || cLoc) && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                          {gLoc && (
                            <a
                              href={buildMapsUrl(gLoc) ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-md px-2 py-1.5 transition-colors"
                            >
                              <MapPin className="h-3 w-3" />
                              Giriş Konumu
                            </a>
                          )}

                          {cLoc && (
                            <a
                              href={buildMapsUrl(cLoc) ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-md px-2 py-1.5 transition-colors"
                            >
                              <MapPin className="h-3 w-3" />
                              Çıkış Konumu
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  icon,
  hint,
  hintTone,
}: {
  label: string
  value: string
  icon: ReactNode
  hint?: string
  hintTone?: "success" | "warning" | "muted"
}) {
  const hintClass =
    hintTone === "success"
      ? "text-success"
      : hintTone === "warning"
        ? "text-warning"
        : "text-muted-foreground"

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>

      <p className="text-lg font-semibold text-foreground mt-1 tabular-nums">
        {value}
      </p>

      {hint && <p className={`text-[11px] mt-0.5 ${hintClass}`}>{hint}</p>}
    </div>
  )
}

function LocationTile({
  location,
  label,
}: {
  location: GeoLocation | null
  label: string
}) {
  const url = buildMapsUrl(location)

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Navigation className="h-4 w-4 text-primary" />
        <span>{label}</span>
      </div>

      {location ? (
        <>
          <p className="text-sm font-medium text-foreground mt-1 truncate tabular-nums">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>

          <a
            href={url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
          >
            Haritada Göster
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </>
      ) : (
        <p className="text-sm text-muted-foreground mt-1">-</p>
      )}
    </div>
  )
}

function KpiCell({
  label,
  value,
  tone,
  divider,
}: {
  label: string
  value: number
  tone: "success" | "warning" | "destructive" | "muted"
  divider?: boolean
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground"

  return (
    <div className={`p-4 ${divider ? "md:border-l md:border-border" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-1 tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}

function TimeCell({
  time,
  late,
  kind,
}: {
  time: string | null
  late?: boolean
  kind: "in" | "out"
}) {
  if (!time) {
    return <span className="text-sm text-muted-foreground">-</span>
  }

  if (kind === "in" && late) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning tabular-nums">
        <AlertTriangle className="h-3 w-3" />
        {time}
      </span>
    )
  }

  return (
    <span
      className={`text-sm font-medium tabular-nums ${
        kind === "in" ? "text-success" : "text-foreground"
      }`}
    >
      {time}
    </span>
  )
}

function MapLink({ location }: { location: GeoLocation | null }) {
  const url = buildMapsUrl(location)

  if (!location || !url) {
    return <span className="text-xs text-muted-foreground">-</span>
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
    >
      <MapPin className="h-3 w-3" />
      {location.label ?? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}
    </a>
  )
}

function RowStatusBadge({
  kayit,
  late,
}: {
  kayit: GunlukKayit
  late: boolean
}) {
  if (!kayit.girisZamani) {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground">
        Gelmedi
      </Badge>
    )
  }

  if (late && !kayit.cikisZamani) {
    return (
      <Badge className="bg-warning/15 text-warning border border-warning/40 hover:bg-warning/15">
        Geç - Çalışıyor
      </Badge>
    )
  }

  if (late && kayit.cikisZamani) {
    return (
      <Badge className="bg-warning/15 text-warning border border-warning/40 hover:bg-warning/15">
        Geç - Tamamlandı
      </Badge>
    )
  }

  if (!kayit.cikisZamani) {
    return (
      <Badge className="bg-success/15 text-success border border-success/40 hover:bg-success/15">
        Çalışıyor
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-border text-muted-foreground">
      Tamamlandı
    </Badge>
  )
}
