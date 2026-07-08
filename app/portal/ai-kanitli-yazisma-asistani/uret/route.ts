import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"

const MAX_ALAN_UZUNLUGU = 12000

const AMAC_KATEGORILERI = [
  { ad: "Teknik değişim talebi", regex: /degisim\s*uygun|urun\s*degis|degisim\s*talep|degistir|degisim\s*istiyor/ },
  { ad: "Teknik destek isteme", regex: /teknik\s*destek|ne\s*yapmam\s*lazim|cozum\s*oner|ariza\s*devam/ },
  { ad: "Şikayet yönetimi", regex: /sikayet|musteri\s*rahatsiz|surekli\s*sikayet|musteri\s*sinirli/ },
  { ad: "Savunma yazısı", regex: /savunma|itiraz|haksiz\s*sikayet|magdur\s*degil/ },
  { ad: "Bilgilendirme", regex: /bilgilendir|bilgi\s*ver|durumu\s*aktar|haberdar/ },
  { ad: "Bölgeden yönlendirme isteme", regex: /bilmiyorum|ne\s*yapac|yonlendir|karar\s*ver|operasyon\s*destek|surekli\s*ara.*bilmiyorum/ },
  { ad: "Operasyon desteği", regex: /operasyon|saha\s*destek|ekip\s*destek|mudahale\s*plan/ },
  { ad: "Hukuki destek", regex: /hukuk|avukat|mahkeme|dava\s*ac|tuketici\s*hakem|hakem\s*heyeti|hakeme\s*gid/ },
  { ad: "Ürün değişimi", regex: /urun\s*degis|degisim\s*talep|yenisiyle\s*degis/ },
  { ad: "Parça talebi", regex: /parca\s*talep|yedek\s*parca|parca\s*istiyorum/ },
  { ad: "Garanti değerlendirmesi", regex: /garanti|garanti\s*kapsam|garanti\s*disi/ },
  { ad: "Müşteri ikna desteği", regex: /ikna|musteri\s*ikna|kabul\s*ettirm|razi\s*et/ },
  { ad: "İdari talep", regex: /idari|belediye|ruhsat|resmi\s*evrak/ },
  { ad: "Malzeme talebi", regex: /malzeme\s*talep|malzeme\s*istiyorum|stok/ },
  { ad: "Araç talebi", regex: /arac\s*talep|branda|arac\s*istiyorum/ },
  { ad: "Yönetici bilgilendirmesi", regex: /yonetici|mudur\s*bilgilendir|ust\s*yonetim/ },
  { ad: "Resmi cevap", regex: /resmi\s*cevap|resmi\s*yazi|yazili\s*cevap/ },
  { ad: "Mail cevabı", regex: /mail\s*cevap|eposta|e\s*posta/ },
  { ad: "İç yazışma", regex: /ic\s*yazisma|ekip\s*ici|departman\s*ici/ },
] as const

type KanitVeriTuru =
  | "voltaj"
  | "akim"
  | "btu"
  | "dondurucu_sicaklik"
  | "sogutucu_sicaklik"
  | "evaporator_sicaklik"
  | "atis_havasi"
  | "dis_ortam"
  | "ic_ortam"
  | "kompresor_sicaklik"
  | "basinc"
  | "kullanim_alani"
  | "cihaz_yasi"
  | "ek_kanit"
  | "islem"
  | "hata_kodu"
  | "seri_no"

type KanitOgesi = {
  tur: KanitVeriTuru
  etiket: string
  deger?: number
  birim?: string
  ham: string
}

type KararOzeti = {
  talebin_amaci: string[]
  kanit_guveni: number
  teknik_tutarlilik: string
  eksik_belge: string
  celiski: string | null
  ai_karari: string
  talep_yorumu: string
}

type AnalizSonucu = {
  kanitOgeleri: KanitOgesi[]
  kanitAnalizi: string[]
  urunGrubu: string | null
  baglamRiskleri: string[]
  mantikHatalari: string[]
  mantikUyarilari: string[]
  eksikBilgiler: string[]
  kanitZayif: boolean
  talepAmaclari: string[]
  birincilAmac: string
  celiskiMetni: string | null
  kararOzeti: KararOzeti
  yazimEngellendi: boolean
}

type AiYazismaCevap = {
  hazir_yazi: string
  fallback_kullanildi?: boolean
}

type YazismaGirdisi = {
  kanit: string
  kime: string
  amac: string
}

function temizMetin(value: unknown, max = MAX_ALAN_UZUNLUGU) {
  const metin = String(value ?? "").trim()
  if (!metin) return ""
  return metin.length > max ? metin.slice(0, max) : metin
}

function metinListesi(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => temizMetin(item, 200))
    .filter(Boolean)
}

function normalizeTr(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
}

function sayiyiFormatla(value: string) {
  return value.replace(",", ".")
}

function sayiOku(value: string) {
  const temiz = sayiyiFormatla(value)
  const sayi = Number.parseFloat(temiz)
  return Number.isFinite(sayi) ? sayi : undefined
}

function kelimeBasHarfBuyut(kelime: string) {
  if (!kelime) return kelime
  const kucuk = kelime.toLocaleLowerCase("tr-TR")
  return kucuk.charAt(0).toLocaleUpperCase("tr-TR") + kucuk.slice(1)
}

function hitapDuzelt(kime: string) {
  const ham = kime.trim()
  if (!ham) return "İlgili yetkili"

  const beyEslesme = ham.match(/^(.+?)\s*be[tty]?\.?$/i)
  if (beyEslesme) {
    const isim = beyEslesme[1]
      .split(/\s+/)
      .map((parca) => kelimeBasHarfBuyut(parca))
      .join(" ")
    return `${isim} Bey`
  }

  const hanimEslesme = ham.match(/^(.+?)\s*han[iı]m\.?$/i)
  if (hanimEslesme) {
    const isim = hanimEslesme[1]
      .split(/\s+/)
      .map((parca) => kelimeBasHarfBuyut(parca))
      .join(" ")
    return `${isim} Hanım`
  }

  return ham
    .split(/\s+/)
    .map((parca) => kelimeBasHarfBuyut(parca))
    .join(" ")
}

function jsonCevabiniOku(text: string): unknown {
  const temiz = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()

  try {
    return JSON.parse(temiz)
  } catch {
    const baslangic = temiz.indexOf("{")
    const bitis = temiz.lastIndexOf("}")
    if (baslangic >= 0 && bitis > baslangic) {
      return JSON.parse(temiz.slice(baslangic, bitis + 1))
    }
    throw new Error("JSON parse hatasi")
  }
}

function cevabiDogrula(value: unknown): AiYazismaCevap {
  const kayit =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  const hazirYazi = temizMetin(kayit.hazir_yazi, 8000)
  if (!hazirYazi) {
    throw new Error("AI hazir_yazi uretmedi")
  }

  return {
    hazir_yazi: hazirYazi,
  }
}

function kanitVeAmacBirlesik(kanit: string, amac: string) {
  return normalizeTr(`${kanit}\n${amac}`)
}

function ogeEkle(liste: KanitOgesi[], yeni: KanitOgesi) {
  const anahtar = `${yeni.tur}:${yeni.etiket}:${yeni.deger ?? yeni.ham}`
  if (liste.some((o) => `${o.tur}:${o.etiket}:${o.deger ?? o.ham}` === anahtar)) return
  liste.push(yeni)
}

