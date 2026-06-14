import { SignupForm } from "@/components/auth/signup-form"
import { Building2 } from "lucide-react"

export const metadata = {
  title: "Kayıt Ol | FeyRoute IK Paneli",
}

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              FeyRoute IK Paneli
            </h1>
            <p className="text-xs text-muted-foreground">
              Yeni hesap olusturun
            </p>
          </div>
        </div>
        <SignupForm />
      </div>
    </main>
  )
}
