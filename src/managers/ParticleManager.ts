import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Application } from 'pixi.js';
import { bus } from '../core/EventBus';
import { cfg, type BackgroundAlias } from '../config/GameConfig';
import type { IManager } from '../core/IManager';
import type { LayoutResult } from '../config/Layout';


interface Petal {
  sprite:       Sprite;
  vx:           number;
  vy:           number;
  rotSpeed:     number; 
  wobble:       number;
  wobbleSpeed:  number;
  wobbleAmp:    number;
  life:         number;
  maxLife:      number;
  isAmbient:    boolean;
}


const PETAL_W = 10;
const PETAL_H = 18;


function bakePetalTexture(app: Application, hexColor: string): Texture {
  const color = parseInt(hexColor.replace('#', ''), 16);
  const g = new Graphics();
  g.moveTo(0, -PETAL_H);
  g.bezierCurveTo( PETAL_W, -PETAL_H * 0.4,  PETAL_W,  PETAL_H * 0.4, 0,  PETAL_H);
  g.bezierCurveTo(-PETAL_W,  PETAL_H * 0.4, -PETAL_W, -PETAL_H * 0.4, 0, -PETAL_H);
  g.fill({ color, alpha: 0.88 });
  const tex = app.renderer.generateTexture(g);
  g.destroy();
  return tex;
}


export class ParticleManager implements IManager {
  private readonly ambientLayer:  Container;
  private readonly burstLayer:    Container;

  private readonly petals: Petal[] = [];

  private readonly texCache = new Map<string, Texture>();

  private currentColors: [string, string, string] = ['#ffffff', '#ffffff', '#ffffff'];
  private layout!: LayoutResult;

  private ambientTimer = 0;

  private readonly app: Application;
  private readonly unsubs: Array<() => void> = [];

  constructor(app: Application, backgroundAlias: BackgroundAlias) {
    this.app = app;

    this.ambientLayer = new Container();
    this.ambientLayer.zIndex = -10;
    app.stage.addChild(this.ambientLayer);

    this.burstLayer = new Container();
    this.burstLayer.zIndex = -1;
    app.stage.addChild(this.burstLayer);

    this.currentColors = cfg.particles.colors[backgroundAlias];
    for (const hex of this.currentColors) this._getOrBakeTexture(hex);

    this.unsubs.push(
      bus.on('layout_changed', ({ layout }) => { this.layout = layout; }),
      bus.on('spawn_particles', (p) => this._burst(p.x, p.y, p.amount, p.speed, p.dieoff)),
    );
  }

  private _getOrBakeTexture(hex: string): Texture {
    let tex = this.texCache.get(hex);
    if (!tex) {
      tex = bakePetalTexture(this.app, hex);
      this.texCache.set(hex, tex);
    }
    return tex;
  }

  private _randomTexture(): Texture {
    const hex = this.currentColors[Math.floor(Math.random() * 3)];
    return this._getOrBakeTexture(hex);
  }

  
  private _spawn(
    x: number, y: number,
    vx: number, vy: number,
    lifetime: number,
    isAmbient: boolean,
    sizeScale = 1,
  ): void {
    const tex = this._randomTexture();
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.rotation = Math.random() * Math.PI * 2;

    const baseScale = (this.layout.unitSize * 0.15) / (PETAL_W * 2);
    sprite.scale.set(baseScale * sizeScale * (0.75 + Math.random() * 0.5));

    const layer = isAmbient ? this.ambientLayer : this.burstLayer;
    layer.addChild(sprite);

    this.petals.push({
      sprite,
      vx, vy,
      rotSpeed:    (Math.random() - 0.5) * 5,
      wobble:      Math.random() * Math.PI * 2,
      wobbleSpeed: 1.5 + Math.random() * 2.5,
      wobbleAmp:   isAmbient
                     ? (18 + Math.random() * 28)
                     : (8  + Math.random() * 16),
      life:    lifetime,
      maxLife: lifetime,
      isAmbient,
    });
  }

  private _burst(
    x: number, y: number,
    amount: number, speed: number, dieoff: number,
  ): void {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s     = speed * (0.4 + Math.random() * 0.9);
      this._spawn(
        x, y - this.layout!.tilePxH * 0.6,
        Math.cos(angle) * s,
        Math.sin(angle) * s,
        dieoff * (0.6 + Math.random() * 0.8),
        false,
        0.9 + Math.random() * 0.4,
      );
    }
  }

  private _spawnAmbient(): void {
    const layout = this.layout;
    if (!layout) return;

    const ac = cfg.particles.ambient;

    const dirDeg = ac.direction + (Math.random() - 0.5) * 2 * ac.directionVariance;
    const dirRad = (dirDeg * Math.PI) / 180;
    const speed  = ac.speed + (Math.random() - 0.5) * 2 * ac.speedVariance;
    const vx     = Math.cos(dirRad) * speed;
    const vy     = Math.sin(dirRad) * speed;

    const lifetime = ac.lifetime + (Math.random() - 0.5) * 2 * ac.lifetimeVariance;

    const spawnX = -layout.screenW * 0.1 + Math.random() * layout.screenW * 1.2;
    const spawnY = -PETAL_H * 4;

    this._spawn(
      spawnX, spawnY,
      vx, vy,
      lifetime,
      true,
      0.7 + Math.random() * 0.7,
    );
  }

  
  update(deltaMS: number): void {
    const dt = deltaMS / 1000;

    const ambientAlive = this.petals.filter(p => p.isAmbient).length;
    if (ambientAlive < cfg.particles.ambient.maxCount) {
      this.ambientTimer -= dt;
      if (this.ambientTimer <= 0) {
        this.ambientTimer = 1 / cfg.particles.ambient.spawnRate;
        this._spawnAmbient();
      }
    }

    
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i]!;
      p.life -= dt;

      if (p.life <= 0) {
        p.sprite.parent?.removeChild(p.sprite);
        p.sprite.destroy();
        this.petals.splice(i, 1);
        continue;
      }

      p.wobble        += p.wobbleSpeed * dt;
      const wobbleOff  = Math.cos(p.wobble) * p.wobbleAmp * dt;

      p.sprite.x        += p.vx * dt + wobbleOff;
      p.sprite.y        += p.vy * dt;
      p.sprite.rotation += p.rotSpeed * dt;

      if (!p.isAmbient) {
        const drag  = Math.pow(0.92, dt * 60);
        p.vx       *= drag;
        p.vy        = p.vy * drag + 120 * dt;
      }

      const ratio          = p.life / p.maxLife;
      p.sprite.alpha       = ratio < 0.25 ? ratio / 0.25 : 1;
    }
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs.length = 0;

    for (const p of this.petals) {
      p.sprite.parent?.removeChild(p.sprite);
      p.sprite.destroy();
    }
    this.petals.length = 0;

    for (const tex of this.texCache.values()) tex.destroy(true);
    this.texCache.clear();

    this.ambientLayer.destroy({ children: true });
    this.burstLayer.destroy({ children: true });
  }
}