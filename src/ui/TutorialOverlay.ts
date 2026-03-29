import { Container, Sprite, Texture } from 'pixi.js';
import type { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { bus } from '../core/EventBus';
import type { IManager } from '../core/IManager';
import type { LayoutResult } from '../config/Layout';
import { cfg } from '../config/GameConfig';
import { boardTileRect } from '../config/Layout';

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

export class TutorialOverlay implements IManager {
  private readonly container: Container;
  private sprite: Sprite | null = null;
  private dismissed = false;

  private dismissHandler: (() => void) | null = null;
  private readonly unsubs: Array<() => void> = [];

  constructor(app: Application) {
    this.container = new Container();
    this.container.zIndex = 200;
    this.container.eventMode = 'none';
    app.stage.addChild(this.container);
    this.container.alpha = 0;

    this.unsubs.push(
      bus.on('layout_changed',  ({ layout }) => this._applyLayout(layout)),
      bus.on('intro_complete',  () => this._show())
    );
  }

  private _applyLayout(layout: LayoutResult): void {
    if (this.dismissed) return;
    this._buildTexture(layout);

    /*if (!this.dismissHandler) {
      this.dismissHandler = () => this._dismiss();
      window.addEventListener('pointerdown', this.dismissHandler, { once: true });
    }*/
  }

  private _buildTexture(layout: LayoutResult): void {
    const { screenW, screenH, unitSize } = layout;
    const tc = cfg.tutorial;

    const focusRect = boardTileRect(
      { gridX: tc.focusGridX, gridY: tc.focusGridY, layer: tc.focusLayer },
      layout,
    );
    const cx = focusRect.x;
    const cy = focusRect.y;

    const innerR = tc.focusRadiusUnits    * unitSize;
    const outerR = innerR + tc.gradientFeatherUnits * unitSize;

    const canvas = document.createElement('canvas');
    canvas.width  = Math.ceil(screenW);
    canvas.height = Math.ceil(screenH);
    const ctx = canvas.getContext('2d')!;

    const [r, g, b] = hexToRgb(tc.tintColor);
    ctx.fillStyle = `rgba(${r},${g},${b},${tc.tintAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
    grad.addColorStop(0,             'rgba(0,0,0,1)');
    grad.addColorStop(innerR / outerR, 'rgba(0,0,0,1)'); 
    grad.addColorStop(1,             'rgba(0,0,0,0)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    if (this.sprite) {
      this.sprite.texture.destroy(true);
      this.container.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }

    const texture = Texture.from(canvas);
    this.sprite = new Sprite(texture);
    this.container.addChild(this.sprite);
  }

  private _show(): void {
    if (this.dismissed) return;
    gsap.to(this.container, {
        alpha:    1,
        duration: 0.4,
        ease:     'power2.out',
    });
    this.dismissHandler = () => this._dismiss();
    window.addEventListener('pointerdown', this.dismissHandler, { once: true });
  }

  private _dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    bus.emit('play_sound', { alias: 'bgm' })
    gsap.to(this.container, {
      alpha:    0,
      duration: 0.35,
      ease:     'power2.out',
      onComplete: () => { this.container.visible = false; },
    });
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    if (this.dismissHandler) {
      window.removeEventListener('pointerdown', this.dismissHandler);
    }
    if (this.sprite) {
      this.sprite.texture.destroy(true);
    }
    this.container.destroy({ children: true });
  }
}