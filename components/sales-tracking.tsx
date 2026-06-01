"use client"

/**
 * Satis Takibi
 * ------------
 * Uc sekmeli modul:
 *   1. Satis Girisi : Barkod tara (kamera / manuel) -> urun adi, fiyat
 *                     otomatik dolsun; miktar, satici, tarih ile kayit.
 *   2. Satislar     : Supabase realtime abonelik ile canli satis listesi.
 *   3. Raporlar     : Tarih araligi + satici filtresi, ozet kart + CSV.
 *
 * Veri kaynagi: Supabase (public.products, public.sales).
 * Saticilar: lib/hr-data.ts -> employees (aktif olanlar).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Download,
  Loader2,
  PackagePlus,
  Receipt,
  RefreshCcw,
  ScanLine,
  TrendingUp,
  User as UserIcon,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { employees } from "@/lib/hr-data"

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

interface ProductRow {
  id: string
  barcode: string
  name: string
  default_price: number
}

interface SaleRow {
  id: string
  product_id: string | null
  barcode: string | null
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  seller_id: string | null
  seller_name: string
  sold_at: string
  created_at: string
  created_by: string | null
}

// ---------------------------------------------------------------------------
// Yardimcilar
// ---------------------------------------------------------------------------

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/**
 * Barkod payload'unu cozumle. asset-tracking ile ayni mantigin kisaltilmis hali:
 * JSON / URL / "key:val" / "a|b|c" / duz string.
 */
function parseBarcodePayload(raw: string): {
  barcode: string
  name?: string
  price?: number
} {
  const text = raw.trim()
  if (!text) return { barcode: "" }

  // JSON
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>
      const str = (k: string) =>
        typeof obj[k] === "string" ? (obj[k] as string).trim() : undefined
      const num = (k: string) => {
        const v = obj[k]
        const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
        return Number.isFinite(n) ? n : undefined
      }
      return {
        barcode:
          str("barcode") ?? str("sku") ?? str("code") ?? str("ean") ?? text,
        name: str("name") ?? str("productName") ?? str("ad") ?? str("urunAdi"),
        price: num("price") ?? num("fiyat"),
      }
    } catch {
      /* JSON degil */
    }
  }

  // URL query
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text)
      const sp = url.searchParams
      return {
        barcode:
          sp.get("barcode") ??
          sp.get("sku") ??
          sp.get("ean") ??
          sp.get("code") ??
          text,
        name: sp.get("name") ?? sp.get("ad") ?? undefined,
        price: sp.get("price") ? Number(sp.get("price")) : undefined,
      }
    } catch {
      /* parse edilemiyor */
    }
  }

  // "a|b|c"
  const parts = text.split(/[|;]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const priceCandidate = parts[2] ? Number(parts[2]) : NaN
    return {
      barcode: parts[0],
      name: parts[1],
      price: Number.isFinite(priceCandidate) ? priceCandidate : undefined,
    }
  }

  return { barcode: text }
}

// ---------------------------------------------------------------------------
// Ana bilesen
// ---------------------------------------------------------------------------

