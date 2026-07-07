/**
 * Atama onayı → operasyon_zimmetleri → Görevlerim köprüsü yardımcıları.
 */
export function planlananIsTipiKodu(isTipi: string | null | undefined) {
  const t = String(isTipi ?? "").toUpperCase()
  const nakliye = t.includes("NAKLIYE") || t.includes("NAKLİYE")
  const montaj = t.includes("MONTAJ")
  if (nakliye && montaj) return "NM"
  if (nakliye) return "N"
  if (montaj) return "M"
  return isTipi?.trim() || null
}

export function zimmetNotlariBirlestir(
  basvuruNotu: string | null | undefined,
  katBilgisi: string | null | undefined,
) {
  const parcalar: string[] = []
  const not = String(basvuruNotu ?? "").trim()
  const kat = String(katBilgisi ?? "").trim()

  if (not) parcalar.push(not)
  if (kat) parcalar.push(`Kat bilgisi: ${kat}`)

  return parcalar.length > 0 ? parcalar.join("\n") : null
}

export type AtamaGorevKopruOzet = {
  gorevTarihi: string
  planlananIsTipi: string | null
  zimmetId: string
  operasyonId: string
  fisNo: string | null
  ekipId: string
}

export function atamaGorevKopruOzet(
  input: AtamaGorevKopruOzet,
): AtamaGorevKopruOzet {
  return input
}
