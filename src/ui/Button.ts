import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { bus } from '../core/EventBus';
import { AnimationManager } from '../managers/AnimationManager';

export interface ButtonConfig {
  texture?: Texture | null;
  label?: string;
  onClick: () => void;
}

export class Button extends Container {
  private readonly bg:         Graphics | null;
  private readonly iconSprite: Sprite | null;
  labelText:  Text   | null;

  private _enabled = true;

  constructor(config: ButtonConfig) {
    super();

    if (config.texture) {
      this.iconSprite = new Sprite(config.texture);
      this.iconSprite.anchor.set(0.5);
      this.addChild(this.iconSprite);
      this.bg = null;
    } else {
      this.iconSprite = null;
      this.bg = new Graphics();
      this.addChild(this.bg);
    }

    if (config.label != null) {
      this.labelText = new Text({
        text:  config.label,
        style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', align: 'center' },
      });
      this.labelText.anchor.set(0.5);
      this.addChild(this.labelText);
    } else {
      this.labelText = null;
    }

    this.eventMode = 'static';
    this.cursor    = 'pointer';

    this.on('pointerdown', () => {
      if (!this._enabled) return;
      AnimationManager.play('button_press', this, {});
      bus.emit('play_sound', { alias: 'sfxPick' });
      config.onClick();
    });

    if (this.bg) {
      this.on('pointerover', () => { if (this._enabled) this.bg!.tint = 0xddddff; });
      this.on('pointerout',  () => { this.bg!.tint = 0xffffff; });
    }
  }

  
  update(x: number, y: number, pxW: number, pxH: number): void {
    this.x = x;
    this.y = y;

    if (this.bg) {
      const radius = Math.min(pxW, pxH) * 0.15;
      this.bg.clear();
      this.bg.setStrokeStyle({
          width: 2, color: 0x102040
        }).roundRect(-pxW / 2, -pxH / 2, pxW, pxH, radius).fill(0x334466).stroke();
    }

    if (this.iconSprite) {
      this.iconSprite.width  = pxW;
      this.iconSprite.height = pxH;
    }

    if (this.labelText) {
      this.labelText.style.fontSize = pxH;
    }
  }

  setIconTexture(t: Texture): void {
    if (this.iconSprite) this.iconSprite.texture = t;
  }

  setLabel(text: string): void {
    if (this.labelText) this.labelText.text = text;
  }

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled  = enabled;
    this.eventMode = enabled ? 'static' : 'none';
    gsap.to(this, {
      alpha:     enabled ? 1 : 0.35,
      duration:  0.2,
      overwrite: 'auto',
    });
  }
}