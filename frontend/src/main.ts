import Phaser from 'phaser';
import './style.css';

type Player = { id: string; nickname: string; score: number };
type State = { players: Player[]; waiting: number; capacity: number; leaderboard: Player[] };
let state: State = { players: [], waiting: 0, capacity: 50, leaderboard: [] };
let status = 'BAĞLANIYOR';
const effects = new Map<string, number>();
const font = 'monospace';

class HoronScene extends Phaser.Scene {
  private dancers = new Map<string, Phaser.GameObjects.Container>();
  private counter!: Phaser.GameObjects.Text;
  private ranking!: Phaser.GameObjects.Text;
  private connection!: Phaser.GameObjects.Text;
  create() {
    const g = this.add.graphics();
    g.fillStyle(0x182f30).fillRect(0, 0, 540, 960);
    g.fillStyle(0x294b43).fillTriangle(0, 340, 210, 110, 430, 340);
    g.fillStyle(0x345a49).fillTriangle(190, 340, 440, 150, 620, 340);
    g.fillStyle(0x66805a).fillRect(0, 320, 540, 640);
    g.fillStyle(0xa9a17b).fillEllipse(270, 605, 490, 440);
    g.lineStyle(3, 0xccc09a).strokeEllipse(270, 605, 450, 400);
    for (let x = 20; x < 540; x += 45) {
      g.fillStyle(x % 2 ? 0xf0b76b : 0xc96950).fillTriangle(x, 285, x + 20, 285, x + 10, 312);
    }
    this.add.text(32, 35, 'KÖY MEYDANI / 01', { fontFamily: font, fontSize: '14px', color: '#c8d7a6' });
    this.add.text(30, 68, 'HORON LIVE', { fontFamily: font, fontSize: '48px', fontStyle: 'bold', color: '#fff1d0' });
    this.add.text(32, 130, 'Bir halka, bin hikâye.', { fontFamily: font, fontSize: '17px', color: '#d2d9b9' });
    this.connection = this.add.text(32, 174, '', { fontFamily: font, fontSize: '13px' });
    this.makeDancer('Gelin', 0xf3e5be).setPosition(244, 595);
    this.makeDancer('Damat', 0x293d49).setPosition(297, 595);
    this.counter = this.add.text(30, 827, '', { fontFamily: font, fontSize: '16px', color: '#fff0d3' });
    this.ranking = this.add.text(30, 862, '', { fontFamily: font, fontSize: '14px', color: '#f5d59d', lineSpacing: 7 });
  }
  makeDancer(name: string, color: number) {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x283831, .25).fillEllipse(0, 24, 34, 9);
    g.fillStyle(0x292a2d).fillRect(-10, 10, 7, 14).fillRect(3, 10, 7, 14);
    g.fillStyle(color).fillRect(-12, -10, 24, 24).fillRect(-23, -9, 12, 6).fillRect(11, -9, 12, 6);
    g.fillStyle(0xe9ba8c).fillRect(-9, -29, 18, 19);
    g.fillStyle(0x34322f).fillRect(-10, -31, 20, 6);
    const label = this.add.text(0, -45, name.slice(0, 16), { fontFamily: font, fontSize: '11px', color: '#fff5dc', backgroundColor: '#1c3430' }).setOrigin(.5);
    c.add([g, label]);
    return c;
  }
  update(time: number) {
    const ids = new Set(state.players.map(p => p.id));
    for (const [id, dancer] of this.dancers) if (!ids.has(id)) { dancer.destroy(); this.dancers.delete(id); }
    state.players.forEach((p, i) => {
      let dancer = this.dancers.get(p.id);
      if (!dancer) {
        dancer = this.makeDancer(p.nickname, [0x9f524b, 0xd5ac58, 0x557e9c, 0xe4d3a8][i % 4]);
        this.dancers.set(p.id, dancer);
      }
      const angle = i / state.players.length * Math.PI * 2 + time / 17000;
      const ring = i >= 25 ? 1.12 : .82;
      dancer.setPosition(270 + Math.cos(angle) * 215 * ring, 605 + Math.sin(angle) * 170 * ring + Math.sin(time / 110 + i) * 4);
      dancer.setDepth(dancer.y);
      dancer.setAngle(Math.sin(time / 180 + i) * 6);
      const until = effects.get(p.id) ?? 0;
      dancer.setScale(until > Date.now() ? 1.35 : 1);
      if (until && until <= Date.now()) effects.delete(p.id);
    });
    this.connection.setText(status);
    this.counter.setText(`${state.players.length}/${state.capacity} HORONCU   ·   ${state.waiting} SIRADA`);
    this.ranking.setText(state.leaderboard.length ? state.leaderboard.map((p, i) => `${i + 1}. ${p.nickname.slice(0, 18)}  ${p.score} ✦`).join('\n') : 'Sohbete !katil yaz, halkaya katıl.');
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 540, height: 960,
  pixelArt: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: HoronScene });

function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
  ws.onopen = () => { status = '● PROVA MODU / BAĞLI'; };
  ws.onmessage = message => {
    const data = JSON.parse(message.data);
    state = data.state;
    if (data.effect) effects.set(data.effect.user_id, Date.now() + 2500);
  };
  ws.onclose = () => { status = '○ BAĞLANTI BEKLENİYOR'; setTimeout(connect, 2000); };
  ws.onerror = () => ws.close();
}
connect();

if (new URLSearchParams(location.search).get('obs') === '1') {
  document.querySelector('#controls')?.remove();
  document.body.style.padding = '0';
  document.querySelector<HTMLElement>('#game')!.style.height = '100vh';
}
async function send(type: 'comment' | 'gift', text = '') {
  const nickname = document.querySelector<HTMLInputElement>('#nickname')!.value.trim();
  const notice = document.querySelector('#notice')!;
  if (!nickname) { notice.textContent = 'Bir kullanıcı adı gir.'; return; }
  try {
    const response = await fetch('/events', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'x-admin-token': 'local-dev-token',
    }, body: JSON.stringify({ event_id: crypto.randomUUID(), type, user_id: nickname, nickname, text, gift_id: type === 'gift' ? 'demo-gift' : undefined }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    notice.textContent = 'Prova olayı gönderildi.';
  } catch { notice.textContent = 'Olay gönderilemedi. Backend bağlantısını kontrol et.'; }
}
document.querySelector('#join')!.addEventListener('click', () => void send('comment', '!katil'));
document.querySelector('#leave')!.addEventListener('click', () => void send('comment', '!cik'));
document.querySelector('#gift')!.addEventListener('click', () => void send('gift'));
