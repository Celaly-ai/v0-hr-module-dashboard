"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Loader2, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("90")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(-10)
}

function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@feyroute.com`
}

export function SignupForm() {
  const [telefon, setTelefon] = useState("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const cleanPhone = normalizePhone(telefon)

    if (cleanPhone.length !== 10 || !password) {
      setError("Telefon numarası ve şifre gereklidir.")
      return
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.")
      return
    }

    if (password !== password2) {
      setError("Şifreler eşleşmiyor.")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const authEmail = phoneToEmail(cleanPhone)
      const personelColumns =
        "id, ad, soyad, tel, whatsapp_tel, email, durum, kullanici_id, auth_id, telefon_normalized"

      const { data: dogrudanPersonel, error: dogrudanPersonelError } = await supabase
        .from("personeller")
        .select(personelColumns)
        .or(`telefon_normalized.eq.${cleanPhone},email.eq.${authEmail}`)
        .maybeSingle()

      if (dogrudanPersonelError) {
        setError("Personel kayıtları kontrol edilemedi.")
        return
      }

      let personel = dogrudanPersonel

      if (!personel) {
        const { data: personeller, error: personelError } = await supabase
          .from("personeller")
          .select(personelColumns)
          .limit(500)

        if (personelError || !personeller) {
          setError("Personel kayıtları kontrol edilemedi.")
          return
        }

        personel = personeller.find((p) => {
          const tel = normalizePhone(p.tel ?? "")
          const whatsapp = normalizePhone(p.whatsapp_tel ?? "")
          return tel === cleanPhone || whatsapp === cleanPhone
        }) ?? null
      }

      if (!personel) {
        setError("Bu telefon numarası sistemde kayıtlı değil. Yöneticinizle iletişime geçin.")
        return
      }

      if (personel.kullanici_id || personel.auth_id) {
        setError("Bu telefon numarası ile zaten kayıt yapılmış. Giriş yapın.")
        return
      }

      const fullName = `${personel.ad ?? ""} ${personel.soyad ?? ""}`.trim()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: cleanPhone,
            role: "calisan",
          },
        },
      })

      if (signUpError || !data.user) {
        setError(signUpError?.message || "Kayıt oluşturulamadı.")
        return
      }

      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: authEmail,
        full_name: fullName,
        role: "calisan",
      })

      const { error: updateError } = await supabase
        .from("personeller")
        .update({
          kullanici_id: data.user.id,
          auth_id: data.user.id,
          email: authEmail,
        })
        .eq("id", personel.id)

      if (updateError) {
        setError("Kullanıcı oluşturuldu fakat personel kaydı bağlanamadı.")
        return
      }

      setSuccess(
        `Kayıt başarılı. Şimdi ${cleanPhone} telefon numaranız ve şifreniz ile giriş yapabilirsiniz.`,
      )
    } catch {
      setError("Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">Kayıt Ol</CardTitle>
        <CardDescription>
          Sisteme kayıtlı telefon numaranız ile hesap oluşturun.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-600/40 bg-emerald-600/10 text-emerald-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="telefon">Telefon Numarası</Label>
            <Input
              id="telefon"
              type="tel"
              autoComplete="tel"
              placeholder="05XXXXXXXXX"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
              minLength={6}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password2">Şifre Tekrar</Label>
            <Input
              id="password2"
              type="password"
              autoComplete="new-password"
              placeholder="Şifrenizi tekrar girin"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              disabled={submitting}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Kayıt Ol
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Giriş yapın
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export default SignupForm
