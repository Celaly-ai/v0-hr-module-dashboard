import fs from "fs"
import os from "os"
import path from "path"
import { chromium } from "playwright"

const CDP_URL = process.env.ARON_CDP_URL || "http://127.0.0.1:9222"
const HEDEF_DOSYA =
  process.argv[2] ||
  path.join(process.env.HOME || os.homedir(), "Downloads", "aron-bultenler-formatli.json")

const ARON_URL_PARCALARI = [
  "yetkiliservis.arcelik.com/aron",
  "/Dashboard/html/ltr/index2.html",
]

const ATLANACAK_URL_ONEKLERI = [
  "chrome://",
  "chrome-extension://",
  "devtools://",
  "about:blank",
  "edge://",
]

function aronSekmesiMi(url) {
  if (!url) return false
  const kucuk = url.toLowerCase()
  if (ATLANACAK_URL_ONEKLERI.some((on) => kucuk.startsWith(on))) return false
  if (kucuk.includes("chrome://new-tab-page")) return false
  return ARON_URL_PARCALARI.some((p) => kucuk.includes(p.toLowerCase()))
}

function aronSekmesiBul(context) {
  return context.pages().find((p) => aronSekmesiMi(p.url())) || null
}

function bultenOzeti(kayit, sira) {
  if (!kayit || typeof kayit !== "object") {
    return `${sira}. [geçersiz kayıt]`
  }

  // ARON kısa alan adları: A=başlık, BN=bülten no, GT=tarih
  const aronBaslik = kayit.A ?? kayit.a
  const aronNo = kayit.BN ?? kayit.bn
  const aronTarih = kayit.GT ?? kayit.gt

  if (aronBaslik || aronNo || aronTarih) {
    const parcalar = [`${sira}.`]
    if (aronNo) parcalar.push(`BN=${aronNo}`)
    if (aronBaslik) parcalar.push(String(aronBaslik).trim().slice(0, 90))
    if (aronTarih) parcalar.push(`(${String(aronTarih).trim()})`)
    return parcalar.join(" ")
  }

  const adAdaylari = [
    "Baslik",
    "baslik",
    "Konu",
    "konu",
    "Title",
    "title",
    "BultenBaslik",
    "bultenBaslik",
    "Aciklama",
    "aciklama",
  ]
  const tarihAdaylari = ["Tarih", "tarih", "Date", "date", "OlusturmaTarihi", "olusturmaTarihi"]
  const idAdaylari = ["Id", "id", "BultenId", "bultenId", "No", "no"]

  const al = (anahtarlar) => {
    for (const k of anahtarlar) {
      const v = kayit[k]
      if (v !== null && v !== undefined && String(v).trim()) return String(v).trim()
    }
    return ""
  }

  const ad = al(adAdaylari)
  const tarih = al(tarihAdaylari)
  const id = al(idAdaylari)

  const parcalar = [`${sira}.`]
  if (id) parcalar.push(`id=${id}`)
  if (ad) parcalar.push(ad.slice(0, 80))
  if (tarih) parcalar.push(`(${tarih})`)

  if (parcalar.length === 1) {
    const anahtarlar = Object.keys(kayit).slice(0, 4)
    const kisa = anahtarlar
      .map((k) => {
        const v = kayit[k]
        if (v === null || v === undefined) return null
        if (typeof v === "object") return `${k}=[object]`
        const s = String(v).trim()
        return s ? `${k}=${s.slice(0, 40)}` : null
      })
      .filter(Boolean)
      .join(", ")
    parcalar.push(kisa || "[boş kayıt]")
  }

  return parcalar.join(" ")
}

