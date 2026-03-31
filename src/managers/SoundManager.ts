import { bus } from '../core/EventBus';
import { getAudioUrl } from '../core/AssetLoader';
import { cfg, type AudioAlias } from '../config/GameConfig';
import type { IManager } from '../core/IManager';


export class SoundManager implements IManager {
  private readonly ctx: AudioContext;
  private readonly masterGain: GainNode;

  private muted = false;
  private readonly buffers = new Map<AudioAlias, AudioBuffer>();

  private bgmSource:  AudioBufferSourceNode | null = null;
  private bgmGain:    GainNode | null = null;
  private bgmStarted = false;

  private readonly unsubs: Array<() => void> = [];

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);

    this.unsubs.push(
      bus.on('play_sound',   ({ alias }) => this._onPlaySound(alias)),
      bus.on('sound_toggle', ({ muted }) => this._onToggle(muted)),
    );
  }

  // ── Asset loading ──────────────────────────────────────────────────────────

  async load(alias: AudioAlias): Promise<void> {
    if (this.buffers.has(alias)) return;
    const url      = getAudioUrl(alias);
    const response = await fetch(url);
    const arrayBuf = await response.arrayBuffer();
    const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
    this.buffers.set(alias, audioBuf);
  }

  async loadAll(): Promise<void> {
    const aliases: AudioAlias[] = ['bgm', 'sfxPick', 'sfxMatch', 'sfxLose'];
    await Promise.all(aliases.map(a => this.load(a)));
  }

  
  startBgm(): void {
    if (this.bgmStarted) return;
    this.bgmStarted = true;
    if (this.ctx.state === 'running') {
      void this._playBgm();
    } else {
      const resume = () => {
        void this.ctx.resume().then(() => this._playBgm());
      };
      window.addEventListener('pointerdown', resume, { once: true });
    }
  }

  private async _playBgm(): Promise<void> {
    const buf = this.buffers.get('bgm');
    if (!buf) return;

    if (this.bgmSource) {
      this.bgmSource.onended = null;
      this.bgmSource.stop();
      this.bgmSource.disconnect();
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = this.muted ? 0 : cfg.volume['bgm'];
    gainNode.connect(this.masterGain);

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.loop   = true;
    source.connect(gainNode);
    source.start(0);

    this.bgmSource = source;
    this.bgmGain   = gainNode;
  }

  
  private _playOnce(alias: AudioAlias): void {
    const buf = this.buffers.get(alias);
    if (!buf || this.muted) return;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = cfg.volume[alias];
    gainNode.connect(this.masterGain);

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.connect(gainNode);
    source.start(0);

    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  }

  
  private _onPlaySound(alias: AudioAlias): void {
    if (alias === 'bgm') { this.startBgm(); return; }
    
    if (this.ctx.state !== 'running') {
      void this.ctx.resume().then(() => this._playOnce(alias));
    } else {
      this._playOnce(alias);
    }
  }

  private _onToggle(muted: boolean): void {
    this.muted = muted;
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(
        muted ? 0 : cfg.volume['bgm'],
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  
  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.bgmSource?.stop();
    this.bgmSource?.disconnect();
    this.bgmGain?.disconnect();
    void this.ctx.close();
  }
}