function kanitSatirlariniAyikla(kanit: string) {
  return kanit
    .split(/\n|;/)
    .map((satir) => satir.trim())
    .filter(Boolean)
}

function satirdanSayiCek(satir: string) {
  const eslesme = satir.match(/([+\-]?\d+(?:[.,]\d+)?)/)
  return eslesme ? sayiOku(eslesme[1]) : undefined
}

function satirdanKanitOgesi(satir: string): KanitOgesi | null {
  const ham = satir.trim()
  const n = normalizeTr(ham)

  if (/foto|fotograf|fotolar/.test(n)) {
    const eklendi = /fis|fiste|ekl|eklen/.test(n)
    return {
      tur: "ek_kanit",
      etiket: eklendi ? "Fotoğraflar fişe eklendi" : "Fotoğraf",
      ham,
    }
  }

  if (/video/.test(n)) {
    const eklendi = /fis|fiste|ekl|eklen/.test(n)
    return {
      tur: "ek_kanit",
      etiket: eklendi ? "Video fişe eklendi" : "Video",
      ham,
    }
  }

  if (/testo/.test(n)) {
    const eklendi = /fis|fiste|ekl|eklen/.test(n)
    return {
      tur: "ek_kanit",
      etiket: eklendi ? "Testo kaydı fişe eklendi" : "Testo kaydı",
      ham,
    }
  }

  const yasEslesme = n.match(/(\d+)\s*aylik|cihaz\s*(\d+)\s*aylik/)
  if (yasEslesme) {
    const deger = sayiOku(yasEslesme[1] || yasEslesme[2] || "")
    if (deger !== undefined) {
      return {
        tur: "cihaz_yasi",
        etiket: "Cihaz yaşı",
        deger,
        birim: "ay",
        ham,
      }
    }
  }

  const alanEslesme = n.match(
    /(\d+(?:[.,]\d+)?)\s*m2|(\d+(?:[.,]\d+)?)\s*metre\s*kare|alan\s*(\d+(?:[.,]\d+)?)|oda\s*(\d+(?:[.,]\d+)?)\s*m2/,
  )
  if (alanEslesme || /m²|m2/.test(ham)) {
    const alanHamEslesme = ham.match(
      /(\d+(?:[.,]\d+)?)\s*m[²2]|(\d+(?:[.,]\d+)?)\s*metre\s*kare|alan\s*(\d+(?:[.,]\d+)?)|oda\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i,
    )
    const deger = sayiOku(
      alanEslesme?.[1] ||
        alanEslesme?.[2] ||
        alanEslesme?.[3] ||
        alanEslesme?.[4] ||
        alanHamEslesme?.[1] ||
        alanHamEslesme?.[2] ||
        alanHamEslesme?.[3] ||
        alanHamEslesme?.[4] ||
        "",
    )
    if (deger !== undefined) {
      return {
        tur: "kullanim_alani",
        etiket: "Kullanım alanı",
        deger,
        birim: "m²",
        ham,
      }
    }
  }

  const btuEslesme = ham.match(/(\d+(?:[.,]\d+)?)\s*btu(?:\s*\/?\s*h)?(?:\s*klima)?/i)
  if (btuEslesme) {
    const deger = sayiOku(btuEslesme[1])
    if (deger !== undefined) {
      return {
        tur: "btu",
        etiket: "Cihaz kapasitesi",
        deger,
        birim: "BTU/h",
        ham,
      }
    }
  }

  if (
    /dis\s*ortam|dis\s*sicaklik|disari|dis\s+\d|dış\s*ortam|dış\s*sıcaklık|dışarı/.test(n) &&
    !/ic\s*ortam|iceri|iç/.test(n)
  ) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "dis_ortam",
        etiket: "Dış ortam sıcaklığı",
        deger,
        birim: "°C",
        ham,
      }
    }
  }

  if (/ic\s*ortam|ic\s*sicaklik|iceri|iç\s*ortam|iç\s*sıcaklık|içeri/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "ic_ortam",
        etiket: "İç ortam sıcaklığı",
        deger,
        birim: "°C",
        ham,
      }
    }
  }

  if (
    /atis\s*sicakligi|atis\s*havasi|klima\s*cikisi|klima\s*cikis|ufleme|ufleme|cikis\s*sicakligi/.test(
      n,
    )
  ) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "atis_havasi",
        etiket: "Klima çıkış/atış havası sıcaklığı",
        deger,
        birim: "°C",
        ham,
      }
    }
  }

  if (/dondurucu/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "dondurucu_sicaklik",
        etiket: "Dondurucu sıcaklığı",
        deger,
        birim: "°C",
        ham,
      }
    }
  }

  if (/sogutucu/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "sogutucu_sicaklik",
        etiket: "Soğutucu sıcaklığı",
        deger,
        birim: "°C",
        ham,
      }
    }
  }

  if (/evaporator/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "evaporator_sicaklik",
        etiket: "Evaporatör sıcaklığı",
        deger,
        birim: "°C",
        ham,
      }
    }
  }

  if (/kompresor/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "kompresor_sicaklik",
        etiket: "Kompresör sıcaklığı",
        deger,
        birim: "°C",
        ham,
      }
    }
  }

  if (/voltaj|volt\b|sebeke\s*volt/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "voltaj",
        etiket: "Şebeke voltajı",
        deger,
        birim: "V",
        ham,
      }
    }
  }

  if (/amper|akim\b|\ba\b/.test(n) && /\d/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "akim",
        etiket: "Akım",
        deger,
        birim: "A",
        ham,
      }
    }
  }

  const hataEslesme = ham.match(
    /(?:hata|error|ar[iı]za)\s*(?:kodu)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{1,12})/i,
  )
  if (hataEslesme) {
    return {
      tur: "hata_kodu",
      etiket: `Hata kodu: ${hataEslesme[1]}`,
      ham,
    }
  }

  const seriEslesme = ham.match(/seri\s*(?:no|numara)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,20})/i)
  if (seriEslesme) {
    return {
      tur: "seri_no",
      etiket: `Seri no: ${seriEslesme[1]}`,
      ham,
    }
  }

  if (/basinc/.test(n)) {
    const deger = satirdanSayiCek(ham)
    if (deger !== undefined) {
      return {
        tur: "basinc",
        etiket: "Basınç",
        deger,
        birim: "bar",
        ham,
      }
    }
  }

  if (/kart\s*de[gğ]i[sş]/.test(n)) {
    return { tur: "islem", etiket: "Kart değişimi", ham }
  }

  return null
}

function kanitOgeleriniCek(kanit: string): KanitOgesi[] {
  const ogeler: KanitOgesi[] = []
  const satirlar = kanitSatirlariniAyikla(kanit)

  for (const satir of satirlar) {
    const oge = satirdanKanitOgesi(satir)
    if (oge) ogeEkle(ogeler, oge)
  }

  if (ogeler.length === 0 && kanit.trim()) {
    const oge = satirdanKanitOgesi(kanit.trim())
    if (oge) ogeEkle(ogeler, oge)
  }

  return ogeler
}

