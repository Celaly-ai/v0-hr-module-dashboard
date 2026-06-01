"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, X, Clock, Plus, CalendarDays, Loader2 } from "lucide-react"

type Izin = {
  id: string
  personel_id: string
  izin_turu: string
  baslangic: string
  bitis: string
  gun_sayisi: number
  aciklama: string | null
  durum: string
  yonetici_notu: string | null
  created_at: string
  personeller?: { ad: string; soyad: string; departman: string }
}

function getStatusColor(durum: string) {
  switch (durum) {
    case "bekliyor": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
    case "onaylandi": return "bg-green-500/20 text-green-500 border-green-500/30"
    case "reddedildi": return "bg-red-500/20 text-red-500 border-red-500/30"
    default: return "bg-muted text-muted-foreground"
  }
}

function getStatusLabel(durum: string) {
  switch (durum) {
    case "bekliyor": return "Beklemede"
    case "onaylandi": return "Onaylandi"
    case "reddedildi": return "Reddedildi"
    default: return durum
  }
}

function getInitials(ad: string, soyad: string) {
  return `${ad[0]}${soyad[0]}`.toUpperCase()
}

export function LeaveRequests() {
  const { profile } = useAuth()
  const [izinler, setIzinler] = useState<Izin[]>([])
  const [loading, setLoading] = useState(true)
  const [personeller, setPersoneller] = useState<any[]>([])
  const [yeniDialog, setYeniDialog] = useState(false)
  const [redDialog, setRedDialog] = useState(false)
  const [seciliIzin, setSeciliIzin] = useState<Izin | null>(null)
  const [redNedeni, setRedNedeni] = useState("")
  const [formPersonelId, setFormPersonelId] = useState("")
  const [formTur, setFormTur] = useState("Yillik Izin")
  const [formBaslangic, setFormBaslangic] = useState("")
  const [formBitis, setFormBitis] = useState("")
  const [formAciklama, setFormAciklama] = useState("")
  const [formYukleniyor, setFormYukleniyor] = useState(false)

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role === "servis_yoneticisi" ||
    profile?.role === "ik_yoneticisi"

  const fetchIzinler = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
   let query = supabase
     .from("izinler")
     .select("id, personel_id, izin_turu, baslangic, bitis, gun_sayisi, aciklama, durum, yonetici_notu, created_at, personeller!izinler_personel_id_fkey(ad, soyad, departman)")
     .order("created_at", { ascending: false })

    if (!isAdmin) {
      const { data: p } = await supabase
        .from("personeller")
        .select("id")
        .or(`auth_id.eq.${profile?.id},kullanici_id.eq.${profile?.id}`)
        .maybeSingle()
      if (p) query = query.eq("personel_id", p.id)
    }
    const { data } = await query

    setIzinler((data || []) as unknown as Izin[])
    setLoading(false)
  }, [isAdmin, profile?.id])

  const fetchPersoneller = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from("personeller").select("id, ad, soyad, departman, sirket_id").order("ad")

    setPersoneller(data || [])
  }, [])

  useEffect(() => {
    if (profile) {
      void fetchIzinler()
      if (isAdmin) void fetchPersoneller()
    }
  }, [profile, isAdmin, fetchIzinler, fetchPersoneller])

  const handleOnayla = async (izin: Izin) => {
    const supabase = createClient()
    await supabase.from("izinler").update({ durum: "onaylandi", onay_tarihi: new Date().toISOString() }).eq("id", izin.id)
    fetchIzinler()
  }

  const handleRedOnayla = async () => {
    if (!seciliIzin) return
    const supabase = createClient()
    await supabase.from("izinler").update({ durum: "reddedildi", yonetici_notu: redNedeni }).eq("id", seciliIzin.id)
    setRedDialog(false)
    fetchIzinler()
  }

  const handleYeniTalep = async () => {
    if (!formBaslangic || !formBitis) return
    setFormYukleniyor(true)
    const supabase = createClient()
    let personelId = formPersonelId
    let sirketId = ""
    if (!isAdmin) {
      const { data: p } = await supabase
        .from("personeller")
        .select("id, sirket_id")
        .or(`auth_id.eq.${profile?.id},kullanici_id.eq.${profile?.id}`)
        .maybeSingle()
      if (p) { personelId = p.id; sirketId = p.sirket_id }
    } else {
      const p = personeller.find(p => p.id === formPersonelId)
      if (p) sirketId = p.sirket_id
    }
    const gun = Math.ceil((new Date(formBitis).getTime() - new Date(formBaslangic).getTime()) / 86400000) + 1
    await supabase.from("izinler").insert({ personel_id: personelId, sirket_id: sirketId, izin_turu: formTur, baslangic: formBaslangic, bitis: formBitis, gun_sayisi: gun, aciklama: formAciklama, durum: "bekliyor" })
    setYeniDialog(false)
    setFormPersonelId(""); setFormTur("Yillik Izin"); setFormBaslangic(""); setFormBitis(""); setFormAciklama("")
    setFormYukleniyor(false)
    fetchIzinler()
  }

  const bekleyenler = izinler.filter(i => i.durum === "bekliyor")
  const onaylananlar = izinler.filter(i => i.durum === "onaylandi")
  const reddedilenler = izinler.filter(i => i.durum === "reddedildi")

  const IzinKarti = ({ izin }: { izin: Izin }) => (
    <Card className="p-4 border-border">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
            {izin.personeller ? getInitials(izin.personeller.ad, izin.personeller.soyad) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-foreground">
              {izin.personeller ? `${izin.personeller.ad} ${izin.personeller.soyad}` : "Bilinmiyor"}
            </p>
            <Badge variant="outline" className={`text-xs ${getStatusColor(izin.durum)}`}>{getStatusLabel(izin.durum)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{izin.izin_turu} • {izin.gun_sayisi} gun</p>
          <p className="text-sm text-muted-foreground">{new Date(izin.baslangic).toLocaleDateString("tr-TR")} - {new Date(izin.bitis).toLocaleDateString("tr-TR")}</p>
          {izin.aciklama && <p className="text-sm text-foreground/80 mt-1">{izin.aciklama}</p>}
          {izin.yonetici_notu && <p className="text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded mt-2">Red nedeni: {izin.yonetici_notu}</p>}
        </div>
      </div>
      {isAdmin && izin.durum === "bekliyor" && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <Button size="sm" className="flex-1" onClick={() => handleOnayla(izin)}><Check className="h-4 w-4 mr-1" />Onayla</Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => { setSeciliIzin(izin); setRedNedeni(""); setRedDialog(true) }}><X className="h-4 w-4 mr-1" />Reddet</Button>
        </div>
      )}
    </Card>
  )

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
          <Card className="p-4 border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><Clock className="h-5 w-5 text-yellow-500" /></div>
              <div><p className="text-2xl font-semibold">{bekleyenler.length}</p><p className="text-sm text-muted-foreground">Beklemede</p></div>
            </div>
          </Card>
          <Card className="p-4 border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><Check className="h-5 w-5 text-green-500" /></div>
              <div><p className="text-2xl font-semibold">{onaylananlar.length}</p><p className="text-sm text-muted-foreground">Onaylandi</p></div>
            </div>
          </Card>
          <Card className="p-4 border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20"><X className="h-5 w-5 text-red-500" /></div>
              <div><p className="text-2xl font-semibold">{reddedilenler.length}</p><p className="text-sm text-muted-foreground">Reddedildi</p></div>
            </div>
          </Card>
        </div>
        <Button onClick={() => setYeniDialog(true)}><Plus className="h-4 w-4 mr-2" />Yeni Izin Talebi</Button>
      </div>

      <Tabs defaultValue="bekleyen" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="bekleyen">Bekleyen ({bekleyenler.length})</TabsTrigger>
          <TabsTrigger value="onaylanan">Onaylandi ({onaylananlar.length})</TabsTrigger>
          <TabsTrigger value="reddedilen">Reddedildi ({reddedilenler.length})</TabsTrigger>
          <TabsTrigger value="tumu">Tumu ({izinler.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="bekleyen">
          {bekleyenler.length === 0 ? <Card className="p-12 border-border text-center"><CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Bekleyen izin talebi yok</p></Card> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{bekleyenler.map(i => <IzinKarti key={i.id} izin={i} />)}</div>}
        </TabsContent>
        <TabsContent value="onaylanan">
          {onaylananlar.length === 0 ? <Card className="p-12 border-border text-center"><p className="text-muted-foreground">Onaylanan izin talebi yok</p></Card> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{onaylananlar.map(i => <IzinKarti key={i.id} izin={i} />)}</div>}
        </TabsContent>
        <TabsContent value="reddedilen">
          {reddedilenler.length === 0 ? <Card className="p-12 border-border text-center"><p className="text-muted-foreground">Reddedilen izin talebi yok</p></Card> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{reddedilenler.map(i => <IzinKarti key={i.id} izin={i} />)}</div>}
        </TabsContent>
        <TabsContent value="tumu">
          <Card className="border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Calisan</TableHead>
                  <TableHead>Izin Turu</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Gun</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {izinler.map(i => (
                  <TableRow key={i.id} className="border-border">
                    <TableCell>{i.personeller ? `${i.personeller.ad} ${i.personeller.soyad}` : "Bilinmiyor"}</TableCell>
                    <TableCell>{i.izin_turu}</TableCell>
                    <TableCell>{new Date(i.baslangic).toLocaleDateString("tr-TR")} - {new Date(i.bitis).toLocaleDateString("tr-TR")}</TableCell>
                    <TableCell>{i.gun_sayisi}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${getStatusColor(i.durum)}`}>{getStatusLabel(i.durum)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={redDialog} onOpenChange={setRedDialog}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="bg-card border-border">

          <DialogHeader><DialogTitle>Izin Talebini Reddet</DialogTitle><DialogDescription>Red sebebini belirtin.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            <Label>Red Nedeni</Label>
            <Textarea value={redNedeni} onChange={e => setRedNedeni(e.target.value)} className="bg-secondary border-border" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRedDialog(false)}>Iptal</Button>
            <Button variant="destructive" onClick={handleRedOnayla} disabled={!redNedeni.trim()}><X className="h-4 w-4 mr-1" />Reddet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={yeniDialog} onOpenChange={setYeniDialog}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="bg-card border-border max-w-md">

          <DialogHeader><DialogTitle>Yeni Izin Talebi</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Calisan</Label>
                <Select value={formPersonelId} onValueChange={setFormPersonelId}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Calisan secin" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">{personeller.map(p => <SelectItem key={p.id} value={p.id}>{p.ad} {p.soyad} - {p.departman}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Izin Turu</Label>
              <Select value={formTur} onValueChange={setFormTur}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Yillik Izin">Yillik Izin</SelectItem>
                  <SelectItem value="Hastalik">Hastalik</SelectItem>
                  <SelectItem value="Mazeret">Mazeret</SelectItem>
                  <SelectItem value="Ucretsiz Izin">Ucretsiz Izin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Baslangic</Label><Input type="date" value={formBaslangic} onChange={e => setFormBaslangic(e.target.value)} className="bg-secondary border-border" /></div>
              <div className="space-y-2"><Label>Bitis</Label><Input type="date" value={formBitis} onChange={e => setFormBitis(e.target.value)} className="bg-secondary border-border" /></div>
            </div>
            <div className="space-y-2"><Label>Aciklama</Label><Textarea value={formAciklama} onChange={e => setFormAciklama(e.target.value)} className="bg-secondary border-border" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setYeniDialog(false)}>Iptal</Button>
            <Button onClick={handleYeniTalep} disabled={formYukleniyor || !formBaslangic || !formBitis || (isAdmin && !formPersonelId)}>
              {formYukleniyor ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}Talep Olustur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
