# ZAF Tech — üçüncü üst blok önizlemesi

21 Ekim 2026. Bu paket yayınlanmış sürüm değildir.

- Logo ve marka üstte, birlikte ortalandı. Masaüstünde logo 112 px; marka yazısı ekran genişliğine göre 36–46 px. Mobilde logo 60 px, marka yazısı 21–30 px.
- Masaüstünde Start Pi ve Pi giriş butonları solda, kendi satırında korundu. Arama, dil, tema ve mevcut yenileme kontrolü aynı satırın sağına taşındı.
- Mobilde üstte marka/logo, altta solda kompakt Pi butonları ve sağda küçük arama/dil/tema kontrolleri kullanıldı. Uzun çevirilerde satır gerektiğinde genişliğe uyarlanır.
- Masaüstü ana sekme ikonları 28 px oldu. Buton yüksekliği önceki 49 px değerinde tutuldu. Mobil ikonlar 20 px.
- Açılır listelerin genişliği yalnızca ilgili ana sekmenin genişliği kadar. Altın tema korundu; uzun metinler dar mobil menüde satıra yayılıyor. Uzun listeler dikey kaydırılabiliyor.

Görseller: `web-ust-blok.png`, `mobil-ust-blok.png`, `web-ag-menusu.png`, `mobil-ag-menusu.png`, `web-koyu-menu.png`, `mobil-koyu-menu.png`.

Build, TypeScript ve 99 regresyon testi başarılı. Lint: 0 hata, önceki koddan 15 uyarı. Yerel tarayıcıda 320, 375, 390, 768, 1024 ve 1440 px genişlikleri kontrol edildi: marka grubu ortada, menü ve sekme genişlikleri eşit, yatay taşma yok. Dokuz dilde 320 px başlık/menü taşma kontrolü de geçti. Sayfa JavaScript hatası görülmedi.

Pi giriş işlemleri ve veri kaynakları değiştirilmedi. GitHub'a push veya yayınlama yapılmadı. Gerçek cihaz smoke testi kullanıcı onayından sonra yapılacak.
