import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { cfg, type TilesAlias } from '../config/GameConfig';
import { getTexture } from '../core/AssetLoader';
import { bus } from '../core/EventBus';
import { AnimationManager } from '../managers/AnimationManager';

export interface TileData {
  id:    number;
  gridX: number;
  gridY: number;
  layer: number;
}

export class Tile extends Container {
  readonly tileId: number;
  readonly gridX:  number;
  readonly gridY:  number;
  readonly layer:  number;

  readonly topNeighbours:    Tile[] = [];
  readonly bottomNeighbours: Tile[] = [];

  isCleared = false;

  private _typeIndex  = -1;
  private _available  = false;
  private _faceUp     = false;
  private readonly sprite:      Sprite;
  private readonly backTexture: Texture;

  constructor(data: TileData, backTexture: Texture) {
    super();
    this.tileId      = data.id;
    this.gridX       = data.gridX;
    this.gridY       = data.gridY;
    this.layer       = data.layer;
    this.backTexture = backTexture;

    this.sprite = new Sprite(this.backTexture);
    this.addChild(this.sprite);
    this.sprite.anchor.set(0.5, 0.5);
    this._updateZIndex();

    this._bindPointer();
  }

  private _updateZIndex(): void {
    this.zIndex = Math.round(2 * (
      this.layer * cfg.board.cols * cfg.board.rows +
      (cfg.board.cols - 1 - this.gridX) * cfg.board.rows +
      this.gridY
    ));
  }

  
  update(x: number, y: number, w: number, h: number): void {
    this.x = x;
    this.y = y;
    this.sprite.width  = w;
    this.sprite.height = h;
  }

  get typeIndex(): number { return this._typeIndex; }

  setType(index: number): void {
    this._typeIndex = index;
    if (this._faceUp) {
      this.sprite.texture = this._resolveFrontTexture();
    }
  }

  showFront(): void {
    this.sprite.texture = this._resolveFrontTexture();
    this._faceUp = true;
  }

  showBack(): void {
    this.sprite.texture = this.backTexture;
    this._faceUp = false;
  }

  get isFaceUp(): boolean { return this._faceUp; }

  private _resolveFrontTexture(): Texture {
    const aliases = Object.keys(cfg.assets.tiles) as TilesAlias[];
    const alias = aliases[this._typeIndex] as TilesAlias | undefined;
    if (!alias) {
      throw new Error(
        `[Tile ${this.tileId}] typeIndex ${this._typeIndex} out of range ` +
        `(cfg.level.tileTypeTextures.length = ${aliases.length}).`
      );
    }
    return getTexture(alias);
  }

  
  get isAvailable(): boolean { return this._available; }

  updateAvailability(): void {
    const next = !this.isCleared && this.topNeighbours.every(t => t.isCleared);
    this._available = next;
    this._setInteractable(next);
  }

  setInteractable(value: boolean): void {
    this._setInteractable(value);
  }

  private _setInteractable(value: boolean): void {
    this.eventMode = 'static';
    this.cursor    = value ? 'pointer' : 'default';
  }

  private _bindPointer(): void {
    this.on('pointerdown', () => {
      if (!this._available) {
        AnimationManager.play('hand_full_shake', this, {});
        return;
      }

      this.isCleared  = true;
      this._available = false;
      this._setInteractable(false);

      for (const below of this.bottomNeighbours) {
        below.updateAvailability();
      }

      bus.emit('play_sound', { alias: 'sfxPick' });
      //AnimationManager.play('tile_pick', this, {});
      bus.emit('tile_picked', { tile: this });
    });
  }

  
  undoReturn(): void {
    this.isCleared = false;
    for (const below of this.bottomNeighbours) {
      below.updateAvailability();
    }
    this.updateAvailability();
    this._updateZIndex();
  }

  appear(delay = 0): Promise<void> {
    return AnimationManager.play('tile_appear', this, { delay });
  }

  flipIn(delay = 0): Promise<void> {
    return AnimationManager.play('flip_in', this, { 
      delay, onMidpoint: () => this.showFront(),
    });
  }

  flipOut(delay = 0): Promise<void> {
    return AnimationManager.play('flip_out', this, {
      delay, onMidpoint: () => this.showBack(),
    });
  }

  pick(delay = 0): Promise<void> {
    return AnimationManager.play('tile_pick', this, { delay });
  }

  
  moveTo(worldX: number, worldY: number, clip: 'tile_move_to_hand' | 'tile_return_to_board'): Promise<void> {
    return AnimationManager.play(clip, this, { x: worldX, y: worldY });
  }

  playMatchRemove(onComplete?: () => void): void {
    AnimationManager.play('tile_match_remove', this, { onComplete });
  }

  destroy(): void {
    AnimationManager.kill(this);
    super.destroy({ children: true });
  }
}