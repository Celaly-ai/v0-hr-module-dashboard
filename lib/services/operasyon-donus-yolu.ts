const IZINLI_YOLLAR = new Set([
  "/portal/operasyon-havuzu",
  "/portal/akilli-atama-merkezi",
])

export function guvenliDonusYolu(value: unknown, varsayilan: string) {
  const yol = String(value ?? "").trim()
  if (IZINLI_YOLLAR.has(yol)) return yol
  return varsayilan
}

export function donusQuerySuffix(base: string, durum: string) {
  const ayirici = base.includes("?") ? "&" : "?"
  return `${base}${ayirici}islem=${encodeURIComponent(durum)}`
}
