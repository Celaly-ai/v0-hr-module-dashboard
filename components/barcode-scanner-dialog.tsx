"use client"

/**
 * BarcodeScannerDialog
 *
 * Kamera uzerinden barkod / QR kod okuyan yeniden kullanilabilir dialog.
 * - @zxing/browser ile linear barkodlar ve QR kodlari cozer.
 * - Kamera desteklenmiyor, izin yok veya tarama basarisiz olursa manuel giris
 *   alani sunar; kullanici kod degerini elle yazip onaylayabilir.
 * - Tespit edilen ham degeri ust bilesene iletir. Ayristirma (JSON / `|` /
 *   URL / duz string) parent tarafinda yapilir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  Loader2,
  RefreshCcw,
  ScanLine,
} from "lucide-react"

interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Barkod / QR cozuldugunde veya manuel giris onaylandiginda cagrilir. */
  onDetected: (rawValue: string, source: "camera" | "manual") => void
  title?: string
  description?: string
}

type ScannerPhase = "idle" | "requesting" | "scanning" | "detected" | "error" | "manual"

/**
 * BrowserMultiFormatReader tipi runtime'da dinamik import ile geldigi icin
 * `any` yerine minimal bir arayuz tanimliyoruz.
 */
interface ZXingControls {
  stop: () => void
}

interface ZXingReader {
  decodeFromVideoDevice: (
    deviceId: string | undefined,
    videoElement: HTMLVideoElement,
    callback: (result: { getText: () => string } | undefined, error: unknown) => void,
  ) => Promise<ZXingControls>
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
  title = "Barkod / QR Tara",
  description = "Varlik barkodunu veya QR kodunu kameraya tutun. Otomatik olarak okunacaktir.",
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<ZXingControls | null>(null)
  const readerRef = useRef<ZXingReader | null>(null)

