# ZAF Tech — ikinci önizleme

21 Ekim 2026. Bu paket yerel uygulamanın yeni ekran görüntülerini içerir; yayınlanmış sürüm değildir.

## Yapılan 7 düzenleme

1. Ana sekmelerin açılır listesine, örnekteki ağ seçimi gibi altın kenarlık, altın seçili satır ve onay işareti uygulandı. Açık/koyu tema, web ve mobil destekleniyor.
2. Mobil Start Pi ve Pi giriş butonları metin genişliğine göre daraltıldı; ikisi birlikte ortalandı. Pi giriş işlevi değiştirilmedi.
3. Mobil arama, dil ve tema kontrolleri 24×26 CSS piksele küçültüldü; ikonlar da orantılı küçültüldü. Marka/logo korunuyor.
4. Mobil ekosistem grafiğindeki ağ/tür filtreleri küçültüldü ve satıra yayılacak şekilde düzenlendi. Bütün seçenekler karta sığıyor; yatay kaydırma gerekmiyor.
5. Launchpad'in Mainnet durum kartı artık seçilen dilde Coming Soon/Yakında gösteriyor. Yayınlanmış Testnet kanıtları ayrı olarak korunuyor.
6. Yerel Node durumu kartındaki 13 farklı teşhis açıklaması dokuz dile çevrildi. Durum puanı ve değerlendirme hesapları değiştirilmedi.
7. Connector kartındaki “The download opens the official ZAF Tech GitHub Releases page.” açıklaması kaldırıldı. İndirme bağlantısı korunuyor.

## Görseller

- `mobil-ust-blok.png`: küçültülmüş, ortalanmış Pi butonları ve küçük sağ üst kontroller.
- `mobil-menu.png`, `mobil-menu-koyu.png`, `web-menu.png`: altın vurgulu açılır listeler.
- `mobil-grafik.png`, `web-grafik.png`: filtreler ve gerçek API yanıtıyla grafik.
- `mobil-launchpad.png`, `web-launchpad.png`: Mainnet için Yakında durumu.
- `mobil-node.png`, `web-node.png`: Türkçe yerel Node durumu kartı.
- `web-connector.png`: açıklama satırı kaldırılmış Connector kartının tamamı.

## Kontroller

Build ve TypeScript başarılı. Lint: 0 hata, önceden mevcut koddan 15 uyarı. 99 regresyon testi ve 13 güncelleme testi geçti. Yeni test bütün teşhis açıklamalarının dokuz dilde çevirisini doğruluyor.

320, 375, 390, 768 ve 1440 pikselde başlık kontrolleri incelendi. Grafik filtrelerinde 320, 390 ve 768 pikselde hem sayfa hem filtre grupları için yatay taşma olmadığı ölçüldü. Tarayıcıda JavaScript sayfa hatası görülmedi.

Önizleme ortamı kullanılabilir bir yerel Node gözlemlemediğinden Node kartı Çevrimdışı gösteriyor. Bu, gerçek Node'unuz için yapılmış bir teşhis değildir. Grafik ve Launchpad görselleri yerel uygulamanın gerçek API yanıtlarıdır; örnek veri eklenmedi.

GitHub'a push, merge veya deploy yapılmadı. Gerçek iPhone/Android Pi Browser smoke testi yapılmadı. Yayınlama ve sonrasındaki smoke testi, kullanıcı onayından sonra yapılacak.
