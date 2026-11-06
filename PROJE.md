# TikTok LIVE Horon — Proje Planı

Başlangıç tarihi: 6 Kasım 2026. Kaynak: [paylaşılan proje konuşması](https://chatgpt.com/share/6aeddd94-a0ac-83ed-adf4-9ee55a2a55e0).

## Amaç ve kapsam

Tek yayıncı olarak kendi TikTok LIVE yayınımızda kullanacağımız, MacBook üzerinde çalışan bir horon oyunu geliştirmek. Görsel yön: Karadeniz köy düğünü, ortada gelin/damat, çevrede kullanıcı adları görünen 2D pixel art dansçılar. Ücretsiz sohbet katılımı her zaman açık; hediyeler görsel kutlama ve destek sıralaması sağlar.

İlk sürümde çoklu yayıncı, SaaS, üyelik, ödeme sistemi ve bulut dağıtımı yok. Hedef büyüyen tek halkada 200 eş zamanlı karakter, 1080 × 1920 dikey OBS sahnesi ve 60 FPS; yük altında alt sınır 30 FPS. Bunlar ölçülmesi gereken hedeflerdir.

## Mimari

```text
TikTok LIVE → TikTok adaptörü → normalize olay → FastAPI oyun kuralları
                                                    ↓
                                             WebSocket /ws/game
                                                    ↓
                                             Phaser 3 sahnesi
                                                    ↓
                                             OBS → TikTok LIVE
```

Python/FastAPI oyun durumunun tek kaynağıdır. Phaser 3 + TypeScript sadece sahneyi ve animasyonları gösterir. İlk prototipte durum bellekte tutulur; SQLite aşamasında oturum, destek puanları ve işlenen olay kimlikleri kalıcı hale gelir. TikTok bağlantısı sahneden bağımsızdır; bağlantı koparsa karakterler ekranda kalır. Tarayıcı WebSocket bağlantısı koptuğunda tekrar bağlanır ve tam durumu alır.

## Oyun kuralları

| Olay | Davranış |
| --- | --- |
| `!katil [memleket]` | Kullanıcıyı bir kez ekle, doğrulanan memleket kuşağını ata; doluysa FIFO bekleme kuyruğuna al |
| `!cik` | Aktif oyuncuyu/kuyruk kaydını kaldır; boşluğu sıradakiyle doldur |
| `!sol`, `!sağ`, `!çök`, `!kalk` | Aktif oyuncunun turdaki tek oyunu; hedefe ulaşan hareketi tüm halkada oynat |
| `!dalga`, `🔥`, `!ateş` | Sekiz saniyelik sıralı horon dalgasını başlat/destekle; hedef dolarsa dalgayı ve tempoyu güçlendir |
| Tamamlanmış hediye | Kullanıcıyı ekle, puanını artır, kısa görsel efekt göster |
| Tekrar eden olay kimliği | İkinci kez uygulama |
| Yayın bağlantısı kopması | Sahneyi koru; adaptör tekrar bağlanmayı denesin |

Görünen kullanıcı adı yerine sabit kullanıcı kimliği esas alınır. Adlar uzunluk sınırıyla canvas metni olarak çizilir. Liderlik tablosu oturumdaki en çok destek veren üç kişiyi gösterir; ayrılmak destek puanını silmez. v0.2'de demo gül kalp, demo kutlama veya en az 10 puan değerindeki hediye konfeti ve 6,5 saniyelik 1,6× görsel tempo artışı sağlar. Gerçek hediye kuralları isim yerine doğrulanmış `gift_id` ile eşlenecek.

## Olay sözleşmesi

`POST /events`, `x-admin-token` başlığıyla normalize olay kabul eder:

```json
{
  "event_id": "kaynak-olay-kimligi",
  "type": "gift",
  "user_id": "sabit-kullanici-kimligi",
  "nickname": "Horoncu",
  "gift_id": "dogrulanmis-hediye-kimligi",
  "count": 3,
  "diamonds": 1
}
```

Yorum olayında `type: "comment"` ve `text: "!katil"` kullanılır. WebSocket mesajı `{state, effect}` içerir. `state`: revision, players, waiting, capacity, leaderboard. Yeniden bağlanma ilk tam snapshot ile senkronize olur. Yavaş istemcinin kuyruğu sınırlıdır; eski güncellemeler atlanabilir, sonraki tam snapshot durumu düzeltir. Geçici efektlerin yeniden oynatılması garanti edilmez.

## Yol haritası

### Aşama 1 — Yerel prova

- [x] FastAPI sağlık ve olay endpoint'leri
- [x] Motor bağımsız oyun kuralları, kapasite ve FIFO kuyruk
- [x] Süreç içinde sınırlı olay tekilleştirme ve destek sıralaması
- [x] WebSocket durum aktarımı ve istemci yeniden bağlantısı
- [x] Phaser dikey düğün sahnesi ve hareketli geçici pixel karakterler
- [x] Sahte yorum/hediye kontrol paneli ve OBS görünümü
- [ ] Tek büyüyen halkada 200 karakter performans ölçümü ve OBS görüntü kontrolü

### Aşama 2 — Görsel kalite

- [x] Özgün, kodla üretilen altı kare horon sprite sheet'leri
- [x] Köy haritası, gelin/damat animasyonu, kemençeci ve ad etiketleri (kalabalıkta isteğe bağlı gizleme)
- [x] Kalp/konfeti efektleri ve kısa süreli görsel tempo değişimi
- [x] 25/50/100/150 kişi eşiklerinde kademeli canlanan köy meydanı
- [x] Aktiviteye göre dönüşümlü horonbaşı ve sahne rozeti
- [x] Sis/yağmur/fırtına katmanları ve `!tempo` ile toplu hava açma
- [x] Doğrulanan Karadeniz memleketleri için karakter kuşağı renkleri
- [x] On saniyelik A/B kemençe düellosu ve kazanan ritim etkisi
- [x] Etkinlik eşiğinde halka kopması ve `🤝` / `!birleş` ile toplu onarım
- [x] Kalabalık eşikleri/büyük kutlamada fotoğraf anı ve PNG hatıra karesi
- [ ] Kullanım hakkı doğrulanmış müzik ve ses seviyesi kontrolü

### Aşama 3 — TikTok bağlantısı

- [x] TikTokLive SDK sürümünü doğrula (7.0.1)
- [ ] Gerçek yayın erişimini doğrula
- [x] Yorum/hediye adaptörünü aynı olay sözleşmesine bağla
- [x] Hediye serisinin ara/toplam bildirimlerini tekilleştir; yalnızca final kümülatif adedi say
- [x] Üstel bekleme ile yeniden bağlanma, bağlantı durumu ve hata günlükleri
- [ ] Gerçek yayında en az bir yorum ve hediye testi

TikTokLive üçüncü taraf bağlantı seçeneğidir; resmi TikTok desteği varsayılmaz. SDK ve olay alanları uygulanacağı sırada doğrulanır. TikFinity gerekirse alternatif adaptör olabilir; ilk sürüm bağımlılığı değildir. Kaynak konuşmadaki indirilebilir ZIP bu paylaşımdan alınamadığı için bu repoda prototip sıfırdan oluşturulmuştur.

### Aşama 4 — Yayına hazırlık

- [ ] SQLite oturum/skor/olay kaydı ve yeniden başlatma kurtarması
- [x] SQLite kullanıcı ziyaret/aktivite profili ve kalıcı müdavim görünümü
- [ ] Kuyruk/kullanıcı sınırları, kullanıcı başına hız sınırı
- [ ] Yönetim paneli, oturum sıfırlama, hediye eşlemesi ve token yönetimi
- [ ] Uzun süreli yük testi, yayın provası ve kurulum kılavuzu

## Yayına hazır kabul kriterleri

- [ ] 200 karakter tek halkada hareket ederken 30 FPS altına düşmüyor.
- [ ] 100 ardışık sahte olayda durum ve WebSocket bağlantısı tutarlı kalıyor.
- [ ] Aynı hediye ve seri ara bildirimleri çift puan üretmiyor.
- [ ] Katılma, ayrılma, kuyruk ilerlemesi ve yeniden bağlanma çalışıyor.
- [ ] TikTok bağlantısı kopunca sahne korunuyor.
- [ ] Gerçek yayından yorum ve hediye uçtan uca işleniyor.
- [ ] OBS, 1080 × 1920 sahneyi kırpmadan gösteriyor.

## Teknik kaynaklar

- [FastAPI WebSocket belgeleri](https://fastapi.tiangolo.com/advanced/websockets/)
- [Phaser kurulum belgeleri](https://docs.phaser.io/phaser/getting-started/installation)

## Bir sonraki iş

Adaptörü gerçek yayında `!katil`, tek hediye ve seri hediye ile uçtan uca doğrulamak. Ardından olay kimliklerini ve skorları SQLite ile kalıcılaştırmak. Müzik, OBS uygulama provası ve uzun süreli performans testi de açık işlerdir.

## v0.3 doğrulaması — 6 Kasım 2026

- TikTokLive 7.0.1 olay alanlarına göre yorum/hediye adaptörü eklendi.
- Yalnızca oyun komutları backend'e aktarılıyor; kullanıcı için sayısal TikTok kimliği tercih ediliyor.
- Seri hediyelerin ara kareleri atlanıyor, final `repeat_count` değeri bir kez işleniyor; kaynak mesaj kimliği yeniden gönderimleri tekilleştiriyor.
- Sahte TikTok olaylarıyla komut filtresi, ara/final seri davranışı, tek hediye ve kimlik eksikliği test edildi.
- Gerçek yayın hesabıyla bağlantı ve hediye alanları henüz doğrulanmadı.

## İlk sürüm doğrulaması — 6 Kasım 2026

- Backend: 4 test geçti; kapasite/FIFO, hediye tekilleştirme, ayrılma sonrası destek puanı, yetkilendirme, WebSocket aktarımı ve 100 ardışık olay kontrol edildi.
- Frontend: TypeScript kontrolü ve Vite production derlemesi geçti. Phaser paket boyutu için derleyici uyarısı var; yerel prototipte engelleyici değil.
- Tarayıcı: katılım ve sahte hediye düğmeleriyle karakter, efekt ve sıralama görüntülendi.
- TestClient, kullanılan httpx sürümü için geçiş uyarısı veriyor; testler başarılı.
- Gerçek TikTok yayını, OBS ve 50 karakter FPS ölçümü henüz doğrulanmadı.

## v0.2 doğrulaması — 6 Kasım 2026

- Phaser sahnesi özgün pixel köy haritası, dokuz karakter görünümü ve altı kare animasyonlarla yenilendi. Görsel/karakter kaynakları `frontend/src/art.ts`, sahne davranışları `scene.ts` içinde.
- 50 karakter üç tam halkada görüntülendi. 1280 × 900 masaüstü tarayıcıdaki kısa kontrolde gösterge yaklaşık 120 FPS idi; bu, sürekli performans garantisi veya OBS ölçümü değildir.
- Katılım, sahte gül, konfeti/tempo artışı, toplu prova ekleme ve bu sayfadan eklenen prova karakterlerini çıkarma tarayıcıda denendi.
- 390 px mobil görünümde yatay taşma yok. OBS görünümü 1080 × 1920 viewport'ta tam alanı dolduruyor ve paneli gizliyor.
- Gerçek TikTok, müzik ve OBS uygulaması üzerinden yayın testi henüz yapılmadı.
