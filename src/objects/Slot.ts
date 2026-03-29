import { Container, Sprite } from 'pixi.js';
import { getTexture } from '../core/AssetLoader';

export class Slot extends Container {
  private readonly sprite: Sprite;

  constructor() {
    super();
    this.sprite = new Sprite(getTexture('slotBg'));
    this.addChild(this.sprite);
    this.sprite.anchor.set(0.5);
  }

  update(x: number, y: number, w: number, h: number): void {
    this.x = x;
    this.y = y;
    this.sprite.width  = w;
    this.sprite.height = h;
  }
}