function kanitAnaliziMetinleri(ogeler: KanitOgesi[]): string[] {
  return ogeler.map((oge) => {
    if (oge.deger !== undefined && oge.birim) {
      return `${oge.etiket}: ${oge.deger} ${oge.birim}`
    }
    return oge.etiket
  })
}

function urunGrubunuTani(kanit: string, amac: string): string | null {
  const birlesik = kanitVeAmacBirlesik(kanit, amac)
  const urunler: Array<{ ad: string; regex: RegExp }> = [
    { ad: "Klima", regex: /klima|split|multi|vrf|at\s?is\s?havasi|ic\s?unite|dis\s?unite/ },
    { ad: "Buzdolabı", regex: /buzdol|dondurucu|sogutucu|no\s*frost|derin\s*dondurucu/ },
    { ad: "Çamaşır Makinesi", regex: /camasir|yikama\s*makinesi|devir/ },
    { ad: "Bulaşık Makinesi", regex: /bulasik|bulasik\s*makinesi/ },
    { ad: "Fırın", regex: /firin|ankastre\s*firin|ocak/ },
    { ad: "Kurutma Makinesi", regex: /kurutma\s*makinesi/ },
    { ad: "TV", regex: /\btv\b|televizyon|panel|smart\s*tv/ },
    { ad: "Kombi", regex: /kombi|petek|isitma\s*sistemi/ },
    { ad: "Küçük Ev Aleti", regex: /blender|mikser|ut[uü]|supurge|robot\s*supurge/ },
  ]
  for (const urun of urunler) {
    if (urun.regex.test(birlesik)) return urun.ad
  }
  return null
}

function mantikKontrolu(ogeler: KanitOgesi[], urunGrubu: string | null) {
  const hatalar: string[] = []
  const uyarilar: string[] = []

  for (const oge of ogeler) {
    if (oge.deger === undefined) continue

    if (oge.tur === "voltaj") {
      if (oge.deger <= 10 || oge.deger > 400) {
        hatalar.push(`${oge.deger} Volt değerinin gerçekçi olmadığını düşünüyorum.`)
      } else if (oge.deger < 80 || oge.deger > 280) {
        uyarilar.push(`${oge.deger} Volt değeri olağan dışı görünüyor; kontrol ediniz.`)
      }
    }

    if (oge.tur === "akim") {
      const evTipiLimit = urunGrubu === "Klima" ? 40 : 30
      if (oge.deger >= 100) {
        hatalar.push(`${oge.deger} Amper değerinin gerçekçi olmadığını düşünüyorum.`)
      } else if (oge.deger > evTipiLimit) {
        hatalar.push(`${oge.deger} Amper ev tipi cihaz için olağan dışı görünüyor.`)
      }
    }

    if (oge.tur === "dondurucu_sicaklik") {
      if (oge.deger > 10) {
        hatalar.push(`${oge.deger} °C dondurucu sıcaklığının olağan olmadığını düşünüyorum.`)
      } else if (oge.deger < -35) {
        uyarilar.push(`${oge.deger} °C dondurucu sıcaklığı şüpheli görünüyor; kontrol ediniz.`)
      }
    }

    if (oge.tur === "sogutucu_sicaklik" || oge.tur === "evaporator_sicaklik") {
      if (oge.deger >= 30) {
        hatalar.push(`${oge.deger} °C ${oge.etiket.toLowerCase()} değerinin gerçekçi olmadığını düşünüyorum.`)
      } else if (oge.deger > 15) {
        hatalar.push(`${oge.deger} °C soğutucu/evaporatör sıcaklığı olağan değildir.`)
      }
    }

    if (oge.tur === "atis_havasi" && (oge.deger > 30 || oge.deger < 0)) {
      uyarilar.push(`${oge.deger} °C atış havası değeri şüpheli görünüyor.`)
    }

    if (oge.tur === "kompresor_sicaklik" && (oge.deger > 130 || oge.deger < -20)) {
      hatalar.push(`${oge.deger} °C kompresör sıcaklığının olağan olmadığını düşünüyorum.`)
    }
  }

  return {
    hatalar: [...new Set(hatalar)],
    uyarilar: [...new Set(uyarilar)],
  }
}

function talepYorumunuOlustur(amac: string): string {
  const n = normalizeTr(amac)
  if (!amac.trim()) return "Talep alanı boş veya eksik bırakılmış."

  if (/hakeme\s*gid|hakem\s*heyeti|tuketici\s*hakem/.test(n)) {
    return "Müşterinin Tüketici Hakem Heyetine başvuracağını ifade ettiği anlaşılmaktadır."
  }
  if (/bilmiyorum|ne\s*yapac/.test(n)) {
    return "Saha personelinin müşteri şikayeti karşısında nasıl ilerleyeceğini bilmediği ve yönlendirme beklediği anlaşılmaktadır."
  }
  if (/surekli\s*sikayet/.test(n)) {
    return "Müşterinin sürekli şikayet ettiği ve operasyonel baskı oluşturduğu anlaşılmaktadır."
  }
  if (/sogutma\s*yeterli|normal\s*calis/.test(n)) {
    return "Teknik bulguların yeterli/normal olduğu, ancak müşteri beklentisinin farklı olduğu anlaşılmaktadır."
  }

  return `Talep özeti: ${amac.replace(/\s+/g, " ").trim()}`
}

function talepAmaclariniTespitEt(kanit: string, amac: string): string[] {
  const kanitNorm = normalizeTr(kanit)
  const amacNorm = normalizeTr(amac)
  const birlesik = `${kanitNorm} ${amacNorm}`
  const amaclar: string[] = []

  const urunNormal =
    /normal\s*calis|calisiyor|yeterli|uygun|problem\s*yok|teknik\s*olarak\s*normal|sorun\s*yok/.test(
      kanitNorm,
    )
  const musteriSikayet = /surekli\s*sikayet|rahatsiz|sikayet|aramaya\s*devam/.test(amacNorm)
  const kararsiz = /bilmiyorum|ne\s*yapac|yonlendir|karar\s*ver/.test(amacNorm)
  const acikDegisimTalep = /degisim\s*talep|degistir|degisim\s*uygun|urun\s*degis|degisim\s*istiyor/.test(
    amacNorm,
  )

  if (urunNormal && musteriSikayet && kararsiz && !acikDegisimTalep) {
    return ["Bölgeden yönlendirme isteme", "Operasyon desteği", "Şikayet yönetimi"]
  }

  for (const kategori of AMAC_KATEGORILERI) {
    if (kategori.regex.test(birlesik)) {
      amaclar.push(kategori.ad)
    }
  }

  if (amaclar.length === 0 && amac.trim()) {
    amaclar.push("Diğer")
  }

  if (
    acikDegisimTalep &&
    !amaclar.includes("Teknik değişim talebi") &&
    !amaclar.includes("Ürün değişimi")
  ) {
    amaclar.push("Teknik değişim talebi")
  }

  return [...new Set(amaclar)]
}

