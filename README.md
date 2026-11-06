# TikTok Horon LIVE

Kendi TikTok yayınımız için yerelde çalışan, 2D pixel art horon oyunu. İzleyiciler `!katil` ile halkaya katılır, `!cik` ile ayrılır; hediyeler kozmetik efekt ve destek puanı sağlar.

**Durum:** v0.3 — animasyonlu köy düğünü, yayın prova stüdyosu ve deneysel TikTokLive adaptörü. Gerçek yayında uçtan uca test henüz yapılmadı. Proje kapsamı, mimari ve kabul kriterleri: [PROJE.md](PROJE.md).

## Çalıştırma

Python 3.11+ ve Node.js 22.12+ kullanın. İki terminal açın.

Backend (proje kökünden):

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.lock.txt
cd backend
uvicorn server:app --host 127.0.0.1 --port 8000
```

Frontend (proje kökünden):

```sh
cd frontend
npm ci
npm run dev
```

Oyunu <http://127.0.0.1:5173> adresinde açın. Kullanıcı adı girip **Halkaya katıl** ve **Ayrıl** düğmelerini deneyin. **Bir gül** kalp efekti, **Kutlama** konfeti ve 6,5 saniyelik 1,6× horon temposu sağlar. Hediyeler provadır; ücret alınmaz.

## TikTok LIVE adaptörü (deneysel)

Backend çalışırken ayrı bir terminalde yayıncı kullanıcı adıyla adaptörü başlatın:

```sh
cd backend
python tiktok_adapter.py @kullanici_adi
```

`ADMIN_TOKEN` backend ile aynı olmalıdır. Farklı adres için `HORON_API_URL` kullanılabilir. Adaptör oyun komutlarını ve tamamlanmış hediye olaylarını gönderir. Seri hediyelerin ara bildirimleri atlanır; final bildirimindeki kümülatif adet bir kez sayılır. Bağlantı koparsa 2 saniyeden başlayan üstel beklemeyle yeniden bağlanır.

TikTokLive resmi olmayan, tersine mühendislik tabanlı bir istemcidir. TikTok değişiklikleri bağlantıyı bozabilir; ilk gerçek yayından önce yorum, tek hediye ve seri hediye ayrı ayrı doğrulanmalıdır.

**+ 25 prova horoncusu ekle** ile 200 kişilik sahneyi deneyebilirsiniz. Bütün horoncular tek çemberde kalır; kişi sayısı arttıkça çember büyür ve karakterler sahneye sığacak biçimde kademeli küçülür. Kapasite aşılırsa yeni kişiler kuyruğa girer. **Provayı temizle** yalnızca bu sayfa açıldıktan sonra bu düğmeyle eklediğiniz karakterleri çıkarır; kişisel katılım ve destek puanları korunur. Sayfayı yenilemek bu yerel prova listesini sıfırlar. **İsimleri göster** sahnedeki izleyici etiketlerini açıp kapatır. FPS göstergesi kısa görsel kontrol içindir; uzun süreli performans ölçümü değildir.

Aktif horoncular `!sol`, `!sağ`, `!çök` ve `!kalk` komutlarıyla toplu harekete oy verebilir. Her kullanıcı tur başına bir oy kullanır; kalabalığa göre artan hedefe ulaşan hareket bütün halkada oynatılır.

Bir aktif horoncu `!dalga` yazarak sekiz saniyelik horon dalgasını başlatabilir. Aktif izleyiciler `🔥` veya `!ateş` ile bir kez destek verir. Kalabalığa göre belirlenen hedef dolarsa dalga halkayı yeniden dolaşır ve tempo beş saniye artar.

Köy meydanı kalabalıkla birlikte dört aşamada canlanır: 25 horoncuda fenerler, 50'de yeni flamalar, 100'de ev ışıkları ve seyirciler, 150'de yıldız/havai fişek parıltıları açılır. Kişi sayısı eşiğin altına inerse ilgili dekor katmanı kapanır.

Geçerli katılım, oy, dalga desteği ve hediyeler aktivite sayılır. Her 25 olayda en aktif uygun horoncu **horonbaşı** olur; halkada büyük, parlak ve özel rozetli görünür. Horonbaşı ayrılırsa görev otomatik devredilir.

Her 40 geçerli olayda meydan açıksa sis, yağmur veya fırtına başlar. Hava dans temposunu hafifçe etkiler. Aktif horoncular tur başına bir kez `!tempo` yazar; kalabalığa göre belirlenen hedef dolunca hava açılır.

Katılırken `!katil trabzon`, `!katil rize`, `!katil ordu`, `!katil giresun`, `!katil artvin` veya `!katil samsun` yazılabilir. Doğrulanan memleket karakterin üzerinde kendine özgü renkli kuşakla gösterilir; bilinmeyen değerler yok sayılır.

Aktif bir horoncu `!duello` ile on saniyelik kemençe düellosunu başlatır. Her aktif kullanıcı `!a` veya `!b` ile bir kez oy verir. Hedef erken dolarsa sonuç hemen açıklanır; A kazanırsa tempo, B kazanırsa halkanın dönüş yönü beş saniyeliğine değişir.

Her 60 geçerli olayda en az sekiz horoncu varsa halkada görünür bir boşluk açılır. Aktif horoncular `🤝` veya `!birleş` ile bir kez destek verir; hedef dolunca tek çember yeniden kapanır.

50/100/150/200 horoncu eşiklerinde ve en az 10 destek puanlık kutlamalarda sahne kısa süre poz verir; flaş ve hatıra çerçevesi görünür. **Hatıra karesini indir** düğmesi o anki sahneyi PNG olarak kaydeder.

Kullanıcı ziyaretleri ve aktivitesi `backend/horon.db` SQLite veritabanında kalıcı tutulur. Aynı oturumda tekrar katılmak ziyareti artırmaz. 2 ziyarette bronz, 5 ziyarette gümüş, 10 ziyarette altın müdavim işareti karakterin üzerinde görünür. Konum `HORON_DB_PATH` ile değiştirilebilir.

Aktif bir horoncu `!baskin ekip adı` yazarak misafir grubunu duyurabilir. Sonraki 10 yeni katılımcı bu grubun rozetiyle sahnenin iki kenarından toplu giriş yapar; mevcut oyuncular sonradan gruba yazılmaz.

**Sesi aç** düğmesi tarayıcıda prosedürel üretilen temel kemençe ritmini başlatır. Aktif horoncular `👏`/`!alkış`, `!davul` veya `!tulum` ile sekiz saniyeliğine ilgili ses katmanını ritme ekler. Harici ses dosyası kullanılmaz.

OBS Browser Source: `http://127.0.0.1:5173/?obs=1`, genişlik **1080**, yükseklik **1920**. Bu görünüm prova kontrollerini gizler. Tarayıcıda tam 1080 × 1920 alan doğrulandı; OBS uygulamasında yayın doğrulaması henüz yapılmadı.

