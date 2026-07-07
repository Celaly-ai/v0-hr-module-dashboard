"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

type GirisTipi = "telefon" | "email"

function normalizePhone(value: string) {
  let digits = String(value || "").replace(/\D/g, "")

  if (digits.startsWith("90")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)

  return digits.slice(-10)
}

function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@feyroute.com`
}

function normalizeEmail(value: string) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

function aktifDurumMu(value?: string | null) {
  const durum = String(value || "").toLocaleLowerCase("tr-TR").trim()

  return (
    durum === "aktif" ||
    durum === "active" ||
    durum === "izinli" ||
    durum === "izınli"
  )
}

export default function LoginForm() {
  const [girisTipi, setGirisTipi] = useState<GirisTipi>("telefon")
  const [telefon, setTelefon] = useState("")
  const [email, setEmail] = useState("")
  const [sifre, setSifre] = useState("")
  const [hata, setHata] = useState("")
  const [bilgi, setBilgi] = useState("")
  const [yukleniyor, setYukleniyor] = useState(false)

  async function handleGiris() {
    const cleanPhone = normalizePhone(telefon)
    const cleanEmail =
      girisTipi === "telefon" ? phoneToEmail(cleanPhone) : normalizeEmail(email)

    setHata("")
    setBilgi("")

    if (girisTipi === "telefon" && cleanPhone.length !== 10) {
      setHata("Telefon numarası 10 haneli olmalıdır. Örnek: 05XXXXXXXXX")
      return
    }

    if (girisTipi === "email" && !cleanEmail.includes("@")) {
      setHata("Lütfen geçerli bir e-posta adresi giriniz.")
      return
    }

    if (!sifre.trim()) {
      setHata("Lütfen şifrenizi giriniz.")
      return
    }

    setYukleniyor(true)

    const supabase = createClient()

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: sifre,
      })

    if (authError || !authData.user) {
      setHata(
        girisTipi === "telefon"
          ? `Giriş yapılamadı. Supabase Auth içinde ${cleanEmail} kullanıcısı yok veya şifre hatalı.`
          : "E-posta veya şifre hatalı.",
      )
      setYukleniyor(false)
      return
    }

    const personelSorgu =
      girisTipi === "telefon"
        ? `auth_id.eq.${authData.user.id},email.eq.${cleanEmail},telefon_normalized.eq.${cleanPhone}`
        : `auth_id.eq.${authData.user.id},email.eq.${cleanEmail}`

    const { data: personeller, error: personelError } = await supabase
      .from("personeller")
      .select(
        "id, ad, soyad, tel, email, telefon_normalized, kullanici_id, auth_id, rol, durum",
      )
      .or(personelSorgu)
      .limit(10)

    if (personelError) {
      await supabase.auth.signOut()
      setHata("Personel kaydı kontrol edilirken hata oluştu: " + personelError.message)
      setYukleniyor(false)
      return
    }

    const personelListesi = personeller || []

    const personel =
      personelListesi.find((p) => p.auth_id === authData.user.id) ||
      personelListesi.find((p) => normalizeEmail(p.email || "") === cleanEmail) ||
      (girisTipi === "telefon"
        ? personelListesi.find(
            (p) => String(p.telefon_normalized || "") === cleanPhone,
          )
        : null) ||
      personelListesi[0] ||
      null

    if (!personel) {
      await supabase.auth.signOut()
      setHata(
        girisTipi === "telefon"
          ? `Giriş başarılı fakat personeller tablosunda eşleşme bulunamadı. Kontrol: email=${cleanEmail}, telefon_normalized=${cleanPhone}`
          : `Giriş başarılı fakat personeller tablosunda ${cleanEmail} için eşleşme bulunamadı.`,
      )
      setYukleniyor(false)
      return
    }

    if (!aktifDurumMu(personel.durum)) {
      await supabase.auth.signOut()
      setHata("Giriş yetkiniz bulunmamaktadır. Personel durumu aktif değil.")
      setYukleniyor(false)
      return
    }

    const guncellenecekAlanlar: Record<string, string> = {}

    if (!personel.auth_id) {
      guncellenecekAlanlar.auth_id = authData.user.id
    }

    if (!personel.email) {
      guncellenecekAlanlar.email = cleanEmail
    }

    if (girisTipi === "telefon" && !personel.telefon_normalized) {
      guncellenecekAlanlar.telefon_normalized = cleanPhone
    }

    if (Object.keys(guncellenecekAlanlar).length > 0) {
      const { error: updateError } = await supabase
        .from("personeller")
        .update(guncellenecekAlanlar)
        .eq("id", personel.id)

      if (updateError) {
        await supabase.auth.signOut()
        setHata("Personel hesabı bağlanamadı: " + updateError.message)
        setYukleniyor(false)
        return
      }
    }

    setBilgi("Giriş başarılı. Portale yönlendiriliyorsunuz...")

    const ilkGiris = authData.user.user_metadata?.ilk_giris

    if (ilkGiris) {
      window.location.href = "/portal/sifre-degistir"
      return
    }

    window.location.href = "/portal"
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-7 space-y-6 shadow-lg">
      <div>
        <h2 className="text-xl font-bold text-foreground">Giriş Yap</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Telefon veya e-posta adresiniz ile devam edin.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        <button
          type="button"
          onClick={() => {
            setGirisTipi("telefon")
            setHata("")
            setBilgi("")
          }}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${
            girisTipi === "telefon"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          Telefon
        </button>

        <button
          type="button"
          onClick={() => {
            setGirisTipi("email")
            setHata("")
            setBilgi("")
          }}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${
            girisTipi === "email"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          E-posta
        </button>
      </div>

      <div className="space-y-4">
        {girisTipi === "telefon" ? (
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Telefon Numarası
            </label>
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="05XXXXXXXXX"
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {normalizePhone(telefon).length === 10 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Giriş e-postası: {phoneToEmail(telefon)}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              E-posta Adresi
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@firma.com"
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Şifre
          </label>
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGiris()
            }}
            className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {hata && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm text-destructive text-center">{hata}</p>
        </div>
      )}

      {bilgi && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
          <p className="text-sm text-primary text-center">{bilgi}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleGiris}
        disabled={yukleniyor}
        className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {yukleniyor ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            İşlem yapılıyor...
          </span>
        ) : (
          "Giriş Yap"
        )}
      </button>
    </div>
  )
}