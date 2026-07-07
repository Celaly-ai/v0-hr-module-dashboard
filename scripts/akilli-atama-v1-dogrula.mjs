/**
 * Akıllı Atama Merkezi V1 — smoke doğrulama scripti
 * Kullanım: node scripts/akilli-atama-v1-dogrula.mjs
 */
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function bugunTr() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

const kontroller = []

function ok(ad, detay) {
  kontroller.push({ ad, durum: "OK", detay })
}

function uyari(ad, detay) {
  kontroller.push({ ad, durum: "UYARI", detay })
}

function hata(ad, detay) {
  kontroller.push({ ad, durum: "HATA", detay })
}

const { data: modul } = await supabase
  .from("moduller")
  .select("kod, aktif")
  .in("kod", ["akilli_atama_merkezi", "hizmet_sure_katalogu", "gorevlerim"])

const modulMap = new Map((modul ?? []).map((m) => [m.kod, m]))

if (modulMap.get("akilli_atama_merkezi")?.aktif) {
  ok("Modül: akilli_atama_merkezi", "Aktif")
} else {
  uyari("Modül: akilli_atama_merkezi", "Kayıt yok veya pasif — scripts/022 çalıştırın")
}

if (modulMap.get("hizmet_sure_katalogu")?.aktif) {
  ok("Modül: hizmet_sure_katalogu", "Aktif")
} else {
  uyari("Modül: hizmet_sure_katalogu", "Kayıt yok — scripts/023 çalıştırın")
}

const { count: katalogSayisi, error: katalogError } = await supabase
  .from("hizmet_sure_katalogu")
  .select("id", { count: "exact", head: true })

if (katalogError) {
  hata("Tablo: hizmet_sure_katalogu", katalogError.message)
} else if ((katalogSayisi ?? 0) > 0) {
  ok("Hizmet süre kataloğu", `${katalogSayisi} kayıt`)
} else {
  uyari("Hizmet süre kataloğu", "Boş — scripts/023 seed çalıştırın")
}

const { count: atamaBekleyen } = await supabase
  .from("aktif_operasyon_havuzu_v2")
  .select("id", { count: "exact", head: true })
  .eq("atama_gerekli", true)
  .is("kesin_atanan_ekip_id", null)

ok("Atama bekleyen iş", String(atamaBekleyen ?? 0))

const tarih = bugunTr()
const { count: bugunZimmet } = await supabase
  .from("operasyon_zimmetleri")
  .select("id", { count: "exact", head: true })
  .eq("gorev_tarihi", tarih)

ok("Bugünkü zimmet (TR tarih)", `${bugunZimmet ?? 0} · ${tarih}`)

const utcBugun = new Date().toISOString().slice(0, 10)
if (utcBugun !== tarih) {
  uyari(
    "Tarih köprüsü",
    `UTC ${utcBugun} ≠ TR ${tarih} — Görevlerim API artık TR kullanıyor`,
  )
} else {
  ok("Tarih köprüsü", "UTC ve TR tarih aynı")
}

const { data: ornekZimmet } = await supabase
  .from("operasyon_zimmetleri")
  .select("id, fis_no, planlanan_is_tipi, gorev_tarihi, durum")
  .eq("gorev_tarihi", tarih)
  .limit(3)

for (const z of ornekZimmet ?? []) {
  if (!z.planlanan_is_tipi) {
    uyari(`Zimmet ${z.fis_no ?? z.id}`, "planlanan_is_tipi boş — yeni atamalarda doldurulmalı")
  } else {
    ok(`Zimmet ${z.fis_no ?? z.id}`, `planlanan=${z.planlanan_is_tipi}`)
  }
}

console.log("\n=== Akıllı Atama Merkezi V1 Doğrulama ===\n")
for (const k of kontroller) {
  console.log(`[${k.durum}] ${k.ad}: ${k.detay}`)
}
console.log("")

const hataSayisi = kontroller.filter((k) => k.durum === "HATA").length
process.exit(hataSayisi > 0 ? 1 : 0)
