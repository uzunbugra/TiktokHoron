import type { GameState } from './types';

export class HoronSound {
  private context?: AudioContext;
  private timer?: number;
  private step = 0;
  private layer: GameState['music']['layer'] = null;
  private layerUntil = 0;
  private revision = 0;

  enable() {
    this.context ??= new AudioContext();
    void this.context.resume();
    if (!this.timer) this.timer = window.setInterval(() => this.tick(), 360);
  }

  setMusic(music: GameState['music']) {
    if (music.revision <= this.revision) return;
    this.revision = music.revision;
    this.layer = music.layer;
    this.layerUntil = Date.now() + 8000;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }

  private tick() {
    if (!this.context) return;
    const melody = [392, 440, 493.88, 440, 523.25, 493.88, 440, 392];
    this.tone(melody[this.step++ % melody.length], .28, 'triangle', .035);
    const active = Date.now() < this.layerUntil ? this.layer : null;
    if (active === 'davul') this.tone(this.step % 2 ? 82 : 110, .2, 'sine', .11);
    if (active === 'tulum') this.tone(this.step % 2 ? 196 : 220, .34, 'sawtooth', .025);
    if (active === 'alkis') this.tone(900 + (this.step % 3) * 180, .055, 'square', .018);
  }
}
