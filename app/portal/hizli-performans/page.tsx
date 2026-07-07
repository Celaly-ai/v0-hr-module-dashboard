// @ts-nocheck
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Style from "styled-jsx/style"
import { createClient } from "@/lib/supabase/client"

const bugun = new Date();
const varsayilanYil = bugun.getFullYear() < 2026 ? 2026 : bugun.getFullYear();
const aylar = [
    {
        value: 1,
        label: "Ocak"
    },
    {
        value: 2,
        label: "Şubat"
    },
    {
        value: 3,
        label: "Mart"
    },
    {
        value: 4,
        label: "Nisan"
    },
    {
        value: 5,
        label: "Mayıs"
    },
    {
        value: 6,
        label: "Haziran"
    },
    {
        value: 7,
        label: "Temmuz"
    },
    {
        value: 8,
        label: "Ağustos"
    },
    {
        value: 9,
        label: "Eylül"
    },
    {
        value: 10,
        label: "Ekim"
    },
    {
        value: 11,
        label: "Kasım"
    },
    {
        value: 12,
        label: "Aralık"
    }
];
const veriTurleri = [
    {
        value: "tumu",
        label: "Tümü"
    },
    {
        value: "nps",
        label: "NPS"
    },
    {
        value: "randevu",
        label: "Randevu"
    },
    {
        value: "sikayet",
        label: "Şikayet"
    },
    {
        value: "tamamlayici",
        label: "Tamamlayıcı"
    },
    {
        value: "ek_garanti",
        label: "Ek Garanti"
    }
];
const agirliklar = {
    nps: 0.15,
    sikayet: 0.3,
    randevu: 0.15,
    tamamlayici: 0.2,
    ek_garanti: 0.2
};
function safeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
}
function normalizeText(value) {
    return safeString(value).toLocaleLowerCase("tr-TR").replaceAll("ı", "i").replaceAll("İ", "i").replaceAll("ş", "s").replaceAll("Ş", "s").replaceAll("ğ", "g").replaceAll("Ğ", "g").replaceAll("ü", "u").replaceAll("Ü", "u").replaceAll("ö", "o").replaceAll("Ö", "o").replaceAll("ç", "c").replaceAll("Ç", "c").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function sayi(value) {
    const text = safeString(value).trim().replace("%", "").replace(",", ".").replace(/\s+/g, "");
    if (!text) return 0;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}
function paraDegeri(value) {
    let text = safeString(value).replace(/₺/g, "").replace(/TL/gi, "").replace(/\s+/g, "").trim();
    if (!text) return 0;
    if (text.includes(",") && text.includes(".")) {
        const sonVirgul = text.lastIndexOf(",");
        const sonNokta = text.lastIndexOf(".");
        if (sonVirgul > sonNokta) {
            text = text.replace(/\./g, "").replace(",", ".");
        } else {
            text = text.replace(/,/g, "");
        }
    } else if (text.includes(",")) {
        const parts = text.split(",");
        const last = parts[parts.length - 1];
        if (last.length === 3 && parts.length > 1) {
            text = text.replace(/,/g, "");
        } else {
            text = text.replace(",", ".");
        }
    } else if (text.includes(".")) {
        const parts = text.split(".");
        const last = parts[parts.length - 1];
        if (last.length === 3 && parts.length > 1) {
            text = text.replace(/\./g, "");
        }
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}
function satirdanSayilariAl(value) {
    return safeString(value).replaceAll(",", ".").match(/\d+(?:\.\d+)?/g)?.map((x)=>Number(x)).filter((x)=>Number.isFinite(x)) || [];
}
function satirdanParaDegerleriAl(value) {
    return safeString(value).replace(/₺/g, "").replace(/TL/gi, "").match(/\d[\d.,]*/g)?.map((x)=>paraDegeri(x)).filter((x)=>Number.isFinite(x)) || [];
}
function performansDegeriDuzelt(value, veriTuru) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return 0;
    if (veriTuru === "nps" || veriTuru === "randevu") {
        if (num > 0 && num <= 1.5) return num * 100;
        if (num > 150) return num / 100;
    }
    return num;
}
function formatNumber(value) {
    const num = Number(value || 0);
    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number.isFinite(num) ? num : 0);
}
function harfNotu(value) {
    const puan = Number(value || 0);
    if (puan >= 80) return "A";
    if (puan >= 60) return "B";
    if (puan >= 40) return "C";
    if (puan >= 20) return "D";
    return "E";
}
function ayAdi(ay) {
    if (!ay) return "Tüm Yıl";
    return aylar.find((x)=>x.value === ay)?.label || String(ay);
}
function veriTuruAdi(veriTuru) {
    if (veriTuru === "tumu") return "Tümü";
    if (veriTuru === "nps") return "NPS";
    if (veriTuru === "randevu") return "Randevu";
    if (veriTuru === "sikayet") return "Şikayet";
    if (veriTuru === "tamamlayici") return "Tamamlayıcı";
    return "Ek Garanti";
}
function satirlar(raw) {
    return raw.split(/\r?\n/).map((x)=>x.replace(/\r/g, "")).filter((x)=>x.trim().length > 0);
}
function satirBol(satir) {
    if (satir.includes("\t")) return satir.split("\t").map((x)=>x.trim());
    if (satir.includes(";")) return satir.split(";").map((x)=>x.trim());
    if (satir.includes(",")) return satir.split(",").map((x)=>x.trim());
    const ikiBosluk = satir.split(/\s{2,}/).map((x)=>x.trim()).filter(Boolean);
    if (ikiBosluk.length > 1) return ikiBosluk;
    return [
        satir.trim()
    ];
}
function personelKoduBul(value) {
    const text = safeString(value);
    const match = text.match(/^(\d{3,})\s+/);
    return match?.[1] || null;
}
function kelimeBasHarfiBuyut(value) {
    if (!value) return "";
    return value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1).toLocaleLowerCase("tr-TR");
}
function baslikGibiMi(value) {
    const t = normalizeText(value);
    const yasaklar = [
        "turkiye",
        "bolge",
        "ortalama",
        "servis",
        "toplam",
        "puan",
        "npsadet",
        "nps adet",
        "olumlular",
        "olumsuzlar",
        "kararsizlar",
        "sorgula",
        "kayit",
        "adet",
        "randevu",
        "sikayet",
        "tamamlayici",
        "garanti",
        "grand",
        "total",
        "teknisyenleri",
        "goster",
        "gizle",
        "sikayet ozet",
        "genislet",
        "daralt",
        "malzeme",
        "iscilik",
        "yanodeme",
        "yan odeme"
    ];
    return yasaklar.some((yasak)=>t === yasak || t.includes(yasak));
}
function gorunenAdDuzenle(value) {
    const temiz = safeString(value).replace(/^\s*\d{3,}\s+/, "").replace(/\d+(?:[.,]\d+)?\s*%?/g, " ").replace(/[\.\,\;\:\-\_\(\)\[\]\{\}\|\/\\]+/g, " ").replace(/\s+(o|a|e|i|l|s|0)\s*$/i, "").replace(/\s+/g, " ").trim();
    const parcalar = temiz.split(" ").map((x)=>x.trim()).filter(Boolean).filter((x)=>{
        const n = normalizeText(x);
        if (!n) return false;
        if (n.length === 1) return false;
        if (baslikGibiMi(n)) return false;
        return true;
    });
    return parcalar.map(kelimeBasHarfiBuyut).join(" ").trim();
}
function teknisyenKimlikUret(rawAd, kod = null) {
    const raw = safeString(rawAd);
    const kodFromText = kod || personelKoduBul(raw);
    const gorunenAd = gorunenAdDuzenle(raw);
    const anahtar = normalizeText(gorunenAd || raw).split(" ").filter((x)=>x.length > 1).join(" ").toLocaleUpperCase("tr-TR");
    return {
        kod: kodFromText,
        gorunenAd: gorunenAd || raw || "Bilinmeyen Teknisyen",
        anahtar: anahtar || normalizeText(raw || "Bilinmeyen Teknisyen").toLocaleUpperCase("tr-TR")
    };
}
function dahaIyiGorunenAd(mevcut, aday) {
    const a = safeString(aday).trim();
    const m = safeString(mevcut).trim();
    if (!m) return a;
    if (!a) return m;
    if (a.length > m.length) return a;
    return m;
}
function grandTotalMi(value) {
    const t = normalizeText(value);
    return t.includes("grand total") || t === "grand" || t === "total" || t === "toplam" || t === "genel toplam";
}
function baslikReferansTipi(text) {
    const t = normalizeText(text);
    if (t.includes("turkiye ortalama")) return "turkiye";
    if (t.includes("bolge ortalama")) return "bolge";
    if (t.includes("servis ortalama")) return "servis_ortalama";
    if (t.includes("servis toplam") || t === "toplam" || t.includes("genel toplam")) return "servis_toplam";
    return null;
}
function anaDegerSatiriMi(text, veriTuru) {
    const t = normalizeText(text);
    if (veriTuru === "nps") return t === "puan" || t.includes("nps puan") || t.includes("nps");
    if (veriTuru === "randevu") return t.includes("randevu") || t.includes("uyum") || t.includes("puan");
    if (veriTuru === "sikayet") return t.includes("sikayet") || t.includes("toplam") || t.includes("adet");
    if (veriTuru === "tamamlayici") return t.includes("tamamlayici") || t.includes("satis") || t.includes("adet");
    return t.includes("ek garanti") || t.includes("garanti") || t.includes("satis") || t.includes("adet");
}
function referansOrtalamaSec(turkiye, bolge) {
    const tr = Number(turkiye || 0);
    const bg = Number(bolge || 0);
    if (tr > 0 && bg > 0) return Math.max(tr, bg);
    if (tr > 0) return tr;
    if (bg > 0) return bg;
    return null;
}
function referansliPuan(teknisyenDegeri, referans) {
    const deger = Number(teknisyenDegeri || 0);
    const ref = Number(referans || 0);
    if (ref <= 0) return deger > 0 ? deger : null;
    return 100 + (deger - ref) / ref * 100;
}
function clamp(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    return Math.max(0, Math.min(150, value));
}
function sikayetPuanHesapla(teknisyenSikayet, servisToplam) {
    const toplam = Number(servisToplam || 0);
    const deger = Number(teknisyenSikayet || 0);
    if (toplam <= 0) return 100;
    const oran = deger / toplam * 100;
    return Math.max(0, 100 - oran);
}
function agirlikliToplam(values) {
    let toplamAgirlik = 0;
    let toplam = 0;
    Object.keys(agirliklar).forEach((key)=>{
        const value = values[key];
        if (value !== null && value !== undefined && Number.isFinite(value)) {
            toplamAgirlik += agirliklar[key];
            toplam += value * agirliklar[key];
        }
    });
    if (toplamAgirlik <= 0) return null;
    return toplam / toplamAgirlik;
}
function ortalamaIkiDeger(a, b) {
    const values = [
        a,
        b
    ].filter((x)=>typeof x === "number" && Number.isFinite(x));
    if (values.length === 0) return null;
    return values.reduce((sum, value)=>sum + value, 0) / values.length;
}
function tekilleNormalizeKayitlar(kayitlar) {
    const map = new Map();
    kayitlar.forEach((kayit)=>{
        const kimlik = teknisyenKimlikUret(kayit.teknisyen_gorunen_ad || kayit.teknisyen_ad_soyad, kayit.teknisyen_kodu);
        const clean = {
            ...kayit,
            teknisyen_anahtar: kimlik.anahtar,
            teknisyen_gorunen_ad: kimlik.gorunenAd,
            teknisyen_ad_soyad: kimlik.gorunenAd,
            teknisyen_kodu: kimlik.kod
        };
        const key = `${clean.yil}-${clean.ay}-${clean.veri_turu}-${clean.teknisyen_anahtar}`;
        const mevcut = map.get(key);
        if (!mevcut) {
            map.set(key, {
                ...clean,
                tekrar_sayisi: 1
            });
            return;
        }
        const tekrar = mevcut.tekrar_sayisi + 1;
        if (clean.veri_turu === "sikayet" || clean.veri_turu === "tamamlayici" || clean.veri_turu === "ek_garanti") {
            mevcut.teknisyen_degeri = Number(clean.teknisyen_degeri || 0);
            mevcut.servis_toplam = Number(clean.servis_toplam || mevcut.servis_toplam || 0);
            mevcut.servis_ortalama = clean.servis_ortalama || mevcut.servis_ortalama;
            mevcut.referans_ortalama = clean.referans_ortalama || mevcut.referans_ortalama;
            mevcut.teknisyen_sayisi = clean.teknisyen_sayisi || mevcut.teknisyen_sayisi;
        } else {
            mevcut.teknisyen_degeri = (Number(mevcut.teknisyen_degeri || 0) * mevcut.tekrar_sayisi + Number(clean.teknisyen_degeri || 0)) / tekrar;
        }
        mevcut.teknisyen_gorunen_ad = dahaIyiGorunenAd(mevcut.teknisyen_gorunen_ad, clean.teknisyen_gorunen_ad);
        mevcut.teknisyen_ad_soyad = mevcut.teknisyen_gorunen_ad;
        mevcut.tekrar_sayisi = tekrar;
        mevcut.yardimci_veriler = {
            ...mevcut.yardimci_veriler || {},
            ...clean.yardimci_veriler || {},
            tekrar_sayisi: tekrar,
            birlestirme: "Aynı teknisyen anahtarı ile gelen kayıtlar birleştirildi."
        };
        map.set(key, mevcut);
    });
    return Array.from(map.values()).map((item)=>{
        const { tekrar_sayisi, ...rest } = item;
        return rest;
    });
}
function puanSonuclariTekillestir(puanlar) {
    const map = new Map();
    puanlar.forEach((puan)=>{
        const key = [
            puan.yil,
            puan.ay === null || puan.ay === undefined ? "YIL" : String(puan.ay),
            puan.donem_tipi,
            puan.teknisyen_anahtar
        ].join("|");
        const mevcut = map.get(key);
        if (!mevcut) {
            map.set(key, puan);
            return;
        }
        map.set(key, {
            ...mevcut,
            teknisyen_gorunen_ad: dahaIyiGorunenAd(mevcut.teknisyen_gorunen_ad, puan.teknisyen_gorunen_ad),
            teknisyen_ad_soyad: dahaIyiGorunenAd(mevcut.teknisyen_ad_soyad, puan.teknisyen_ad_soyad),
            nps_deger: ortalamaIkiDeger(mevcut.nps_deger, puan.nps_deger),
            nps_referans: ortalamaIkiDeger(mevcut.nps_referans, puan.nps_referans),
            nps_puan: ortalamaIkiDeger(mevcut.nps_puan, puan.nps_puan),
            sikayet_deger: puan.sikayet_deger ?? mevcut.sikayet_deger,
            sikayet_servis_toplam: puan.sikayet_servis_toplam ?? mevcut.sikayet_servis_toplam,
            sikayet_oran: puan.sikayet_oran ?? mevcut.sikayet_oran,
            sikayet_puan: puan.sikayet_puan ?? mevcut.sikayet_puan,
            randevu_deger: ortalamaIkiDeger(mevcut.randevu_deger, puan.randevu_deger),
            randevu_referans: ortalamaIkiDeger(mevcut.randevu_referans, puan.randevu_referans),
            randevu_puan: ortalamaIkiDeger(mevcut.randevu_puan, puan.randevu_puan),
            tamamlayici_deger: puan.tamamlayici_deger ?? mevcut.tamamlayici_deger,
            tamamlayici_referans: puan.tamamlayici_referans ?? mevcut.tamamlayici_referans,
            tamamlayici_puan: puan.tamamlayici_puan ?? mevcut.tamamlayici_puan,
            ek_garanti_deger: puan.ek_garanti_deger ?? mevcut.ek_garanti_deger,
            ek_garanti_referans: puan.ek_garanti_referans ?? mevcut.ek_garanti_referans,
            ek_garanti_puan: puan.ek_garanti_puan ?? mevcut.ek_garanti_puan,
            toplam_puan: ortalamaIkiDeger(mevcut.toplam_puan, puan.toplam_puan),
            zayif_alanlar: Array.from(new Set([
                ...mevcut.zayif_alanlar || [],
                ...puan.zayif_alanlar || []
            ])),
            guclu_alanlar: Array.from(new Set([
                ...mevcut.guclu_alanlar || [],
                ...puan.guclu_alanlar || []
            ])),
            kisa_rapor: mevcut.kisa_rapor || puan.kisa_rapor,
            hesaplama_detayi: {
                ...mevcut.hesaplama_detayi || {},
                ...puan.hesaplama_detayi || {},
                tekillestirme: "Aynı yıl/ay/dönem/teknisyen anahtarına gelen puan sonucu tek kayda indirildi."
            }
        });
    });
    return Array.from(map.values());
}
function haricUygula(kayitlar, haricAnahtarlar) {
    return kayitlar.map((row)=>{
        const kimlik = teknisyenKimlikUret(row.teknisyen_gorunen_ad || row.teknisyen_ad_soyad, row.teknisyen_kodu);
        if (!haricAnahtarlar.has(kimlik.anahtar)) {
            return {
                ...row,
                teknisyen_anahtar: kimlik.anahtar,
                teknisyen_gorunen_ad: kimlik.gorunenAd,
                teknisyen_ad_soyad: kimlik.gorunenAd,
                teknisyen_kodu: kimlik.kod
            };
        }
        return {
            ...row,
            teknisyen_anahtar: kimlik.anahtar,
            teknisyen_gorunen_ad: kimlik.gorunenAd,
            teknisyen_ad_soyad: kimlik.gorunenAd,
            teknisyen_kodu: kimlik.kod,
            durum: "haric",
            haric_nedeni: "Hesaplama dışı teknisyen listesinde."
        };
    });
}
function kisaRaporUret(sonuc) {
    const zayif = [];
    const guclu = [];
    const kalemler = [
        {
            label: "NPS",
            puan: sonuc.nps_puan
        },
        {
            label: "Randevu",
            puan: sonuc.randevu_puan
        },
        {
            label: "Şikayet",
            puan: sonuc.sikayet_puan
        },
        {
            label: "Tamamlayıcı",
            puan: sonuc.tamamlayici_puan
        },
        {
            label: "Ek Garanti",
            puan: sonuc.ek_garanti_puan
        }
    ];
    kalemler.forEach((kalem)=>{
        if (kalem.puan === null || kalem.puan === undefined) return;
        if (kalem.puan < 95) zayif.push(kalem.label);
        if (kalem.puan >= 105) guclu.push(kalem.label);
    });
    const toplam = Number(sonuc.toplam_puan || 0);
    let rapor = toplam >= 110 ? "Genel performans servis ortalamasının belirgin üzerinde." : toplam >= 95 ? "Genel performans kabul edilebilir seviyede." : "Genel performans geliştirme ihtiyacı gösteriyor.";
    if (zayif.length > 0) rapor += ` Servis ortalamasının altında kalan alanlar: ${zayif.join(", ")}.`;
    if (guclu.length > 0) rapor += ` Güçlü alanlar: ${guclu.join(", ")}.`;
    return {
        zayif,
        guclu,
        rapor
    };
}
function matrixParser(raw, yil, ay, veriTuru) {
    const lines = satirlar(raw);
    if (lines.length < 2) return null;
    let headerIndex = -1;
    let headerKolonlari = [];
    for(let i = 0; i < lines.length; i++){
        const kolonlar = satirBol(lines[i]);
        const normalized = kolonlar.map(normalizeText);
        if (kolonlar.length >= 3 && normalized.some((x)=>x.includes("turkiye") || x.includes("bolge") || x.includes("toplam"))) {
            headerIndex = i;
            headerKolonlari = kolonlar;
            break;
        }
    }
    if (headerIndex === -1) return null;
    const hamSatirlar = lines.map((line, index)=>({
            yil,
            ay,
            veri_turu: veriTuru,
            satir_no: index + 1,
            ham_metin: line,
            satir_tipi: index === headerIndex ? "baslik" : "bilinmiyor",
            islenebilir: false,
            haric_nedeni: null
        }));
    const anaSatir = lines.slice(headerIndex + 1).map((line, localIndex)=>({
            line,
            globalIndex: headerIndex + 1 + localIndex,
            kolonlar: satirBol(line)
        })).find((row)=>anaDegerSatiriMi(row.kolonlar[0] || "", veriTuru));
    if (!anaSatir) {
        return {
            hamSatirlar,
            normalizeKayitlar: [],
            turkiyeOrtalama: null,
            bolgeOrtalama: null,
            servisToplam: null,
            servisOrtalama: null,
            teknisyenSayisi: 0,
            uyarilar: [
                "Ana değer satırı bulunamadı."
            ]
        };
    }
    hamSatirlar[anaSatir.globalIndex].satir_tipi = "teknisyen";
    hamSatirlar[anaSatir.globalIndex].islenebilir = true;
    let turkiyeOrtalama = null;
    let bolgeOrtalama = null;
    let servisToplam = null;
    let servisOrtalama = null;
    const normalizeKayitlar = [];
    for(let colIndex = 1; colIndex < headerKolonlari.length; colIndex++){
        const baslik = headerKolonlari[colIndex] || "";
        const deger = performansDegeriDuzelt(sayi(anaSatir.kolonlar[colIndex]), veriTuru);
        if (deger === 0) continue;
        const refTip = baslikReferansTipi(baslik);
        if (refTip === "turkiye") {
            turkiyeOrtalama = deger;
            continue;
        }
        if (refTip === "bolge") {
            bolgeOrtalama = deger;
            continue;
        }
        if (refTip === "servis_toplam") {
            servisToplam = deger;
            servisOrtalama = deger;
            continue;
        }
        if (refTip === "servis_ortalama") {
            servisOrtalama = deger;
            continue;
        }
        if (baslikGibiMi(baslik)) continue;
        const kimlik = teknisyenKimlikUret(baslik);
        if (!kimlik.anahtar || kimlik.gorunenAd.length < 3) continue;
        normalizeKayitlar.push({
            yil,
            ay,
            veri_turu: veriTuru,
            teknisyen_kodu: kimlik.kod,
            teknisyen_ad_soyad: kimlik.gorunenAd,
            teknisyen_anahtar: kimlik.anahtar,
            teknisyen_gorunen_ad: kimlik.gorunenAd,
            teknisyen_degeri: deger,
            turkiye_ortalama: null,
            bolge_ortalama: null,
            referans_ortalama: null,
            servis_toplam: null,
            servis_ortalama: null,
            teknisyen_sayisi: null,
            yardimci_veriler: {},
            durum: "aktif",
            haric_nedeni: null,
            aciklama: null
        });
    }
    const tekilKayitlar = tekilleNormalizeKayitlar(normalizeKayitlar);
    const teknisyenSayisi = tekilKayitlar.length;
    const toplam = tekilKayitlar.reduce((sum, row)=>sum + Number(row.teknisyen_degeri || 0), 0);
    const ortalama = teknisyenSayisi > 0 ? toplam / teknisyenSayisi : null;
    tekilKayitlar.forEach((row)=>{
        row.turkiye_ortalama = turkiyeOrtalama;
        row.bolge_ortalama = bolgeOrtalama;
        row.referans_ortalama = veriTuru === "nps" || veriTuru === "randevu" ? referansOrtalamaSec(turkiyeOrtalama, bolgeOrtalama) : veriTuru === "tamamlayici" || veriTuru === "ek_garanti" ? ortalama : null;
        row.servis_toplam = servisToplam || toplam;
        row.servis_ortalama = servisOrtalama || ortalama;
        row.teknisyen_sayisi = teknisyenSayisi;
    });
    return {
        hamSatirlar,
        normalizeKayitlar: tekilKayitlar,
        turkiyeOrtalama,
        bolgeOrtalama,
        servisToplam: servisToplam || toplam,
        servisOrtalama: servisOrtalama || ortalama,
        teknisyenSayisi,
        uyarilar: []
    };
}
function sikayetBaslikSatirindanTeknisyenleriBul(cells) {
    const sonuc = [];
    cells.forEach((cell, index)=>{
        const raw = safeString(cell).trim();
        if (!raw) return;
        if (grandTotalMi(raw)) return;
        if (baslikGibiMi(raw)) return;
        if (/^\d+(?:[.,]\d+)?$/.test(raw)) return;
        const kimlik = teknisyenKimlikUret(raw);
        const kelimeSayisi = kimlik.gorunenAd.split(" ").filter(Boolean).length;
        if (kimlik.anahtar && kimlik.gorunenAd.length >= 5 && kelimeSayisi >= 2) {
            sonuc.push({
                colIndex: index,
                kod: kimlik.kod,
                anahtar: kimlik.anahtar,
                gorunenAd: kimlik.gorunenAd
            });
        }
    });
    return sonuc;
}
function sikayetHeaderTekSatirdanAdlariAyikla(line) {
    const ham = safeString(line).replace(/grand\s+total/gi, " ").replace(/teknisyenleri\s+göster\s*\/\s*gizle/gi, " ").replace(/teknisyenleri\s+goster\s*\/\s*gizle/gi, " ").replace(/teknisyen/gi, " ").replace(/\d+(?:[.,]\d+)?/g, " ").replace(/\s+/g, " ").trim();
    if (!ham) return [];
    const tabliParcalar = ham.split(/\t|;|,/).map((x)=>x.trim()).filter(Boolean);
    if (tabliParcalar.length >= 2) {
        return tabliParcalar.map((ad, index)=>{
            const kimlik = teknisyenKimlikUret(ad);
            return {
                colIndex: index + 1,
                kod: kimlik.kod,
                anahtar: kimlik.anahtar,
                gorunenAd: kimlik.gorunenAd
            };
        }).filter((x)=>x.anahtar && x.gorunenAd.split(" ").filter(Boolean).length >= 2 && !baslikGibiMi(x.gorunenAd));
    }
    const kelimeler = ham.split(" ").map((x)=>x.trim()).filter(Boolean).filter((x)=>!baslikGibiMi(x));
    const soyadListesi = new Set([
        "kalan",
        "kaymaz",
        "akar",
        "aksahin",
        "akşahin",
        "tektas",
        "tektaş",
        "kirli",
        "kırlı",
        "cicek",
        "çiçek",
        "cetin",
        "çetin",
        "karagoz",
        "karagöz",
        "baran",
        "demir",
        "dogru",
        "doğru",
        "altunboga",
        "altunboğa",
        "ercan",
        "ciftcioglu",
        "çiftçioğlu",
        "sipal",
        "şıpal"
    ]);
    const adaylar = [];
    let i = 0;
    while(i < kelimeler.length){
        const k1 = kelimeler[i];
        const k2 = kelimeler[i + 1];
        if (!k1 || !k2) break;
        const ikiKelime = `${k1} ${k2}`;
        const ikiKimlik = teknisyenKimlikUret(ikiKelime);
        const k2Norm = normalizeText(k2);
        if (ikiKimlik.anahtar && ikiKimlik.gorunenAd.split(" ").filter(Boolean).length >= 2) {
            adaylar.push(ikiKimlik.gorunenAd);
            i += 2;
            continue;
        }
        if (soyadListesi.has(k2Norm)) {
            adaylar.push(ikiKimlik.gorunenAd);
            i += 2;
            continue;
        }
        i += 1;
    }
    return adaylar.map((ad, index)=>{
        const kimlik = teknisyenKimlikUret(ad);
        return {
            colIndex: index + 1,
            kod: kimlik.kod,
            anahtar: kimlik.anahtar,
            gorunenAd: kimlik.gorunenAd
        };
    }).filter((x)=>x.anahtar && x.gorunenAd.split(" ").filter(Boolean).length >= 2 && !baslikGibiMi(x.gorunenAd));
}
function sikayetMatrixParser(raw, yil, ay) {
    const lines = satirlar(raw);
    if (lines.length < 2) return null;
    const hamSatirlar = lines.map((line, index)=>({
            yil,
            ay,
            veri_turu: "sikayet",
            satir_no: index + 1,
            ham_metin: line,
            satir_tipi: "bilinmiyor",
            islenebilir: false,
            haric_nedeni: null
        }));
    let grandTotalRowIndex = -1;
    let grandTotalCells = [];
    let grandTotalNumbers = [];
    for(let i = lines.length - 1; i >= 0; i--){
        const line = lines[i];
        const cells = satirBol(line);
        const lineNorm = normalizeText(line);
        if (cells.some((cell)=>grandTotalMi(cell)) || lineNorm.includes("grand total") || lineNorm.includes("genel toplam")) {
            grandTotalRowIndex = i;
            grandTotalCells = cells;
            grandTotalNumbers = satirdanSayilariAl(line);
            hamSatirlar[i].satir_tipi = "yardimci";
            hamSatirlar[i].islenebilir = true;
            break;
        }
    }
    if (grandTotalRowIndex === -1) {
        return {
            hamSatirlar,
            normalizeKayitlar: [],
            turkiyeOrtalama: null,
            bolgeOrtalama: null,
            servisToplam: null,
            servisOrtalama: null,
            teknisyenSayisi: 0,
            uyarilar: [
                "Şikayet matrisinde Grand Total satırı bulunamadı. En altta teknisyen toplamları gerekir."
            ]
        };
    }
    let headerIndex = -1;
    let teknisyenKolonlari = [];
    for(let i = grandTotalRowIndex - 1; i >= 0; i--){
        const cells = satirBol(lines[i]);
        const adaylar = sikayetBaslikSatirindanTeknisyenleriBul(cells);
        if (adaylar.length >= 2) {
            headerIndex = i;
            teknisyenKolonlari = adaylar;
            break;
        }
        const tekSatirAdaylar = sikayetHeaderTekSatirdanAdlariAyikla(lines[i]);
        if (tekSatirAdaylar.length >= 2) {
            headerIndex = i;
            teknisyenKolonlari = tekSatirAdaylar;
            break;
        }
    }
    if (headerIndex === -1 || teknisyenKolonlari.length === 0) {
        return {
            hamSatirlar,
            normalizeKayitlar: [],
            turkiyeOrtalama: null,
            bolgeOrtalama: null,
            servisToplam: null,
            servisOrtalama: null,
            teknisyenSayisi: 0,
            uyarilar: [
                "Şikayet matrisinde teknisyen başlık satırı bulunamadı. Grand Total satırının üstünde teknisyen ad soyadlarının bulunduğu satır gerekir."
            ]
        };
    }
    hamSatirlar[headerIndex].satir_tipi = "baslik";
    hamSatirlar[headerIndex].islenebilir = true;
    const grandTotalCellIndex = grandTotalCells.findIndex((cell)=>grandTotalMi(cell));
    const grandTotalSonSayi = grandTotalNumbers.length > teknisyenKolonlari.length ? grandTotalNumbers[grandTotalNumbers.length - 1] : null;
    const teknisyenToplamlari = teknisyenKolonlari.map((teknisyen, index)=>{
        let value = 0;
        if (grandTotalCells.length > teknisyen.colIndex) {
            value = sayi(grandTotalCells[teknisyen.colIndex]);
        }
        if (value === 0 && grandTotalNumbers.length >= teknisyenKolonlari.length) {
            value = Number(grandTotalNumbers[index] || 0);
        }
        return value;
    });
    let servisToplam = teknisyenToplamlari.reduce((sum, value)=>sum + Number(value || 0), 0);
    if (grandTotalSonSayi && grandTotalSonSayi >= servisToplam) {
        servisToplam = grandTotalSonSayi;
    }
    const detayMap = new Map();
    for(let i = headerIndex + 1; i < grandTotalRowIndex; i++){
        const cells = satirBol(lines[i]);
        const ilkHucre = safeString(cells[0]).trim();
        const sikayetNedeni = ilkHucre && !/^\d+$/.test(ilkHucre) ? ilkHucre : "Şikayet detayı";
        let satirdaVeriVar = false;
        teknisyenKolonlari.forEach((teknisyen, index)=>{
            let adet = 0;
            if (cells.length > teknisyen.colIndex) {
                adet = sayi(cells[teknisyen.colIndex]);
            }
            if (adet === 0 && cells.length <= teknisyen.colIndex) {
                const nums = satirdanSayilariAl(lines[i]);
                adet = Number(nums[index] || 0);
            }
            if (adet > 0) {
                satirdaVeriVar = true;
                const mevcut = detayMap.get(teknisyen.anahtar) || [];
                mevcut.push({
                    sikayet_nedeni: sikayetNedeni,
                    adet
                });
                detayMap.set(teknisyen.anahtar, mevcut);
            }
        });
        hamSatirlar[i].satir_tipi = satirdaVeriVar ? "teknisyen" : "haric";
        hamSatirlar[i].islenebilir = satirdaVeriVar;
        hamSatirlar[i].haric_nedeni = satirdaVeriVar ? null : "Şikayet detay adedi okunmadı.";
    }
    const normalizeKayitlar = teknisyenKolonlari.map((teknisyen, index)=>{
        const toplamAdet = Number(teknisyenToplamlari[index] || 0);
        const detaylar = detayMap.get(teknisyen.anahtar) || [];
        const siraliDetaylar = [
            ...detaylar
        ].sort((a, b)=>b.adet - a.adet);
        return {
            yil,
            ay,
            veri_turu: "sikayet",
            teknisyen_kodu: teknisyen.kod,
            teknisyen_ad_soyad: teknisyen.gorunenAd,
            teknisyen_anahtar: teknisyen.anahtar,
            teknisyen_gorunen_ad: teknisyen.gorunenAd,
            teknisyen_degeri: toplamAdet,
            turkiye_ortalama: null,
            bolge_ortalama: null,
            referans_ortalama: null,
            servis_toplam: servisToplam,
            servis_ortalama: teknisyenKolonlari.length > 0 ? servisToplam / teknisyenKolonlari.length : null,
            teknisyen_sayisi: teknisyenKolonlari.length,
            yardimci_veriler: {
                okuma_tipi: "sikayet_grand_total_matrisi",
                header_index: headerIndex + 1,
                grand_total_index: grandTotalRowIndex + 1,
                grand_total_cell_index: grandTotalCellIndex,
                grand_total_sayilari: grandTotalNumbers,
                puanlama_esasi: "Puanlamaya Grand Total satırındaki teknisyen toplamları alınır. Şikayet detay satırları yalnızca analiz/öneri için kullanılır.",
                calisma_kurali: "Bu kayıt puanlamada ancak aynı ayda teknisyenin Randevuya Uyum kaydı varsa kullanılır. Randevu kaydı yoksa teknisyen o ay çalışmamış sayılır.",
                sikayet_detaylari: siraliDetaylar,
                en_yogun_sikayetler: siraliDetaylar.slice(0, 5)
            },
            durum: "aktif",
            haric_nedeni: null,
            aciklama: null
        };
    });
    return {
        hamSatirlar,
        normalizeKayitlar: tekilleNormalizeKayitlar(normalizeKayitlar),
        turkiyeOrtalama: null,
        bolgeOrtalama: null,
        servisToplam,
        servisOrtalama: teknisyenKolonlari.length > 0 ? servisToplam / teknisyenKolonlari.length : null,
        teknisyenSayisi: teknisyenKolonlari.length,
        uyarilar: []
    };
}
function satisTablosuParser(raw, yil, ay, veriTuru) {
    if (veriTuru !== "tamamlayici" && veriTuru !== "ek_garanti") return null;
    const lines = satirlar(raw);
    if (lines.length < 2) return null;
    const hamSatirlar = lines.map((line, index)=>({
            yil,
            ay,
            veri_turu: veriTuru,
            satir_no: index + 1,
            ham_metin: line,
            satir_tipi: "bilinmiyor",
            islenebilir: false,
            haric_nedeni: null
        }));
    const normalizeKayitlar = [];
    let servisToplam = null;
    const uyarilar = [];
    lines.forEach((line, index)=>{
        const temizSatir = safeString(line).replace(/\s+/g, " ").trim();
        const norm = normalizeText(temizSatir);
        if (!temizSatir) return;
        const isHeader = norm.includes("teknisyen") && (norm.includes("garanti") || norm.includes("malzeme") || norm.includes("iscilik") || norm.includes("toplam"));
        if (isHeader) {
            hamSatirlar[index].satir_tipi = "baslik";
            hamSatirlar[index].islenebilir = false;
            return;
        }
        const isTotalLine = norm.includes("tamamlayici urun toplam") || norm.includes("tamamlayici toplam") || norm.includes("ek garanti toplam") || norm.endsWith(" toplam") || norm === "toplam";
        if (isTotalLine) {
            const parasalDegerler = satirdanParaDegerleriAl(temizSatir);
            servisToplam = parasalDegerler.length > 0 ? parasalDegerler[parasalDegerler.length - 1] : servisToplam;
            hamSatirlar[index].satir_tipi = "yardimci";
            hamSatirlar[index].islenebilir = true;
            return;
        }
        const kodMatch = temizSatir.match(/^(\d{3,})\s+(.+)$/);
        if (!kodMatch) {
            hamSatirlar[index].satir_tipi = "haric";
            hamSatirlar[index].haric_nedeni = "Satış tablosunda teknisyen kodu ile başlayan satır değil.";
            return;
        }
        const teknisyenKodu = kodMatch[1];
        const kalan = kodMatch[2];
        const parasalDegerler = satirdanParaDegerleriAl(kalan);
        const toplamTutar = parasalDegerler.length > 0 ? parasalDegerler[parasalDegerler.length - 1] : 0;
        if (toplamTutar <= 0) {
            hamSatirlar[index].satir_tipi = "haric";
            hamSatirlar[index].haric_nedeni = "Satış toplam tutarı okunamadı.";
            return;
        }
        const lower = kalan.toLocaleLowerCase("tr-TR");
        const garantiKelimeIndexleri = [
            lower.indexOf("tamamlayiciurun"),
            lower.indexOf("tamamlayıcıurun"),
            lower.indexOf("tamamlayici urun"),
            lower.indexOf("tamamlayıcı ürün"),
            lower.indexOf("tamamlayici"),
            lower.indexOf("tamamlayıcı"),
            lower.indexOf("ekgaranti"),
            lower.indexOf("ek garanti"),
            lower.indexOf("garanti")
        ].filter((x)=>x >= 0);
        const adBolum = garantiKelimeIndexleri.length > 0 ? kalan.slice(0, Math.min(...garantiKelimeIndexleri)).trim() : kalan.replace(/\d[\d.,]*\s*₺?/g, " ").trim();
        const kimlik = teknisyenKimlikUret(`${teknisyenKodu} ${adBolum}`, teknisyenKodu);
        if (!kimlik.anahtar || kimlik.gorunenAd.length < 3 || baslikGibiMi(kimlik.gorunenAd)) {
            hamSatirlar[index].satir_tipi = "haric";
            hamSatirlar[index].haric_nedeni = "Teknisyen adı ayıklanamadı.";
            return;
        }
        const malzeme = parasalDegerler.length >= 4 ? parasalDegerler[0] : 0;
        const iscilik = parasalDegerler.length >= 4 ? parasalDegerler[1] : 0;
        const yanOdeme = parasalDegerler.length >= 4 ? parasalDegerler[2] : 0;
        normalizeKayitlar.push({
            yil,
            ay,
            veri_turu: veriTuru,
            teknisyen_kodu: kimlik.kod,
            teknisyen_ad_soyad: kimlik.gorunenAd,
            teknisyen_anahtar: kimlik.anahtar,
            teknisyen_gorunen_ad: kimlik.gorunenAd,
            teknisyen_degeri: toplamTutar,
            turkiye_ortalama: null,
            bolge_ortalama: null,
            referans_ortalama: null,
            servis_toplam: null,
            servis_ortalama: null,
            teknisyen_sayisi: null,
            yardimci_veriler: {
                okuma_tipi: "satis_tutari_tablosu",
                garanti_turu: veriTuru === "tamamlayici" ? "Tamamlayıcı Ürün" : "Ek Garanti",
                malzeme,
                iscilik,
                yan_odeme: yanOdeme,
                toplam_tutar: toplamTutar,
                puanlama_esasi: "Tamamlayıcı/Ek Garanti satışlarında puanlamaya en sağdaki Toplam tutarı alınır. Malzeme, işçilik ve yan ödeme sadece detay verisidir."
            },
            durum: "aktif",
            haric_nedeni: null,
            aciklama: null
        });
        hamSatirlar[index].satir_tipi = "teknisyen";
        hamSatirlar[index].islenebilir = true;
    });
    const tekilKayitlar = tekilleNormalizeKayitlar(normalizeKayitlar);
    const teknisyenSayisi = tekilKayitlar.length;
    const hesaplananToplam = tekilKayitlar.reduce((sum, row)=>sum + Number(row.teknisyen_degeri || 0), 0);
    const finalServisToplam = servisToplam && servisToplam > 0 ? servisToplam : hesaplananToplam;
    const servisOrtalama = teknisyenSayisi > 0 ? finalServisToplam / teknisyenSayisi : null;
    tekilKayitlar.forEach((row)=>{
        row.servis_toplam = finalServisToplam;
        row.servis_ortalama = servisOrtalama;
        row.teknisyen_sayisi = teknisyenSayisi;
        row.referans_ortalama = servisOrtalama;
    });
    if (tekilKayitlar.length === 0) {
        uyarilar.push("Tamamlayıcı/Ek Garanti satış satırı bulunamadı. Beklenen format: teknisyen kodu + ad soyad + garanti türü + toplam tutar.");
    }
    return {
        hamSatirlar,
        normalizeKayitlar: tekilKayitlar,
        turkiyeOrtalama: null,
        bolgeOrtalama: null,
        servisToplam: finalServisToplam,
        servisOrtalama,
        teknisyenSayisi,
        uyarilar
    };
}
function listParser(raw, yil, ay, veriTuru) {
    const lines = satirlar(raw);
    const hamSatirlar = [];
    const normalizeKayitlar = [];
    const uyarilar = [];
    let turkiyeOrtalama = null;
    let bolgeOrtalama = null;
    let servisToplam = null;
    let servisOrtalama = null;
    lines.forEach((line, index)=>{
        const clean = line.replace(/\s+/g, " ").trim();
        const t = normalizeText(clean);
        const sayilar = clean.match(/\d+(?:[.,]\d+)?\s*%?/g) || [];
        const sonDeger = sayilar.length > 0 ? performansDegeriDuzelt(sayi(sayilar[sayilar.length - 1]), veriTuru) : 0;
        let satirTipi = "bilinmiyor";
        let islenebilir = false;
        let haricNedeni = null;
        if (t.includes("turkiye ortalama")) {
            turkiyeOrtalama = sonDeger;
            satirTipi = "yardimci";
        } else if (t.includes("bolge ortalama")) {
            bolgeOrtalama = sonDeger;
            satirTipi = "yardimci";
        } else if (t.includes("servis toplam") || t === "toplam" || t.includes("genel toplam")) {
            servisToplam = sonDeger;
            satirTipi = "yardimci";
        } else if (t.includes("servis ortalama")) {
            servisOrtalama = sonDeger;
            satirTipi = "yardimci";
        } else if (baslikGibiMi(t)) {
            satirTipi = "yardimci";
            haricNedeni = "Teknisyen performans satırı değil.";
        } else {
            const kodluSatir = clean.match(/^(\d{3,})\s+(.+)$/);
            if (kodluSatir && sonDeger > 0) {
                const kod = kodluSatir[1];
                const kalan = kodluSatir[2];
                const kimlik = teknisyenKimlikUret(`${kod} ${kalan}`, kod);
                if (kimlik.anahtar && kimlik.gorunenAd.length >= 3 && !baslikGibiMi(kimlik.gorunenAd)) {
                    satirTipi = "teknisyen";
                    islenebilir = true;
                    normalizeKayitlar.push({
                        yil,
                        ay,
                        veri_turu: veriTuru,
                        teknisyen_kodu: kimlik.kod,
                        teknisyen_ad_soyad: kimlik.gorunenAd,
                        teknisyen_anahtar: kimlik.anahtar,
                        teknisyen_gorunen_ad: kimlik.gorunenAd,
                        teknisyen_degeri: sonDeger,
                        turkiye_ortalama: null,
                        bolge_ortalama: null,
                        referans_ortalama: null,
                        servis_toplam: null,
                        servis_ortalama: null,
                        teknisyen_sayisi: null,
                        yardimci_veriler: {},
                        durum: "aktif",
                        haric_nedeni: null,
                        aciklama: null
                    });
                } else {
                    satirTipi = "haric";
                    haricNedeni = "Teknisyen adı ayıklanamadı.";
                }
            } else {
                satirTipi = "haric";
                haricNedeni = "Kodlu teknisyen satırı değil.";
            }
        }
        hamSatirlar.push({
            yil,
            ay,
            veri_turu: veriTuru,
            satir_no: index + 1,
            ham_metin: line,
            satir_tipi: satirTipi,
            islenebilir,
            haric_nedeni: haricNedeni
        });
    });
    const tekilKayitlar = tekilleNormalizeKayitlar(normalizeKayitlar);
    const teknisyenSayisi = tekilKayitlar.length;
    const toplam = tekilKayitlar.reduce((sum, row)=>sum + Number(row.teknisyen_degeri || 0), 0);
    const ortalama = teknisyenSayisi > 0 ? toplam / teknisyenSayisi : null;
    if (!servisToplam) servisToplam = toplam;
    if (!servisOrtalama) servisOrtalama = ortalama;
    tekilKayitlar.forEach((row)=>{
        row.turkiye_ortalama = turkiyeOrtalama;
        row.bolge_ortalama = bolgeOrtalama;
        row.referans_ortalama = veriTuru === "nps" || veriTuru === "randevu" ? referansOrtalamaSec(turkiyeOrtalama, bolgeOrtalama) || ortalama : veriTuru === "tamamlayici" || veriTuru === "ek_garanti" ? ortalama : null;
        row.servis_toplam = servisToplam;
        row.servis_ortalama = servisOrtalama;
        row.teknisyen_sayisi = teknisyenSayisi;
    });
    if (tekilKayitlar.length === 0) {
        uyarilar.push("Teknisyen satırı bulunamadı. Dosyada teknisyen kodu + ad soyad + değer formatı beklenir.");
    }
    return {
        hamSatirlar,
        normalizeKayitlar: tekilKayitlar,
        turkiyeOrtalama,
        bolgeOrtalama,
        servisToplam,
        servisOrtalama,
        teknisyenSayisi,
        uyarilar
    };
}
function parsePerformansVerisi(raw, yil, ay, veriTuru) {
    if (veriTuru === "tamamlayici" || veriTuru === "ek_garanti") {
        const satisParser = satisTablosuParser(raw, yil, ay, veriTuru);
        if (satisParser && satisParser.normalizeKayitlar.length > 0) {
            return satisParser;
        }
    }
    if (veriTuru === "sikayet") {
        const sikayetMatrix = sikayetMatrixParser(raw, yil, ay);
        if (sikayetMatrix && sikayetMatrix.normalizeKayitlar.length > 0) {
            return sikayetMatrix;
        }
        if (sikayetMatrix && sikayetMatrix.uyarilar.length > 0) {
            return sikayetMatrix;
        }
    }
    const matrix = matrixParser(raw, yil, ay, veriTuru);
    if (matrix && matrix.normalizeKayitlar.length > 0) return matrix;
    const liste = listParser(raw, yil, ay, veriTuru);
    if (matrix?.uyarilar?.length) {
        liste.uyarilar.unshift(...matrix.uyarilar);
    }
    return liste;
}
function hesaplaPuanSonuclari(kayitlar, yil, haricAnahtarlar) {
    const aktif = tekilleNormalizeKayitlar(kayitlar).filter((row)=>{
        const kimlik = teknisyenKimlikUret(row.teknisyen_gorunen_ad || row.teknisyen_ad_soyad, row.teknisyen_kodu);
        return row.yil === yil && row.durum === "aktif" && !haricAnahtarlar.has(kimlik.anahtar);
    });
    const sonuc = [];
    const ayListesi = Array.from(new Set(aktif.map((x)=>x.ay))).sort((a, b)=>a - b);
    for (const aktifAy of ayListesi){
        const ayKayitlari = aktif.filter((x)=>x.ay === aktifAy);
        const aydaCalisanTeknisyenMap = new Map();
        ayKayitlari.filter((x)=>x.veri_turu === "randevu").forEach((row)=>{
            const kimlik = teknisyenKimlikUret(row.teknisyen_gorunen_ad || row.teknisyen_ad_soyad, row.teknisyen_kodu);
            const randevuReferans = row.referans_ortalama || referansOrtalamaSec(row.turkiye_ortalama || null, row.bolge_ortalama || null);
            const randevuPuan = clamp(referansliPuan(row.teknisyen_degeri, randevuReferans));
            if (row.teknisyen_degeri > 0 && randevuPuan !== null && randevuPuan > 0) {
                const mevcut = aydaCalisanTeknisyenMap.get(kimlik.anahtar);
                aydaCalisanTeknisyenMap.set(kimlik.anahtar, {
                    anahtar: kimlik.anahtar,
                    gorunenAd: dahaIyiGorunenAd(mevcut?.gorunenAd, kimlik.gorunenAd)
                });
            }
        });
        const aydaCalisanTeknisyenler = Array.from(aydaCalisanTeknisyenMap.values()).sort((a, b)=>a.gorunenAd.localeCompare(b.gorunenAd, "tr"));
        if (aydaCalisanTeknisyenler.length === 0) continue;
        const sikayetKayitlari = ayKayitlari.filter((x)=>x.veri_turu === "sikayet");
        const sikayetServisToplamKaynaklari = sikayetKayitlari.map((x)=>Number(x.servis_toplam || 0)).filter((x)=>Number.isFinite(x) && x > 0);
        const sikayetToplam = sikayetServisToplamKaynaklari.length > 0 ? Math.max(...sikayetServisToplamKaynaklari) : sikayetKayitlari.reduce((sum, row)=>sum + Number(row.teknisyen_degeri || 0), 0);
        const tamamlayiciKayitlari = ayKayitlari.filter((x)=>{
            if (x.veri_turu !== "tamamlayici") return false;
            const kimlik = teknisyenKimlikUret(x.teknisyen_gorunen_ad || x.teknisyen_ad_soyad, x.teknisyen_kodu);
            return aydaCalisanTeknisyenMap.has(kimlik.anahtar);
        });
        const ekGarantiKayitlari = ayKayitlari.filter((x)=>{
            if (x.veri_turu !== "ek_garanti") return false;
            const kimlik = teknisyenKimlikUret(x.teknisyen_gorunen_ad || x.teknisyen_ad_soyad, x.teknisyen_kodu);
            return aydaCalisanTeknisyenMap.has(kimlik.anahtar);
        });
        const tamamlayiciOrtalama = tamamlayiciKayitlari.length > 0 ? tamamlayiciKayitlari.reduce((sum, row)=>sum + Number(row.teknisyen_degeri || 0), 0) / tamamlayiciKayitlari.length : null;
        const ekGarantiOrtalama = ekGarantiKayitlari.length > 0 ? ekGarantiKayitlari.reduce((sum, row)=>sum + Number(row.teknisyen_degeri || 0), 0) / ekGarantiKayitlari.length : null;
        for (const teknisyen of aydaCalisanTeknisyenler){
            const tKayitlari = ayKayitlari.filter((x)=>{
                const kimlik = teknisyenKimlikUret(x.teknisyen_gorunen_ad || x.teknisyen_ad_soyad, x.teknisyen_kodu);
                return kimlik.anahtar === teknisyen.anahtar;
            });
            const randevu = tKayitlari.find((x)=>x.veri_turu === "randevu");
            const nps = tKayitlari.find((x)=>x.veri_turu === "nps");
            const sikayet = tKayitlari.find((x)=>x.veri_turu === "sikayet");
            const tamamlayici = tKayitlari.find((x)=>x.veri_turu === "tamamlayici");
            const ekGaranti = tKayitlari.find((x)=>x.veri_turu === "ek_garanti");
            const randevuReferans = randevu?.referans_ortalama || referansOrtalamaSec(randevu?.turkiye_ortalama || null, randevu?.bolge_ortalama || null);
            const randevuPuan = clamp(randevu ? referansliPuan(randevu.teknisyen_degeri, randevuReferans) : null);
            if (!randevu || randevu.teknisyen_degeri <= 0 || randevuPuan === null || randevuPuan <= 0) {
                continue;
            }
            const npsReferans = nps?.referans_ortalama || referansOrtalamaSec(nps?.turkiye_ortalama || null, nps?.bolge_ortalama || null);
            const npsPuan = clamp(nps ? referansliPuan(nps.teknisyen_degeri, npsReferans) : null);
            const sikayetDeger = Number(sikayet?.teknisyen_degeri || 0);
            const sikayetOran = sikayetToplam > 0 ? sikayetDeger / sikayetToplam * 100 : 0;
            const sikayetPuan = clamp(sikayetPuanHesapla(sikayetDeger, sikayetToplam));
            const gercekTamamlayiciSatis = Number(tamamlayici?.teknisyen_degeri ?? 0);
            const tamamlayiciSatis = Math.max(gercekTamamlayiciSatis, 1);
            const tamamlayiciPuan = clamp(tamamlayici ? referansliPuan(tamamlayiciSatis, tamamlayiciOrtalama) : null);
            const gercekEkGarantiSatis = Number(ekGaranti?.teknisyen_degeri ?? 0);
            const ekGarantiSatis = Math.max(gercekEkGarantiSatis, 1);
            const ekGarantiPuan = clamp(ekGaranti ? referansliPuan(ekGarantiSatis, ekGarantiOrtalama) : null);
            const toplamPuan = agirlikliToplam({
                nps: npsPuan,
                randevu: randevuPuan,
                sikayet: sikayetPuan,
                tamamlayici: tamamlayiciPuan,
                ek_garanti: ekGarantiPuan
            });
            const base = {
                yil,
                ay: aktifAy,
                donem_tipi: "aylik",
                teknisyen_ad_soyad: teknisyen.gorunenAd,
                teknisyen_anahtar: teknisyen.anahtar,
                teknisyen_gorunen_ad: teknisyen.gorunenAd,
                nps_deger: nps?.teknisyen_degeri ?? null,
                nps_referans: npsReferans ?? null,
                nps_puan: npsPuan,
                randevu_deger: randevu?.teknisyen_degeri ?? null,
                randevu_referans: randevuReferans ?? null,
                randevu_puan: randevuPuan,
                sikayet_deger: sikayetDeger,
                sikayet_servis_toplam: sikayetToplam,
                sikayet_oran: sikayetOran,
                sikayet_puan: sikayetPuan,
                tamamlayici_deger: tamamlayici?.teknisyen_degeri ?? null,
                tamamlayici_referans: tamamlayiciOrtalama,
                tamamlayici_puan: tamamlayiciPuan,
                ek_garanti_deger: ekGaranti?.teknisyen_degeri ?? null,
                ek_garanti_referans: ekGarantiOrtalama,
                ek_garanti_puan: ekGarantiPuan,
                toplam_puan: toplamPuan,
                zayif_alanlar: [],
                guclu_alanlar: [],
                kisa_rapor: null,
                hesaplama_detayi: {
                    agirliklar,
                    calisma_kurali: "Teknisyenin ilgili ayda Randevuya Uyum kaydı yoksa çalışmamış kabul edilir ve o ay hiçbir puanı hesaplanmaz.",
                    sikayet_kurali: "Çalışan teknisyen şikayet listesinde yoksa şikayet adedi 0 ve şikayet puanı 100 kabul edilir. Şikayet puanı = 100 - ((teknisyen şikayet adedi / toplam şikayet adedi) × 100).",
                    satis_kurali: "Tamamlayıcı ve Ek Garanti satışlarında puanlamaya en sağdaki Toplam tutarı alınır. Referans puan servis ortalamasıdır."
                }
            };
            const rapor = kisaRaporUret(base);
            base.zayif_alanlar = rapor.zayif;
            base.guclu_alanlar = rapor.guclu;
            base.kisa_rapor = rapor.rapor;
            sonuc.push(base);
        }
    }
    const yillikTeknisyenMap = new Map();
    sonuc.filter((x)=>x.donem_tipi === "aylik").forEach((row)=>{
        const mevcut = yillikTeknisyenMap.get(row.teknisyen_anahtar);
        yillikTeknisyenMap.set(row.teknisyen_anahtar, {
            anahtar: row.teknisyen_anahtar,
            gorunenAd: dahaIyiGorunenAd(mevcut?.gorunenAd, row.teknisyen_gorunen_ad || row.teknisyen_ad_soyad)
        });
    });
    const yillikTeknisyenler = Array.from(yillikTeknisyenMap.values());
    for (const teknisyen of yillikTeknisyenler){
        const ayliklar = sonuc.filter((x)=>x.teknisyen_anahtar === teknisyen.anahtar && x.donem_tipi === "aylik");
        if (ayliklar.length === 0) continue;
        const avg = (field)=>{
            const values = ayliklar.map((x)=>x[field]).filter((x)=>typeof x === "number" && Number.isFinite(x));
            if (values.length === 0) return null;
            return values.reduce((sum, value)=>sum + value, 0) / values.length;
        };
        const yillikSikayetDeger = ayliklar.reduce((sum, row)=>sum + Number(row.sikayet_deger || 0), 0);
        const yillikSikayetToplam = ayliklar.reduce((sum, row)=>sum + Number(row.sikayet_servis_toplam || 0), 0);
        const yillikSikayetOran = yillikSikayetToplam > 0 ? yillikSikayetDeger / yillikSikayetToplam * 100 : 0;
        const yillikSikayetPuan = clamp(sikayetPuanHesapla(yillikSikayetDeger, yillikSikayetToplam));
        const yillik = {
            yil,
            ay: null,
            donem_tipi: "yillik",
            teknisyen_ad_soyad: teknisyen.gorunenAd,
            teknisyen_anahtar: teknisyen.anahtar,
            teknisyen_gorunen_ad: teknisyen.gorunenAd,
            nps_deger: avg("nps_deger"),
            nps_referans: avg("nps_referans"),
            nps_puan: avg("nps_puan"),
            randevu_deger: avg("randevu_deger"),
            randevu_referans: avg("randevu_referans"),
            randevu_puan: avg("randevu_puan"),
            sikayet_deger: yillikSikayetDeger,
            sikayet_servis_toplam: yillikSikayetToplam,
            sikayet_oran: yillikSikayetOran,
            sikayet_puan: yillikSikayetPuan,
            tamamlayici_deger: avg("tamamlayici_deger"),
            tamamlayici_referans: avg("tamamlayici_referans"),
            tamamlayici_puan: avg("tamamlayici_puan"),
            ek_garanti_deger: avg("ek_garanti_deger"),
            ek_garanti_referans: avg("ek_garanti_referans"),
            ek_garanti_puan: avg("ek_garanti_puan"),
            toplam_puan: agirlikliToplam({
                nps: avg("nps_puan"),
                randevu: avg("randevu_puan"),
                sikayet: yillikSikayetPuan,
                tamamlayici: avg("tamamlayici_puan"),
                ek_garanti: avg("ek_garanti_puan")
            }),
            zayif_alanlar: [],
            guclu_alanlar: [],
            kisa_rapor: null,
            hesaplama_detayi: {
                aylik_kayit_sayisi: ayliklar.length,
                agirliklar,
                calisma_kurali: "Yıllık hesaplamaya sadece teknisyenin Randevuya Uyum kaydı bulunan çalıştığı aylar dahil edilmiştir.",
                sikayet_kurali: "Yıllık şikayet puanı, çalışılan ayların toplam teknisyen şikayeti / çalışılan ayların toplam servis şikayeti oranına göre hesaplanır."
            }
        };
        const rapor = kisaRaporUret(yillik);
        yillik.zayif_alanlar = rapor.zayif;
        yillik.guclu_alanlar = rapor.guclu;
        yillik.kisa_rapor = rapor.rapor;
        sonuc.push(yillik);
    }
    return puanSonuclariTekillestir(sonuc);
}
function sikayetAnalizRaporuUret(yillikKayitlar, teknisyenAnahtar) {
    const sikayetKayitlari = yillikKayitlar.filter((row)=>{
        const kimlik = teknisyenKimlikUret(row.teknisyen_gorunen_ad || row.teknisyen_ad_soyad, row.teknisyen_kodu);
        return row.veri_turu === "sikayet" && kimlik.anahtar === teknisyenAnahtar;
    });
    const detaySayac = new Map();
    sikayetKayitlari.forEach((row)=>{
        const detaylar = row.yardimci_veriler?.sikayet_detaylari || [];
        if (Array.isArray(detaylar)) {
            detaylar.forEach((detay)=>{
                const neden = safeString(detay?.sikayet_nedeni).trim();
                const adet = sayi(detay?.adet);
                if (!neden || adet <= 0) return;
                detaySayac.set(neden, (detaySayac.get(neden) || 0) + adet);
            });
        }
    });
    const detaylar = Array.from(detaySayac.entries()).map(([neden, adet])=>({
            neden,
            adet
        })).sort((a, b)=>b.adet - a.adet);
    if (detaylar.length === 0) {
        return {
            detaylar: [],
            rapor: "Bu teknisyen için şikayet detay analizi oluşturacak yeterli detay verisi bulunamadı."
        };
    }
    const ilkBes = detaylar.slice(0, 5);
    const nedenMetni = ilkBes.map((x)=>`${x.neden} (${x.adet})`).join(", ");
    const metin = detaylar.map((x)=>normalizeText(x.neden)).join(" ");
    const oneriler = [];
    if (metin.includes("randevu") || metin.includes("gelmediler") || metin.includes("saat")) {
        oneriler.push("Randevu takibi ve müşteriye zamanında bilgilendirme disiplini güçlendirilmeli.");
    }
    if (metin.includes("parca") || metin.includes("yedek") || metin.includes("kargo") || metin.includes("siparis")) {
        oneriler.push("Parça bekleme süreçlerinde müşteriye düzenli geri dönüş yapılmalı ve parça akışı daha sık takip edilmeli.");
    }
    if (metin.includes("ariza devam") || metin.includes("hizmetin uzun") || metin.includes("tamamlanmadi")) {
        oneriler.push("İlk seferde çözüm, teknik teşhis ve iş kapatma kalitesi ayrıca incelenmeli.");
    }
    if (metin.includes("bilgi verilmedi") || metin.includes("geri donus") || metin.includes("onay")) {
        oneriler.push("Müşteri iletişimi, onay sonrası geri dönüş ve işlem durumu açıklama alışkanlığı iyileştirilmeli.");
    }
    if (oneriler.length === 0) {
        oneriler.push("En yoğun şikayet başlıkları teknisyenle birlikte incelenmeli ve tekrar eden nedenler için süreç kontrol listesi uygulanmalı.");
    }
    return {
        detaylar,
        rapor: `Şikayetler en çok şu başlıklarda yoğunlaşıyor: ${nedenMetni}. ${oneriler.join(" ")}`
    };
}
function desteklenenDosyaMi(fileName) {
    const lower = fileName.toLocaleLowerCase("tr-TR");
    return lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt") || lower.endsWith(".pdf") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
}
async function excelDosyasiniOku(file) {
    const XLSX = await __turbopack_context__.A("[project]/node_modules/xlsx/xlsx.mjs [app-client] (ecmascript, async loader)");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
        type: "array"
    });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("Excel dosyasında okunacak sayfa bulunamadı.");
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: ""
    });
    return rows.map((row)=>row.map((cell)=>safeString(cell).trim()).join("\t")).join("\n");
}
async function metinDosyasiniOku(file) {
    return file.text();
}
async function gorselOcrOku(file) {
    const tesseract = await __turbopack_context__.A("[project]/node_modules/tesseract.js/src/index.js [app-client] (ecmascript, async loader)");
    const result = await tesseract.recognize(file, "tur+eng");
    return result?.data?.text || "";
}
async function pdfDosyasiniOku(file) {
    const pdfjsLib = await __turbopack_context__.A("[project]/node_modules/pdfjs-dist/legacy/build/pdf.mjs [app-client] (ecmascript, async loader)");
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
        data,
        disableWorker: true
    });
    const pdf = await loadingTask.promise;
    const textParts = [];
    for(let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++){
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item)=>item?.str || "").join("\t").trim();
        if (text) textParts.push(text);
    }
    const textBasedPdf = textParts.join("\n").trim();
    if (textBasedPdf.length >= 20) return textBasedPdf;
    const tesseract = await __turbopack_context__.A("[project]/node_modules/tesseract.js/src/index.js [app-client] (ecmascript, async loader)");
    const ocrParts = [];
    for(let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++){
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({
            scale: 2
        });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
            canvasContext: context,
            viewport
        }).promise;
        const result = await tesseract.recognize(canvas, "tur+eng");
        const text = result?.data?.text || "";
        if (text.trim()) ocrParts.push(text.trim());
    }
    return ocrParts.join("\n");
}
async function dosyaIceriginiOku(file) {
    const lower = file.name.toLocaleLowerCase("tr-TR");
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return excelDosyasiniOku(file);
    if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) return metinDosyasiniOku(file);
    if (lower.endsWith(".pdf")) return pdfDosyasiniOku(file);
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
        return gorselOcrOku(file);
    }
    throw new Error("Desteklenmeyen dosya türü.");
}
function chunkArray(items, chunkSize) {
    const chunks = [];
    for(let i = 0; i < items.length; i += chunkSize){
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}
export default function HizliPerformansPage() {
    const supabase = createClient();
    const dosyaInputRef = useRef(null);
    const [yil, setYil] = useState(varsayilanYil);
    const [ay, setAy] = useState(1);
    const [veriTuru, setVeriTuru] = useState("nps");
    const [aciklama, setAciklama] = useState("");
    const [hamVeri, setHamVeri] = useState("");
    const [dosyaAdi, setDosyaAdi] = useState("");
    const [dosyaOkunuyor, setDosyaOkunuyor] = useState(false);
    const [kaydediliyor, setKaydediliyor] = useState(false);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState(null);
    const [mesaj, setMesaj] = useState(null);
    const [normalizeKayitlar, setNormalizeKayitlar] = useState([]);
    const [puanSonuclari, setPuanSonuclari] = useState([]);
    const [haricTeknisyenler, setHaricTeknisyenler] = useState([]);
    const [seciliTeknisyenAnahtar, setSeciliTeknisyenAnahtar] = useState(null);
    const [filtreTeknisyen, setFiltreTeknisyen] = useState("tumu");
    const [filtreAy, setFiltreAy] = useState("tumu");
    const [filtreVeriTuru, setFiltreVeriTuru] = useState("tumu");
    const [siralam, setSiralam] = useState("toplam_desc");
    const [manuelHaricAd, setManuelHaricAd] = useState("");
    const [manuelHaricNeden, setManuelHaricNeden] = useState("Sistemde olmayan / hesaplama dışı teknisyen");
    const [haricKayitlariGoster, setHaricKayitlariGoster] = useState(false);
    const haricAktifAnahtarlar = useMemo(() => {
            return new Set(haricTeknisyenler.filter(((x)=>x.durum === "aktif"
            )).map(((x)=>x.teknisyen_anahtar
            )));
        }, [
        haricTeknisyenler
    ]);
    const parserSonucu = useMemo(() => {
            if (!hamVeri.trim()) return null;
            const sonuc = parsePerformansVerisi(hamVeri, yil, ay, veriTuru);
            return {
                ...sonuc,
                normalizeKayitlar: haricUygula(sonuc.normalizeKayitlar, haricAktifAnahtarlar)
            };
        }, [
        hamVeri,
        yil,
        ay,
        veriTuru,
        haricAktifAnahtarlar
    ]);
    const anaListe = useMemo(() => {
            const yillik = puanSonuclari.filter(((x)=>x.yil === yil && x.donem_tipi === "yillik"
            ));
            let liste = yillik.filter(((x)=>!haricAktifAnahtarlar.has(x.teknisyen_anahtar)
            )).map(((x)=>({
                        teknisyen_anahtar: x.teknisyen_anahtar,
                        teknisyen_gorunen_ad: x.teknisyen_gorunen_ad || x.teknisyen_ad_soyad,
                        nps_puan: x.nps_puan,
                        randevu_puan: x.randevu_puan,
                        sikayet_puan: x.sikayet_puan,
                        tamamlayici_puan: x.tamamlayici_puan,
                        ek_garanti_puan: x.ek_garanti_puan,
                        toplam_puan: x.toplam_puan,
                        harf_notu: harfNotu(x.toplam_puan)
                    })
            ));
            if (filtreTeknisyen !== "tumu") liste = liste.filter(((x)=>x.teknisyen_anahtar === filtreTeknisyen
            ));
            if (filtreVeriTuru !== "tumu") {
                const field = `${filtreVeriTuru}_puan`;
                liste = liste.filter(((x)=>typeof x[field] === "number"
                ));
            }
            if (siralam === "toplam_asc") liste.sort(((a, b)=>Number(a.toplam_puan || 0) - Number(b.toplam_puan || 0)
            ));
            else if (siralam === "nps_desc") liste.sort(((a, b)=>Number(b.nps_puan || 0) - Number(a.nps_puan || 0)
            ));
            else if (siralam === "randevu_desc") liste.sort(((a, b)=>Number(b.randevu_puan || 0) - Number(a.randevu_puan || 0)
            ));
            else if (siralam === "sikayet_desc") liste.sort(((a, b)=>Number(b.sikayet_puan || 0) - Number(a.sikayet_puan || 0)
            ));
            else liste.sort(((a, b)=>Number(b.toplam_puan || 0) - Number(a.toplam_puan || 0)
            ));
            return liste;
        }, [
        puanSonuclari,
        yil,
        filtreTeknisyen,
        filtreVeriTuru,
        siralam,
        haricAktifAnahtarlar
    ]);
    const teknisyenSecenekleri = useMemo(() => {
            const map = new Map();
            puanSonuclari.forEach(((x)=>{
                    if (haricAktifAnahtarlar.has(x.teknisyen_anahtar)) return;
                    map.set(x.teknisyen_anahtar, dahaIyiGorunenAd(map.get(x.teknisyen_anahtar), x.teknisyen_gorunen_ad || x.teknisyen_ad_soyad));
                }
            ));
            return Array.from(map.entries()).map((([anahtar, ad])=>({
                        anahtar,
                        ad
                    })
            )).sort(((a, b)=>a.ad.localeCompare(b.ad, "tr")
            ));
        }, [
        puanSonuclari,
        haricAktifAnahtarlar
    ]);
    const detayAyliklar = useMemo(() => {
            if (!seciliTeknisyenAnahtar || haricAktifAnahtarlar.has(seciliTeknisyenAnahtar)) return [];
            let liste = puanSonuclari.filter(((x)=>x.teknisyen_anahtar === seciliTeknisyenAnahtar && x.donem_tipi === "aylik"
            ));
            if (filtreAy !== "tumu") liste = liste.filter(((x)=>x.ay === Number(filtreAy)
            ));
            return liste.sort(((a, b)=>Number(a.ay || 0) - Number(b.ay || 0)
            ));
        }, [
        puanSonuclari,
        seciliTeknisyenAnahtar,
        filtreAy,
        haricAktifAnahtarlar
    ]);
    async function haricTeknisyenleriGetir() {
        const { data, error } = await supabase.from("performans_haric_teknisyenler").select("*").order("teknisyen_gorunen_ad");
        if (error) {
            setHata(error.message);
            setHaricTeknisyenler([]);
            return [];
        }
        const liste = data || [];
        setHaricTeknisyenler(liste);
        return liste;
    }
    async function verileriGetir() {
        setYukleniyor(true);
        setHata(null);
        const haricListe = await haricTeknisyenleriGetir();
        const aktifHaric = new Set(haricListe.filter((x)=>x.durum === "aktif").map((x)=>x.teknisyen_anahtar));
        const normalizeReq = await supabase.from("performans_normalize_kayitlar").select("*").eq("yil", yil).order("ay", {
            ascending: true
        }).order("teknisyen_gorunen_ad", {
            ascending: true
        });
        const puanReq = await supabase.from("performans_puan_sonuclari").select("*").eq("yil", yil).order("toplam_puan", {
            ascending: false
        });
        if (normalizeReq.error) {
            setHata(normalizeReq.error.message);
            setNormalizeKayitlar([]);
        } else {
            setNormalizeKayitlar((normalizeReq.data || []).filter((x)=>!aktifHaric.has(x.teknisyen_anahtar)));
        }
        if (puanReq.error) {
            setHata(puanReq.error.message);
            setPuanSonuclari([]);
        } else {
            setPuanSonuclari((puanReq.data || []).filter((x)=>!aktifHaric.has(x.teknisyen_anahtar)));
        }
        setYukleniyor(false);
    }
    useEffect(() => {
            verileriGetir();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
        yil
    ]);
    async function puanlariKaydet(puanlar) {
        await supabase.from("performans_puan_sonuclari").delete().eq("yil", yil);
        for (const parca of chunkArray(puanlar, 300)){
            const { error } = await supabase.from("performans_puan_sonuclari").insert(parca);
            if (error) throw new Error(error.message);
        }
    }
    async function tumYiliYenidenHesapla(haricListeParam) {
        setKaydediliyor(true);
        setHata(null);
        setMesaj("Yıl puanları yeniden hesaplanıyor...");
        try {
            const haricListe = haricListeParam || haricTeknisyenler;
            const aktifHaricAnahtarlar = new Set(haricListe.filter((x)=>x.durum === "aktif").map((x)=>x.teknisyen_anahtar));
            const normalizeReq = await supabase.from("performans_normalize_kayitlar").select("*").eq("yil", yil);
            if (normalizeReq.error) throw new Error(normalizeReq.error.message);
            const normalize = haricUygula(tekilleNormalizeKayitlar(normalizeReq.data || []), aktifHaricAnahtarlar);
            const puanlar = puanSonuclariTekillestir(hesaplaPuanSonuclari(normalize, yil, aktifHaricAnahtarlar));
            await puanlariKaydet(puanlar);
            setMesaj("Yıl puanları yeniden hesaplandı.");
            await verileriGetir();
        } catch (error) {
            setHata(`Hesaplama başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
            setMesaj(null);
        } finally{
            setKaydediliyor(false);
        }
    }
    async function dosyadanVeriAl(file) {
        setDosyaOkunuyor(true);
        setHata(null);
        setMesaj(null);
        setDosyaAdi(file.name);
        try {
            if (!desteklenenDosyaMi(file.name)) {
                setHata("Desteklenmeyen dosya türü. Excel, CSV, TXT, PDF, JPG, PNG veya WEBP dosyası seçin.");
                return;
            }
            const text = await dosyaIceriginiOku(file);
            if (!text.trim()) {
                setHata("Dosyadan okunabilir veri alınamadı.");
                return;
            }
            setHamVeri(text);
            setMesaj(`${file.name} dosyasından veri alındı. Önizlemeyi kontrol edip kaydedin.`);
        } catch (error) {
            setHata(`Dosya okunamadı: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
        } finally{
            setDosyaOkunuyor(false);
            if (dosyaInputRef.current) dosyaInputRef.current.value = "";
        }
    }
    async function kaydetVePuanla() {
        if (kaydediliyor) return;
        setKaydediliyor(true);
        setHata(null);
        setMesaj("Veri kaydı ve puan hesaplama başlatıldı...");
        try {
            const parseHam = parsePerformansVerisi(hamVeri, yil, ay, veriTuru);
            const parse = {
                ...parseHam,
                normalizeKayitlar: haricUygula(parseHam.normalizeKayitlar, haricAktifAnahtarlar)
            };
            if (parse.normalizeKayitlar.length === 0) {
                setHata("Kaydedilecek teknisyen satırı bulunamadı.");
                setMesaj(null);
                return;
            }
            const { data: dosya, error: dosyaError } = await supabase.from("performans_dosya_yuklemeleri").insert({
                yil,
                ay,
                veri_turu: veriTuru,
                dosya_adi: dosyaAdi || null,
                dosya_tipi: dosyaAdi ? dosyaAdi.split(".").pop() || null : null,
                kaynak: dosyaAdi ? "dosya" : "manuel",
                durum: "isleniyor",
                toplam_ham_satir: parse.hamSatirlar.length,
                toplam_normalize_kayit: parse.normalizeKayitlar.length,
                aciklama: aciklama || null
            }).select("id").single();
            if (dosyaError) throw new Error(dosyaError.message);
            const dosyaId = dosya.id;
            const hamPayload = parse.hamSatirlar.map((row)=>({
                    ...row,
                    dosya_yukleme_id: dosyaId
                }));
            for (const parca of chunkArray(hamPayload, 500)){
                const { error } = await supabase.from("performans_ham_satirlar").insert(parca);
                if (error) throw new Error(error.message);
            }
            await supabase.from("performans_normalize_kayitlar").delete().eq("yil", yil).eq("ay", ay).eq("veri_turu", veriTuru);
            const normalizePayload = parse.normalizeKayitlar.map((row)=>({
                    ...row,
                    dosya_yukleme_id: dosyaId,
                    aciklama: aciklama || null
                }));
            for (const parca of chunkArray(normalizePayload, 300)){
                const { error } = await supabase.from("performans_normalize_kayitlar").insert(parca);
                if (error) throw new Error(error.message);
            }
            await supabase.from("performans_dosya_yuklemeleri").update({
                durum: "tamamlandi"
            }).eq("id", dosyaId);
            const normalizeReq = await supabase.from("performans_normalize_kayitlar").select("*").eq("yil", yil);
            if (normalizeReq.error) throw new Error(normalizeReq.error.message);
            const normalize = haricUygula(tekilleNormalizeKayitlar(normalizeReq.data || []), haricAktifAnahtarlar);
            const puanlar = puanSonuclariTekillestir(hesaplaPuanSonuclari(normalize, yil, haricAktifAnahtarlar));
            await puanlariKaydet(puanlar);
            setMesaj(`${parse.normalizeKayitlar.length} tekil teknisyen kaydı işlendi ve puanlandı.`);
            setHamVeri("");
            setDosyaAdi("");
            await verileriGetir();
        } catch (error) {
            setHata(`Kayıt başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
            setMesaj(null);
        } finally{
            setKaydediliyor(false);
        }
    }
    async function haricTeknisyenEkle(ad, neden) {
        const kimlik = teknisyenKimlikUret(ad);
        if (!kimlik.anahtar || kimlik.gorunenAd.length < 3) {
            setHata("Hesaplama dışı eklenecek teknisyen adı geçerli değil.");
            return;
        }
        setKaydediliyor(true);
        setHata(null);
        setMesaj(null);
        try {
            const { error } = await supabase.from("performans_haric_teknisyenler").upsert({
                teknisyen_anahtar: kimlik.anahtar,
                teknisyen_gorunen_ad: kimlik.gorunenAd,
                teknisyen_kodu: kimlik.kod,
                durum: "aktif",
                haric_nedeni: neden || "Sistemde olmayan / hesaplama dışı teknisyen"
            }, {
                onConflict: "teknisyen_anahtar"
            });
            if (error) throw new Error(error.message);
            const yeniListe = await haricTeknisyenleriGetir();
            await tumYiliYenidenHesapla(yeniListe);
            setManuelHaricAd("");
            setMesaj(`${kimlik.gorunenAd} hesaplama dışı listeye eklendi.`);
        } catch (error) {
            setHata(`Hesaplama dışı ekleme başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
        } finally{
            setKaydediliyor(false);
        }
    }
    async function haricTeknisyenAktifEt(anahtar) {
        setKaydediliyor(true);
        setHata(null);
        setMesaj(null);
        try {
            const { error } = await supabase.from("performans_haric_teknisyenler").update({
                durum: "pasif"
            }).eq("teknisyen_anahtar", anahtar);
            if (error) throw new Error(error.message);
            const yeniListe = await haricTeknisyenleriGetir();
            await tumYiliYenidenHesapla(yeniListe);
            setMesaj("Teknisyen tekrar hesaplamaya dahil edildi.");
        } catch (error) {
            setHata(`Aktif etme başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
        } finally{
            setKaydediliyor(false);
        }
    }
    return (
<main id="performans-page" className="jsx-c97a05e23a4cf833 min-h-screen bg-slate-50 p-4 md:p-8">
    <Style id="c97a05e23a4cf833">{"#performans-page input,#performans-page textarea,#performans-page select{color:#0f172a!important;opacity:1!important;-webkit-text-fill-color:#0f172a!important;background-color:#fff!important}#performans-page input::placeholder,#performans-page textarea::placeholder{color:#64748b!important;opacity:1!important;-webkit-text-fill-color:#64748b!important}#performans-page select option{color:#0f172a!important;background-color:#fff!important}#performans-page label{font-weight:600;color:#1e293b!important}#performans-page table,#performans-page td,#performans-page th{color:#0f172a}"}</Style>
    <div className="jsx-c97a05e23a4cf833 mx-auto max-w-7xl space-y-6">
      <section className="jsx-c97a05e23a4cf833 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="jsx-c97a05e23a4cf833 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="jsx-c97a05e23a4cf833">
            <h1 className="jsx-c97a05e23a4cf833 text-2xl font-bold text-slate-900">
              Teknisyen Performans Ölçümleme Modülü
            </h1>
            <p className="jsx-c97a05e23a4cf833 text-sm text-slate-600">
              Çalışma kontrolü Randevuya Uyum verisinden yapılır. Randevu kaydı olmayan ay hiçbir puana dahil edilmez.
            </p>
          </div>
          <div className="jsx-c97a05e23a4cf833 flex flex-wrap gap-2">
            <button type="button" onClick={verileriGetir} className="jsx-c97a05e23a4cf833 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Yenile
            </button>
            <button type="button" onClick={() => tumYiliYenidenHesapla()} className="jsx-c97a05e23a4cf833 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
              Puanları Yeniden Hesapla
            </button>
          </div>
        </div>
      </section>
      {hata && (
        <div className="jsx-c97a05e23a4cf833 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {hata}
        </div>
      )}
      {mesaj && (
        <div className="jsx-c97a05e23a4cf833 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {mesaj}
        </div>
      )}
      <section className="jsx-c97a05e23a4cf833 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="jsx-c97a05e23a4cf833 text-lg font-bold text-slate-900">
          Veri Yükle
        </h2>
        <p className="jsx-c97a05e23a4cf833 mt-1 text-sm text-slate-500">
          Aynı yıl/ay/veri türü tekrar yüklenirse eski normalize kayıtlar yenilenir.
        </p>
        <div className="jsx-c97a05e23a4cf833 mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
          <Input label="Yıl" type="number" value={String(yil)} onChange={v => setYil(Number(v) || varsayilanYil)}></Input>
          <div className="jsx-c97a05e23a4cf833">
            <label className="jsx-c97a05e23a4cf833 mb-1 block text-sm">
              Ay
            </label>
            <select value={ay} onChange={e => setAy(Number(e.target.value))} className="jsx-c97a05e23a4cf833 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              {aylar.map(item =>               <option value={item.value} className="jsx-c97a05e23a4cf833">
                {item.label}
              </option>)}
            </select>
          </div>
          <div className="jsx-c97a05e23a4cf833">
            <label className="jsx-c97a05e23a4cf833 mb-1 block text-sm">
              Veri Türü
            </label>
            <select value={veriTuru} onChange={e => setVeriTuru(e.target.value)} className="jsx-c97a05e23a4cf833 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              {veriTurleri.filter(x => x.value !== "tumu").map(item =>               <option value={item.value} className="jsx-c97a05e23a4cf833">
                {item.label}
              </option>)}
            </select>
          </div>
          <Input label="Açıklama" value={aciklama} onChange={setAciklama} placeholder="İsteğe bağlı"></Input>
          <div className="jsx-c97a05e23a4cf833 flex items-end">
            <input ref={dosyaInputRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf,.jpg,.jpeg,.png,.webp" onChange={event => {
  const file = event.target.files?.[0];
  if (file) dosyadanVeriAl(file);
}} className="jsx-c97a05e23a4cf833 hidden" />
            <button type="button" onClick={() => dosyaInputRef.current?.click()} className="jsx-c97a05e23a4cf833 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              {dosyaOkunuyor ? "Okunuyor..." : "Dosyadan Veri Al"}
            </button>
          </div>
        </div>
        {dosyaAdi && (
          <div className="jsx-c97a05e23a4cf833 mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Seçilen dosya:
            <span className="jsx-c97a05e23a4cf833 font-semibold">
              {dosyaAdi}
            </span>
          </div>
        )}
        <div className="jsx-c97a05e23a4cf833 mt-4">
          <label className="jsx-c97a05e23a4cf833 mb-1 block text-sm">
            Okunan / Yapıştırılan Veri
          </label>
          <textarea value={hamVeri} onChange={e => setHamVeri(e.target.value)} placeholder="Veriyi buraya yapıştırın veya dosyadan alın..." className="jsx-c97a05e23a4cf833 min-h-48 w-full rounded-xl border border-slate-300 px-3 py-3 font-mono text-sm outline-none focus:border-slate-900"></textarea>
        </div>
        {parserSonucu && (
          <div className="jsx-c97a05e23a4cf833 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="jsx-c97a05e23a4cf833 grid grid-cols-1 gap-3 md:grid-cols-5">
              <MiniMetrik label="Tekil Teknisyen" value={parserSonucu.normalizeKayitlar.length}></MiniMetrik>
              <MiniMetrik label="Türkiye Ort." value={parserSonucu.turkiyeOrtalama}></MiniMetrik>
              <MiniMetrik label="Bölge Ort." value={parserSonucu.bolgeOrtalama}></MiniMetrik>
              <MiniMetrik label="Servis Toplam" value={parserSonucu.servisToplam}></MiniMetrik>
              <MiniMetrik label="Servis Ort." value={parserSonucu.servisOrtalama}></MiniMetrik>
            </div>
            {parserSonucu.uyarilar.length > 0 && (
              <div className="jsx-c97a05e23a4cf833 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {parserSonucu.uyarilar.join(" ")}
              </div>
            )}
            {parserSonucu.normalizeKayitlar.length > 0 && (
              <div className="jsx-c97a05e23a4cf833 mt-4 max-h-64 overflow-auto rounded-xl bg-white">
                <table className="jsx-c97a05e23a4cf833 min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="jsx-c97a05e23a4cf833">
                    <tr className="jsx-c97a05e23a4cf833 bg-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="jsx-c97a05e23a4cf833 px-3 py-2">
                        Teknisyen
                      </th>
                      <th className="jsx-c97a05e23a4cf833 px-3 py-2">
                        Durum
                      </th>
                      <th className="jsx-c97a05e23a4cf833 px-3 py-2">
                        Veri Türü
                      </th>
                      <th className="jsx-c97a05e23a4cf833 px-3 py-2 text-right">
                        Değer
                      </th>
                      <th className="jsx-c97a05e23a4cf833 px-3 py-2 text-right">
                        Referans
                      </th>
                      <th className="jsx-c97a05e23a4cf833 px-3 py-2 text-right">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="jsx-c97a05e23a4cf833 divide-y divide-slate-100">
                    {parserSonucu.normalizeKayitlar.slice(0, 100).map((row, index) =>                     <tr className={"jsx-c97a05e23a4cf833" + " " + ((row.durum === "haric" ? "bg-amber-50" : "") || "")}>
                      <td className="jsx-c97a05e23a4cf833 px-3 py-2 font-semibold">
                        {row.teknisyen_gorunen_ad}
                      </td>
                      <td className="jsx-c97a05e23a4cf833 px-3 py-2">
                        {row.durum === "haric" ?                         <span className="jsx-c97a05e23a4cf833 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                          Hesaplama Dışı
                        </span> :                         <span className="jsx-c97a05e23a4cf833 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                          Aktif
                        </span>}
                      </td>
                      <td className="jsx-c97a05e23a4cf833 px-3 py-2">
                        {veriTuruAdi(row.veri_turu)}
                      </td>
                      <td className="jsx-c97a05e23a4cf833 px-3 py-2 text-right">
                        {formatNumber(row.teknisyen_degeri)}
                      </td>
                      <td className="jsx-c97a05e23a4cf833 px-3 py-2 text-right">
                        {formatNumber(row.referans_ortalama)}
                      </td>
                      <td className="jsx-c97a05e23a4cf833 px-3 py-2 text-right">
                        {row.durum === "haric" ?                         <span className="jsx-c97a05e23a4cf833 text-xs text-slate-500">
                          Dışarıda
                        </span> :                         <button type="button" onClick={() => haricTeknisyenEkle(row.teknisyen_gorunen_ad, "Önizlemeden hesaplama dışı yapıldı")} className="jsx-c97a05e23a4cf833 rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                          Hesaplama Dışı Yap
                        </button>}
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <div className="jsx-c97a05e23a4cf833 mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => {
  setHamVeri("");
  setDosyaAdi("");
  setMesaj(null);
  setHata(null);
}} className="jsx-c97a05e23a4cf833 rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Temizle
          </button>
          <button type="button" onClick={kaydetVePuanla} className="jsx-c97a05e23a4cf833 rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600">
            {kaydediliyor ? "Kaydediliyor..." : "Onayla, Kaydet ve Puanla"}
          </button>
        </div>
      </section>
      <section className="jsx-c97a05e23a4cf833 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="jsx-c97a05e23a4cf833 text-lg font-bold text-slate-900">
          Hesaplama Dışı Teknisyen Ekle
        </h2>
        <p className="jsx-c97a05e23a4cf833 mt-1 text-sm text-slate-500">
          Buraya eklenen teknisyenler ana sıralamada, filtrelerde ve detay ekranlarında görünmez; performans hesabına dahil edilmez.
        </p>
        <div className="jsx-c97a05e23a4cf833 mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input label="Teknisyen Adı" value={manuelHaricAd} onChange={setManuelHaricAd} placeholder="Örn: Mehmet Veysi Çetin"></Input>
          <Input label="Hariç Nedeni" value={manuelHaricNeden} onChange={setManuelHaricNeden} placeholder="Örn: Sistemde olmayan teknisyen"></Input>
          <div className="jsx-c97a05e23a4cf833 flex items-end">
            <button type="button" onClick={() => haricTeknisyenEkle(manuelHaricAd, manuelHaricNeden)} className="jsx-c97a05e23a4cf833 w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500">
              Hesaplama Dışı Ekle
            </button>
          </div>
          <div className="jsx-c97a05e23a4cf833 flex items-end">
            <button type="button" onClick={() => tumYiliYenidenHesapla()} className="jsx-c97a05e23a4cf833 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Puanları Güncelle
            </button>
          </div>
        </div>
        <div className="jsx-c97a05e23a4cf833 mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          Aktif hesaplama dışı teknisyen sayısı:
          <span className="jsx-c97a05e23a4cf833 font-bold text-slate-900">
            {haricTeknisyenler.filter(x => x.durum === "aktif").length}
          </span>
        </div>
        <div className="jsx-c97a05e23a4cf833 mt-3">
          <button type="button" onClick={() => setHaricKayitlariGoster(prev => !prev)} className="jsx-c97a05e23a4cf833 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            {haricKayitlariGoster ? "Dışlanan Kayıtları Gizle" : "Dışlanan Kayıtları Kayıtlardan Çağır"}
          </button>
        </div>
        {haricKayitlariGoster && (
          <div className="jsx-c97a05e23a4cf833 mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="jsx-c97a05e23a4cf833 min-w-full divide-y divide-slate-200 text-sm">
              <thead className="jsx-c97a05e23a4cf833">
                <tr className="jsx-c97a05e23a4cf833 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3">
                    Teknisyen
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3">
                    Anahtar
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3">
                    Durum
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3">
                    Neden
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="jsx-c97a05e23a4cf833 divide-y divide-slate-100">
                {haricTeknisyenler.length === 0 ?                 <tr className="jsx-c97a05e23a4cf833">
                  <td colSpan={5} className="jsx-c97a05e23a4cf833 px-3 py-8 text-center text-slate-500">
                    Hesaplama dışı teknisyen yok.
                  </td>
                </tr> : haricTeknisyenler.map(item =>                 <tr className={"jsx-c97a05e23a4cf833" + " " + ((item.durum === "aktif" ? "bg-amber-50" : "") || "")}>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 font-bold">
                    {item.teknisyen_gorunen_ad}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-xs text-slate-500">
                    {item.teknisyen_anahtar}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3">
                    {item.durum === "aktif" ?                     <span className="jsx-c97a05e23a4cf833 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                      Hesaplama Dışı
                    </span> :                     <span className="jsx-c97a05e23a4cf833 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                      Pasif
                    </span>}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3">
                    {item.haric_nedeni || "-"}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    {item.durum === "aktif" ?                     <button type="button" onClick={() => haricTeknisyenAktifEt(item.teknisyen_anahtar)} className="jsx-c97a05e23a4cf833 rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                      Aktif Et
                    </button> :                     <button type="button" onClick={() => haricTeknisyenEkle(item.teknisyen_gorunen_ad, item.haric_nedeni || undefined)} className="jsx-c97a05e23a4cf833 rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                      Tekrar Dışla
                    </button>}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="jsx-c97a05e23a4cf833 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="jsx-c97a05e23a4cf833 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="jsx-c97a05e23a4cf833">
            <h2 className="jsx-c97a05e23a4cf833 text-lg font-bold text-slate-900">
              Teknisyen Sıralaması
            </h2>
            <p className="jsx-c97a05e23a4cf833 mt-1 text-sm text-slate-500">
              Hesaplama dışı teknisyenler bu listede, filtrelerde ve detaylarda gösterilmez.
            </p>
          </div>
          <div className="jsx-c97a05e23a4cf833 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="jsx-c97a05e23a4cf833">
              <label className="jsx-c97a05e23a4cf833 mb-1 block text-sm">
                Teknisyen
              </label>
              <select value={filtreTeknisyen} onChange={e => setFiltreTeknisyen(e.target.value)} className="jsx-c97a05e23a4cf833 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="tumu" className="jsx-c97a05e23a4cf833">
                  Tümü
                </option>
                {teknisyenSecenekleri.map(item =>                 <option value={item.anahtar} className="jsx-c97a05e23a4cf833">
                  {item.ad}
                </option>)}
              </select>
            </div>
            <div className="jsx-c97a05e23a4cf833">
              <label className="jsx-c97a05e23a4cf833 mb-1 block text-sm">
                Ay
              </label>
              <select value={filtreAy} onChange={e => setFiltreAy(e.target.value)} className="jsx-c97a05e23a4cf833 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="tumu" className="jsx-c97a05e23a4cf833">
                  Tümü
                </option>
                {aylar.map(item =>                 <option value={item.value} className="jsx-c97a05e23a4cf833">
                  {item.label}
                </option>)}
              </select>
            </div>
            <div className="jsx-c97a05e23a4cf833">
              <label className="jsx-c97a05e23a4cf833 mb-1 block text-sm">
                Grup
              </label>
              <select value={filtreVeriTuru} onChange={e => setFiltreVeriTuru(e.target.value)} className="jsx-c97a05e23a4cf833 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                {veriTurleri.map(item =>                 <option value={item.value} className="jsx-c97a05e23a4cf833">
                  {item.label}
                </option>)}
              </select>
            </div>
            <div className="jsx-c97a05e23a4cf833">
              <label className="jsx-c97a05e23a4cf833 mb-1 block text-sm">
                Sıralama
              </label>
              <select value={siralam} onChange={e => setSiralam(e.target.value)} className="jsx-c97a05e23a4cf833 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="toplam_desc" className="jsx-c97a05e23a4cf833">
                  Toplam En Yüksek
                </option>
                <option value="toplam_asc" className="jsx-c97a05e23a4cf833">
                  Toplam En Düşük
                </option>
                <option value="nps_desc" className="jsx-c97a05e23a4cf833">
                  NPS En Yüksek
                </option>
                <option value="randevu_desc" className="jsx-c97a05e23a4cf833">
                  Randevu En Yüksek
                </option>
                <option value="sikayet_desc" className="jsx-c97a05e23a4cf833">
                  Şikayet Puanı En Yüksek
                </option>
              </select>
            </div>
          </div>
        </div>
        <div className="jsx-c97a05e23a4cf833 mt-4 overflow-x-auto">
          <table className="jsx-c97a05e23a4cf833 min-w-full divide-y divide-slate-200 text-sm">
            <thead className="jsx-c97a05e23a4cf833">
              <tr className="jsx-c97a05e23a4cf833 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="jsx-c97a05e23a4cf833 px-3 py-3">
                  Detay
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3">
                  Teknisyen
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  NPS
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  Randevu
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  Şikayet
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  Tamamlayıcı
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  Ek Garanti
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-center">
                  Harf
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  Yıl Toplam
                </th>
              </tr>
            </thead>
            <tbody className="jsx-c97a05e23a4cf833 divide-y divide-slate-100">
              {yukleniyor ?               <tr className="jsx-c97a05e23a4cf833">
                <td colSpan={9} className="jsx-c97a05e23a4cf833 px-3 py-8 text-center text-slate-500">
                  Yükleniyor...
                </td>
              </tr> : anaListe.length === 0 ?               <tr className="jsx-c97a05e23a4cf833">
                <td colSpan={9} className="jsx-c97a05e23a4cf833 px-3 py-8 text-center text-slate-500">
                  Henüz performans kaydı yok.
                </td>
              </tr> : anaListe.map(row =>               <tr className="jsx-c97a05e23a4cf833">
                <td className="jsx-c97a05e23a4cf833 px-3 py-3">
                  <button type="button" onClick={() => setSeciliTeknisyenAnahtar(seciliTeknisyenAnahtar === row.teknisyen_anahtar ? null : row.teknisyen_anahtar)} className="jsx-c97a05e23a4cf833 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700">
                    Detay
                  </button>
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 font-bold text-slate-900">
                  {row.teknisyen_gorunen_ad}
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  {formatNumber(row.nps_puan)}
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  {formatNumber(row.randevu_puan)}
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  {formatNumber(row.sikayet_puan)}
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  {formatNumber(row.tamamlayici_puan)}
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                  {formatNumber(row.ek_garanti_puan)}
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-center">
                  <span className="jsx-c97a05e23a4cf833 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                    {row.harf_notu}
                  </span>
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right text-base font-bold">
                  {formatNumber(row.toplam_puan)}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      {seciliTeknisyenAnahtar && !haricAktifAnahtarlar.has(seciliTeknisyenAnahtar) && (
        <section className="jsx-c97a05e23a4cf833 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="jsx-c97a05e23a4cf833 text-lg font-bold text-slate-900">
            {teknisyenSecenekleri.find(x => x.anahtar === seciliTeknisyenAnahtar)?.ad || seciliTeknisyenAnahtar}
            Detay Raporu
          </h2>
          <div className="jsx-c97a05e23a4cf833 mt-4 overflow-x-auto">
            <table className="jsx-c97a05e23a4cf833 min-w-full divide-y divide-slate-200 text-sm">
              <thead className="jsx-c97a05e23a4cf833">
                <tr className="jsx-c97a05e23a4cf833 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3">
                    Ay
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    NPS
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    Randevu
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    Şikayet
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    Tamamlayıcı
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    Ek Garanti
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-center">
                    Harf
                  </th>
                  <th className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="jsx-c97a05e23a4cf833 divide-y divide-slate-100">
                {detayAyliklar.map(row =>                 <tr className="jsx-c97a05e23a4cf833">
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 font-semibold">
                    {ayAdi(row.ay)}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    {formatNumber(row.nps_puan)}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    {formatNumber(row.randevu_puan)}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    {formatNumber(row.sikayet_puan)}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    {formatNumber(row.tamamlayici_puan)}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right">
                    {formatNumber(row.ek_garanti_puan)}
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-center">
                    <span className="jsx-c97a05e23a4cf833 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                      {harfNotu(row.toplam_puan)}
                    </span>
                  </td>
                  <td className="jsx-c97a05e23a4cf833 px-3 py-3 text-right font-bold">
                    {formatNumber(row.toplam_puan)}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {(() => {
  const yillik = puanSonuclari.find(x => x.teknisyen_anahtar === seciliTeknisyenAnahtar && x.donem_tipi === "yillik");
  if (!yillik) return null;
  const sikayetAnaliz = sikayetAnalizRaporuUret(normalizeKayitlar, seciliTeknisyenAnahtar);
  return   <div className="jsx-c97a05e23a4cf833 mt-4 space-y-4">
    <div className="jsx-c97a05e23a4cf833 rounded-xl bg-slate-50 p-4">
      <h3 className="jsx-c97a05e23a4cf833 font-bold text-slate-900">
        Kısa Performans Raporu
      </h3>
      <p className="jsx-c97a05e23a4cf833 mt-2 text-sm text-slate-700">
        {yillik.kisa_rapor || "Rapor üretilemedi."}
      </p>
      {yillik.zayif_alanlar.length > 0 && (
        <div className="jsx-c97a05e23a4cf833 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Zayıf alanlar:
          <span className="jsx-c97a05e23a4cf833 font-bold">
            {yillik.zayif_alanlar.join(", ")}
          </span>
        </div>
      )}
      {yillik.guclu_alanlar.length > 0 && (
        <div className="jsx-c97a05e23a4cf833 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Güçlü alanlar:
          <span className="jsx-c97a05e23a4cf833 font-bold">
            {yillik.guclu_alanlar.join(", ")}
          </span>
        </div>
      )}
    </div>
    {sikayetAnaliz.detaylar.length > 0 && (
      <div className="jsx-c97a05e23a4cf833 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="jsx-c97a05e23a4cf833 font-bold text-amber-900">
          Şikayet Analizi ve Öneri
        </h3>
        <p className="jsx-c97a05e23a4cf833 mt-2 text-sm text-amber-800">
          {sikayetAnaliz.rapor}
        </p>
        <div className="jsx-c97a05e23a4cf833 mt-3 overflow-x-auto rounded-xl bg-white">
          <table className="jsx-c97a05e23a4cf833 min-w-full divide-y divide-amber-100 text-sm">
            <thead className="jsx-c97a05e23a4cf833">
              <tr className="jsx-c97a05e23a4cf833 bg-amber-100 text-left text-xs font-semibold uppercase text-amber-800">
                <th className="jsx-c97a05e23a4cf833 px-3 py-2">
                  Şikayet Nedeni
                </th>
                <th className="jsx-c97a05e23a4cf833 px-3 py-2 text-right">
                  Adet
                </th>
              </tr>
            </thead>
            <tbody className="jsx-c97a05e23a4cf833 divide-y divide-amber-50">
              {sikayetAnaliz.detaylar.slice(0, 10).map(item =>               <tr className="jsx-c97a05e23a4cf833">
                <td className="jsx-c97a05e23a4cf833 px-3 py-2">
                  {item.neden}
                </td>
                <td className="jsx-c97a05e23a4cf833 px-3 py-2 text-right font-bold">
                  {item.adet}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
})()}
        </section>
      )}
    </div>
  </main>
    );
}

function Input({ label, value, onChange, type = "text", placeholder }) {
    return (
    <div>
      <label className="mb-1 block text-sm">
        {label}
      </label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" />
    </div>
    );
}
function MiniMetrik({ label, value }) {
    return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
    );
}

