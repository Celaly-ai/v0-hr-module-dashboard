import fs from "fs"
import path from "path"
import { chromium } from "playwright"

const hedefDosya =
  process.argv[2] ||
  path.join(process.env.HOME || "", "Downloads", "aron-acik-fisler-formatli.json")

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222")
const context = browser.contexts()[0]

const page =
  context.pages().find((p) => p.url().includes("yetkiliservis.arcelik.com")) ||
  context.pages()[0]

if (!page) throw new Error("Açık ARON sayfası bulunamadı.")

console.log("Bağlanılan sayfa:", page.url())

await page.waitForTimeout(3000)

const kayitlar = await page.evaluate(() => {
  const root = document.querySelector('[ng-controller="MainCtrl"]') || document.body

  if (!window.angular) {
    return { hata: "Angular bulunamadı.", data: [] }
  }

  const scope = window.angular.element(root).scope()

  if (!scope) {
    return { hata: "Angular scope bulunamadı.", data: [] }
  }

  const liste = scope.AcikFisler || []

    return {
      hata: null,
      toplam: Array.isArray(liste) ? liste.length : 0,
      data: JSON.parse(JSON.stringify(liste))
    }
})

if (kayitlar.hata) {
  console.error(kayitlar.hata)
  process.exit(1)
}

fs.writeFileSync(hedefDosya, JSON.stringify(kayitlar.data, null, 2), "utf8")

console.log("ARON AcikFisler JSON olarak kaydedildi.")
console.log("Dosya:", hedefDosya)
console.log("Toplam kayıt:", kayitlar.toplam)

await browser.close()