  const [phase, setPhase] = useState<ScannerPhase>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined)
  const [manualValue, setManualValue] = useState("")
  const [lastDetected, setLastDetected] = useState<string | null>(null)

  // Tarayicinin kamera + mediaDevices API'sini destekleyip desteklemedigini kontrol et.
  const cameraSupported = useMemo(() => {
    if (typeof window === "undefined") return false
    return Boolean(
      navigator?.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    )
  }, [])

  /** Mevcut tarama oturumunu kapat ve video stream'ini serbest birak. */
  const stopScanning = useCallback(() => {
    try {
      controlsRef.current?.stop()
    } catch {
      // sessizce yok say
    }
    controlsRef.current = null
    const video = videoRef.current
    const stream = video?.srcObject as MediaStream | null
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      if (video) video.srcObject = null
    }
  }, [])

  /** Kamerayi baslat, @zxing/browser ile surekli tarama yap. */
  const startScanning = useCallback(
    async (deviceId?: string) => {
      if (!cameraSupported) {
        setPhase("error")
        setErrorMessage(
          "Bu cihaz / tarayici kamera erisimini desteklemiyor. Manuel giris yapabilirsiniz.",
        )
        return
      }
      setPhase("requesting")
      setErrorMessage(null)

      try {
        // zxing'i yalnizca istemcide, tarama basladiginda yukle.
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        const reader = new BrowserMultiFormatReader() as unknown as ZXingReader
        readerRef.current = reader

        const video = videoRef.current
        if (!video) {
          throw new Error("Video elementi hazir degil")
        }

        // Kamera listesini bir kez cek (izin verilmezse burada patlar).
        if (devices.length === 0) {
          try {
            const all = await navigator.mediaDevices.enumerateDevices()
            const cams = all.filter((d) => d.kind === "videoinput")
            setDevices(cams)
            if (!deviceId && cams.length > 0) {
              // Arka kamerayi tercih et (mobil cihazlarda).
              const back =
                cams.find((c) => /back|rear|environment/i.test(c.label)) ??
                cams[cams.length - 1]
              deviceId = back.deviceId
              setSelectedDeviceId(deviceId)
            }
          } catch {
            // Bazi tarayicilar enumerate icin izin ister; gormezden gelip devam ediyoruz.
          }
        }

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          video,
          (result, err) => {
            if (result) {
              const text = result.getText()
              if (text && text !== lastDetected) {
                setLastDetected(text)
                setPhase("detected")
                // Cift okumayi engellemek icin durduralim.
                try {
                  controls.stop()
                } catch {
                  // noop
                }
                onDetected(text, "camera")
              }
            }
            // ZXing okunamayan her karede bir NotFoundException dusurur -> sessizce gecilir.
            if (err && (err as { name?: string }).name !== "NotFoundException") {
              // Baska bir hata olursa da loglamayalim, aksi halde konsol kirlenir.
            }
          },
        )
        controlsRef.current = controls
        setPhase("scanning")
      } catch (err) {
        const name = (err as { name?: string }).name
        let msg =
          "Kamera baslatilamadi. Manuel giris yapabilir veya tekrar deneyebilirsiniz."
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          msg =
            "Kamera izni reddedildi. Tarayici ayarlarindan izin vererek tekrar deneyin veya manuel giris yapin."
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          msg =
            "Kullanilabilir bir kamera bulunamadi. Manuel giris yapabilirsiniz."
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          msg =
            "Kamera baska bir uygulama tarafindan kullaniliyor olabilir. Manuel giris yapabilirsiniz."
        }
        setPhase("error")
        setErrorMessage(msg)
      }
    },
    [cameraSupported, devices.length, lastDetected, onDetected],
  )

  // Dialog acildiginda taramayi baslat, kapandiginda kamerayi serbest birak.
  useEffect(() => {
    if (open) {
      setManualValue("")
      setLastDetected(null)
      setErrorMessage(null)
      if (cameraSupported) {
        startScanning()
      } else {
        setPhase("error")
        setErrorMessage(
          "Bu cihazda kamera erisimi desteklenmiyor. Asagidan manuel giris yapabilirsiniz.",
        )
      }
    } else {
      stopScanning()
      setPhase("idle")
    }
    return () => {
      stopScanning()
    }
    // startScanning stopScanning `useCallback`'li; sonsuz donguye girmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    stopScanning()
    void startScanning(deviceId)
  }

  const handleRetry = () => {
    stopScanning()
    setLastDetected(null)
    void startScanning(selectedDeviceId)
  }

  const handleManualConfirm = () => {
    const value = manualValue.trim()
    if (!value) return
    onDetected(value, "manual")
  }

  const isScanning = phase === "scanning"
  const isRequesting = phase === "requesting"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Kamera onizleme */}
          <div className="relative overflow-hidden rounded-lg border border-border bg-black/80 aspect-video">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />

            {/* Tarama cercevesi overlay */}
            {(isScanning || isRequesting) && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-2/3 w-4/5 rounded-md border-2 border-primary/70">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary shadow-[0_0_12px_2px_rgba(var(--primary-rgb,59_130_246)/0.8)] animate-pulse" />
                  <span className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-primary" />
                  <span className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-primary" />
                  <span className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-primary" />
                  <span className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-primary" />
                </div>
              </div>
            )}

            {/* Durum rozetleri */}
            <div className="absolute left-3 top-3 flex items-center gap-2">
              {isRequesting && (
                <Badge variant="outline" className="border-amber-400/40 bg-amber-500/20 text-amber-100">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Kamera hazirlaniyor
                </Badge>
              )}
              {isScanning && (
                <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/20 text-emerald-100">
                  <Camera className="mr-1 h-3 w-3" />
                  Taraniyor
                </Badge>
              )}
              {phase === "detected" && (
                <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/20 text-emerald-100">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Okundu
                </Badge>
              )}
              {phase === "error" && (
                <Badge variant="outline" className="border-red-400/40 bg-red-500/20 text-red-100">
                  <CameraOff className="mr-1 h-3 w-3" />
                  Kamera kullanilamiyor
                </Badge>
              )}
            </div>
          </div>

          {/* Kamera secimi (birden fazla varsa) */}
          {devices.length > 1 && phase !== "error" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Kamera</Label>
              <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Kamera secin" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d, idx) => (
                    <SelectItem key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Kamera ${idx + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Son okunan deger */}
          {lastDetected && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
              <p className="text-xs text-emerald-300/80">Okunan deger</p>
              <p className="mt-0.5 break-all font-mono text-emerald-100">
                {lastDetected}
              </p>
            </div>
          )}

          {/* Hata mesaji */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Manuel giris (her zaman gorunur) */}
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="manual-barcode" className="text-sm">
                Manuel giris
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Barkod okunmuyorsa veya kamera kullanilamiyorsa kod degerini elle
              girebilirsiniz.
            </p>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                placeholder="Orn: SN-123456 veya tam payload"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleManualConfirm()
                  }
                }}
                className="font-mono"
              />
              <Button
                type="button"
                onClick={handleManualConfirm}
                disabled={!manualValue.trim()}
              >
                Kullan
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            {phase !== "error" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-1.5"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Yeniden Dene
              </Button>
            )}
            {phase === "error" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                Kamerayi Dene
              </Button>
            )}
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
