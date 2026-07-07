import { execFile } from "child_process"
import { promisify } from "util"
import { createClient } from "@supabase/supabase-js"

const execFileAsync = promisify(execFile)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function runScript(script, args = []) {
  console.log(`Çalışıyor: ${script}`)
  const { stdout, stderr } = await execFileAsync(process.execPath, [script, ...args], {
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  })

  if (stdout) console.log(stdout)
  if (stderr) console.error(stderr)
}

const { data: log, error: logError } = await supabase
  .from("operasyon_cron_loglari")
  .insert({
    cron_adi: "aron_07_planlama",
    durum: "basladi",
  })
  .select("id")
  .single()

if (logError) {
  console.error("Cron log başlatılamadı:", logError.message)
  process.exit(1)
}

try {
  const jsonPath = process.argv[2] || `${process.env.HOME}/Downloads/aron-acik-fisler-formatli.json`

  await runScript("scripts/aron-import.mjs", [jsonPath])
  await runScript("scripts/aron-operasyon-havuzu.mjs")
  await runScript("scripts/ai-ekip-oneri-v1.mjs")
  await runScript("scripts/aron-07-planlama.mjs")

  const { data: ozet, error: ozetError } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select("id, atama_gerekli, hizmet_alani_ici, koordinat_durumu, kritik_cagri, ai_onerilen_ekip")

  if (ozetError) throw ozetError

  const toplam = ozet?.length || 0
  const atamaBekleyen = (ozet || []).filter(x => x.atama_gerekli).length
  const hizmetIci = (ozet || []).filter(x => x.hizmet_alani_ici).length
  const koordinatBekleyen = (ozet || []).filter(x => x.koordinat_durumu === "bekliyor").length
  const kritik = (ozet || []).filter(x => x.kritik_cagri).length
  const aiOnerilen = (ozet || []).filter(x => x.ai_onerilen_ekip).length

  await supabase
    .from("operasyon_cron_loglari")
    .update({
      durum: "tamamlandi",
      toplam_ham_kayit: toplam,
      operasyon_kapsami: toplam,
      atama_bekleyen: atamaBekleyen,
      hizmet_alani_ici: hizmetIci,
      koordinat_bekleyen: koordinatBekleyen,
      kritik_cagri: kritik,
      ai_oneri_sayisi: aiOnerilen,
      bitis_zamani: new Date().toISOString(),
    })
    .eq("id", log.id)

  console.log("07:00 ARON planlama zinciri tamamlandı.")
  console.log({ toplam, atamaBekleyen, hizmetIci, koordinatBekleyen, kritik, aiOnerilen })
} catch (error) {
  await supabase
    .from("operasyon_cron_loglari")
    .update({
      durum: "hata",
      hata_mesaji: error?.message || String(error),
      bitis_zamani: new Date().toISOString(),
    })
    .eq("id", log.id)

  console.error("Cron hata:", error)
  process.exit(1)
}
