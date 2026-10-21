# ZAF Tech — web ve mobil güncellemeleri

21 Ekim 2026

Çalışma deposu: `zaffzuff/ZAF-TECH`.
Başlangıç: `573d29e05c54acf03b191ae35f5d60ae85444e11` (`fix/pi-browser-verification`). Bu sürüm, son Pi giriş düzeltmelerini içerdiği için korundu.
Yerel çalışma dalı: `codex/mobile-web-updates`.

## 15 maddenin karşılığı

| Madde | Uygulama |
|---|---|
| 1 | Dil adları English, Español, Türkçe, 中文, Italiano, Français, Deutsch, Português, Русский oldu. |
| 2 | Üst bloktaki dört durum etiketi kaldırıldı. Beş ana sekme başlık alanına taşındı. Alt menüler ana sekmeye dokununca dikey liste olarak açılıyor. Seçim, dışarı dokunma ve Escape listeyi kapatıyor. |
| 3 | Kaynak/zaman/örneklem kartı yalnız Pulse ana ekranında bulunuyor; başlangıçta kapalı. Diğer sayfalardaki kısa güncellik göstergesi korunuyor. |
| 4 | Dizin kaynağının dinamik HTML açıklaması dokuz dile çevrildi. Kullanıcıya ham kaynak hata metni yerine çevrilebilir durum açıklaması gösteriliyor. |
| 5 | Boundary/Sınır etiketi sonrası cümle ilk harfi, dilin büyük harf kurallarıyla düzeltiliyor. Mevcut çeviri anahtarları korunuyor. |
| 6 | DEX parite hacimleri, işlem tutarları ve havuz rezervlerine birimler eklendi. Native Pi için π, kredi varlıkları için kendi kodları kullanılıyor. Fiyatın karşı/baz birimi belirtiliyor. Pay sayıları, işlem sayıları ve yüzdeler Pi olarak etiketlenmiyor. |
| 7 | Radar güven nedenleri, kaynak/hata sayıları, durumlar ve dinamik sinyal açıklamaları yerelleştirildi. |
| 8 | 19.1'den 28.0'a kadar belgeye dayalı yükseltme geçmişi Aktivite Sinyalleri ekranına eklendi. Yayınlanmış tarihler, canlı ledger gözlemlerinden ve kayıtlı snapshot geçmişinden ayrı gösteriliyor. |
| 9 | Üst üste binen dairesel metinler yerine ağ grupları, seçilebilir düğümler ve gerçek bağlantı detayları kullanılıyor. Masaüstünde sütunlar, mobilde tek sütun var. Uzun ağ listeleri kart içinde kayıyor. Kaynağın döndürdüğü en fazla 120 düğüm ve bunlar arasındaki gerçek bağlantılar gösteriliyor. |
| 10 | Explorer, seçilen dilde Coming Soon/Yakında açıklaması gösteriyor. |
| 11 | Kaynağın döndürdüğü tüm ilgili koşullar sınıflandırılabiliyorsa hesap bakiyesinin yanında gözlemlenen süre kilitli ve şu anda talep edilebilir miktarlar ayrı gösteriliyor. Bilinmeyen, süresi dolmuş veya geçersiz koşullarda ayrım gösterilmiyor. |
| 12 | Cüzdan bakiyeleri, ücretler, native varlıklar, gözlemlenen staking tutarları ve DeFi miktarlarında π kullanılıyor. Para değerlerinde `314.159,8831291 π` biçimi uygulanıyor. |
| 13 | Kullanıcıya görünen “gözlem yaşlanıyor” yerine “gözlem güncelleme bekliyor” kullanılıyor. İç veri durum kodu `aging` uyumluluk için korunuyor. |
| 14 | Mobil ana sekmeler eşit sütunlarda kalıyor, metinler kesilmeden satıra yayılıyor. Kayan yazı kullanılmıyor. |
| 15 | Yenileme hareketine 24 px başlangıç payı ve direnç eklendi. Yaklaşık 148 CSS px dikey çekişten sonra, parmak bırakılınca yenileme başlıyor. Kısa/yatay hareketler, kontroller, açık diyaloglar ve kaydırılmış sayfa yenileme başlatmıyor. |

## Protokol kaynağı