function birincilAmaciSec(talepAmaclari: string[]): string {
  const oncelik = [
    "Bölgeden yönlendirme isteme",
    "Operasyon desteği",
    "Şikayet yönetimi",
    "Savunma yazısı",
    "Hukuki destek",
    "Teknik değişim talebi",
    "Ürün değişimi",
    "Garanti değerlendirmesi",
    "Parça talebi",
    "Teknik destek isteme",
    "Müşteri ikna desteği",
    "Resmi cevap",
    "Mail cevabı",
    "Yönetici bilgilendirmesi",
    "İdari talep",
    "Malzeme talebi",
    "Araç talebi",
    "Bilgilendirme",
    "İç yazışma",
    "Diğer",
  ]

  for (const ad of oncelik) {
    if (talepAmaclari.includes(ad)) return ad
  }

  return talepAmaclari[0] ?? "Diğer"
}

function celiskiMetniOlustur(kanit: string, amac: string, talepAmaclari: string[]): string | null {
  const kanitNorm = normalizeTr(kanit)
  const amacNorm = normalizeTr(amac)

  const urunNormal =
    /normal\s*calis|calisiyor|yeterli|uygun|problem\s*yok|teknik\s*olarak\s*normal/.test(kanitNorm)
  const musteriDegisim = /musteri.*degisim|degisim\s*istiyor|degisim\s*talep/.test(
    `${kanitNorm} ${amacNorm}`,
  )
  const acikDegisimTalep = /degisim|degistir|uygun\s*mu/.test(amacNorm)

  if (urunNormal && musteriDegisim && acikDegisimTalep) {
    return "Ürün teknik olarak normal görünüyor ancak müşteri değişim istiyor."
  }

  if (
    urunNormal &&
    /surekli\s*sikayet|bilmiyorum/.test(amacNorm) &&
    !acikDegisimTalep
  ) {
    return "Kanıtta ürün normal görünürken talep operasyon yönlendirmesi odaklıdır; otomatik değişim talebi uygun değildir."
  }

  if (/sogutma\s*yeterli|yeterli\s*so[gğ]utma/.test(amacNorm) && /degisim|degistir/.test(amacNorm)) {
    return "Soğutma yeterli değerlendirilirken müşteri değişim baskısı sürdürmektedir."
  }

  if (talepAmaclari.includes("Bölgeden yönlendirme isteme") && talepAmaclari.includes("Teknik değişim talebi")) {
    return "Talep hem yönlendirme hem değişim içeriyor; öncelik operasyon yönlendirmesinde olmalıdır."
  }

  return null
}

function aiKarariniOlustur(
  birincilAmac: string,
  celiski: string | null,
  talepAmaclari: string[],
  urunGrubu: string | null,
): string {
  if (birincilAmac === "Bölgeden yönlendirme isteme") {
    return "Teknik değişim istemek yerine operasyon yönlendirmesi istenmesi daha uygundur."
  }
  if (birincilAmac === "Operasyon desteği" && !talepAmaclari.includes("Teknik değişim talebi")) {
    return "Doğrudan değişim talebi oluşturulmadan operasyon desteği ve yönlendirme istenmelidir."
  }
  if (birincilAmac === "Şikayet yönetimi" && celiski) {
    return "Şikayet yönetimi odağında yazılmalı; kanıt-talep çelişkisi metinde nazikçe belirtilmelidir."
  }
  if (birincilAmac === "Savunma yazısı") {
    return "Savunma ve kanıt dayanaklı açıklama yapılmalıdır."
  }
  if (birincilAmac === "Teknik değişim talebi" || birincilAmac === "Ürün değişimi") {
    return celiski
      ? "Değişim uygunluğu talep edilmeli; kanıt-talep farkı açıkça yazılmalıdır."
      : "Teknik bulgular ve ölçümlerle desteklenmiş değişim uygunluğu değerlendirmesi istenmelidir."
  }
  if (birincilAmac === "Hukuki destek") {
    return "Hukuki risk ve müşteri beyanları dikkate alınarak bilgilendirme yapılmalıdır."
  }
  if (urunGrubu) {
    return `${urunGrubu} bağlamına uygun, kanıta dayalı profesyonel yazı oluşturulmalıdır.`
  }
  return "Talebin gerçek amacına uygun, kanıta dayalı profesyonel yazı oluşturulmalıdır."
}

function baglamRiskleriniCek(amac: string, kanit: string): string[] {
  const birlesik = kanitVeAmacBirlesik(kanit, amac)
  const riskler: string[] = []

  const adaylar: Array<{ regex: RegExp; cumle: string }> = [
    { regex: /surekli\s*sikayet|aramaya\s*devam|degisene\s*kadar\s*ara/, cumle: "Müşterinin sürekli şikayet edeceğini ve aramaya devam edeceğini belirttiğini tespit ettim." },
    { regex: /tuketici\s*hakem|hakem\s*heyeti|hakeme\s*gid/, cumle: "Müşterinin Tüketici Hakem Heyetine başvuracağını ifade ettiğini kaydettim." },
    { regex: /mahkeme|dava\s*ac|hukuk|avukat/, cumle: "Müşterinin mahkemeye başvuracağını belirttiğini tespit ettim." },
    { regex: /sosyal\s*medya|facebook|instagram|sikayetvar|paylasacak/, cumle: "Müşterinin sosyal medyada paylaşım yapacağını ifade ettiğini kaydettim." },
    { regex: /kullanamiyor|kullanilmiyor/, cumle: "Müşterinin ürünü kullanamadığını belirttiğini tespit ettim." },
    { regex: /yasli|hasta|bebek|engelli/, cumle: "Evde yaşlı, hasta veya bebek bulunduğunu; durumun aciliyet taşıdığını değerlendirdim." },
    { regex: /isletme\s*dur|ticari\s*kullanim|dukkan|restoran|market/, cumle: "Ürünün ticari kullanımda olduğunu ve işletmenin olumsuz etkilendiğini tespit ettim." },
    { regex: /gida\s*bozul|bozuluyor|urun\s*bozul/, cumle: "Gıda bozulması riski bulunduğunu değerlendirdim." },
  ]

  for (const aday of adaylar) {
    if (aday.regex.test(birlesik)) riskler.push(aday.cumle)
  }

  return riskler.slice(0, 6)
}

function eksikKanitAnalizi(kanit: string, amac: string, urunGrubu: string | null, birincilAmac: string) {
  const kanitNorm = normalizeTr(kanit)
  const amacNorm = normalizeTr(amac)
  const birlesik = `${kanitNorm} ${amacNorm}`
  const oneriler: string[] = []

  const teknikTalep =
    urunGrubu !== null ||
    birincilAmac.includes("Teknik") ||
    birincilAmac.includes("değişim") ||
    /voltaj|akim|olcum|testo|fis|ariza/.test(birlesik)

  if (teknikTalep) {
    if (!/video/.test(kanitNorm)) oneriler.push("çalışma videosu")
    if (!/foto|fotograf/.test(kanitNorm)) oneriler.push("ölçüm fotoğrafı")
    if (/degisim|degistir/.test(birlesik) && !/ariza|bozuk|hasar/.test(kanitNorm)) {
      oneriler.push("cihaz üzerindeki arıza görüntüsü")
    }
  }

  if (birincilAmac === "Savunma yazısı") {
    if (!/tutanak|imza/.test(kanitNorm)) oneriler.push("tutanak veya imza kaydı")
  }

  if (birincilAmac === "Araç talebi") {
    if (!/foto/.test(kanitNorm)) oneriler.push("araç fotoğrafları")
  }

  if (birincilAmac === "Resmi cevap" || birincilAmac === "İdari talep") {
    if (!/resmi|belge|yazi/.test(kanitNorm)) oneriler.push("resmi cevap yazısı")
  }

  const olcumVar = /\d/.test(kanitNorm) && /voltaj|akim|sicaklik|testo|olcum/.test(kanitNorm)
  const ekVar = /foto|video|testo|eklen|fise/.test(kanitNorm)

  if (olcumVar && ekVar && oneriler.length > 1) return oneriler.slice(0, 1)

  return oneriler.slice(0, 3)
}

