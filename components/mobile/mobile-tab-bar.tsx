"use client"

import { usePathname, useRouter } from "next/navigation"

const TABS = [
  { label: "Ana", icon: "🏠", path: "/portal/personel-paneli" },
  { label: "Mesai", icon: "📍", path: "/portal/giris-cikis" },
  { label: "İzin", icon: "🏖️", path: "/portal/izin" },
  { label: "Talepler", icon: "📋", path: "/portal/talepler" },
  { label: "Portal", icon: "👤", path: "/portal" },
]

export function MobileTabBar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] border-t-4 border-blue-700 bg-white px-2 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-8px_28px_rgba(15,23,42,0.18)] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.path || pathname.startsWith(`${tab.path}/`)

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => router.push(tab.path)}
              className={`rounded-2xl px-2 py-2 text-center text-xs font-black active:scale-95 ${
                active ? "bg-blue-600 text-white" : "text-slate-600"
              }`}
            >
              <div className="text-lg leading-none">{tab.icon}</div>
              <div className="mt-1 truncate">{tab.label}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
