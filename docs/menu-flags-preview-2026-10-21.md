# ZAF Tech — dördüncü önizleme

21 Ekim 2026. Yayınlanmamış yerel önizlemedir.

- Yalnız mobil alt menüler 140–180 CSS px genişliğe alındı. Yazılar artık harf harf bölünmüyor; çok uzun adlar gerekirse kelime sınırından satıra geçiyor. Listeler ekran dışına taşmıyor.
- Web alt menü genişlikleri, ana sekme ikonları ve buton yükseklikleri korundu.
- Dil bayraklarının orijinal SVG dosyaları uygulamaya eklendi. Bayraklar kırpılmadan, doğru oranla gösteriliyor; vektör oldukları için büyütüldüklerinde piksel çözünürlüğü kaybı oluşmuyor. Mobil tetikleyicide 18×12, seçeneklerde 24×16 CSS px alan kullanılıyor. Bu alanların içinde bayrağın özgün oranı korunuyor.
- Web arama çubuğu mevcut 210 px genişliğinden 105 px'e indirildi. Mobil arama boyutu değiştirilmedi.

Paket açık/koyu tema, web/mobil üst blok, açılır menü ve bayrak seçicisi için 8 PNG içerir. Görseller 2× ekran yoğunluğuyla alındı; örneğin 375 CSS px ekran görüntüsü 750 piksel olarak kaydedildi.

Build ve TypeScript başarılı. Lint 0 hata ve önceki koddan 15 uyarı veriyor. 320, 375, 390, 768, 1024 ve 1440 CSS px genişliklerinde kontrol yapıldı. Mobilde menü sınırları, webde önceki menü genişliği ve 105 px arama ölçümü doğrulandı. Dokuz dilde 320 px yatay taşma kontrolü geçti. Dokuz bayrağın yerel dosyalardan başarıyla yüklendiği doğrulandı. Tarayıcıda sayfa JavaScript hatası görülmedi.

Pi giriş mantığı ve veri kaynakları değiştirilmedi. Yayınlama veya gerçek cihaz smoke testi yapılmadı; kullanıcı onayı bekleniyor.