Kullanıcının sağladığı [Google Docs belgesi](https://docs.google.com/document/d/1iqI7MZCfLqiZMYdGlXSQXpS1qK2q74nVK0jBER-S-mM/edit) metin dışa aktarımı üzerinden incelendi.

Sıra: 19.1 → 19.6 → 19.9 → 20.2 → 21.2 → 22.1 → 23.0 → 24.1 → 25.2 → 26.1 → 27.1 → 28.0.

Tarihler belgenin **Upgrade by / Key Dates** alanlarıdır; ağın kesin etkinleşme anı olarak sunulmaz. Belge 19.1 başlangıcına tarih vermediği için tarih eklenmedi. Ondalıklı Node sürümleri ile tam sayılı ledger protokol sürümleri birbirine dönüştürülmedi. Bu içerik statik kaynak kaydıdır; otomatik yeni sürüm takibi değildir.

## Doğrulama

- Üretim build'i başarılı.
- TypeScript kontrolü başarılı.
- Lint: 0 hata, önceden mevcut koddan 15 uyarı. Kimlik doğrulama ve veritabanı kodunu bu arayüz işi içinde yeniden düzenlemek yerine mevcut bulgular dar dosya kapsamlarında uyarı olarak tutuldu. Güvenlik girdilerindeki kasıtlı kontrol karakteri filtreleri korundu. Next.js ayrıca kendi ESLint eklentisinin yapılandırılmadığı uyarısını veriyor.
- `test:final`, `test:news`, `test:readiness` başarılı. Son cüzdan değişikliği için 12 cüzdan testi de geçti.
- `test:updates`: 12 test başarılı; sayı/birim, çeviri, cüzdan koşulu ve hareket eşiğini kapsıyor.
- `git diff --check` başarılı.
- Yerel Edge kontrolünde 320, 375, 390, 768 ve 1440 CSS px genişliklerinde ana sekmelerde yatay taşma yok. Dokuz dilde 320 px ana sekme metinlerinde kesilme yok. Menü seçimi ve Escape doğrulandı; sayfa JavaScript hatası görülmedi.
- Gerçek yerel API yanıtıyla grafikte 99 düğüm görüntülendi; 390 px genişlikte yatay taşma yok. Bu, o anki kaynak yanıtıdır; kalıcı ekosistem toplamı değildir.
- Kaynak kartı ana sayfada kapalı ve diğer sekmelerde yok.

## Sınırlamalar ve smoke testi

- Gerçek iPhone/Android cihazlarda yeni sürüm testi **yapılmadı**. Önceki altı hesapla başarılı giriş raporu yeni sürümün cihaz kanıtı olarak sayılmadı.
- Pi Sign-in uygulaması ve yetki kapsamları değiştirilmedi; mevcut otomatik giriş testleri geçti. Yeni sürümde gerçek Pi Browser izin/giriş akışı **test edilemedi**.
- Kilitli/talep edilebilir ayrımı yalnız dönen herkese açık koşulları ve gözlem anını kapsar. Özel Pi kilit taahhütlerini veya eksiksiz cüzdan geçmişini kanıtlamaz. Talep edilebilir kayıtların toplamı, her kaydın şu anda alınabileceği anlamına gelmez. Geçersiz tutarlar sıfıra çevrilmez.
- Hareket eşiği bir başlangıç ayarıdır; platformlar arasında tek bir “profesyonel uygulama standardı” yoktur. Kullanıcının gerçek cihaz smoke testi hareket hissini doğrulamalıdır.
- GitHub'a push, PR, merge, Vercel deploy, domain veya Pi Portal ayarı yapılmadı. Değişiklikler yerel dalda ve teslim paketindedir.

Smoke testinde: Pi Browser giriş/çıkış ve yeniden açma, dokuz dilde menüler, uzun başlıklar, grafik düğüm seçimi/filtreler, bilinen cüzdan örnekleri, kısa çekişin yenilememesi ve yeterli çekişin parmak bırakıldığında tek yenileme başlatması kontrol edilmeli.

## Paket

ZIP içinde güncel proje kaynakları, başlangıç commit'ine göre uygulanabilir değişiklik yaması, bu rapor ve önizleme görselleri bulunur. Bağımlılıklar, derleme çıktıları, Git geçmişi ve ortam dosyaları dahil edilmez. Proje `npm ci`, ardından `npm run build` ile hazırlanabilir.
