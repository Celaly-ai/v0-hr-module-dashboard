import fs from "fs"
import os from "os"
import path from "path"
import { chromium } from "playwright"

const CDP_URL = process.env.ARON_CDP_URL || "http://127.0.0.1:9222"
const RAPOR_DOSYASI =
  process.argv[2] ||
  path.join(process.env.HOME || os.homedir(), "Downloads", "aron-explorer-rapor.json")

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

const UST_BAR_BASLIKLAR = [
  "Aron",
  "Bayi",
  "Malzeme",
  "Reddedildi",
  "E.Garanti",
  "Bakım",
  "Sigorta",
  "Değişim",
  "Kabul",
  "Bülten",
]

function aronSekmesiMi(url) {
  if (!url) return false
  const kucuk = url.toLowerCase()
  if (ATLANACAK_URL_ONEKLERI.some((on) => kucuk.startsWith(on))) return false
  if (kucuk.includes("chrome://new-tab-page")) return false
  return ARON_URL_PARCALARI.some((p) => kucuk.includes(p.toLowerCase()))
}

function aronSekmesiBul(context) {
  const sayfalar = context.pages()
  return sayfalar.find((p) => aronSekmesiMi(p.url())) || null
}

function ornekKisalt(deger, maxDerinlik = 3) {
  const gorulen = new WeakSet()

  function yurut(val, derinlik) {
    if (val === null || val === undefined) return val
    const tip = typeof val
    if (tip === "function") return "[Function]"
    if (tip === "string") return val.length > 300 ? `${val.slice(0, 300)}…` : val
    if (tip === "number" || tip === "boolean") return val
    if (tip !== "object") return String(val)
    if (gorulen.has(val)) return "[Circular]"
    if (derinlik >= maxDerinlik) {
      if (Array.isArray(val)) return `[Array(${val.length})]`
      return `[Object(${Object.keys(val).length} keys)]`
    }
    gorulen.add(val)

    if (Array.isArray(val)) {
      return val.slice(0, 2).map((item) => yurut(item, derinlik + 1))
    }

    const cikti = {}
    const anahtarlar = Object.keys(val).slice(0, 15)
    for (const k of anahtarlar) {
      if (k.startsWith("$$")) continue
      cikti[k] = yurut(val[k], derinlik + 1)
    }
    const toplam = Object.keys(val).length
    if (toplam > anahtarlar.length) {
      cikti["…"] = `+${toplam - anahtarlar.length} anahtar`
    }
    return cikti
  }

  try {
    return yurut(deger, 0)
  } catch {
    return "[Serialize edilemedi]"
  }
}