function kanitGuvenSkoruHesapla(
  kanit: string,
  ogeler: KanitOgesi[],
  eksikBilgiler: string[],
  mantikHatalari: string[],
  mantikUyarilari: string[],
): number {
  let skor = 45
  if (kanit.trim().length > 50) skor += 10
  if (ogeler.length > 0) skor += Math.min(ogeler.length * 6, 24)
  if (/foto|video|testo|belge/.test(normalizeTr(kanit))) skor += 12
  skor -= eksikBilgiler.length * 7
  skor -= mantikHatalari.length * 18
  skor -= mantikUyarilari.length * 6
  return Math.max(0, Math.min(100, Math.round(skor)))
}

function kanitZayifMi(kanit: string, eksikBilgiler: string[], kanitGuveni: number) {
  if (!kanit.trim()) return true
  if (kanitGuveni < 55) return true
  return kanit.trim().length < 40 && eksikBilgiler.length >= 2
}

function ogeBul(ogeler: KanitOgesi[], tur: KanitVeriTuru) {
  return ogeler.find((o) => o.tur === tur)
}

function kanitParagrafiOlustur(ogeler: KanitOgesi[]): string {
  const parcalar: string[] = []
  const kullanilan = new Set<string>()

  const volt = ogeBul(ogeler, "voltaj")
  const akim = ogeBul(ogeler, "akim")
  const btu = ogeBul(ogeler, "btu")
  const alan = ogeBul(ogeler, "kullanim_alani")
  const yas = ogeBul(ogeler, "cihaz_yasi")
  const dis = ogeBul(ogeler, "dis_ortam")
  const ic = ogeBul(ogeler, "ic_ortam")
  const atis = ogeBul(ogeler, "atis_havasi")

  if (volt?.deger !== undefined) {
    parcalar.push(`Şebeke voltajını ${volt.deger} Volt olarak ölçtüm`)
    kullanilan.add("voltaj")
  }

  if (akim?.deger !== undefined) {
    parcalar.push(`Akımı ${akim.deger} Amper olarak ölçtüm`)
    kullanilan.add("akim")
  }

  const fisNotlari: string[] = []
  if (btu?.deger !== undefined) {
    fisNotlari.push(`Cihazın ${btu.deger} BTU/h kapasiteli olduğunu`)
    kullanilan.add("btu")
  }
  if (alan?.deger !== undefined) {
    fisNotlari.push(`kullanım alanının ${alan.deger} m² olduğunu`)
    kullanilan.add("kullanim_alani")
  }
  if (yas?.deger !== undefined) {
    fisNotlari.push(`cihazın yaklaşık ${yas.deger} aylık olduğunu`)
    kullanilan.add("cihaz_yasi")
  }
  if (fisNotlari.length > 0) {
    parcalar.push(`${fisNotlari.join(", ")} fişe not ettim`)
  }

  const sicaklikOlcumleri: string[] = []
  if (dis?.deger !== undefined) {
    sicaklikOlcumleri.push(`Dış ortam sıcaklığını ${dis.deger} °C`)
    kullanilan.add("dis_ortam")
  }
  if (ic?.deger !== undefined) {
    sicaklikOlcumleri.push(`iç ortam sıcaklığını ${ic.deger} °C`)
    kullanilan.add("ic_ortam")
  }
  if (atis?.deger !== undefined) {
    sicaklikOlcumleri.push(`klima çıkış/atış havası sıcaklığını ${atis.deger} °C`)
    kullanilan.add("atis_havasi")
  }

  if (sicaklikOlcumleri.length === 1) {
    parcalar.push(`${sicaklikOlcumleri[0]} olarak ölçtüm`)
  } else if (sicaklikOlcumleri.length === 2) {
    parcalar.push(`${sicaklikOlcumleri[0]} ve ${sicaklikOlcumleri[1]} olarak ölçtüm`)
  } else if (sicaklikOlcumleri.length >= 3) {
    const son = sicaklikOlcumleri.pop()
    parcalar.push(`${sicaklikOlcumleri.join(", ")} ve ${son} olarak ölçtüm`)
  }

  for (const oge of ogeler) {
    if (kullanilan.has(oge.tur)) continue

    if (oge.tur === "dondurucu_sicaklik" && oge.deger !== undefined) {
      parcalar.push(`Dondurucu sıcaklığını ${oge.deger} °C olarak ölçtüm`)
    } else if (oge.tur === "sogutucu_sicaklik" && oge.deger !== undefined) {
      parcalar.push(`Soğutucu sıcaklığını ${oge.deger} °C olarak ölçtüm`)
    } else if (oge.tur === "evaporator_sicaklik" && oge.deger !== undefined) {
      parcalar.push(`Evaporatör sıcaklığını ${oge.deger} °C olarak ölçtüm`)
    } else if (oge.tur === "kompresor_sicaklik" && oge.deger !== undefined) {
      parcalar.push(`Kompresör sıcaklığını ${oge.deger} °C olarak ölçtüm`)
    } else if (oge.tur === "basinc" && oge.deger !== undefined) {
      parcalar.push(`Basınç değerini ${oge.deger} bar olarak ölçtüm`)
    } else if (oge.tur === "hata_kodu") {
      parcalar.push(`${oge.etiket} bilgisini fişe ekledim`)
    } else if (oge.tur === "seri_no") {
      parcalar.push(
        `Seri numarasını ${oge.etiket.replace("Seri no: ", "")} olarak kaydettim`,
      )
    } else if (oge.tur === "islem") {
      parcalar.push("Kart değişimini yaptım")
    } else if (oge.tur === "ek_kanit") {
      if (/testo/.test(normalizeTr(oge.ham))) {
        parcalar.push("Testo kayıtlarını fişe ekledim")
      } else if (/foto/.test(normalizeTr(oge.ham))) {
        parcalar.push("İlgili fotoğrafları fişe ekledim")
      } else if (/video/.test(normalizeTr(oge.ham))) {
        parcalar.push("Videoyu fişe ekledim")
      } else if (/belge/.test(normalizeTr(oge.ham))) {
        parcalar.push("İlgili belgeleri fişe ekledim")
      }
    }
  }

  return parcalar.join(". ") + (parcalar.length > 0 ? "." : "")
}

function kanitOgelerindenCumleler(ogeler: KanitOgesi[]): string[] {
  const paragraf = kanitParagrafiOlustur(ogeler)
  if (!paragraf) return []
  return paragraf.split(/\.\s+/).filter(Boolean).map((p) => p.trim())
}

