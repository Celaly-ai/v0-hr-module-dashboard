"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type GirisTipi = "telefon" | "email"

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").replace(/^90/, "").slice(-10)
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export default function PortalGirisPage() {
  const [girisTipi, setGirisTipi] = useState<GirisTipi>("telefon")
  const [telefon, setTelefon] = useState("")
  const [email, setEmail] = useState("")
  const [sifre, setSifre] = useState("")
  const [hata, setHata] = useState("")
  const [bilgi, setBilgi] = useState("")
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kayitModu, setKayitModu] = useState(false)

  const handleGiris = async () => {
    setHata("")
    setBilgi("")
    setYukleniyor(true)

    try {
      const supabase = createClient()

      if (!supabase) {
        setHata("Supabase bağlantısı yok. Env ayarlarını kontrol edin.")
        setYukleniyor(false)
        return
      }

      let girisEmail = ""

      if (girisTipi === "telefon") {
        const temizTelefon = normalizePhone(telefon)

        if (temizTelefon.length !== 10) {
          setHata("Geçerli telefon numarası giriniz.")
          setYukleniyor(false)
          return
        }

        const { data: telefonPersonel, error: telefonError } = await supabase
          .from("personeller")
          .select("id, email, auth_id, kullanici_id, durum")
          .eq("telefon_normalized", temizTelefon)
          .maybeSingle()

        if (telefonError) {
          setHata("Telefon personel sorgu hatası: " + telefonError.message)
          setYukleniyor(false)
          return
        }

        if (!telefonPersonel) {
          setHata("Bu telefon numarası personeller tablosunda bulunamadı.")
          setYukleniyor(false)
          return
        }

        if (!telefonPersonel.email) {
          setHata("Bu personelin e-posta alanı boş. Önce personel kaydına e-posta eklenmeli.")
          setYukleniyor(false)
          return
        }

        girisEmail = normalizeEmail(telefonPersonel.email)
      } else {
        girisEmail = normalizeEmail(email)

        if (!girisEmail || !girisEmail.includes("@")) {
          setHata("Geçerli e-posta adresi giriniz.")
          setYukleniyor(false)
          return
        }
      }

      if (!sifre) {
        setHata("Şifre giriniz.")
        setYukleniyor(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: girisEmail,
        password: sifre,
      })

      if (error || !data.user) {
        setHata("Auth giriş hatası: " + (error?.message || "Kullanıcı bulunamadı."))
        setYukleniyor(false)
        return
      }

      const { data: personel, error: personelError } = await supabase
        .from("personeller")
        .select("id, auth_id, kullanici_id, durum")
        .or(`auth_id.eq.${data.user.id},kullanici_id.eq.${data.user.id},email.eq.${girisEmail}`)
        .maybeSingle()

      if (personelError) {
        await supabase.auth.signOut()
        setHata("Personel sorgu hatası: " + personelError.message)
        setYukleniyor(false)
        return
      }

      if (!personel) {
        await supabase.auth.signOut()
        setHata("Auth girişi başarılı ama bağlı personel kaydı bulunamadı. E-posta/auth_id/kullanici_id eşleşmesini kontrol edin.")
        setYukleniyor(false)
        return
      }

      if (!personel.auth_id || !personel.kullanici_id) {
        await supabase
          .from("personeller")
          .update({
            auth_id: data.user.id,
            kullanici_id: data.user.id,
          })
          .eq("id", personel.id)
      }

      const durum = (personel.durum || "").toLocaleLowerCase("tr-TR")

      if (
        durum !== "aktif" &&
        durum !== "active" &&
        durum !== "izinli" &&
        durum !== "izınli"
      ) {
        await supabase.auth.signOut()
        setHata(`Personel pasif görünüyor. Durum: ${personel.durum || "boş"}`)
        setYukleniyor(false)
        return
      }

      setBilgi("Giriş başarılı. Portala yönlendiriliyorsunuz...")
      window.location.href = "/portal"
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Beklenmeyen giriş hatası oluştu.")
      setYukleniyor(false)
    }
  }

  const handleKayitOl = async () => {
    setHata("Şimdilik önce mevcut hesabın girişini düzeltelim. Kayıt modunu sonra açacağız.")
  }

  const handleSifreUnuttum = async () => {
    setHata("")
    setBilgi("")

    if (girisTipi === "telefon") {
      setHata("Şifre yenileme için E-posta sekmesine geçip e-posta adresinizi giriniz.")
      return
    }

    const temizEmail = normalizeEmail(email)

    if (!temizEmail || !temizEmail.includes("@")) {
      setHata("Şifre yenileme linki için e-posta adresinizi giriniz.")
      return
    }

    setYukleniyor(true)

    const supabase = createClient()

    if (!supabase) {
      setHata("Supabase bağlantısı yok.")
      setYukleniyor(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(temizEmail, {
      redirectTo: `${window.location.origin}/portal/sifre-yenile`,
    })

    if (error) {
      setHata("Şifre yenileme hatası: " + error.message)
      setYukleniyor(false)
      return
    }

    setBilgi("Şifre yenileme bağlantısı e-posta adresinize gönderildi.")
    setYukleniyor(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 space-y-6 shadow-lg">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              IK
            </div>

            <div>
              <h1 className="text-base font-bold text-foreground">
                FeyRoute IK Paneli
              </h1>
              <p className="text-xs text-muted-foreground">Personel ve Operasyon Girişi</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground">
            {kayitModu ? "Kayıt Ol" : "Giriş Yap"}
          </h2>

          <p className="text-sm text-muted-foreground mt-1">
            Telefon veya e-posta ile devam edin.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setGirisTipi("telefon")
              setHata("")
              setBilgi("")
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              girisTipi === "telefon"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-foreground border-border"
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
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              girisTipi === "email"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-foreground border-border"
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
              placeholder="Şifreniz"
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {!kayitModu && (
          <div className="text-right">
            <button
              type="button"
              onClick={handleSifreUnuttum}
              disabled={yukleniyor}
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              Şifremi unuttum
            </button>
          </div>
        )}

        {hata && (
          <div className="rounded-lg border border-red-300 bg-red-100 p-3">
            <p className="text-sm text-red-700 text-center whitespace-pre-line">{hata}</p>
          </div>
        )}

        {bilgi && (
          <div className="rounded-lg border border-green-300 bg-green-100 p-3">
            <p className="text-sm text-green-700 text-center">{bilgi}</p>
          </div>
        )}

        <button
          onClick={kayitModu ? handleKayitOl : handleGiris}
          disabled={yukleniyor}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {yukleniyor
            ? kayitModu
              ? "Kayıt oluşturuluyor..."
              : "Giriş yapılıyor..."
            : kayitModu
              ? "Kayıt Ol"
              : "Giriş Yap"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          {kayitModu ? "Hesabınız var mı?" : "Hesabınız yok mu?"}{" "}
          <button
            type="button"
            onClick={() => {
              setKayitModu((v) => !v)
              setHata("")
              setBilgi("")
            }}
            className="font-semibold text-primary hover:underline"
          >
            {kayitModu ? "Giriş yapın" : "Kayıt olun"}
          </button>
        </p>
      </div>
    </div>
  )
}
