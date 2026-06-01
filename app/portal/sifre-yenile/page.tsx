"use client"

export default function SifreYenilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 space-y-4 text-center">
        <h1 className="text-xl font-bold">Sifre Yenileme</h1>

        <p className="text-sm text-gray-600">
          Bu sayfa gecici olarak hazirlaniyor.
        </p>

        <a
          href="/portal/giris"
          className="block w-full rounded-lg bg-black text-white py-3 text-sm font-bold"
        >
          Giris sayfasina don
        </a>
      </div>
    </div>
  )
}
