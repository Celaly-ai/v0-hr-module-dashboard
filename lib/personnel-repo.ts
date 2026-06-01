
import { createClient } from "@/lib/supabase/client"
import type { Employee } from "@/lib/hr-data"

interface PersonnelRow {
  id: string
  ad: string
  soyad: string
  email: string | null
  departman: string | null
  unvan: string | null
  durum: string
  ise_giris: string | null
  tel: string | null
  lokasyon: string | null
  tc_no: string | null
  dogum_tarihi: string | null
  kan_grubu: string | null
  acil_kisi: string | null
  acil_tel: string | null
  egitim_durumu: string | null
  calisma_tipi: string | null
  sgk_no: string | null
  iban: string | null
  cinsiyet: string | null
  rol: string | null
  il: string | null
ilce: string | null
adres: string | null
acil_yakinlik: string | null
vergi_no: string | null
mahalle: string | null
sgk_baslangic: string | null
brut_maas: number | null
  
}

const PERSONNEL_SELECT =
  "id, ad, soyad, email, departman, unvan, durum, ise_giris, tel, lokasyon, tc_no, dogum_tarihi, kan_grubu, acil_kisi, acil_tel, egitim_durumu, calisma_tipi, sgk_no, iban, cinsiyet, rol, il, ilce, adres, acil_yakinlik, vergi_no, mahalle, sgk_baslangic, brut_maas"


function rowToEmployee(row: PersonnelRow): Employee {
  return {
    id: row.id,
    name: `${row.ad} ${row.soyad}`.trim(),
    email: row.email ?? "",
    avatar: "",
    department: row.departman ?? "",
    position: row.unvan ?? "",
    status: (row.durum ?? "active") as Employee["status"],
    startDate: row.ise_giris ?? "",
    phone: row.tel ?? "",
    location: row.lokasyon ?? "",
    tcKimlikNo: row.tc_no ?? "",
    birthDate: row.dogum_tarihi ?? "",
    bloodType: (row.kan_grubu ?? "A+") as Employee["bloodType"],
    emergencyContactName: row.acil_kisi ?? "",
    emergencyContactPhone: row.acil_tel ?? "",
    educationLevel: (row.egitim_durumu ?? "lisans") as Employee["educationLevel"],
    militaryStatus: "yapilmadi" as Employee["militaryStatus"],
    contractType: "belirsiz" as Employee["contractType"],
    contractEndDate: null,
    workType: (row.calisma_tipi ?? "tam-zamanli") as Employee["workType"],
    sgkStartDate: row.sgk_baslangic ?? "",
    
    probationEndDate: null,
    iban: row.iban ?? "",
    rol: row.rol ?? "calisan",
    emergencyContactRelation: row.acil_yakinlik ?? "",

    gender: (row.cinsiyet ?? "") as Employee["gender"],
            city: row.il ?? "",
    district: row.ilce ?? "",
            neighborhood: row.mahalle ?? "",
            openAddress: row.adres ?? "",

    


    grossSalary: row.brut_maas ?? 0,

  }
}

export type NewEmployeeInput = Omit<Employee, "id">

export async function listPersonnel(): Promise<Employee[]> {
  const supabase = createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("personeller")
    .select(PERSONNEL_SELECT)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToEmployee(r as PersonnelRow))
}

export async function createPersonnel(input: NewEmployeeInput): Promise<Employee> {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase yapilandirilmadi.")

    const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Kullanici bulunamadi.")
  const { data: profile } = await supabase
    .from("profiles")
    .select("sirket_id")
    .eq("id", user.id)
    .single()
  const sirketId = profile?.sirket_id ?? null

  const nameParts = input.name.trim().split(" ")
  const soyad = nameParts.length > 1 ? nameParts.pop()! : ""
  const ad = nameParts.join(" ")

  const { data, error } = await supabase
    .from("personeller")
    .insert({
      ad,
      soyad,
      email: input.email || null,
      departman: input.department || null,
      unvan: input.position || null,
      durum: input.status,
      ise_giris: input.startDate || null,
      tel: input.phone || null,
      lokasyon: input.location || null,
      tc_no: input.tcKimlikNo || null,
      dogum_tarihi: input.birthDate || null,
      kan_grubu: input.bloodType || null,
      acil_kisi: input.emergencyContactName || null,
      acil_tel: input.emergencyContactPhone || null,
      egitim_durumu: input.educationLevel || null,
      calisma_tipi: input.workType || null,
      iban: input.iban || null,
            sirket_id: sirketId,
      rol: (input as any).rol ?? "calisan",
      cinsiyet: (input as any).gender || null,
      
      il: (input as any).city || null,
ilce: (input as any).district || null,
adres: (input as any).openAddress || null,
acil_yakinlik: input.emergencyContactRelation || null,
vergi_no: (input as any).taxNumber || null,
mahalle: (input as any).neighborhood || null,
sgk_baslangic: input.sgkStartDate || null,
brut_maas: input.grossSalary || null,



    })
    .select(PERSONNEL_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return rowToEmployee(data as PersonnelRow)
}
/** Fotoğraf yükle ve URL döndür */
export async function uploadAvatar(
  personnelId: string,
  file: File,
): Promise<string> {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase yapilandirilmadi.")

  const ext = file.name.split(".").pop()
  const path = `${personnelId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("Avatars")
    .upload(path, file, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const { data } = supabase.storage
    .from("Avatars")
    .getPublicUrl(path)

  // personeller tablosundaki avatar alanını güncelle
  await supabase
    .from("personeller")
    .update({ avatar: data.publicUrl })
    .eq("id", personnelId)

  return data.publicUrl
}
export async function updatePersonnel(
  id: string,
  input: Partial<NewEmployeeInput>
): Promise<Employee> {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase yapilandirilmadi.")

  const nameParts = (input.name ?? "").trim().split(" ")
  const soyad = nameParts.length > 1 ? nameParts.pop()! : ""
  const ad = nameParts.join(" ")

  const { data, error } = await supabase
    .from("personeller")
    .update({
      ad,
      soyad,
      email: input.email || null,
      departman: input.department || null,
      unvan: input.position || null,
      durum: input.status,
      ise_giris: input.startDate || null,
      tel: input.phone || null,
      lokasyon: input.location || null,
      tc_no: input.tcKimlikNo || null,
      dogum_tarihi: input.birthDate || null,
      kan_grubu: input.bloodType || null,
      acil_kisi: input.emergencyContactName || null,
      acil_tel: input.emergencyContactPhone || null,
      egitim_durumu: input.educationLevel || null,
      calisma_tipi: input.workType || null,
      iban: input.iban || null,
      rol: (input as any).rol || undefined,
      cinsiyet: (input as any).gender || null,
      il: (input as any).city || null,
ilce: (input as any).district || null,
adres: (input as any).openAddress || null,
mahalle: (input as any).neighborhood || null,

acil_yakinlik: input.emergencyContactRelation || null,
vergi_no: (input as any).taxNumber || null,
sgk_baslangic: input.sgkStartDate || null,
brut_maas: input.grossSalary || null,


    })
    .eq("id", id)
    .select(PERSONNEL_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return rowToEmployee(data as PersonnelRow)
}
