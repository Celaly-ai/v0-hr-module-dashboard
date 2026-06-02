"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function OturumTestPage() {
  const [sonuc, setSonuc] = useState<any>(null)

  useEffect(() => {
    async function testEt() {
      const supabase = createClient()

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      const user = session?.user || null

      let personel = null
      let personelError = null

      if (user) {
        const response = await supabase
          .from("personeller")
          .select("id, ad, soyad, email, tel, rol, durum, auth_id, kullanici_id")
          .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle()

        personel = response.data
        personelError = response.error
      }

      setSonuc({
        sessionError: sessionError?.message || null,
        userId: user?.id || null,
        userEmail: user?.email || null,
        personel,
        personelError: personelError?.message || null,
      })
    }

    testEt()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <h1 className="text-2xl font-black mb-4">Oturum Test Sayfası</h1>

      <pre className="bg-white border rounded-xl p-4 overflow-auto text-xs">
        {JSON.stringify(sonuc, null, 2)}
      </pre>
    </div>
  )
}
