import Phaser from 'phaser';
import { createArt } from './art';
import type { GameState, Gift, Player } from './types';

const font = 'monospace';
const RING_CAPACITY = 50;
type Dancer = { root: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text };
type RingLayout = { x: number; y: number; radiiX: number[]; radiiY: number[]; scale: number };
type RingGuide = { ellipse: Phaser.GameObjects.Ellipse; label: Phaser.GameObjects.Text };

export class HoronScene extends Phaser.Scene {
  private dancers = new Map<string, Dancer>();
  private couple: Dancer[] = [];
  private musician!: Dancer;
  private state: GameState = { revision: 0, players: [], waiting: 0, capacity: 200, leaderboard: [] };
  private ringGuides: RingGuide[] = [];
  private counter!: Phaser.GameObjects.Text;
  private ranking!: Phaser.GameObjects.Text;
  private connection!: Phaser.GameObjects.Text;
  private tempo!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private toastUntil = 0;
  private boostUntil = 0;
  private rotation = 0;
  private effectUntil = new Map<string, number>();
  private ready = false;
  private pendingGifts: Gift[] = [];
  private namesVisible = true;
  private connected = false;

  constructor() { super('horon'); }

  create() {
    createArt(this);
    this.add.image(270, 480, 'village').setDisplaySize(540, 960);
    for (let i = 0; i < 4; i++) {
      const ellipse = this.add.ellipse(270, 586, 440, 328, 0xffffff, 0)
        .setStrokeStyle(1, 0xe0c68e, .32).setDepth(200).setVisible(false);
      const label = this.add.text(270, 390, '', { fontFamily: font, fontSize: '9px', color: '#d8c796', backgroundColor: '#526749', padding: { x: 5, y: 2 } })
        .setOrigin(.5).setDepth(201).setVisible(false);
      this.ringGuides.push({ ellipse, label });
    }
    this.add.text(28, 27, 'KARADENİZ • KÖY DÜĞÜNÜ', { fontFamily: font, fontSize: '12px', color: '#b9c9a1', letterSpacing: 2 });
    this.add.text(26, 55, 'HORON', { fontFamily: font, fontSize: '55px', fontStyle: 'bold', color: '#fff0ce' });
    this.add.rectangle(283, 84, 60, 25, 0xca795d);
    this.add.text(283, 84, 'LIVE', { fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#fff6e0' }).setOrigin(.5);
    this.add.text(29, 124, 'Bir halka, bin hikâye.', { fontFamily: font, fontSize: '16px', color: '#b6c5ac' });
    this.connection = this.add.text(29, 160, '', { fontFamily: font, fontSize: '11px', color: '#c6d1b7' });
    this.setConnection(this.connected);
    this.tempo = this.add.text(508, 160, 'TEMPO 1×', { fontFamily: font, fontSize: '11px', color: '#e4bd7d' }).setOrigin(1, 0);
    this.couple = [this.makeDancer({ id: 'bride', nickname: 'Gelin', score: 0 }, 6), this.makeDancer({ id: 'groom', nickname: 'Damat', score: 0 }, 7)];
    this.couple.forEach((d, i) => { d.root.setPosition(250 + i * 44, 591).setDepth(591); d.root.setScale(1.15); });
    this.musician = this.makeDancer({ id: 'musician', nickname: 'Kemençeci', score: 0 }, 8);
    this.musician.root.setPosition(102, 414).setDepth(414);
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
    });
    const ringCount = Math.max(1, Math.ceil(state.players.length / RING_CAPACITY));
    this.updateRingGuides(ringCount);
    this.positionHosts(ringCount);
    this.counter.setText(`${state.players.length.toString().padStart(3, '0')} / ${state.capacity} HORONCU    ${ringCount} HALKA    ${state.waiting} SIRADA`);
    this.ranking.setText(state.leaderboard.length ? state.leaderboard.map((p, i) => `${i + 1}. ${p.nickname.slice(0, 19).padEnd(19)} ${p.score} ✦`).join('\n') : 'İlk destekçi sen ol. İyi ki geldin!');
  }

  private shortName(name: string) { return name.length > 10 ? `${name.slice(0, 9)}…` : name; }