function talepCumleleriniOlustur(amac: string, analiz: AnalizSonucu): string[] {
  const n = normalizeTr(amac)
  const cumleler: string[] = []
  const eklenen = new Set<string>()

  function ekle(cumle: string) {
    if (eklenen.has(cumle)) return
    eklenen.add(cumle)
    cumleler.push(cumle)
  }

  if (/israr.*degisim|degisim\s*istiyor|surekli\s*degisim|musteri.*degisim/.test(n)) {
    ekle("Müşteri ısrarla ürün değişimi talep etmektedir.")
  }
  if (
    (/degismezse|yine\s*sikayet|tekrar\s*sikayet|sikayet.*sur|sikayet\s*edecek/.test(n) &&
      /hakem|hakeme/.test(n)) ||
    (/degisim|degistir/.test(n) && /sikayet/.test(n) && /hakem|hakeme/.test(n))
  ) {
    ekle(
      "Müşteri, değişim yapılmaması halinde şikâyetlerini sürdüreceğini ve Tüketici Hakem Heyetine başvuracağını ifade etmektedir.",
    )
  } else if (/degismezse|yine\s*sikayet|tekrar\s*sikayet|sikayet.*sur|sikayet\s*edecek/.test(n)) {
    ekle(
      "Müşteri değişim yapılmaması halinde şikâyetlerini sürdüreceğini ifade etmektedir.",
    )
  }
  if (/hakem|hakeme\s*gid|tuketici\s*hakem/.test(n)) {
    if (
      !cumleler.some((c) =>
        c.includes("Tüketici Hakem Heyetine başvuracağını ifade etmektedir"),
      )
    ) {
      ekle("Müşteri Tüketici Hakem Heyetine başvuracağını ifade etmektedir.")
    }
  }
  if (/mahkeme|dava\s*ac|avukat/.test(n)) {
    ekle("Müşteri mahkemeye başvuracağını ifade etmektedir.")
  }
  if (/sosyal\s*medya|sikayetvar|paylasacak/.test(n)) {
    ekle("Müşteri sosyal medyada paylaşım yapacağını ifade etmektedir.")
  }
  if (/surekli\s*ariyor|beni\s*ariyor|aramaya\s*devam|surekli\s*ara/.test(n)) {
    ekle("Müşterinin beni sürekli aradığını ve baskı oluşturduğunu belirtmek isterim.")
  }
  if (/surekli\s*sikayet|rahatsiz\s*edecek/.test(n)) {
    ekle("Müşterinin sürekli şikâyet ettiğini ve rahatsızlık yaşadığını tespit ettim.")
  }
  if (/kullanamiyor|kullanilmiyor/.test(n)) {
    ekle("Müşterinin ürünü kullanamadığını belirttiğini kaydettim.")
  }
  if (/yasli|hasta|bebek/.test(n)) {
    ekle("Evde yaşlı, hasta veya bebek bulunduğunu; durumun aciliyet taşıdığını değerlendirdim.")
  }
  if (/isletme\s*dur|ticari|dukkan|restoran|market/.test(n)) {
    ekle("Ürünün ticari kullanımda olduğunu ve işletmenin olumsuz etkilendiğini tespit ettim.")
  }
  if (/gida\s*bozul|bozuluyor/.test(n)) {
    ekle("Gıda bozulması riski bulunduğunu değerlendirdim.")
  }

  for (const risk of analiz.baglamRiskleri) {
    const profesyonel = risk
      .replace("belirttiğini tespit ettim", "ifade etmektedir")
      .replace("ifade ettiğini kaydettim", "ifade etmektedir")
      .replace("belirttiğini tespit ettim", "ifade etmektedir")
    if (/musteri/i.test(profesyonel)) {
      ekle(profesyonel.endsWith(".") ? profesyonel : `${profesyonel}.`)
    }
  }

  if (
    analiz.birincilAmac === "Teknik değişim talebi" ||
    analiz.birincilAmac === "Ürün değişimi"
  ) {
    if (/degisim|degistir/.test(n) && !cumleler.some((c) => c.includes("değiş"))) {
      ekle("Müşteri ürün değişimi talebini sürdürmektedir.")
    }
  }

  return cumleler
}

function tespitCumleleriniOlustur(
  kanit: string,
  amac: string,
  birincilAmac: string,
  urunGrubu: string | null,
  riskler: string[],
  celiskiMetni: string | null,
): string[] {
  const kanitNorm = normalizeTr(kanit)
  const amacNorm = normalizeTr(amac)
  const cumleler: string[] = []

  if (/normal\s*calis|calisiyor|yeterli|uygun/.test(kanitNorm)) {
    cumleler.push("Yaptığım kontrollerde ürünün teknik olarak normal çalıştığını değerlendirdim.")
  } else if (/sogutma\s*yeterli|yeterli\s*so[gğ]utma/.test(amacNorm)) {
    cumleler.push("Yaptığım kontrollerde soğutmanın yeterli olduğunu değerlendirdim.")
  } else if (/sogutmuyor|calismiyor|problem/.test(kanitNorm)) {
    cumleler.push("Yaptığım incelemede ürünün arıza belirtileri devam ettiğini tespit ettim.")
  } else if (urunGrubu) {
    cumleler.push(`${urunGrubu} üzerinde gerekli kontrolleri tamamladım.`)
  }

  if (birincilAmac === "Bölgeden yönlendirme isteme" || birincilAmac === "Operasyon desteği") {
    cumleler.push("Müşteri sürekli şikâyet etmekte; saha olarak nasıl ilerleyeceğim konusunda yönlendirme beklemekteyim.")
  }

  if (celiskiMetni && !cumleler.some((c) => c.includes("normal"))) {
    cumleler.push(celiskiMetni.replace(/\.$/, "") + " olarak değerlendirdim.")
  }

  if (
    (birincilAmac === "Teknik değişim talebi" || birincilAmac === "Ürün değişimi") &&
    /degisim|degistir|musteri.*istiyor/.test(amacNorm)
  ) {
    cumleler.push("Müşteri ürün değişimi talebini sürdürmektedir.")
  }

  for (const risk of riskler) {
    if (!cumleler.includes(risk)) cumleler.push(risk)
  }

  return cumleler
}

function kapanisCumlesiOlustur(birincilAmac: string, amac: string): string {
  switch (birincilAmac) {
    case "Bölgeden yönlendirme isteme":
    case "Operasyon desteği":
      return "Teknik bulgular ve müşteri beyanı doğrultusunda nasıl ilerlemem gerektiği konusunda yönlendirmenizi rica ederim."
    case "Şikayet yönetimi":
      return "Müşteri şikâyeti konusunda nasıl ilerlemem gerektiği konusunda yönlendirmenizi rica ederim."
    case "Savunma yazısı":
      return "Mevcut bulgular doğrultusunda savunmamın değerlendirilmesini rica ederim."
    case "Teknik değişim talebi":
    case "Ürün değişimi":
      return "Mevcut bulgular doğrultusunda ürünün değişim uygunluğunun değerlendirilmesini rica ederim."
    case "Hukuki destek":
      return "Hukuki süreç açısından nasıl ilerlemem gerektiği konusunda bilgilendirmenizi rica ederim."
    case "Garanti değerlendirmesi":
      return "Garanti kapsamının değerlendirilmesini rica ederim."
    case "Parça talebi":
      return "Gerekli yedek parça temini konusunda desteğinizi rica ederim."
    case "Resmi cevap":
    case "Mail cevabı":
      return "Uygun resmi cevabın oluşturulması konusunda yönlendirmenizi rica ederim."
    case "Yönetici bilgilendirmesi":
      return "Durumun değerlendirilmesi ve yönlendirme konusunda bilgilendirmenizi rica ederim."
    case "Malzeme talebi":
      return "Malzeme temini konusunda desteğinizi rica ederim."
    case "Araç talebi":
      return "Araç/malzeme talebinin değerlendirilmesini rica ederim."
    default:
      if (amac.trim()) {
        const temiz = amac.replace(/\s+/g, " ").trim().replace(/[.!?]$/, "")
        return `${temiz.charAt(0).toLocaleUpperCase("tr-TR")}${temiz.slice(1)} konusunda değerlendirmenizi rica ederim.`
      }
      return "Değerlendirmenizi rica ederim."
  }
}