## API örneği

```sh
curl -X POST http://127.0.0.1:8000/events \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: local-dev-token' \
  -d '{"event_id":"demo-001","type":"comment","user_id":"oyuncu1","nickname":"Horoncu","text":"!katil"}'
```

Her yeni olay için farklı `event_id` gönderin. Aynı kimlik tekrar gönderildiğinde ikinci kez işlenmez (son 10.000 kimlik, süreç belleğinde). Hediye örneği: `type: "gift"`, `gift_id: "demo-rose"`, `count: 3`, `diamonds: 1`. `demo-celebration` veya en az 10 destek puanı değerindeki hediye kutlama efektini tetikler. Bunlar simülasyon kimlikleridir; gerçek TikTok hediye kimlikleri değildir. Puan = adet × birim elmas değeri; para karşılığı değildir. Bu endpoint tamamlanmış ve normalize edilmiş hediye olayları bekler; ham TikTok seri bildirimleri doğrudan gönderilmez.

`GET /health`: sağlık kontrolü. `WS /ws/game`: ilk durum ve sonraki güncellemeler.

## Doğrulama

```sh
source .venv/bin/activate
cd backend
python -m pytest -q
```

```sh
cd frontend
npm run build
```

## Mevcut sınırlar

- Canlı oyun, kuyruk ve oturum skoru bellektedir; ziyaret/aktivite profilleri SQLite'ta kalıcıdır.
- Yerel geliştirme içindir. Tek backend worker kullanın; portları internete açmayın. Prova paneli geliştirme token'ını kullanır. `ADMIN_TOKEN` değiştirilirse panel yerine özel başlıklı API isteği kullanın.
- TikTok adaptörü ve hediye serisi normalizasyonu uygulandı ancak gerçek yayında henüz doğrulanmadı. SQLite, yönetim paneli, hız sınırı ve kalıcı olay tekilleştirmesi sonraki aşamalardır.
- Karakterler özgün, kodla çizilmiş altı karelik pixel sprite sheet'leridir. Köy haritası, efektler ve prosedürel sesler kodla üretilir; harici görsel, font veya ses indirilmez.
- Tek büyüyen halkada 200 karakter desteği eklendi; uzun süreli FPS, OBS ve tam kapasite görsel testi ayrıca yapılacak.

## Dizinler

```text
backend/           FastAPI, oyun kuralları, testler
frontend/          Phaser 3 + TypeScript + Vite
PROJE.md           Ürün kapsamı ve yol haritası
```