async function kesifCalistir(page) {
  return page.evaluate(
    ({ ustBarBasliklar }) => {
      const ATLANACAK_PROP_ONEK = ["$$"]
      const ATLANACAK_PROP_TAM = new Set([
        "$parent",
        "$root",
        "$id",
        "$destroy",
        "$watch",
        "$apply",
        "$evalAsync",
        "$broadcast",
        "$emit",
        "$on",
        "$digest",
        "$applyAsync",
      ])

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

        if (window.angular) {
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
        }

        return scopeList
      }

      function propAtla(anahtar) {
        if (!anahtar) return true
        if (ATLANACAK_PROP_TAM.has(anahtar)) return true
        if (anahtar.startsWith("$")) return true
        return ATLANACAK_PROP_ONEK.some((on) => anahtar.startsWith(on))
      }

      function scopeEtiketi(scope) {
        const id = scope.$id ?? "?"
        let controller = ""
        try {
          if (scope.$ctrl) controller = "component"
          else if (scope.constructor?.name && scope.constructor.name !== "Scope") {
            controller = scope.constructor.name
          }
        } catch {
          // noop
        }
        return controller ? `scope#${id}/${controller}` : `scope#${id}`
      }

      function ornekDeger(deger) {
        const gorulen = new WeakSet()

        function yurut(val, derinlik) {
          if (val === null || val === undefined) return val
          const tip = typeof val
          if (tip === "function") return "[Function]"
          if (tip === "string") return val.length > 300 ? `${val.slice(0, 300)}…` : val
          if (tip === "number" || tip === "boolean") return val
          if (tip !== "object") return String(val)
          if (gorulen.has(val)) return "[Circular]"
          if (derinlik >= 3) {
            if (Array.isArray(val)) return `[Array(${val.length})]`
            return `[Object(${Object.keys(val).length} keys)]`
          }
          gorulen.add(val)

          if (Array.isArray(val)) {
            return val.slice(0, 2).map((item) => yurut(item, derinlik + 1))
          }

          const cikti = {}
          const anahtarlar = Object.keys(val).slice(0, 15)
          for (const k of anahtarlar) {
            if (k.startsWith("$$")) continue
            cikti[k] = yurut(val[k], derinlik + 1)
          }
          const toplam = Object.keys(val).length
          if (toplam > anahtarlar.length) cikti["…"] = `+${toplam - anahtarlar.length} anahtar`
          return cikti
        }

        try {
          return yurut(deger, 0)
        } catch {
          return "[Serialize edilemedi]"
        }
      }

      function domUstBarOku() {
        const sonuc = []
        const normalize = (s) =>
          String(s || "")
            .replace(/\s+/g, " ")
            .trim()

        for (const baslik of ustBarBasliklar) {
          const eslesmeler = []

          document.querySelectorAll("a, button, span, div, li, td, th, label, h1, h2, h3, h4, h5, h6, p").forEach(
            (el) => {
              const kendiMetin = normalize(el.childNodes.length === 1 ? el.textContent : "")
              const tamMetin = normalize(el.textContent)
              if (!tamMetin) return

              const baslikEslesti =
                kendiMetin === baslik ||
                kendiMetin.startsWith(`${baslik} `) ||
                kendiMetin.startsWith(`${baslik}:`) ||
                (kendiMetin.includes(baslik) && kendiMetin.length <= baslik.length + 12)

              if (!baslikEslesti) return

              const kapsayici = el.closest("a, li, div, td, th, span") || el.parentElement || el
              const blokMetin = normalize(kapsayici.textContent)
              const sayiEslesme = blokMetin.match(/(\d[\d.,]*)/g)

              eslesmeler.push({
                baslik,
                gorunenMetin: tamMetin.slice(0, 180),
                kapsayiciMetin: blokMetin.slice(0, 220),
                sayilar: sayiEslesme ? [...new Set(sayiEslesme)].slice(0, 5) : [],
                etiket: el.tagName.toLowerCase(),
                sinif: typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : "",
              })
            },
          )

          const benzersiz = []
          const anahtarSet = new Set()
          for (const item of eslesmeler) {
            const anahtar = `${item.baslik}|${item.kapsayiciMetin}`
            if (anahtarSet.has(anahtar)) continue
            anahtarSet.add(anahtar)
            benzersiz.push(item)
          }

          sonuc.push({
            baslik,
            adet: benzersiz.length,
            kayitlar: benzersiz.slice(0, 8),
          })
        }

        return sonuc
      }

      const angularVar = Boolean(window.angular)
      const scopes = angularVar ? tumScopelariTopla() : []

      const arrays = []
      const objects = []
      const primitives = []
      const sayiAlanlari = []

      const SAYI_ADI_KALIPLARI = [
        /count/i,
        /sayi/i,
        /adet/i,
        /toplam/i,
        /total/i,
        /miktar/i,
        /qty/i,
        /num/i,
        /red/i,
        /garanti/i,
        /bakim/i,
        /sigorta/i,
        /degisim/i,
        /kabul/i,
        /bulten/i,
        /bayi/i,
        /malzeme/i,
        /aron/i,
      ]

      for (const scope of scopes) {
        const etiket = scopeEtiketi(scope)
        let anahtarlar = []
        try {
          anahtarlar = Object.keys(scope)
        } catch {
          continue
        }

        for (const prop of anahtarlar) {
          if (propAtla(prop)) continue

          let deger
          try {
            deger = scope[prop]
          } catch {
            continue
          }

          if (typeof deger === "function") continue

          const yol = `${etiket}.${prop}`

          if (Array.isArray(deger)) {
            arrays.push({
              yol,
              property: prop,
              scope: etiket,
              kayitSayisi: deger.length,
              ilkKayitOrnegi: deger.length > 0 ? ornekDeger(deger[0]) : null,
            })
            continue
          }

          if (deger !== null && typeof deger === "object") {
            let anahtarSayisi = 0
            try {
              anahtarSayisi = Object.keys(deger).length
            } catch {
              anahtarSayisi = -1
            }
            objects.push({
              yol,
              property: prop,
              scope: etiket,
              anahtarSayisi,
              ornekIcerik: ornekDeger(deger),
            })
            continue
          }

          const tip = deger === null ? "null" : typeof deger
          if (tip === "string" || tip === "number" || tip === "boolean" || tip === "null") {
            primitives.push({
              yol,
              property: prop,
              scope: etiket,
              tip,
              deger,
            })

            if (tip === "number" && Number.isFinite(deger)) {
              sayiAlanlari.push({
                yol,
                property: prop,
                scope: etiket,
                deger,
              })
            }
          }
        }
      }

      const ustBarBenzeriAlanlar = sayiAlanlari.filter((item) => {
        if (item.deger < 0 || item.deger > 100000) return false
        if (/^(currentPage|pageSize|pageNumber|.*PageSize|.*CurrentPage|.*DisplayLimit|.*Limit|MOBILEMODE|Selected)/i.test(item.property)) {
          return false
        }
        if (/^Toplam/i.test(item.property)) return true
        if (Number.isInteger(item.deger) && item.deger <= 10000) {
          return SAYI_ADI_KALIPLARI.some((k) => k.test(item.property) || k.test(item.yol))
        }
        return SAYI_ADI_KALIPLARI.some((k) => k.test(item.property) || k.test(item.yol))
      })

      arrays.sort((a, b) => b.kayitSayisi - a.kayitSayisi)

      return {
        angularVar,
        scopeSayisi: scopes.length,
        domUstBar: domUstBarOku(),
        arrays,
        objects,
        primitives,
        sayiAlanlari,
        ustBarBenzeriAlanlar,
      }
    },
    { ustBarBasliklar: UST_BAR_BASLIKLAR },
  )
}

