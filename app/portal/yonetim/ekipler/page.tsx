"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function YonetimEkiplerPage() {
  const router = useRouter()

  const [personeller, setPersoneller] = useState<any[]>([])
  const [araclar, setAraclar] = useState<any[]>([])
  const [ekipler, setEkipler] = useState<any[]>([])
  const [uyeler, setUyeler] = useState<any[]>([])
  const [mesaj, setMesaj] = useState("")
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const [form, setForm] = useState({
    ekip_adi: "",
    lider_personel_id: "",
    sorumlu_personel_id: "",
    arac_varlik_id: "",
    bolge: "",
    gorev: "",
    aciklama: "",
  })

  const [seciliEkipId, setSeciliEkipId] = useState("")
  const [seciliPersonelId, setSeciliPersonelId] = useState("")

  useEffect(() => {
    yukle()
  }, [])

  async function yukle() {
    setLoading(true)
    const supabase = createClient()

    const { data: personelData } = await supabase
      .from("personeller")
      .select("id, ad, soyad")
      .order("ad", { ascending: true })

    const { data: aracData } = await supabase
      .from("varliklar")
      .select("id, ad, plaka, demirbas_no, marka, model")
      .eq("kategori", "Araç")
      .order("ad", { ascending: true })

    const { data: ekipData } = await supabase
      .from("ekipler")
      .select("id, ekip_adi, lider_personel_id, sorumlu_personel_id, arac_varlik_id, bolge, gorev, created_at")
      .order("created_at", { ascending: false })

    const { data: uyeData } = await supabase
      .from("ekip_uyeleri")
      .select("id, ekip_id, personel_id, rol, created_at")
      .order("created_at", { ascending: true })

    setPersoneller(personelData || [])
    setAraclar(aracData || [])
    setEkipler(ekipData || [])
    setUyeler(uyeData || [])
    setLoading(false)
  }

  function personelAdi(id: string) {
    const p = personeller.find((x) => x.id === id)
    return p ? `${p.ad || ""} ${p.soyad || ""}`.trim() : "-"
  }

  function aracAdi(id: string) {
    const a = araclar.find((x) => x.id === id)
    if (!a) return "-"
    return `${a.plaka || a.demirbas_no || ""} ${a.marka || ""} ${a.model || ""}`.trim()
  }

  function ekipUyeleri(ekipId: string) {
    return uyeler.filter((u) => u.ekip_id === ekipId)
  }

  async function ekipOlustur() {
    setMesaj("")

    if (!form.ekip_adi.trim()) {
      setMesaj("Ekip adı zorunludur.")
      return
    }

    if (!form.lider_personel_id) {
      setMesaj("Lider seçmelisiniz.")
      return
    }

    if (!form.sorumlu_personel_id) {
      setMesaj("Sorumlu seçmelisiniz.")
      return
    }

    setKaydediliyor(true)
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      setMesaj("Oturum bulunamadı. Lütfen tekrar giriş yapın.")
      setKaydediliyor(false)
      return
    }

    const { data: mevcutPersonel } = await supabase
      .from("personeller")
      .select("sirket_id")
      .or(`auth_id.eq.${session.user.id},kullanici_id.eq.${session.user.id}`)
      .limit(1)
      .maybeSingle()

    if (!mevcutPersonel?.sirket_id) {
      setMesaj("Şirket ID bulunamadı. Giriş yapan kullanıcı personel kaydında sirket_id dolu olmalı.")
      setKaydediliyor(false)
      return
    }

    const { data: yeniEkip, error } = await supabase
      .from("ekipler")
      .insert({
        sirket_id: mevcutPersonel.sirket_id,
        ekip_adi: form.ekip_adi.trim(),
        lider_personel_id: form.lider_personel_id,
        sorumlu_personel_id: form.sorumlu_personel_id,
        arac_varlik_id: form.arac_varlik_id || null,
        bolge: form.bolge.trim() || null,
        gorev: form.gorev.trim() || null,
        aciklama: form.aciklama.trim() || null,
        durum: "aktif",
      })
      .select("id")
      .maybeSingle()

    if (error || !yeniEkip?.id) {
      setMesaj("Ekip oluşturulamadı: " + (error?.message || "Bilinmeyen hata"))
      setKaydediliyor(false)
      return
    }

    await supabase.from("ekip_uyeleri").upsert(
      [
        {
          ekip_id: yeniEkip.id,
          personel_id: form.lider_personel_id,
          rol: "lider",
          durum: "aktif",
        },
        {
          ekip_id: yeniEkip.id,
          personel_id: form.sorumlu_personel_id,
          rol: "sorumlu",
          durum: "aktif",
        },
      ],
      { onConflict: "ekip_id,personel_id" },
    )

    setForm({
      ekip_adi: "",
      lider_personel_id: "",
      sorumlu_personel_id: "",
      arac_varlik_id: "",
      bolge: "",
      gorev: "",
      aciklama: "",
    })

    setMesaj("Ekip başarıyla oluşturuldu.")
    await yukle()
    setKaydediliyor(false)
  }

  async function uyeEkle() {
    setMesaj("")

    if (!seciliEkipId || !seciliPersonelId) {
      setMesaj("Ekip ve personel seçmelisiniz.")
      return
    }

    const supabase = createClient()

    const { error } = await supabase.from("ekip_uyeleri").upsert(
      {
        ekip_id: seciliEkipId,
        personel_id: seciliPersonelId,
        rol: "eleman",
        durum: "aktif",
      },
      { onConflict: "ekip_id,personel_id" },
    )

    if (error) {
      setMesaj("Üye eklenemedi: " + error.message)
      return
    }

    setSeciliPersonelId("")
    setMesaj("Personel ekibe eklendi.")
    await yukle()
  }

  async function uyeSil(id: string) {
    const supabase = createClient()

    await supabase.from("ekip_uyeleri").delete().eq("id", id)

    setMesaj("Üye ekipten çıkarıldı.")
    await yukle()
  }

  if (loading) {
    return <div className="p-6 font-bold">Yükleniyor...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.push("/portal")} className="text-2xl font-bold">
          ←
        </button>
        <div>
          <h1 className="text-xl font-black">Ekip Yönetimi</h1>
          <p className="text-xs font-semibold text-gray-700">
            Ekip oluştur, lider/sorumlu/araç/bölge/görev tanımla
          </p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {mesaj && (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm font-bold text-blue-900">
            {mesaj}
          </div>
        )}

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black">Yeni Ekip Oluştur</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <input
              value={form.ekip_adi}
              onChange={(e) => setForm({ ...form, ekip_adi: e.target.value })}
              placeholder="Ekip adı"
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />

            <select
              value={form.lider_personel_id}
              onChange={(e) => setForm({ ...form, lider_personel_id: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Lider seç</option>
              {personeller.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>

            <select
              value={form.sorumlu_personel_id}
              onChange={(e) => setForm({ ...form, sorumlu_personel_id: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Sorumlu seç</option>
              {personeller.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>

            <select
              value={form.arac_varlik_id}
              onChange={(e) => setForm({ ...form, arac_varlik_id: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Araç seç</option>
              {araclar.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.plaka || a.demirbas_no || a.ad} {a.marka || ""} {a.model || ""}
                </option>
              ))}
            </select>

            <input
              value={form.bolge}
              onChange={(e) => setForm({ ...form, bolge: e.target.value })}
              placeholder="Bölge"
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />

            <input
              value={form.gorev}
              onChange={(e) => setForm({ ...form, gorev: e.target.value })}
              placeholder="Görev"
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />

            <input
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              placeholder="Açıklama"
              className="md:col-span-6 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />
          </div>

          <button
            onClick={ekipOlustur}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Ekip Oluştur"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black">Ekibe Eleman Ekle</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <select
              value={seciliEkipId}
              onChange={(e) => setSeciliEkipId(e.target.value)}
              className="md:col-span-5 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Ekip seç</option>
              {ekipler.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.ekip_adi}
                </option>
              ))}
            </select>

            <select
              value={seciliPersonelId}
              onChange={(e) => setSeciliPersonelId(e.target.value)}
              className="md:col-span-5 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Personel seç</option>
              {personeller.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>

            <button
              onClick={uyeEkle}
              className="md:col-span-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-black text-white"
            >
              Ekle
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black">Ekip Listesi</h2>

          {ekipler.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center font-bold text-gray-600">
              Ekip kaydı yok.
            </div>
          ) : (
            ekipler.map((e) => (
              <div key={e.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-lg font-black">{e.ekip_adi}</p>
                <p className="text-sm font-semibold text-gray-700">
                  Görev: {e.gorev || "-"} · Bölge: {e.bolge || "-"}
                </p>
                <p className="text-xs font-bold text-gray-600 mt-1">
                  Lider: {personelAdi(e.lider_personel_id)} · Sorumlu:{" "}
                  {personelAdi(e.sorumlu_personel_id)}
                </p>
                <p className="text-xs font-bold text-gray-600">
                  Araç: {aracAdi(e.arac_varlik_id)}
                </p>
                <div className="mt-3 flex gap-2">
  {e.aktif ? (
    <button
      onClick={() => alert('Ekip durum değiştirme işlemi sonraki sürümde aktif edilecektir.')}
      className="rounded bg-orange-600 px-3 py-2 text-xs font-black text-white"
    >
      Pasife Al
    </button>
  ) : (
    <button
      onClick={() => alert('Ekip durum değiştirme işlemi sonraki sürümde aktif edilecektir.')}
      className="rounded bg-green-700 px-3 py-2 text-xs font-black text-white"
    >
      Aktif Yap
    </button>
  )}
</div>
                <div className="mt-3 rounded-xl bg-gray-50 border p-3">
                  <p className="text-xs font-black mb-2">Üyeler</p>

                  {ekipUyeleri(e.id).length === 0 ? (
                    <p className="text-xs font-semibold text-gray-600">Üye yok.</p>
                  ) : (
                    ekipUyeleri(e.id).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded-lg bg-white border px-2 py-2 mb-1"
                      >
                        <p className="text-xs font-bold">
                          {personelAdi(u.personel_id)} - {u.rol}
                        </p>
                        <button
                          onClick={() => uyeSil(u.id)}
                          className="rounded bg-red-700 px-2 py-1 text-[11px] font-black text-white"
                        >
                          Çıkar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
