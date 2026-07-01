FeyRoute Operasyon Kuralları v1.0

1. Temel Operasyon Prensibi

FeyRoute’ta amaç yalnızca iş emrini kapatmak değildir.

Amaç:

* Doğru ürünün
* Doğru müşteriye
* Doğru ekip tarafından
* Doğru işlemle

teslim edildiğini doğrulamaktır.

Her operasyon izlenebilir ve denetlenebilir olmalıdır.

⸻

2. Operasyon Sonuç Kodları

Sistemde temel sonuç tipleri:

Kod    Açıklama
N    Nakliye
M    Montaj
NM    Nakliye + Montaj
İ    İptal

⸻

3. Adrese Varış (AT) Kuralları

Kural 3.1

AT (Adrese Varış) tamamlanmadan:

* N
* M
* NM

işlemleri aktif olmaz.

Kural 3.2

AT yalnızca müşteri konumunda yapılabilir.

Kural 3.3

AT sırasında adres operasyon bilgileri toplanır.

Örnek:

* Kat bilgisi
* Asansör durumu
* Asansör çalışıyor mu
* Merdiven durumu
* Araç yaklaşma mesafesi
* Yük taşıma zorluğu

Kural 3.4

AT verileri gelecekte adres öğrenme sistemine aktarılacaktır.

(Faz-2)

⸻

4. İptal Kuralları

Kural 4.1

İ (İptal) butonu operasyonun her aşamasında kullanılabilir.

Kural 4.2

İptal için açıklama zorunludur.

Kural 4.3

Açıklama olmadan iptal kaydı yapılamaz.

⸻

5. Barkod ve Seri No Kuralları

Kural 5.1

Ürün teslim alma sırasında barkod okutulmalıdır.

Kural 5.2

Ürün barkodu kayıtlı ürün ile eşleşmelidir.

Kural 5.3

Seri numarası doğrulanmalıdır.

Kural 5.4

Barkod doğrulanmadan ürün teslim alınamaz.

Kural 5.5

Seri numarası doğrulanmadan ürün teslim alınamaz.

Kural 5.6

Amaç yanlış ürünün müşteriye götürülmesini engellemektir.

⸻

6. Sonuçlandırma Kuralları

Kural 6.1

Planlanan iş tipi ile gerçekleşen iş tipi ayrı kaydedilir.

Örnek:

Planlanan:

NM

Gerçekleşen:

N

Kural 6.2

Planlanan iş NM ise ve sonuç N olarak kapatılıyorsa açıklama zorunludur.

Kural 6.3

Planlanan iş NM ise ve sonuç M olarak kapatılıyorsa açıklama zorunludur.

Kural 6.4

Açıklama olmadan sonuçlandırma yapılamaz.

⸻

7. Anket Havuzu Kuralları

Kural 7.1

Sonuçlanan operasyonlar otomatik olarak Anket Havuzuna aktarılır.

Kural 7.2

Aktarım tekrar yapılmamalıdır.

Kural 7.3

Her iş emri yalnızca bir kez Anket Havuzuna gönderilebilir.

⸻

8. Risk ve Öncelik Kuralları

Anket oluşturulurken sistem geçmiş verileri dikkate almalıdır.

Örnek:

* Şikayet geçmişi
* Düşük NPS geçmişi
* Ek garanti satış eksikliği
* Bahşiş talebi şikayetleri
* Ürün bilgilendirme eksikliği
* Tekrar servis geçmişi

Bu alanlar Faz-2 öğrenme motorunda kullanılacaktır.

⸻

9. Ürün Konum Kuralları

Sistemde ürünler aşağıdaki konumlarda bulunabilir.

* SERVIS
* BAYI
* MUSTERI
* EKIP
* IADE
* HURDA
* BOD (Bölge Operasyon Deposu)
* BDA (Bölge Değişim Aracı)
* KARGO
* TEDARIKCI

⸻

10. Servis ve Ürün Sorumlusu Kuralı

Operasyonel olarak:

SERVIS

ve

URUN_SORUMLUSU

aynı kabul edilir.

Ürün sorumlusu tarafından teslim alınan ürün sistemde SERVIS konumunda kabul edilir.

⸻

11. Mobil Operasyon Prensibi

Operasyon ekranı öncelikli olarak mobil cihaz kullanımına göre tasarlanır.

Amaç:

* Tek el ile kullanım
* Hızlı işlem
* Minimum veri girişi
* Maksimum doğrulama

olmalıdır.

⸻

12. Faz-2 İçin Ayrılan Kurallar

Aşağıdaki yapılar V2/Faz-2 kapsamındadır:

* Adres öğrenme motoru
* Operasyon zorluk skoru
* AI risk motoru
* AI ekip öneri sistemi
* AI anket öncelik motoru
* AI ürün risk analizi
* AI tekrar servis tahmini

Bu kurallar V1’de veri toplayacak, Faz-2’de aktif kullanılacaktır.
