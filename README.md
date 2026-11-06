# TikTok Horon LIVE

Kendi TikTok yayınımız için yerelde çalışan, 2D pixel art horon oyunu. İzleyiciler `!katil` ile halkaya katılır, `!cik` ile ayrılır; hediyeler kozmetik efekt ve destek puanı sağlar.

**Durum:** v0.2 — animasyonlu köy düğünü ve yayın prova stüdyosu. Gerçek TikTok bağlantısı henüz uygulanmadı. Proje kapsamı, mimari ve kabul kriterleri: [PROJE.md](PROJE.md).

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

**+ 10 prova horoncusu ekle** ile 50 kişilik sahneyi deneyebilirsiniz. Kapasite aşılırsa yeni kişiler kuyruğa girer. **Provayı temizle** yalnızca bu sayfa açıldıktan sonra bu düğmeyle eklediğiniz karakterleri çıkarır; kişisel katılım ve destek puanları korunur. Sayfayı yenilemek bu yerel prova listesini sıfırlar. **İsimleri göster** sahnedeki izleyici etiketlerini açıp kapatır. FPS göstergesi kısa görsel kontrol içindir; uzun süreli performans ölçümü değildir.

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

- Oyun ve skorlar bellekte; backend yeniden başlayınca sıfırlanır.
- Yerel geliştirme içindir. Tek backend worker kullanın; portları internete açmayın. Prova paneli geliştirme token'ını kullanır. `ADMIN_TOKEN` değiştirilirse panel yerine özel başlıklı API isteği kullanın.
- TikTok adaptörü, hediye serisi birleştirme, SQLite, yönetim paneli, hız sınırı ve kalıcı olay tekilleştirmesi sonraki aşamalardır.
- Karakterler özgün, kodla çizilmiş altı karelik pixel sprite sheet'leridir. Köy haritası ve efektler de kodla üretilir; harici görsel veya font indirilmez. Müzik henüz eklenmedi.
- 50 karakterle kısa tarayıcı provası yapıldı. Uzun süreli FPS, OBS ve gerçek yayın testi ayrıca yapılacak.

## Dizinler

```text
backend/           FastAPI, oyun kuralları, testler
frontend/          Phaser 3 + TypeScript + Vite
PROJE.md           Ürün kapsamı ve yol haritası
```