export function SalesTracking() {
  const { user, profile, configError } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  // Aktif calisanlar -> satici listesi
  const sellers = useMemo(
    () => employees.filter((e) => e.status === "active"),
    [],
  )

  // -------------------------------------------------------------------------
  // Satislar listesi + realtime
  // -------------------------------------------------------------------------
  const [sales, setSales] = useState<SaleRow[]>([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const loadSales = useCallback(async () => {
    if (!supabase) return
    setSalesLoading(true)
    setListError(null)
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("sold_at", { ascending: false })
      .limit(500)
    if (error) {
      setListError(error.message)
      setSalesLoading(false)
      return
    }
    setSales((data ?? []) as SaleRow[])
    setSalesLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadSales()
  }, [loadSales])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel("sales-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sales" },
        (payload) => {
          const row = payload.new as SaleRow
          setSales((prev) => {
            if (prev.some((s) => s.id === row.id)) return prev
            return [row, ...prev].slice(0, 500)
          })
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "sales" },
        (payload) => {
          const old = payload.old as { id?: string }
          if (!old?.id) return
          setSales((prev) => prev.filter((s) => s.id !== old.id))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  if (configError) {
    return (
      <Alert className="border-amber-600/40 bg-amber-600/10 text-amber-200">
        <AlertDescription>
          Supabase baglantisi yapilandirilmamis. Satis modulunu kullanmak icin{" "}
          <code className="rounded bg-amber-600/20 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          ve{" "}
          <code className="rounded bg-amber-600/20 px-1">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          ortam degiskenlerini ekleyin.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Satis Takibi</h1>
        <p className="text-sm text-muted-foreground">
          Barkod taratarak hizli satis girisi yapin, canli liste ve raporlari
          takip edin.
        </p>
      </header>

      <Tabs defaultValue="entry" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entry" className="gap-2">
            <PackagePlus className="h-4 w-4" />
            Satis Girisi
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <Receipt className="h-4 w-4" />
            Satislar
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
              {sales.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Raporlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry">
          <SalesEntryTab
            sellers={sellers}
            defaultSellerName={profile?.fullName ?? profile?.email ?? ""}
            userId={user?.id ?? null}
            onSaved={() => {
              // Realtime zaten ekleyecek; yine de guvenli olsun diye tekrar yukle.
              void loadSales()
            }}
          />
        </TabsContent>

        <TabsContent value="list">
          <SalesListTab
            sales={sales}
            loading={salesLoading}
            error={listError}
            onReload={loadSales}
          />
        </TabsContent>

        <TabsContent value="reports">
          <SalesReportsTab sales={sales} sellers={sellers} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===========================================================================
// Satis Girisi
// ===========================================================================

interface SalesEntryTabProps {
  sellers: typeof employees
  defaultSellerName: string
  userId: string | null
  onSaved: () => void
}

function SalesEntryTab({
  sellers,
  defaultSellerName,
  userId,
  onSaved,
}: SalesEntryTabProps) {
  const supabase = useMemo(() => createClient(), [])

  const [scannerOpen, setScannerOpen] = useState(false)
  const [barcode, setBarcode] = useState("")
  const [productName, setProductName] = useState("")
  const [unitPrice, setUnitPrice] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("1")
  const [sellerId, setSellerId] = useState<string>(sellers[0]?.id ?? "")
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString())

  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "looking" | "hit" | "miss"
  >("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Her 30 sn'de bir timestamp alaninin "Simdi" gorunmesini canli tut
  useEffect(() => {
    const i = setInterval(() => setTimestamp(new Date().toISOString()), 30_000)
    return () => clearInterval(i)
  }, [])

  // Urun arama (barkod ile products tablosundan)
  const lookupProduct = useCallback(
    async (code: string) => {
      if (!supabase || !code) {
        setLookupStatus("idle")
        return
      }
      setLookupStatus("looking")
      const { data, error } = await supabase
        .from("products")
        .select("id, barcode, name, default_price")
        .eq("barcode", code)
        .maybeSingle()
      if (error) {
        console.error("[v0] product lookup error:", error.message)
        setLookupStatus("miss")
        return
      }
      if (data) {
        const p = data as ProductRow
        setProductName((prev) => (prev ? prev : p.name))
        setUnitPrice((prev) =>
          prev ? prev : p.default_price ? String(p.default_price) : "",
        )
        setLookupStatus("hit")
      } else {
        setLookupStatus("miss")
      }
    },
    [supabase],
  )

  const handleScanned = useCallback(
    (raw: string) => {
      const parsed = parseBarcodePayload(raw)
      setBarcode(parsed.barcode)
      if (parsed.name && !productName) setProductName(parsed.name)
      if (parsed.price && !unitPrice) setUnitPrice(String(parsed.price))
      setScannerOpen(false)
      // products tablosunda esleme var mi bak
      void lookupProduct(parsed.barcode)
    },
    [productName, unitPrice, lookupProduct],
  )

  const handleBarcodeBlur = () => {
    if (barcode.trim()) void lookupProduct(barcode.trim())
  }

  const resetForm = () => {
    setBarcode("")
    setProductName("")
    setUnitPrice("")
    setQuantity("1")
    setLookupStatus("idle")
    setTimestamp(new Date().toISOString())
    // sellerId'i ozellikle koruyoruz (ayni satici arka arkaya giris yapabilir)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(null)

    if (!supabase) {
      setSaveError("Supabase baglantisi yok.")
      return
    }

    const name = productName.trim()
    const qty = Number(quantity)
    const price = unitPrice.trim() === "" ? 0 : Number(unitPrice)

    if (!name) {
      setSaveError("Urun adi zorunludur.")
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setSaveError("Miktar pozitif bir sayi olmalidir.")
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setSaveError("Birim fiyat gecerli olmalidir.")
      return
    }
    if (!sellerId) {
      setSaveError("Satici secmelisiniz.")
      return
    }

    const seller = sellers.find((s) => s.id === sellerId)
    const sellerName = seller?.name ?? defaultSellerName ?? "Bilinmeyen"
    const code = barcode.trim() || null

    setSaving(true)
    try {
      // Barkod varsa ve urun kayitli degilse -> products'a upsert et (RLS izin veriyor)
      let productId: string | null = null
      if (code) {
        const { data: existing, error: exErr } = await supabase
          .from("products")
          .select("id")
          .eq("barcode", code)
          .maybeSingle()

        if (exErr) {
          console.error("[v0] product check error:", exErr.message)
        }

        if (existing?.id) {
          productId = existing.id as string
          // Fiyat / ad guncellenmisse guncelle
          await supabase
            .from("products")
            .update({ name, default_price: price })
            .eq("id", productId)
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from("products")
            .insert({ barcode: code, name, default_price: price })
            .select("id")
            .maybeSingle()
          if (insErr) {
            console.error("[v0] product insert error:", insErr.message)
          }
          productId = inserted?.id ?? null
        }
      }

      const total = Number((qty * price).toFixed(2))
      const { error: saleErr } = await supabase.from("sales").insert({
        product_id: productId,
        barcode: code,
        product_name: name,
        quantity: qty,
        unit_price: price,
        total_price: total,
        seller_id: sellerId,
        seller_name: sellerName,
        sold_at: new Date().toISOString(),
        created_by: userId,
      })

      if (saleErr) {
        setSaveError(saleErr.message)
        return
      }

      setSaveSuccess(
        `${name} - ${qty} adet kaydedildi. (${currency.format(total)})`,
      )
      resetForm()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="h-4 w-4 text-primary" />
            Yeni Satis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Barkod + Tara */}
            <div className="space-y-2">
              <Label htmlFor="sale-barcode">Barkod</Label>
              <div className="flex gap-2">
                <Input
                  id="sale-barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onBlur={handleBarcodeBlur}
                  placeholder="Kodu elle girin veya kamera ile tarayin"
                  className="flex-1 font-mono"
                />
                <Button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <ScanLine className="h-4 w-4" />
                  Barkod Tara
                </Button>
              </div>
              {lookupStatus === "looking" && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Urun veritabaninda araniyor...
                </p>
              )}
              {lookupStatus === "hit" && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Kayitli urun bulundu. Ad ve fiyat otomatik dolduruldu.
                </p>
              )}
              {lookupStatus === "miss" && barcode.trim() !== "" && (
                <p className="flex items-center gap-1.5 text-xs text-amber-400">
                  <XCircle className="h-3 w-3" />
                  Bu barkod veritabaninda yok. Urun adini girin; satis
                  kaydedildiginde otomatik olarak eklenecek.
                </p>
              )}
            </div>

            {/* Urun adi */}
            <div className="space-y-2">
              <Label htmlFor="sale-name">
                Urun Adi <span className="text-red-400">*</span>
              </Label>
              <Input
                id="sale-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Orn: Pamuk Seker"
                required
              />
            </div>

            {/* Miktar + Birim fiyat */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-qty">
                  Miktar <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="sale-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-price">Birim Fiyat (TL)</Label>
                <Input
                  id="sale-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Satici + Zaman */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Satici <span className="text-red-400">*</span>
                </Label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Satici secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {s.position}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Varsayilan olarak oturum acan kullanici: {defaultSellerName}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tarih & Saat</Label>
                <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                  <CalendarRange className="h-4 w-4" />
                  {dateTime.format(new Date(timestamp))}
                  <Badge
                    variant="outline"
                    className="ml-auto h-5 px-1.5 text-[10px]"
                  >
                    Simdi
                  </Badge>
                </div>
              </div>
            </div>

            {saveError && (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}
            {saveSuccess && (
              <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Satisi Kaydet
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={saving}
                className="gap-1.5"
              >
                <RefreshCcw className="h-4 w-4" />
                Temizle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleScanned}
        title="Urun Barkodu Tara"
        description="Urun barkodunu kameraya tutun. Otomatik okunacak ve form dolacaktir."
      />
    </>
  )
}

// ===========================================================================
// Satislar Listesi
// ===========================================================================

interface SalesListTabProps {
  sales: SaleRow[]
  loading: boolean
  error: string | null
  onReload: () => void
}

function SalesListTab({ sales, loading, error, onReload }: SalesListTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-primary" />
          Canli Satis Listesi
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Gercek zamanli
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onReload}
            className="gap-1.5"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Satislar yuklenemedi: {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih / Saat</TableHead>
                <TableHead>Urun</TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Birim</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Satici</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && sales.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && sales.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Henuz kayitli satis yok. Satis Girisi sekmesinden ilk
                    satisi ekleyin.
                  </TableCell>
                </TableRow>
              )}
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {dateTime.format(new Date(s.sold_at))}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {s.product_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.barcode ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">{s.quantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {currency.format(Number(s.unit_price))}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {currency.format(Number(s.total_price))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.seller_name}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// Raporlar
// ===========================================================================

interface SalesReportsTabProps {
  sales: SaleRow[]
  sellers: typeof employees
}

function SalesReportsTab({ sales, sellers }: SalesReportsTabProps) {
  const [from, setFrom] = useState<string>(daysAgoISO(30))
  const [to, setTo] = useState<string>(todayISO())
  const [sellerFilter, setSellerFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    const fromTs = new Date(from + "T00:00:00").getTime()
    const toTs = new Date(to + "T23:59:59").getTime()
    return sales.filter((s) => {
      const t = new Date(s.sold_at).getTime()
      if (Number.isNaN(t)) return false
      if (t < fromTs || t > toTs) return false
      if (sellerFilter !== "all" && s.seller_id !== sellerFilter) return false
      return true
    })
  }, [sales, from, to, sellerFilter])

  const summary = useMemo(() => {
    const totalAmount = filtered.reduce(
      (a, s) => a + Number(s.total_price || 0),
      0,
    )
    const totalQty = filtered.reduce((a, s) => a + Number(s.quantity || 0), 0)

    const byProduct = new Map<string, number>()
    for (const s of filtered) {
      byProduct.set(
        s.product_name,
        (byProduct.get(s.product_name) ?? 0) + Number(s.quantity || 0),
      )
    }
    const topProduct = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0]

    return {
      count: filtered.length,
      totalAmount,
      totalQty,
      topProductName: topProduct?.[0] ?? "-",
      topProductQty: topProduct?.[1] ?? 0,
    }
  }, [filtered])

  const downloadRef = useRef<HTMLAnchorElement>(null)
  const handleExportCSV = () => {
    const rows = [
      [
        "Tarih",
        "Urun",
        "Barkod",
        "Miktar",
        "Birim Fiyat",
        "Toplam",
        "Satici",
      ],
      ...filtered.map((s) => [
        dateTime.format(new Date(s.sold_at)),
        s.product_name,
        s.barcode ?? "",
        String(s.quantity),
        String(s.unit_price),
        String(s.total_price),
        s.seller_name,
      ]),
    ]
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const v = cell ?? ""
            if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`
            return v
          })
          .join(";"),
      )
      .join("\r\n")
    // Excel TR uyumlulugu icin UTF-8 BOM ekle
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const a = downloadRef.current
    if (a) {
      a.href = url
      a.download = `satis-raporu-${from}-${to}.csv`
      a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-primary" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="rep-from">Baslangic</Label>
              <Input
                id="rep-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-to">Bitis</Label>
              <Input
                id="rep-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Satici</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tum saticilar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum saticilar</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              CSV olarak disa aktar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFrom(daysAgoISO(30))
                setTo(todayISO())
                setSellerFilter("all")
              }}
              className="gap-1.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Filtreleri sifirla
            </Button>
            {/* gizli indirme kanci */}
            <a ref={downloadRef} className="hidden" aria-hidden />
          </div>
        </CardContent>
      </Card>

      {/* Ozet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Toplam satis"
          value={String(summary.count)}
          icon={<Receipt className="h-4 w-4 text-primary" />}
        />
        <SummaryCard
          label="Toplam ciro"
          value={currency.format(summary.totalAmount)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
        />
        <SummaryCard
          label="Toplam urun adedi"
          value={String(summary.totalQty)}
          icon={<PackagePlus className="h-4 w-4 text-primary" />}
        />
        <SummaryCard
          label="En cok satan"
          value={summary.topProductName}
          sub={
            summary.topProductQty ? `${summary.topProductQty} adet` : undefined
          }
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Detay tablo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detayli Kayitlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Urun</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Satici</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Secilen kriterler icin kayit bulunamadi.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {dateTime.format(new Date(s.sold_at))}
                    </TableCell>
                    <TableCell>{s.product_name}</TableCell>
                    <TableCell className="text-right">{s.quantity}</TableCell>
                    <TableCell className="text-right">
                      {currency.format(Number(s.total_price))}
                    </TableCell>
                    <TableCell>{s.seller_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-lg font-semibold text-foreground">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}
