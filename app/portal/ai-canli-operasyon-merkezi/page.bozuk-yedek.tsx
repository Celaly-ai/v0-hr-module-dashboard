"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  aiCanliOperasyonGorevDurumuGuncelle,
  aiCanliOperasyonVerisiGetir,
  aiCanliOperasyondanGorevOlustur,
  aiEnUygunPersonellerGetir,
  aiGorevAtanabilirPersonellerGetir,
  aiGorevGecmisiGetir,
  aiGorevPersonelAta,
  type AiGorevAtanabilirPersonel,
  type AiGorevGecmisiKaydi,
  type AiOnerilenPersonel,
} from "@/lib/services/ai-live-operations-service"
import type {
  AiCanliOperasyonKayit,
  AiCanliOperasyonVeri,
} from "@/lib/types/ai-live-operations"

const BOS_VERI: AiCanliOperasyonVeri = {
  kpi: {
    aktifGorev: 0,
    sahadakiEkip: 0,
    riskliIs: 0,
    tamamlanan: 0,
  },
  kayitlar: [],
  uyarilar: [],
}

export function useAiLiveOperations() {
  const supabase = useMemo(() => createClient(), [])

  const [veri, setVeri] = useState<AiCanliOperasyonVeri>(BOS_VERI)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sonGuncelleme, setSonGuncelleme] = useState<Date | null>(null)
  const [guncellenenKayitId, setGuncellenenKayitId] = useState<string | null>(null)
  const [gorevOlusturulanKayitId, setGorevOlusturulanKayitId] = useState<string | null>(null)
  const [sonIslemMesaji, setSonIslemMesaji] = useState<string | null>(null)

  const [atanabilirPersoneller, setAtanabilirPersoneller] = useState<
    AiGorevAtanabilirPersonel[]
  >([])
  const [atanabilirPersonellerLoading, setAtanabilirPersonellerLoading] =
    useState(true)

  const [onerilenPersoneller, setOnerilenPersoneller] = useState<
    AiOnerilenPersonel[]
  >([])
  const [onerilenPersonellerLoading, setOnerilenPersonellerLoading] =
    useState(true)

  const [gorevGecmisleri, setGorevGecmisleri] = useState<
    Record<string, AiGorevGecmisiKaydi[]>
  >({})
  const [gorevGecmisiLoadingId, setGorevGecmisiLoadingId] = useState<string | null>(
    null,
  )

  const verileriYenile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const sonuc = await aiCanliOperasyonVerisiGetir(supabase)
      setVeri(sonuc)
      setSonGuncelleme(new Date())
    } catch (err: any) {
      setError(err?.message || "AI canlı operasyon verileri yenilenemedi.")
      setVeri(BOS_VERI)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const atanabilirPersonelleriYenile = useCallback(async () => {
    setAtanabilirPersonellerLoading(true)

    try {
      const sonuc = await aiGorevAtanabilirPersonellerGetir(supabase)

      if (sonuc.error) {
        setError(sonuc.error)
        setAtanabilirPersoneller([])
        return
      }

      setAtanabilirPersoneller(sonuc.personeller)
    } catch (err: any) {
      setError(err?.message || "Atanabilir personel listesi okunamadı.")
      setAtanabilirPersoneller([])
    } finally {
      setAtanabilirPersonellerLoading(false)
    }
  }, [supabase])

  const onerilenPersonelleriYenile = useCallback(async () => {
    setOnerilenPersonellerLoading(true)

    try {
      const sonuc = await aiEnUygunPersonellerGetir(supabase, 5)

      if (sonuc.error) {
        setError(sonuc.error)
        setOnerilenPersoneller([])
        return
      }

      setOnerilenPersoneller(sonuc.personeller)
    } catch (err: any) {
      setError(err?.message || "AI önerilen personeller okunamadı.")
      setOnerilenPersoneller([])
    } finally {
      setOnerilenPersonellerLoading(false)
    }
  }, [supabase])

  const gorevGecmisiGetir = useCallback(
    async (kayitId: string) => {
      setGorevGecmisiLoadingId(kayitId)
      setError(null)

      try {
        const sonuc = await aiGorevGecmisiGetir(supabase, kayitId)

        if (sonuc.error) {
          setError(sonuc.error)
          return false
        }

        setGorevGecmisleri((onceki) => ({
          ...onceki,
          [kayitId]: sonuc.gecmis,
        }))

        return true
      } catch (err: any) {
        setError(err?.message || "Görev geçmişi okunamadı.")
        return false
      } finally {
        setGorevGecmisiLoadingId(null)
      }
    },
    [supabase],
  )

  const gorevDurumuGuncelle = useCallback(
    async (
      kayitId: string,
      yeniDurum: "acik" | "inceleniyor" | "tamamlandi" | "arsivlendi",
    ) => {
      setGuncellenenKayitId(kayitId)
      setError(null)
      setSonIslemMesaji(null)

      try {
        const sonuc = await aiCanliOperasyonGorevDurumuGuncelle(
          supabase,
          kayitId,
          yeniDurum,
        )

        if (!sonuc.success) {
          setError(sonuc.error || "Görev durumu güncellenemedi.")
          return false
        }

        setSonIslemMesaji("Görev durumu güncellendi.")
        await verileriYenile()
        await gorevGecmisiGetir(kayitId)
        return true
      } catch (err: any) {
        setError(err?.message || "Görev durumu güncellenemedi.")
        return false
      } finally {
        setGuncellenenKayitId(null)
      }
    },
    [supabase, verileriYenile, gorevGecmisiGetir],
  )

  const gorevPersonelAta = useCallback(
    async (kayitId: string, personelKodu: string) => {
      setGuncellenenKayitId(kayitId)
      setError(null)
      setSonIslemMesaji(null)

      try {
        const sonuc = await aiGorevPersonelAta(supabase, kayitId, personelKodu)

        if (!sonuc.success) {
          setError(sonuc.error || "Göreve personel atanamadı.")
          return false
        }

        setSonIslemMesaji("Göreve personel atandı.")
        await verileriYenile()
        await gorevGecmisiGetir(kayitId)
        await onerilenPersonelleriYenile()
        return true
      } catch (err: any) {
        setError(err?.message || "Göreve personel atanamadı.")
        return false
      } finally {
        setGuncellenenKayitId(null)
      }
    },
    [supabase, verileriYenile, gorevGecmisiGetir, onerilenPersonelleriYenile],
  )

  const canliOperasyondanGorevOlustur = useCallback(
    async (kayit: AiCanliOperasyonKayit) => {
      setGorevOlusturulanKayitId(kayit.id)
      setError(null)
      setSonIslemMesaji(null)

      try {
        const sonuc = await aiCanliOperasyondanGorevOlustur(supabase, kayit)

        if (!sonuc.success) {
          setError(sonuc.error || "Canlı operasyon kaydından görev oluşturulamadı.")
          return false
        }

        setSonIslemMesaji(
          sonuc.already_exists
            ? "Bu canlı operasyon kaydı için görev zaten oluşturulmuş."
            : "Canlı operasyon kaydından AI görevi oluşturuldu.",
        )

        await verileriYenile()
        await onerilenPersonelleriYenile()
        return true
      } catch (err: any) {
        setError(err?.message || "Canlı operasyon kaydından görev oluşturulamadı.")
        return false
      } finally {
        setGorevOlusturulanKayitId(null)
      }
    },
    [supabase, verileriYenile, onerilenPersonelleriYenile],
  )

  useEffect(() => {
    verileriYenile()
    atanabilirPersonelleriYenile()
    onerilenPersonelleriYenile()
  }, [verileriYenile, atanabilirPersonelleriYenile, onerilenPersonelleriYenile])

  return {
    veri,
    loading,
    error,
    sonGuncelleme,
    guncellenenKayitId,
    gorevOlusturulanKayitId,
    sonIslemMesaji,
    atanabilirPersoneller,
    atanabilirPersonellerLoading,
    onerilenPersoneller,
    onerilenPersonellerLoading,
    gorevGecmisleri,
    gorevGecmisiLoadingId,
    verileriYenile,
    atanabilirPersonelleriYenile,
    onerilenPersonelleriYenile,
    gorevGecmisiGetir,
    gorevDurumuGuncelle,
    gorevPersonelAta,
    canliOperasyondanGorevOlustur,
  }
}