function kararOzetiniOlustur(
  girdi: YazismaGirdisi,
  analiz: Omit<AnalizSonucu, "kararOzeti" | "kanitZayif">,
): KararOzeti {
  const kanitGuveni = kanitGuvenSkoruHesapla(
    girdi.kanit,
    analiz.kanitOgeleri,
    analiz.eksikBilgiler,
    analiz.mantikHatalari,
    analiz.mantikUyarilari,
  )

  return {
    talebin_amaci: analiz.talepAmaclari.length > 0 ? analiz.talepAmaclari : ["Diğer"],
    kanit_guveni: kanitGuveni,
    teknik_tutarlilik:
      analiz.mantikHatalari.length > 0
        ? "Başarısız"
        : analiz.mantikUyarilari.length > 0
          ? "Şüpheli — kontrol ediniz"
          : "Geçti",
    eksik_belge: analiz.eksikBilgiler.length > 0 ? analiz.eksikBilgiler.join(", ") : "Yok",
    celiski: analiz.celiskiMetni,
    ai_karari: aiKarariniOlustur(
      analiz.birincilAmac,
      analiz.celiskiMetni,
      analiz.talepAmaclari,
      analiz.urunGrubu,
    ),
    talep_yorumu: talepYorumunuOlustur(girdi.amac),
  }
}

function analizPipeline(girdi: YazismaGirdisi): AnalizSonucu {
  const kanitOgeleri = kanitOgeleriniCek(girdi.kanit)
  const kanitAnalizi = kanitAnaliziMetinleri(kanitOgeleri)
  const urunGrubu = urunGrubunuTani(girdi.kanit, girdi.amac)
  const { hatalar: mantikHatalari, uyarilar: mantikUyarilari } = mantikKontrolu(kanitOgeleri, urunGrubu)
  const talepAmaclari = talepAmaclariniTespitEt(girdi.kanit, girdi.amac)
  const birincilAmac = birincilAmaciSec(talepAmaclari)
  const celiskiMetni = celiskiMetniOlustur(girdi.kanit, girdi.amac, talepAmaclari)
  const baglamRiskleri = baglamRiskleriniCek(girdi.amac, girdi.kanit)
  const eksikBilgiler = eksikKanitAnalizi(girdi.kanit, girdi.amac, urunGrubu, birincilAmac)
  const yazimEngellendi = mantikHatalari.length > 0

  const araAnaliz = {
    kanitOgeleri,
    kanitAnalizi,
    urunGrubu,
    baglamRiskleri,
    mantikHatalari,
    mantikUyarilari,
    eksikBilgiler,
    kanitZayif: false,
    talepAmaclari,
    birincilAmac,
    celiskiMetni,
    yazimEngellendi,
  }

  const kararOzeti = kararOzetiniOlustur(girdi, araAnaliz)
  const kanitZayif = kanitZayifMi(girdi.kanit, eksikBilgiler, kararOzeti.kanit_guveni)

  return { ...araAnaliz, kanitZayif, kararOzeti }
}

function teknisyenYaziOlustur(girdi: YazismaGirdisi, analiz: AnalizSonucu): string {
  const hitap = hitapDuzelt(girdi.kime)
  const satirlar: string[] = [`${hitap},`, ""]

  const urunIfadesi = analiz.urunGrubu ? `${analiz.urunGrubu}` : "Ürün"
  satirlar.push(`${urunIfadesi} üzerinde gerekli kontrolleri gerçekleştirdim.`)

  const kanitParagrafi = kanitParagrafiOlustur(analiz.kanitOgeleri)
  if (kanitParagrafi) {
    satirlar.push("")
    satirlar.push(kanitParagrafi)
  }

  const kanitNorm = normalizeTr(girdi.kanit)
  const tespit: string[] = []

  if (/normal\s*calis|calisiyor|yeterli|uygun|teknik\s*olarak\s*normal/.test(kanitNorm)) {
    tespit.push("Yaptığım kontrollerde ürünün teknik olarak normal çalıştığını değerlendirdim.")
  } else if (/sogutmuyor|calismiyor|ariza|problem/.test(kanitNorm)) {
    tespit.push("Yaptığım incelemede ürünün arıza belirtilerinin devam ettiğini tespit ettim.")
  }

  if (analiz.celiskiMetni) {
    tespit.push(`${analiz.celiskiMetni.replace(/\.$/, "")}.`)
  }

  const talepCumleleri = talepCumleleriniOlustur(girdi.amac, analiz)
  const govde = [...tespit, ...talepCumleleri]

  if (govde.length > 0) {
    satirlar.push("")
    satirlar.push(govde.join(" "))
  }

  satirlar.push("")
  satirlar.push(kapanisCumlesiOlustur(analiz.birincilAmac, girdi.amac))
  satirlar.push("")
  satirlar.push("Teşekkür ederim.")

  return satirlar.join("\n").trim()
}

function mantikHatasiYazisiOlustur(girdi: YazismaGirdisi, analiz: AnalizSonucu): string {
  const hitap = hitapDuzelt(girdi.kime)
  return [
    `${hitap},`,
    "",
    "Kanıt alanındaki ölçüm değerlerini inceledim.",
    analiz.mantikHatalari.join(" "),
    "Lütfen ölçüm değerlerini kontrol edip kanıt alanını güncelledikten sonra yazıyı yeniden oluşturunuz.",
    "",
    "Teşekkür ederim.",
  ].join("\n")
}

function cevapOlustur(
  girdi: YazismaGirdisi,
  analiz: AnalizSonucu,
  ek: Partial<AiYazismaCevap> = {},
): AiYazismaCevap {
  const hazirYazi = analiz.yazimEngellendi
    ? mantikHatasiYazisiOlustur(girdi, analiz)
    : teknisyenYaziOlustur(girdi, analiz)

  return {
    hazir_yazi: hazirYazi,
    ...ek,
  }
}

function sonucuTamamla(
  sonuc: AiYazismaCevap,
  girdi: YazismaGirdisi,
  analiz: AnalizSonucu,
): AiYazismaCevap {
  const hazirYazi =
    temizMetin(sonuc.hazir_yazi, 12000) ||
    (analiz.yazimEngellendi
      ? mantikHatasiYazisiOlustur(girdi, analiz)
      : teknisyenYaziOlustur(girdi, analiz))

  return {
    hazir_yazi: hazirYazi,
    fallback_kullanildi: sonuc.fallback_kullanildi,
  }
}

