import Phaser from 'phaser';
import { HoronScene } from './scene';
import { HoronSound } from './sound';
import type { GameMessage } from './types';
import './style.css';

const scene = new HoronScene();
const sound = new HoronSound();
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 540, height: 960,
  pixelArt: true, backgroundColor: '#172f33',
  render: { preserveDrawingBuffer: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene });
const notice = document.querySelector<HTMLElement>('#notice')!;
const connection = document.querySelector<HTMLElement>('#connection')!;
let socket: WebSocket;
let retry: ReturnType<typeof setTimeout> | undefined;
let stopped = false;

function connect() {
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
  socket.onopen = () => {
    scene.setConnection(true);
    connection.textContent = 'Prova bağlantısı açık';
    connection.dataset.connected = 'true';
  };
  socket.onmessage = message => {
    const data: GameMessage = JSON.parse(message.data);
    scene.sync(data.state);
    sound.setMusic(data.state.music);
    if (data.effect) scene.gift(data.effect);
  };
  socket.onclose = () => {
    scene.setConnection(false);
    connection.textContent = 'Yeniden bağlanıyor…';
    connection.dataset.connected = 'false';
    if (!stopped) retry = setTimeout(connect, 2000);
  };
  socket.onerror = () => socket.close();
}
connect();

if (new URLSearchParams(location.search).get('obs') === '1') document.body.classList.add('obs');

type EventInput = { type: 'comment' | 'gift'; user_id: string; nickname: string; text?: string; gift_id?: string; diamonds?: number };
async function post(event: EventInput) {
  const response = await fetch('/events', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'x-admin-token': 'local-dev-token',
  }, body: JSON.stringify({ ...event, event_id: crypto.randomUUID() }) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

async function withFeedback(action: () => Promise<void>, success: string) {
  const buttons = document.querySelectorAll<HTMLButtonElement>('#controls button');
  buttons.forEach(b => { b.disabled = true; });
  try {
    await action();
    notice.textContent = success;
    notice.dataset.error = 'false';
  } catch {
    notice.textContent = 'Gönderilemedi. Backend bağlantısını ve yerel prova token’ını kontrol et.';
    notice.dataset.error = 'true';
  } finally { buttons.forEach(b => { b.disabled = false; }); }
}

function send(type: 'comment' | 'gift', text = '', gift_id?: string, diamonds = 1) {
  const nickname = document.querySelector<HTMLInputElement>('#nickname')!.value.trim();
  if (!nickname) { notice.textContent = 'Önce bir kullanıcı adı gir.'; return; }
  void withFeedback(() => post({ type, user_id: nickname, nickname, text, gift_id, diamonds }), type === 'gift' ? 'Hediye sahneye ulaştı.' : text === '!cik' ? 'Horondan ayrıldın.' : 'Hoş geldin! Halkada yerin hazır.');
}

function join() {
  const region = document.querySelector<HTMLSelectElement>('#region')!.value;
  send('comment', region ? `!katil ${region}` : '!katil');
}

document.querySelector('#join')!.addEventListener('click', join);
document.querySelector('#leave')!.addEventListener('click', () => send('comment', '!cik'));
document.querySelector('#rose')!.addEventListener('click', () => send('gift', '', 'demo-rose'));
document.querySelector('#celebrate')!.addEventListener('click', () => send('gift', '', 'demo-celebration', 10));
document.querySelector('#move-left')!.addEventListener('click', () => send('comment', '!sol'));
document.querySelector('#move-right')!.addEventListener('click', () => send('comment', '!sağ'));
document.querySelector('#move-down')!.addEventListener('click', () => send('comment', '!çök'));
document.querySelector('#move-up')!.addEventListener('click', () => send('comment', '!kalk'));
document.querySelector('#wave-start')!.addEventListener('click', () => send('comment', '!dalga'));
document.querySelector('#wave-fire')!.addEventListener('click', () => send('comment', '🔥'));
document.querySelector('#weather-tempo')!.addEventListener('click', () => send('comment', '!tempo'));
document.querySelector('#duel-start')!.addEventListener('click', () => send('comment', '!duello'));
document.querySelector('#duel-a')!.addEventListener('click', () => send('comment', '!a'));
document.querySelector('#duel-b')!.addEventListener('click', () => send('comment', '!b'));
document.querySelector('#ring-repair')!.addEventListener('click', () => send('comment', '🤝'));
document.querySelector('#save-photo')!.addEventListener('click', () => scene.savePhoto());
document.querySelector('#raid-start')!.addEventListener('click', () => {
  const name = document.querySelector<HTMLInputElement>('#raid-name')!.value.trim();
  if (!name) { notice.textContent = 'Misafir ekip adını gir.'; return; }
  send('comment', `!baskin ${name}`);
});
document.querySelector('#sound-enable')!.addEventListener('click', () => { sound.enable(); notice.textContent = 'Prosedürel kemençe sesi açıldı.'; });
document.querySelector('#music-clap')!.addEventListener('click', () => send('comment', '👏'));
document.querySelector('#music-drum')!.addEventListener('click', () => send('comment', '!davul'));
document.querySelector('#music-pipe')!.addEventListener('click', () => send('comment', '!tulum'));
document.querySelector('#names')!.addEventListener('change', event => scene.setNames((event.target as HTMLInputElement).checked));
document.querySelector('#nickname')!.addEventListener('keydown', event => {
  if ((event as KeyboardEvent).key === 'Enter') join();
});

const demoNames = ['Ayşe', 'Murat', 'Ece', 'Kaan', 'Zeynep', 'Ali', 'Elif', 'Deniz', 'Yağmur', 'Emre'];
const demoRegions = ['trabzon', 'rize', 'ordu', 'giresun', 'artvin', 'samsun'];
const demoIds: string[] = [];
document.querySelector('#crowd')!.addEventListener('click', () => {
  void withFeedback(async () => {
    for (let i = 0; i < 25; i++) {
      const id = `demo-${crypto.randomUUID()}`;
      await post({ type: 'comment', user_id: id, nickname: demoNames[i % demoNames.length], text: `!katil ${demoRegions[i % demoRegions.length]}` });
      demoIds.push(id);
    }
  }, '25 prova horoncusu eklendi. Tek horon halkası kalabalıkla birlikte büyür.');
});
document.querySelector('#clear-demo')!.addEventListener('click', () => {
  void withFeedback(async () => {
    while (demoIds.length) {
      const id = demoIds[0];
      await post({ type: 'comment', user_id: id, nickname: 'Prova', text: '!cik' });
      demoIds.shift();
    }
  }, 'Bu sayfadan eklenen prova horoncuları ayrıldı.');
});

window.addEventListener('pagehide', () => { stopped = true; clearTimeout(retry); socket.close(); });
if (import.meta.hot) import.meta.hot.dispose(() => { stopped = true; clearTimeout(retry); socket.close(); game.destroy(true); });
