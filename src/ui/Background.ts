import { Application, Container, Sprite } from 'pixi.js';
import { getTexture } from '../core/AssetLoader';
import { bus } from '../core/EventBus';
import type { LayoutResult } from '../config/Layout';
import type { IManager } from '../core/IManager';
import { cfg, type BackgroundAlias } from '../config/GameConfig';

export class Background extends Container implements IManager {
  private readonly sprite: Sprite;
  private readonly unsubs: Array<() => void> = [];

  backgroundAlias: BackgroundAlias;

  constructor(app: Application) {
    super();
    const keys = Object.keys(cfg.assets.backgrounds) as BackgroundAlias[];
    this.backgroundAlias = keys[Math.round(Math.random() * (keys.length - 1))];
    const texture = getTexture(this.backgroundAlias);
    this.sprite = new Sprite(texture);
    this.addChild(this.sprite);
    this.sprite.anchor.set(0.5);
    app.stage.addChild(this);
    this.zIndex = -100;
    
    this.unsubs.push( 
        bus.on('layout_changed', ({ layout }) => { this.handleLayoutChange(layout); })
    );
  }

  private handleLayoutChange(layout: LayoutResult): void {
    const { screenW, screenH } = layout;
    const texture = this.sprite.texture;
    if (!texture) return;
    
    const texWidth = texture.width;
    const texHeight = texture.height;
    
    const scaleX = screenW / texWidth;
    const scaleY = screenH / texHeight;
    const scale = Math.max(scaleX, scaleY);
    
    this.scale.set(scale);
    
    this.position.set(screenW / 2, screenH / 2);
  }

  public destroy(options?: any): void {
    this.unsubs.forEach(u => u());
    super.destroy(options);
  }
}