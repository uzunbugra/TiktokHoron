import Phaser from 'phaser';
import { createArt } from './art';
import type { GameState, Gift, MoveName, Player } from './types';

const font = 'monospace';
type Dancer = { root: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text; leaderBadge: Phaser.GameObjects.Text };
type RingLayout = { x: number; y: number; radiusX: number; radiusY: number; scale: number };
type FestivalObject = Phaser.GameObjects.Shape | Phaser.GameObjects.Text;

export class HoronScene extends Phaser.Scene {
  private dancers = new Map<string, Dancer>();
  private couple: Dancer[] = [];
  private musician!: Dancer;
  private state: GameState = { revision: 0, players: [], waiting: 0, capacity: 200, leaderboard: [],
    move: { name: null, revision: 0 }, vote: { counts: { sol: 0, sag: 0, cok: 0, kalk: 0 }, target: 1 },
    wave: { revision: 0, support: 0, target: 1, status: 'idle' }, leader: { id: null, revision: 0 },
    weather: { kind: 'clear', revision: 0, support: 0, target: 1 } };
  private ringGuide!: Phaser.GameObjects.Ellipse;
  private festivalLayers: FestivalObject[][] = [[], [], [], []];
  private festivalStatus!: Phaser.GameObjects.Text;
  private festivalLevel = 0;
  private rain: Phaser.GameObjects.Rectangle[] = [];
  private fog: Phaser.GameObjects.Ellipse[] = [];
  private storm: Phaser.GameObjects.Rectangle[] = [];
  private counter!: Phaser.GameObjects.Text;
  private ranking!: Phaser.GameObjects.Text;
  private connection!: Phaser.GameObjects.Text;
  private tempo!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private voteStatus!: Phaser.GameObjects.Text;
  private waveStatus!: Phaser.GameObjects.Text;
  private toastUntil = 0;
  private boostUntil = 0;
  private rotation = 0;
  private effectUntil = new Map<string, number>();
  private ready = false;
  private pendingGifts: Gift[] = [];
  private namesVisible = true;
  private connected = false;
  private moveRevision = 0;
  private moveName: MoveName | null = null;
  private moveUntil = 0;
  private waveRevision = 0;
  private waveStartedAt = 0;
  private waveCompletionRevision = 0;
  private leaderRevision = 0;
  private weatherRevision = 0;

  constructor() { super('horon'); }