async function bultenVerisiCek(page) {
  return page.evaluate(() => {
    function scopeAgaciTopla(kok) {
      const ziyaret = new WeakSet()
      const liste = []

      function yurut(scope) {
        if (!scope || ziyaret.has(scope)) return
        ziyaret.add(scope)
        liste.push(scope)

        let cocuk = scope.$$childHead
        while (cocuk) {
          yurut(cocuk)
          cocuk = cocuk.$$nextSibling
        }
      }

      yurut(kok)
      return liste
    }

    function tumScopelariTopla() {
      const scopeSet = new WeakSet()
      const scopeList = []

      function ekle(scope) {
        if (!scope || scopeSet.has(scope)) return
        scopeSet.add(scope)
        scopeList.push(scope)
      }

      document.querySelectorAll("*").forEach((el) => {
        try {
          ekle(window.angular.element(el).scope())
          ekle(window.angular.element(el).isolateScope())
        } catch {
          // noop
        }
      })

      const kok =
        document.querySelector("[ng-controller]") ||
        document.querySelector("[ng-app]") ||
        document.body

      const kokScope = window.angular.element(kok).scope()
      if (kokScope?.$root) {
        scopeAgaciTopla(kokScope.$root).forEach(ekle)
      } else if (kokScope) {
        scopeAgaciTopla(kokScope).forEach(ekle)
      }

      return scopeList
    }

    function diziBul(scope, anahtar) {
      const adaylar = [scope?.[anahtar], scope?.m?.[anahtar]]
      for (const aday of adaylar) {
        if (Array.isArray(aday)) return aday
      }
      return null
    }

    if (!window.angular) {
      return { hata: "Angular bulunamadı.", angularVar: false, kaynak: null, data: [] }
    }

    const scopes = tumScopelariTopla()
    let enIyiKaynak = null
    let enIyiListe = null

    for (const scope of scopes) {
      const bultenData = diziBul(scope, "BultenData")
      if (bultenData && (!enIyiListe || bultenData.length >= enIyiListe.length)) {
        enIyiListe = bultenData
        enIyiKaynak = "BultenData"
      }
    }

    if (!enIyiListe || enIyiListe.length === 0) {
      for (const scope of scopes) {
        const bultenEkran = diziBul(scope, "BultenDataEkran")
        if (bultenEkran && (!enIyiListe || bultenEkran.length >= enIyiListe.length)) {
          enIyiListe = bultenEkran
          enIyiKaynak = "BultenDataEkran"
        }
      }
    }

    if (!enIyiListe || enIyiListe.length === 0) {
      return {
        hata: "BultenData veya BultenDataEkran bulunamadı.",
        angularVar: true,
        kaynak: null,
        data: [],
      }
    }

    let data
    try {
      data = JSON.parse(JSON.stringify(enIyiListe))
    } catch {
      return {
        hata: "Bülten verisi JSON'a dönüştürülemedi.",
        angularVar: true,
        kaynak: enIyiKaynak,
        data: [],
      }
    }

    return {
      hata: null,
      angularVar: true,
      kaynak: enIyiKaynak,
      data,
    }
  })
}

let browser
try {
  browser = await chromium.connectOverCDP(CDP_URL)
} catch (err) {
  console.error("Chrome remote debugging bağlantısı kurulamadı.")
  console.error("Chrome'u şu bayrakla açın: --remote-debugging-port=9222")
  console.error(String(err?.message || err))
  process.exit(1)
}

const context = browser.contexts()[0]
if (!context) {
  console.error("Chrome context bulunamadı.")
  process.exit(1)
}

const page = aronSekmesiBul(context)
if (!page) {
  console.error("ARON sekmesi bulunamadı.")
  console.error("Hedef URL parçaları:")
  for (const p of ARON_URL_PARCALARI) console.error(`  - ${p}`)
  process.exit(1)
}

const url = page.url()
await page.waitForTimeout(1500)

const sonuc = await bultenVerisiCek(page)

console.log("Bağlanılan sayfa:", url)
console.log("Angular:", sonuc.angularVar ? "bulundu" : "bulunamadı")

if (sonuc.hata) {
  console.error(sonuc.hata)
  await browser.close()
  process.exit(1)
}

console.log("Kullanılan kaynak:", sonuc.kaynak)
console.log("Toplam bülten sayısı:", sonuc.data.length)

console.log("İlk 3 bülten özeti:")
for (let i = 0; i < Math.min(3, sonuc.data.length); i++) {
  console.log(" ", bultenOzeti(sonuc.data[i], i + 1))
}
if (sonuc.data.length === 0) {
  console.log("  (kayıt yok)")
}

fs.mkdirSync(path.dirname(HEDEF_DOSYA), { recursive: true })
fs.writeFileSync(HEDEF_DOSYA, JSON.stringify(sonuc.data, null, 2), "utf8")

console.log("Kaydedilen dosya:", HEDEF_DOSYA)

await browser.close()
