import fs from "fs";
import { chromium } from "playwright";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const context = browser.contexts()[0];

const page =
  context.pages().find((p) => p.url().includes("yetkiliservis.arcelik.com")) ||
  context.pages()[0];

console.log("Sayfa:", page.url());

await page.waitForTimeout(3000);

const html = await page.content();

fs.writeFileSync("aron-dom.html", html, "utf8");

console.log("Kaydedildi: aron-dom.html");
console.log("HTML uzunluğu:", html.length);

await browser.close();