  create() {
    createArt(this);
    this.add.image(270, 480, 'village').setDisplaySize(540, 960);
    this.createFestival();
    this.createWeather();
    this.ringGuide = this.add.ellipse(270, 586, 144, 104, 0xffffff, 0)
      .setStrokeStyle(1, 0xe0c68e, .32).setDepth(200);
    this.add.text(28, 27, 'KARADENİZ • KÖY DÜĞÜNÜ', { fontFamily: font, fontSize: '12px', color: '#b9c9a1', letterSpacing: 2 });
    this.add.text(26, 55, 'HORON', { fontFamily: font, fontSize: '55px', fontStyle: 'bold', color: '#fff0ce' });
    this.add.rectangle(283, 84, 60, 25, 0xca795d);
    this.add.text(283, 84, 'LIVE', { fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#fff6e0' }).setOrigin(.5);
    this.add.text(29, 124, 'Bir halka, bin hikâye.', { fontFamily: font, fontSize: '16px', color: '#b6c5ac' });
    this.connection = this.add.text(29, 160, '', { fontFamily: font, fontSize: '11px', color: '#c6d1b7' });
    this.setConnection(this.connected);
    this.tempo = this.add.text(508, 160, 'TEMPO 1×', { fontFamily: font, fontSize: '11px', color: '#e4bd7d' }).setOrigin(1, 0);
    this.festivalStatus = this.add.text(508, 181, 'MEYDAN SAKİN', { fontFamily: font, fontSize: '9px', color: '#91a48b' }).setOrigin(1, 0);
    this.add.text(29, 181, 'HAVA AÇIK', { fontFamily: font, fontSize: '9px', color: '#9eb4ad' }).setName('weather-status');
    this.couple = [this.makeDancer({ id: 'bride', nickname: 'Gelin', score: 0 }, 6), this.makeDancer({ id: 'groom', nickname: 'Damat', score: 0 }, 7)];
    this.couple.forEach((d, i) => { d.root.setPosition(250 + i * 44, 591).setDepth(591); d.root.setScale(1.15); });
    this.musician = this.makeDancer({ id: 'musician', nickname: 'Kemençeci', score: 0 }, 8);
    this.musician.root.setPosition(102, 350).setDepth(350);
    this.waveStatus = this.add.text(270, 727, '', { fontFamily: font, fontSize: '10px', color: '#f0b172', backgroundColor: '#3e4034', padding: { x: 8, y: 5 } }).setOrigin(.5).setDepth(1100);
    this.voteStatus = this.add.text(270, 756, '', { fontFamily: font, fontSize: '10px', color: '#e4c987', backgroundColor: '#30483d', padding: { x: 8, y: 5 } }).setOrigin(.5).setDepth(1100);
    this.add.text(270, 789, 'SOHBETE !katil YAZ · HORONA KATIL', { fontFamily: font, fontSize: '12px', color: '#fff1cd', backgroundColor: '#3c5142', padding: { x: 12, y: 8 } }).setOrigin(.5).setDepth(1100);
    this.counter = this.add.text(28, 837, '', { fontFamily: font, fontSize: '15px', color: '#fff0d3' }).setDepth(1100);
    this.add.text(28, 875, 'DÜĞÜNÜN DESTEKÇİLERİ', { fontFamily: font, fontSize: '10px', color: '#91a48b', letterSpacing: 2 }).setDepth(1100);
    this.ranking = this.add.text(28, 898, '', { fontFamily: font, fontSize: '12px', color: '#f2d59b', lineSpacing: 4 }).setDepth(1100);
    this.toast = this.add.text(270, 218, '', { fontFamily: font, fontSize: '14px', color: '#fff4d9', backgroundColor: '#243c35', padding: { x: 14, y: 9 }, align: 'center' }).setOrigin(.5).setDepth(1500).setVisible(false);
    this.ready = true;
    this.sync(this.state);
    for (const gift of this.pendingGifts) this.gift(gift);
    this.pendingGifts = [];
  }

  setConnection(connected: boolean) {
    this.connected = connected;
    this.connection?.setText(connected ? '● PROVA MODU / BAĞLI' : '○ BAĞLANTI BEKLENİYOR');
  }

  setNames(visible: boolean) {
    this.namesVisible = visible;
    this.dancers.forEach(d => d.label.setVisible(visible));
  }

  sync(state: GameState) {
    this.state = state;
    if (!this.ready) return;
    if (state.move.revision > this.moveRevision && state.move.name) {
      this.moveRevision = state.move.revision;
      this.moveName = state.move.name;
      this.moveUntil = Date.now() + 1800;
      const labels: Record<MoveName, string> = { sol: 'SOLA', sag: 'SAĞA', cok: 'ÇÖK', kalk: 'KALK' };
      this.toast.setText(`Oylama tamamlandı · ${labels[state.move.name]}!`).setVisible(true);
      this.toastUntil = Date.now() + 1800;
    }
    if (state.wave.revision > this.waveRevision) {
      this.waveRevision = state.wave.revision;
      this.waveStartedAt = Date.now();
      this.toast.setText('Horon dalgası başladı · 🔥 gönder!').setVisible(true);
      this.toastUntil = Date.now() + 2200;
    }
    if (state.wave.status === 'success' && state.wave.revision > this.waveCompletionRevision) {
      this.waveCompletionRevision = state.wave.revision;
      this.waveStartedAt = Date.now();
      this.boostUntil = Math.max(this.boostUntil, Date.now() + 5000);
      this.toast.setText('Dalga tamamlandı · kemençe coştu!').setVisible(true);
      this.toastUntil = Date.now() + 2600;
    }
    if (state.leader.revision > this.leaderRevision) {
      this.leaderRevision = state.leader.revision;
      const leader = state.players.find(player => player.id === state.leader.id);
      if (leader) {
        this.toast.setText(`${leader.nickname.slice(0, 18)} horonbaşı oldu!`).setVisible(true);
        this.toastUntil = Date.now() + 2600;
      }
    }
    if (state.weather.revision > this.weatherRevision) {
      this.weatherRevision = state.weather.revision;
      const weatherNames = { clear: 'Hava açtı!', sis: 'Meydana sis çöktü', yagmur: 'Karadeniz yağmuru başladı', firtina: 'Fırtına geliyor!' };
      this.toast.setText(weatherNames[state.weather.kind]).setVisible(true);
      this.toastUntil = Date.now() + 2500;
    }
    const ids = new Set(state.players.map(p => p.id));
    for (const [id, dancer] of this.dancers) {
      if (!ids.has(id)) { dancer.root.destroy(); this.dancers.delete(id); this.effectUntil.delete(id); }
    }
    state.players.forEach(p => {
      let dancer = this.dancers.get(p.id);
      if (!dancer) {
        let hash = 0;
        for (const char of p.id) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
        dancer = this.makeDancer(p, hash % 6);
        this.dancers.set(p.id, dancer);
      }
      dancer.label.setText(this.shortName(p.nickname)).setVisible(this.namesVisible);
      dancer.leaderBadge.setVisible(p.id === state.leader.id);
    });
    this.updateRingGuide(this.ringLayout(state.players.length));
    this.updateFestival(state.players.length);
    this.updateWeather();
    this.counter.setText(`${state.players.length.toString().padStart(3, '0')} / ${state.capacity} HORONCU    1 HALKA    ${state.waiting} SIRADA`);
    const votes = state.vote.counts;
    const voteTotal = votes.sol + votes.sag + votes.cok + votes.kalk;
    this.voteStatus.setText(voteTotal ? `OY: SOL ${votes.sol} · SAĞ ${votes.sag} · ÇÖK ${votes.cok} · KALK ${votes.kalk}   /${state.vote.target}` : '!sol  !sağ  !çök  !kalk');
    this.waveStatus.setText(state.wave.status === 'active' ? `HORON DALGASI 🔥  ${state.wave.support}/${state.wave.target}` : state.wave.status === 'success' ? 'DALGA TAMAMLANDI ✦' : state.wave.status === 'failed' ? 'DALGA SÖNDÜ · !dalga ile yeniden' : '!dalga ile halkayı harekete geçir');
    this.ranking.setText(state.leaderboard.length ? state.leaderboard.map((p, i) => `${i + 1}. ${p.nickname.slice(0, 19).padEnd(19)} ${p.score} ✦`).join('\n') : 'İlk destekçi sen ol. İyi ki geldin!');
  }

  private shortName(name: string) { return name.length > 10 ? `${name.slice(0, 9)}…` : name; }

  private makeDancer(p: Player, variant: number): Dancer {
    const root = this.add.container(270, 580);
    const shadow = this.add.ellipse(0, 0, 29, 8, 0x283b32, .23);
    const sprite = this.add.sprite(0, 0, `dancer-${variant}`).setOrigin(.5, 1).play(`dancer-${variant}`);
    const label = this.add.text(0, -56, this.shortName(p.nickname), { fontFamily: font, fontSize: '10px', color: '#fff5dc', backgroundColor: '#243d35', padding: { x: 3, y: 2 } }).setOrigin(.5);
    const leaderBadge = this.add.text(0, -72, '◆ HORONBAŞI ◆', { fontFamily: font, fontSize: '8px', color: '#ffe19b', backgroundColor: '#774b39', padding: { x: 4, y: 2 } }).setOrigin(.5).setVisible(false);
    root.add([shadow, sprite, label, leaderBadge]);
    return { root, sprite, label, leaderBadge };
  }

  private ringLayout(count: number): RingLayout {
    const fill = Phaser.Math.Clamp(count / Math.max(1, this.state.capacity), 0, 1);
    const growth = Math.sqrt(fill);
    return {
      x: 270,
      y: 586,
      radiusX: Phaser.Math.Linear(72, 220, growth),
      radiusY: Phaser.Math.Linear(52, 166, growth),
      scale: Phaser.Math.Linear(1, .38, growth),
    };
  }

  private updateRingGuide(layout: RingLayout) {
    this.ringGuide.setPosition(layout.x, layout.y)
      .setDisplaySize(layout.radiusX * 2 + 24, layout.radiusY * 2 + 18);
  }

  private festivalObject(level: number, object: FestivalObject) {
    object.setDepth(150).setVisible(false);
    this.festivalLayers[level].push(object);
    return object;
  }

  private createFestival() {
    // 25: warm lanterns wake up around the square.
    [[64, 303], [476, 303], [48, 688], [492, 688]].forEach(([x, y]) => {
      this.festivalObject(0, this.add.circle(x, y, 12, 0xf0b85e, .12));
      const light = this.festivalObject(0, this.add.rectangle(x, y, 7, 11, 0xf4c66f, .9));
      this.tweens.add({ targets: light, alpha: { from: .65, to: 1 }, duration: 650 + x, yoyo: true, repeat: -1 });
    });
    this.festivalObject(0, this.add.text(270, 249, '✦ ŞENLİK BAŞLADI ✦', { fontFamily: font, fontSize: '9px', color: '#ffe0a0', backgroundColor: '#6e493b', padding: { x: 7, y: 3 } }).setOrigin(.5));

    // 50: a second string of colourful pennants crosses the square.
    this.festivalObject(1, this.add.rectangle(270, 282, 390, 2, 0xd8c999, .65));
    for (let x = 82; x <= 458; x += 24) {
      const colors = [0xc9785d, 0xdfb562, 0x8ba99b, 0xb7839c];
      this.festivalObject(1, this.add.triangle(x, 290, 0, 0, 12, 0, 6, 13, colors[(x / 24 | 0) % colors.length], .95));
    }

    // 100: houses glow and little spectators gather at the edge.
    [[55, 351], [108, 351], [418, 362], [470, 362]].forEach(([x, y]) => {
      const window = this.festivalObject(2, this.add.rectangle(x, y, 12, 14, 0xffd77f, .85));
      this.tweens.add({ targets: window, alpha: { from: .7, to: 1 }, duration: 1100 + x, yoyo: true, repeat: -1 });
    });
    [62, 88, 452, 478].forEach((x, i) => {
      this.festivalObject(2, this.add.circle(x, 742 - (i % 2) * 7, 7, [0xb85b52, 0x407e86, 0xd3a445, 0x7167a0][i]));
      this.festivalObject(2, this.add.rectangle(x, 757 - (i % 2) * 7, 12, 22, 0x263b35));
    });

    // 150: pixel-like stars and fireworks crown the full square.
    [[118, 235], [205, 265], [342, 250], [430, 225]].forEach(([x, y], i) => {
      const star = this.festivalObject(3, this.add.star(x, y, 8, 3, 10, [0xf5cf73, 0xdd8c78, 0x9fc5a5, 0xe7b2c1][i], .9));
      this.tweens.add({ targets: star, scale: { from: .55, to: 1.15 }, alpha: { from: .35, to: 1 }, angle: 45, duration: 800 + i * 170, yoyo: true, repeat: -1 });
    });
  }

  private updateFestival(count: number) {
    const level = count >= 150 ? 4 : count >= 100 ? 3 : count >= 50 ? 2 : count >= 25 ? 1 : 0;
    this.festivalLayers.forEach((objects, index) => objects.forEach(object => object.setVisible(index < level)));
    this.festivalStatus.setText(level ? `ŞENLİK SEVİYESİ ${level}/4` : 'MEYDAN SAKİN');
    if (level > this.festivalLevel) {
      this.toast.setText(`Meydan canlandı · Şenlik seviyesi ${level}!`).setVisible(true);
      this.toastUntil = Date.now() + 2200;
    }
    this.festivalLevel = level;
  }

  private createWeather() {
    for (let i = 0; i < 34; i++) {
      const drop = this.add.rectangle((i * 83) % 530 + 5, 205 + (i * 47) % 510, 2, 15, 0xb9d6d5, .55).setDepth(900).setAngle(12).setVisible(false);
      this.rain.push(drop);
      this.tweens.add({ targets: drop, y: '+=260', x: '+=34', duration: 620 + (i % 5) * 80, repeat: -1 });
    }
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.ellipse(70 + i * 115, 390 + (i % 2) * 130, 210, 72, 0xdbe2d2, .12).setDepth(850).setVisible(false);
      this.fog.push(cloud);
      this.tweens.add({ targets: cloud, x: `+=${i % 2 ? -45 : 45}`, duration: 3500 + i * 400, yoyo: true, repeat: -1 });
    }
    const shade = this.add.rectangle(270, 480, 540, 620, 0x17263d, .2).setDepth(840).setVisible(false);
    const lightning = this.add.rectangle(270, 390, 540, 380, 0xdbe8ff, 0).setDepth(905).setVisible(false);
    this.storm.push(shade, lightning);
    this.tweens.add({ targets: lightning, alpha: { from: 0, to: .32 }, duration: 90, hold: 50, yoyo: true, repeat: -1, repeatDelay: 2600 });
  }

  private updateWeather() {
    const kind = this.state.weather.kind;
    this.rain.forEach(drop => drop.setVisible(kind === 'yagmur' || kind === 'firtina'));
    this.fog.forEach(cloud => cloud.setVisible(kind === 'sis'));
    this.storm.forEach(object => object.setVisible(kind === 'firtina'));
    const status = this.children.getByName('weather-status') as Phaser.GameObjects.Text;
    const names = { clear: 'HAVA AÇIK', sis: 'SİS', yagmur: 'YAĞMUR', firtina: 'FIRTINA' };
    status.setText(kind === 'clear' ? names[kind] : `${names[kind]} · !tempo ${this.state.weather.support}/${this.state.weather.target}`);
  }

  gift(gift: Gift) {
    if (!this.ready) { this.pendingGifts.push(gift); return; }
    const celebration = gift.gift_id === 'demo-celebration' || gift.count * gift.diamonds >= 10;
    this.effectUntil.set(gift.user_id, Date.now() + 3500);
    if (celebration) this.boostUntil = Date.now() + 6500;
    const dancer = this.dancers.get(gift.user_id);
    const x = dancer?.root.x ?? 270;
    const y = dancer?.root.y ?? 580;
    const n = celebration ? 35 : 8;
    for (let i = 0; i < n; i++) {
      const particle = celebration
        ? this.add.rectangle(Phaser.Math.Between(50, 490), 245, 4, 8, [0xf1c875, 0xcc7d70, 0xa8c5ac, 0xf5e7bf][i % 4])
        : this.add.image(x + Phaser.Math.Between(-20, 20), y - 35, 'heart');
      particle.setDepth(1400);
      this.tweens.add({ targets: particle, x: particle.x + Phaser.Math.Between(-55, 55), y: celebration ? Phaser.Math.Between(530, 740) : y - 130,
        angle: celebration ? Phaser.Math.Between(-230, 230) : 0, alpha: 0, duration: 1600 + i * 35, delay: i * 18, onComplete: () => particle.destroy() });
    }
    this.toast.setText(`${gift.nickname.slice(0, 18)} ${celebration ? 'düğünü coşturdu!' : 'bir gül bıraktı ♥'}`).setVisible(true);
    this.toastUntil = Date.now() + 3500;
  }

  update(_time: number, delta: number) {
    if (!this.ready) return;
    const now = Date.now();
    const boost = now < this.boostUntil;
    const weatherSpeed = this.state.weather.kind === 'firtina' ? .8 : this.state.weather.kind === 'sis' ? .88 : this.state.weather.kind === 'yagmur' ? .94 : 1;
    const speed = (boost ? 1.6 : 1) * weatherSpeed;
    this.rotation += Math.min(delta, 50) / 20000 * speed;
    this.tempo.setText(boost ? 'TEMPO 1.6× ✦' : 'TEMPO 1×');
    if (now > this.toastUntil) this.toast.setVisible(false);
    const count = this.state.players.length;
    const layout = this.ringLayout(count);
    const moving = now < this.moveUntil && this.moveName;
    const moveProgress = moving ? 1 - (this.moveUntil - now) / 1800 : 1;
    const movePulse = moving ? Math.sin(moveProgress * Math.PI) : 0;
    this.state.players.forEach((p, i) => {
      const angle = i / Math.max(1, count) * Math.PI * 2 + this.rotation - Math.PI / 2;
      const dancer = this.dancers.get(p.id)!;
      let x = layout.x + Math.cos(angle) * layout.radiusX;
      let y = layout.y + Math.sin(angle) * layout.radiusY;
      if (this.moveName === 'sol') x -= movePulse * 14;
      if (this.moveName === 'sag') x += movePulse * 14;
      if (this.moveName === 'cok') y += movePulse * 16;
      if (this.moveName === 'kalk') y -= movePulse * 22;
      const waveDelay = i / Math.max(1, count) * 2200;
      const waveProgress = (now - this.waveStartedAt - waveDelay) / 520;
      const wavePulse = waveProgress >= 0 && waveProgress <= 1 ? Math.sin(waveProgress * Math.PI) : 0;
      y -= wavePulse * 20;
      dancer.root.setPosition(Phaser.Math.Linear(dancer.root.x, x, 1 - Math.exp(-delta / 180)), Phaser.Math.Linear(dancer.root.y, y, 1 - Math.exp(-delta / 180)));
      dancer.root.setDepth(dancer.root.y);
      const highlighted = (this.effectUntil.get(p.id) ?? 0) > now;
      const isLeader = p.id === this.state.leader.id;
      const scale = highlighted || isLeader ? layout.scale * 1.2 : layout.scale;
      dancer.root.setScale(scale * (1 + wavePulse * .22), scale * (this.moveName === 'cok' ? 1 - movePulse * .25 : 1) * (1 + wavePulse * .22));
      dancer.root.setAngle(this.moveName === 'sol' ? -movePulse * 7 : this.moveName === 'sag' ? movePulse * 7 : 0);
      dancer.sprite.anims.timeScale = speed;
      dancer.label.setColor(highlighted ? '#fbd28b' : '#fff5dc');
      dancer.leaderBadge.setAlpha(.75 + Math.sin(now / 260) * .25);
      if (!highlighted) this.effectUntil.delete(p.id);
    });
    if (!moving) this.moveName = null;
    [...this.couple, this.musician].forEach(d => { d.sprite.anims.timeScale = speed; });
    const fps = document.querySelector('#fps');
    if (fps) fps.textContent = `${Math.round(this.game.loop.actualFps)} FPS`;
  }
}
