# TikTok Horon LIVE

Kendi TikTok yayınımız için yerelde çalışan, 2D pixel art horon oyunu. İzleyiciler `!katil` ile halkaya katılır, `!cik` ile ayrılır; hediyeler kozmetik efekt ve destek puanı sağlar.

**Durum:** İlk simülasyon prototipi. Gerçek TikTok bağlantısı henüz uygulanmadı. Proje kapsamı, mimari ve kabul kriterleri: [PROJE.md](PROJE.md).

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

Oyunu <http://127.0.0.1:5173> adresinde açın. Kullanıcı adı girip **Horona katıl**, **Hediye gönder** ve **Ayrıl** düğmelerini deneyin. Farklı isimlerle yeni karakterler ekleyebilirsiniz. Kontroller yalnızca prova içindir.

OBS Browser Source: `http://127.0.0.1:5173/?obs=1`, genişlik **1080**, yükseklik **1920**. OBS doğrulaması henüz yapılmadı.

## API örneği

```sh
curl -X POST http://127.0.0.1:8000/events \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: local-dev-token' \
  -d '{"event_id":"demo-001","type":"comment","user_id":"oyuncu1","nickname":"Horoncu","text":"!katil"}'
```

Her yeni olay için farklı `event_id` gönderin. Aynı kimlik tekrar gönderildiğinde ikinci kez işlenmez (son 10.000 kimlik, süreç belleğinde). Hediye örneği: `type: "gift"`, `gift_id: "demo-gift"`, `count: 3`, `diamonds: 1`. Puan = adet × birim elmas değeri; para karşılığı değildir. Bu endpoint tamamlanmış ve normalize edilmiş hediye olayları bekler; ham TikTok seri bildirimleri doğrudan gönderilmez.

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
- Karakterler kodla çizilmiş geçici pixel figürlerdir. Müzik ve harici görsel varlık eklenmedi.
- 50 karakterde FPS, OBS ve gerçek yayın testi ayrıca yapılacak.

## Dizinler

```text
backend/           FastAPI, oyun kuralları, testler
frontend/          Phaser 3 + TypeScript + Vite
PROJE.md           Ürün kapsamı ve yol haritası
```