function terminalYaz(url, rapor) {
  console.log("Bağlanılan sayfa:", url)
  console.log("Angular:", rapor.angularVar ? "bulundu" : "bulunamadı")
  console.log("Scope sayısı:", rapor.scopeSayisi)
  console.log("Bulunan array sayısı:", rapor.arrays.length)
  console.log("Bulunan object sayısı:", rapor.objects.length)
  console.log("Bulunan sayı alanları:", rapor.sayiAlanlari.length)

  console.log("\nEn büyük 30 array:")
  if (rapor.arrays.length === 0) {
    console.log("  (yok)")
  } else {
    for (const item of rapor.arrays.slice(0, 30)) {
      console.log(`  - ${item.yol} → ${item.kayitSayisi} kayıt`)
    }
  }

  console.log("\nÜst bar sayılarına benzeyen alanlar:")
  if (rapor.ustBarBenzeriAlanlar.length === 0) {
    console.log("  (yok)")
  } else {
    for (const item of rapor.ustBarBenzeriAlanlar.slice(0, 40)) {
      console.log(`  - ${item.yol} = ${item.deger}`)
    }
  }

  console.log("\nDOM üst bar okuması:")
  for (const blok of rapor.domUstBar) {
    const sayiOzet =
      blok.kayitlar
        ?.flatMap((k) => k.sayilar || [])
        .filter(Boolean)
        .slice(0, 3)
        .join(", ") || "-"
    console.log(`  - ${blok.baslik}: ${blok.adet} eşleşme, sayılar: ${sayiOzet}`)
  }
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
  console.error("chrome://new-tab-page gibi sekmeler atlanır.")
  process.exit(1)
}

const url = page.url()
await page.waitForTimeout(1500)

const kesif = await kesifCalistir(page)

const rapor = {
  meta: {
    url,
    zaman: new Date().toISOString(),
    cdpUrl: CDP_URL,
    angularBulundu: kesif.angularVar,
    scopeSayisi: kesif.scopeSayisi,
  },
  domUstBar: kesif.domUstBar,
  arrays: kesif.arrays.map((item) => ({
    ...item,
    ilkKayitOrnegi: ornekKisalt(item.ilkKayitOrnegi),
  })),
  objects: kesif.objects.map((item) => ({
    ...item,
    ornekIcerik: ornekKisalt(item.ornekIcerik),
  })),
  primitives: kesif.primitives,
  sayiAlanlari: kesif.sayiAlanlari,
  ustBarBenzeriAlanlar: kesif.ustBarBenzeriAlanlar,
  ozet: {
    arraySayisi: kesif.arrays.length,
    objectSayisi: kesif.objects.length,
    primitiveSayisi: kesif.primitives.length,
    sayiAlaniSayisi: kesif.sayiAlanlari.length,
    enBuyuk30Array: kesif.arrays.slice(0, 30).map((a) => ({
      yol: a.yol,
      kayitSayisi: a.kayitSayisi,
    })),
  },
}

fs.mkdirSync(path.dirname(RAPOR_DOSYASI), { recursive: true })
fs.writeFileSync(RAPOR_DOSYASI, JSON.stringify(rapor, null, 2), "utf8")

terminalYaz(url, kesif)
console.log("\nJSON rapor:", RAPOR_DOSYASI)

await browser.close()