async function oturumDogrula() {
  const supabaseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!supabaseUrl || !anonKey) return { ok: false as const, reason: "supabase_config" }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // Mevcut oturum çerezleri yeterli.
          }
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, reason: "oturum_yok" }
  return { ok: true as const }
}

const SISTEM_TALIMATI = `Sen kurumsal profesyonel yaziyi sifirdan hazirlayan uzman bir TEKNISYEN yazisma asistanisin.

BU MODUL AI OZETLEME MODULU DEGILDIR. Ozetleme, kisaltma, eksiltme YASAK.

Amac: Okuyan kisi fisi acmadan, urunu gormeden, fotografa bakmadan olayin TAMAMINI anlasin.

ONCE ICSEL ANALIZ (kullaniciya gosterilmez):
1. Kanit kutusundaki TUM teknik bilgileri tek tek oku
2. Talep kutusunu anlam olarak oku (yazim hatalari olabilir)
3. Talebin gercek amacini belirle
4. Kanit-talep uyumunu kontrol et
5. Yazmadan once sessizce sor:
   - Kanittaki tum onemli verileri kullandim mi?
   - Talepteki tum onemli istekleri yaziya yansittim mi?
   - Yazi olayi eksiksiz anlatiyor mu?

YAZI KURALLARI:
- Birinci tekil sahis teknisyen dili: yaptim, olctum, ekledim, kontrol ettim, tespit ettim, inceledim
- Kanittaki HER veriyi DOGRU ADIYLA yaz: Sebeke voltaji, Cihaz kapasitesi (BTU/h), Dis ortam sicakligi, Ic ortam sicakligi, Klima cikis/atish havasi sicakligi, Kullanim alani (m2), Cihaz yasi, Fotoğraflar
- ASLA belirsiz "sicakligi olctum" yazma; hangi sicaklik oldugu mutlaka belirtilmeli
- Satir bazli kanit oku; her satir etiketli veridir
- Hicbir teknik bilgiyi "gereksiz" diye cikarma
- Talepteki HER onemli konu profesyonel dile cevrilerek yazilmali (musteri sikayeti, hakem heyeti, nasil ilerleyeyim, surekli ariyor vb.)
- ASLA otomatik "degisim talebi" yazma; once talebin gercek amacini bul
- Kisa yazmak zorunda degilsin; 10-30 satir olabilir
- Sablon cumle kullanma; olaya ozel yaz
- YASAK pasif dil: "Iletilen bilgiler", "kayitta yer almaktadir", "tarafimizca"

Ornek kanit paragrafi:
"Sebeke voltajini 220 Volt olarak olctum. Cihazin 12000 BTU/h kapasiteli oldugunu, kullanim alaninin 25 m2 oldugunu ve cihazin yaklasik 5 aylik oldugunu fise not ettim. Dis ortam sicakligini 45 °C, ic ortam sicakligini 32 °C ve klima cikis/atish havasi sicakligini 12 °C olarak olctum. Ilgili fotograflari fise ekledim."

JSON:
{ "hazir_yazi": "string" }`

async function aiIleUret(girdi: YazismaGirdisi, analiz: AnalizSonucu): Promise<AiYazismaCevap> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY tanimli degil")

  const kanitParagrafi = kanitParagrafiOlustur(analiz.kanitOgeleri)
  const talepCumleleri = talepCumleleriniOlustur(girdi.amac, analiz)

  const kullaniciMesaji = [
    "KANIT (satir satir, TUMU etiketli sekilde yazida kullanilacak):",
    girdi.kanit || "(bos)",
    "",
    analiz.kanitAnalizi.length > 0
      ? `ETIKETLI VERILER:\n${analiz.kanitAnalizi.map((x) => `- ${x}`).join("\n")}`
      : "",
    "",
    kanitParagrafi
      ? `ORNEK KANIT PARAGRAFI (bu yapida veya daha kapsamli yaz):\n${kanitParagrafi}`
      : "",
    "",
    "TALEP (anlam olarak oku, TUM onemli konulari yaziya cevir):",
    girdi.amac || "(bos)",
    "",
    `BIRINCIL AMAC: ${analiz.birincilAmac}`,
    analiz.celiskiMetni ? `CELIŞKI: ${analiz.celiskiMetni}` : "",
    "",
    talepCumleleri.length > 0
      ? `TALEPTE YAZILMASI GEREKEN KONULAR:\n${talepCumleleri.map((c) => `- ${c}`).join("\n")}`
      : "",
    "",
    analiz.baglamRiskleri.length > 0
      ? `EK OPERASYON BILGILERI:\n${analiz.baglamRiskleri.map((r) => `- ${r}`).join("\n")}`
      : "",
    "",
    analiz.urunGrubu ? `URUN: ${analiz.urunGrubu}` : "",
    `KIME: ${hitapDuzelt(girdi.kime)}`,
    "",
    "YAZMADAN ONCE IC KONTROL: Kanittaki tum veriler ve talepteki tum konular yazida var mi?",
    "",
    "Eksiksiz, ozetlemeyen, teknisyen agzindan profesyonel yaziyi olustur. 10-30 satir olabilir.",
  ]
    .filter(Boolean)
    .join("\n")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      temperature: 0.25,
      system: SISTEM_TALIMATI,
      messages: [{ role: "user", content: kullaniciMesaji }],
    }),
  })

  const anthropicData = await response.json()
  if (!response.ok) {
    console.error("AI kanitli yazisma API hatasi:", JSON.stringify(anthropicData))
    throw new Error(`Anthropic HTTP ${response.status}`)
  }

  const hamMetin =
    anthropicData?.content?.find(
      (parca: { type?: string; text?: string }) => parca.type === "text",
    )?.text ?? ""

  const aiSonuc = cevabiDogrula(jsonCevabiniOku(hamMetin))
  return sonucuTamamla({ ...aiSonuc, fallback_kullanildi: false }, girdi, analiz)
}

function basariliCevap(data: AiYazismaCevap) {
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  let girdi: YazismaGirdisi = { kanit: "", kime: "", amac: "" }

  try {
    const body = await request.json()
    girdi = {
      kanit: temizMetin(body.kanit),
      kime: temizMetin(body.kime, 300),
      amac: temizMetin(body.amac),
    }

    if (!girdi.kanit && !girdi.amac) {
      return NextResponse.json({ success: false, error: "validation" }, { status: 400 })
    }

    const oturum = await oturumDogrula()
    if (!oturum.ok) {
      console.warn("AI kanitli yazisma oturum uyarisi:", oturum.reason)
    }

    const analiz = analizPipeline(girdi)

    if (analiz.yazimEngellendi) {
      return basariliCevap(cevapOlustur(girdi, analiz))
    }

    try {
      const aiSonuc = await aiIleUret(girdi, analiz)
      return basariliCevap(aiSonuc)
    } catch (aiError) {
      console.error("AI kanitli yazisma uretim hatasi, fallback:", aiError)
      return basariliCevap(cevapOlustur(girdi, analiz, { fallback_kullanildi: true }))
    }
  } catch (error) {
    console.error("AI kanitli yazisma route hata:", error)
    if (girdi.kanit || girdi.amac) {
      const analiz = analizPipeline(girdi)
      return basariliCevap(cevapOlustur(girdi, analiz, { fallback_kullanildi: true }))
    }
    return NextResponse.json({ success: false, error: "validation" }, { status: 400 })
  }
}
