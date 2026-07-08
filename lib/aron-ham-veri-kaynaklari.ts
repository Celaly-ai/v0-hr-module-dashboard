export type AronHamVeriKaynagi = {
  kod: string
  ad: string
  kaynak: string | null
  tarihGerekli: boolean
  maxGun: number | null
  scriptOneri: string | null
  dosyaOneri: string | null
}

export const ARON_HAM_VERI_KAYNAKLARI: AronHamVeriKaynagi[] = [
  {
    kod: "acik_fisler",
    ad: "Açık Fişler",
    kaynak: "m.AcikFisler",
    tarihGerekli: false,
    maxGun: null,
    scriptOneri: "scripts/aron-ekrandan-json.mjs",
    dosyaOneri: "~/Downloads/aron-acik-fisler-formatli.json",
  },
  {
    kod: "malzeme_bekleyen_fisler",
    ad: "Malzeme Bekleyen Fişler",
    kaynak: "m.MalzemeBekleyenFisler",
    tarihGerekli: false,
    maxGun: null,
    scriptOneri: "scripts/aron-explorer.mjs",
    dosyaOneri: null,
  },
  {
    kod: "bultenler",
    ad: "Bültenler",
    kaynak: "m.BultenData",
    tarihGerekli: false,
    maxGun: null,
    scriptOneri: "scripts/aron-bultenleri-cek.mjs",
    dosyaOneri: "~/Downloads/aron-bultenler-formatli.json",
  },
  {
    kod: "teknisyen_dashboard",
    ad: "Teknisyen Dashboard",
    kaynak: "m.DashboardTeknisyen",
    tarihGerekli: false,
    maxGun: null,
    scriptOneri: "scripts/aron-explorer.mjs",
    dosyaOneri: null,
  },
  {
    kod: "uyari_merkezi",
    ad: "Uyarı Merkezi",
    kaynak: "m.UyariMerkezi",
    tarihGerekli: false,
    maxGun: null,
    scriptOneri: "scripts/aron-explorer.mjs",
    dosyaOneri: null,
  },
  {
    kod: "basvuru_nedenleri",
    ad: "Başvuru Nedenleri",
    kaynak: "m.listBavuruNedeni",
    tarihGerekli: false,
    maxGun: null,
    scriptOneri: "scripts/aron-explorer.mjs",
    dosyaOneri: null,
  },
  {
    kod: "durum_listesi",
    ad: "Durum Listesi",
    kaynak: "m.listDurum",
    tarihGerekli: false,
    maxGun: null,
    scriptOneri: "scripts/aron-explorer.mjs",
    dosyaOneri: null,
  },
  {
    kod: "nps",
    ad: "NPS",
    kaynak: null,
    tarihGerekli: true,
    maxGun: 30,
    scriptOneri: null,
    dosyaOneri: null,
  },
  {
    kod: "sikayet",
    ad: "Şikayet",
    kaynak: null,
    tarihGerekli: true,
    maxGun: 30,
    scriptOneri: null,
    dosyaOneri: null,
  },
  {
    kod: "randevuya_uyum",
    ad: "Randevuya Uyum",
    kaynak: null,
    tarihGerekli: true,
    maxGun: 30,
    scriptOneri: null,
    dosyaOneri: null,
  },
  {
    kod: "tamamlayici_satis",
    ad: "Tamamlayıcı Satış",
    kaynak: null,
    tarihGerekli: true,
    maxGun: 30,
    scriptOneri: null,
    dosyaOneri: null,
  },
  {
    kod: "ek_garanti_satis",
    ad: "Ek Garanti Satışı",
    kaynak: null,
    tarihGerekli: true,
    maxGun: 30,
    scriptOneri: null,
    dosyaOneri: null,
  },
]

export function aronHamVeriKaynagiBul(kod: string) {
  return ARON_HAM_VERI_KAYNAKLARI.find((k) => k.kod === kod) ?? null
}

export function kayitSayisiHesapla(deger: unknown): number {
  if (Array.isArray(deger)) return deger.length
  if (deger !== null && typeof deger === "object") return 1
  if (deger === null || deger === undefined) return 0
  return 1
}

export function tarihAraligiGunSayisi(baslangic: string, bitis: string): number | null {
  if (!baslangic || !bitis) return null
  const bas = new Date(`${baslangic}T00:00:00`)
  const bit = new Date(`${bitis}T00:00:00`)
  if (Number.isNaN(bas.getTime()) || Number.isNaN(bit.getTime())) return null
  const fark = Math.floor((bit.getTime() - bas.getTime()) / 86400000) + 1
  return fark
}

export async function jsonChecksum(metin: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
