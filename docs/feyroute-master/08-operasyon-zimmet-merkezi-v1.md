FeyRoute Operasyon Zimmet Merkezi V1

Amaç

Operasyon Zimmet Merkezi’nin amacı ürünlerin teslim alınmasından müşteriye teslim edilmesine kadar olan tüm sürecin kayıt altına alınmasıdır.

Bu modül;

* Ürün takibi
* Barkod doğrulama
* Seri numarası doğrulama
* Zimmet yönetimi
* Nakliye yönetimi
* Montaj yönetimi
* Operasyon sonuçlandırma

işlemlerini tek merkezden yönetir.

⸻

Operasyon Sonuç Kodları

Kod    Açıklama
N    Nakliye
M    Montaj
NM    Nakliye + Montaj
İ    İptal

⸻

Ürün Teslim Alma Kuralları

Zorunlu Alanlar

* Barkod
* Seri No

Kurallar

* Barkod doğrulanmadan kayıt tamamlanamaz.
* Seri numarası doğrulanmadan kayıt tamamlanamaz.
* Yanlış ürün zimmeti oluşturulamaz.
* Ürün ekip zimmetine alınmadan operasyon başlatılamaz.

⸻

Zimmet Durumları

EKIP_ZIMMETINDE

Ürün ekip tarafından teslim alınmıştır.

OPERASYONDA

Ürün müşteri operasyonu için taşınmaktadır.

MUSTERIDE

Ürün müşteriye teslim edilmiştir.

IADE

Ürün iade sürecindedir.

HURDA

Ürün hurda sürecine aktarılmıştır.

⸻

Adrese Varış (AT)

AT müşteri adresine ulaşıldığını doğrulayan işlemdir.

Kurallar

* AT yapılmadan N aktif olmaz.
* AT yapılmadan M aktif olmaz.
* AT yapılmadan NM aktif olmaz.
* AT sonrasında sonuç butonları aktif hale gelir.

⸻

İptal Süreci (İ)

İ butonu özel durumdur.

Kurallar

* Operasyonun her aşamasında kullanılabilir.
* AT yapılması zorunlu değildir.
* Müşteri adresine gidilmiş olması zorunlu değildir.
* İptal nedeni girilmesi zorunludur.

Amaç gereksiz saha hareketlerini önlemektir.

⸻

Adres Bilgileri

AT sırasında aşağıdaki bilgiler toplanabilir:

* Kat sayısı
* Asansör durumu
* Asansör çalışıyor mu
* Araç yaklaşma mesafesi
* Merdiven durumu
* Taşıma zorluğu
* Ek açıklamalar

Bu bilgiler Faz-2 öğrenme motorunda kullanılacaktır.

⸻

Sonuçlandırma Kuralları

Planlanan operasyon ile gerçekleşen operasyon farklı olabilir.

Örnek:

Planlanan:
NM

Gerçekleşen:
N

Bu durumda açıklama zorunludur.

⸻

Ürün Konum Tipleri

* SERVIS
* BAYI
* MUSTERI
* EKIP
* IADE
* HURDA
* BOD
* BDA
* KARGO
* TEDARIKCI

⸻

Anket Entegrasyonu

Sonuçlanan operasyonlar otomatik olarak AI Anket İş Havuzuna aktarılır.

Amaç:

* Memnuniyet ölçümü
* Risk tespiti
* Şikayet önleme
* Tekrar servis analizi

⸻

Faz-2 Kapsamı

* Adres öğrenme motoru
* Operasyon zorluk skoru
* Ağır ürün risk analizi
* Dinamik süre tahmini
* AI ekip önerileri
* AI tekrar servis tahmini
* AI operasyon risk puanlama
