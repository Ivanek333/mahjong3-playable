import { bus } from '../core/EventBus';
import { getAudioUrl } from '../core/AssetLoader';
import { cfg, type AudioAlias } from '../config/GameConfig';
import type { IManager } from '../core/IManager';


const POOL_SIZE: Record<AudioAlias, number> = {
  sfxPick:  3,
  sfxMatch: 2,
  sfxWin:  1,
  sfxLose:  1,
  bgm:      1,
};
const DEFAULT_POOL_SIZE = 2;



export class SoundManager implements IManager {
  private muted = false;
  private readonly pools = new Map<AudioAlias, HTMLAudioElement[]>();
  private readonly poolIndex = new Map<AudioAlias, number>();
  private bgmEl: HTMLAudioElement | null = null;

  private readonly unsubs: Array<() => void> = [];

  constructor() {
    this.unsubs.push(
      bus.on('play_sound',   ({ alias }) => this._onPlaySound(alias)),
      bus.on('sound_toggle', ({ muted }) => this._onToggle(muted)),
    );
  }

  
  startBgm(): void {
    if (this.bgmEl) return;
    this.bgmEl = this._makeElement('bgm');
    this.bgmEl.loop = true;
    if (!this.muted) this.bgmEl.play().catch(() => {
      const resume = () => {
        this.bgmEl?.play().catch(() => undefined);
        window.removeEventListener('pointerdown', resume);
      };
      window.addEventListener('pointerdown', resume, { once: true });
    });
  }

  private _onPlaySound(alias: AudioAlias): void {
    if (this.muted) return;
    if (alias === 'bgm') { this.startBgm(); return; }

    const el = this._nextFromPool(alias);
    el.currentTime = 0;
    el.play().catch(() => undefined);
  }

  private _onToggle(muted: boolean): void {
    this.muted = muted;
    if (this.bgmEl) {
      if (muted) {
        this.bgmEl.pause();
      } else {
        this.bgmEl.play().catch(() => undefined);
      }
    }
    for (const pool of this.pools.values()) {
      for (const el of pool) el.muted = muted;
    }
  }

  private _nextFromPool(alias: AudioAlias): HTMLAudioElement {
    if (!this.pools.has(alias)) {
      this._buildPool(alias);
    }
    const pool = this.pools.get(alias)!;
    const idx  = (this.poolIndex.get(alias) ?? 0) % pool.length;
    this.poolIndex.set(alias, idx + 1);
    return pool[idx]!;
  }

  private _buildPool(alias: AudioAlias): void {
    const size = POOL_SIZE[alias] ?? DEFAULT_POOL_SIZE;
    const pool: HTMLAudioElement[] = [];
    for (let i = 0; i < size; i++) {
      pool.push(this._makeElement(alias));
    }
    this.pools.set(alias, pool);
    this.poolIndex.set(alias, 0);
  }

  private _makeElement(alias: AudioAlias): HTMLAudioElement {
    const url = getAudioUrl(alias);
    const el  = new Audio(url);
    el.volume = cfg.volume[alias]!;
    el.muted  = this.muted;
    return el;
  }


  destroy(): void {
    this.unsubs.forEach(u => u());
    this.bgmEl?.pause();
    this.bgmEl = null;
    for (const pool of this.pools.values()) {
      pool.forEach(el => { el.pause(); el.src = ''; });
    }
    this.pools.clear();
    this.poolIndex.clear();
  }
}