  private makeDancer(p: Player, variant: number): Dancer {
    const root = this.add.container(270, 580);
    const shadow = this.add.ellipse(0, 0, 29, 8, 0x283b32, .23);
    const sprite = this.add.sprite(0, 0, `dancer-${variant}`).setOrigin(.5, 1).play(`dancer-${variant}`);
    const label = this.add.text(0, -56, this.shortName(p.nickname), { fontFamily: font, fontSize: '10px', color: '#fff5dc', backgroundColor: '#243d35', padding: { x: 3, y: 2 } }).setOrigin(.5);
    root.add([shadow, sprite, label]);
    return { root, sprite, label };
  }

  private layouts(ringCount: number): RingLayout[] {
    if (ringCount === 1) return [{ x: 270, y: 586, radiiX: [84, 150, 218], radiiY: [60, 110, 164], scale: .86 }];
    const positions = ringCount === 2
      ? [[145, 585], [395, 585]]
      : ringCount === 3
        ? [[145, 475], [395, 475], [270, 675]]
        : [[145, 475], [395, 475], [145, 675], [395, 675]];
    const scale = ringCount === 2 ? .7 : .58;
    return positions.map(([x, y]) => ({ x, y, radiiX: [43, 73, 106], radiiY: [31, 54, 79], scale }));
  }

  private updateRingGuides(ringCount: number) {
    const layouts = this.layouts(ringCount);
    this.ringGuides.forEach((guide, i) => {
      const layout = layouts[i];
      if (!layout) { guide.ellipse.setVisible(false); guide.label.setVisible(false); return; }
      const outerX = layout.radiiX[2];
      const outerY = layout.radiiY[2];
      guide.ellipse.setPosition(layout.x, layout.y).setDisplaySize(outerX * 2 + 28, outerY * 2 + 22).setVisible(true);
      guide.label.setPosition(layout.x, layout.y - outerY - 18).setText(`HALKA ${i + 1}`).setVisible(ringCount > 1);
    });
  }

  private positionHosts(ringCount: number) {
    const y = ringCount === 1 ? 591 : 318;
    this.couple.forEach((d, i) => d.root.setPosition(250 + i * 44, y).setDepth(y).setScale(ringCount === 1 ? 1.15 : .9));
    this.musician.root.setPosition(ringCount === 1 ? 102 : 178, ringCount === 1 ? 414 : 328).setDepth(ringCount === 1 ? 414 : 328).setScale(ringCount === 1 ? 1 : .85);
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
    const speed = boost ? 1.6 : 1;
    this.rotation += Math.min(delta, 50) / 20000 * speed;
    this.tempo.setText(boost ? 'TEMPO 1.6× ✦' : 'TEMPO 1×');
    if (now > this.toastUntil) this.toast.setVisible(false);
    const count = this.state.players.length;
    const ringCount = Math.max(1, Math.ceil(count / RING_CAPACITY));
    const layouts = this.layouts(ringCount);
    this.state.players.forEach((p, i) => {
      const group = Math.floor(i / RING_CAPACITY);
      const index = i % RING_CAPACITY;
      const tier = index < 14 ? 0 : index < 32 ? 1 : 2;
      const start = [0, 14, 32][tier];
      const groupSize = Math.min(RING_CAPACITY, count - group * RING_CAPACITY);
      const size = Math.min(groupSize - start, [14, 18, 18][tier]);
      const direction = group % 2 ? -1 : 1;
      const angle = (index - start) / Math.max(1, size) * Math.PI * 2 + this.rotation * direction;
      const layout = layouts[group];
      const dancer = this.dancers.get(p.id)!;
      const x = layout.x + Math.cos(angle) * layout.radiiX[tier];
      const y = layout.y + Math.sin(angle) * layout.radiiY[tier];
      dancer.root.setPosition(Phaser.Math.Linear(dancer.root.x, x, 1 - Math.exp(-delta / 180)), Phaser.Math.Linear(dancer.root.y, y, 1 - Math.exp(-delta / 180)));
      dancer.root.setDepth(dancer.root.y);
      const highlighted = (this.effectUntil.get(p.id) ?? 0) > now;
      const baseScale = ringCount === 1 && count <= 32 ? 1 : layout.scale;
      dancer.root.setScale(highlighted ? baseScale * 1.28 : baseScale);
      dancer.sprite.anims.timeScale = speed;
      dancer.label.setColor(highlighted ? '#fbd28b' : '#fff5dc');
      if (!highlighted) this.effectUntil.delete(p.id);
    });
    [...this.couple, this.musician].forEach(d => { d.sprite.anims.timeScale = speed; });
    const fps = document.querySelector('#fps');
    if (fps) fps.textContent = `${Math.round(this.game.loop.actualFps)} FPS`;
  }
}
