import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';
import { bus } from '../core/EventBus';
import { AnimationManager } from './AnimationManager';
import { gsap } from 'gsap';
import { LevelLoader } from './LevelLoader';
import { boardTileRect } from '../config/Layout';
import type { LayoutResult } from '../config/Layout';
import type { IManager } from '../core/IManager';
import type { Tile } from '../objects/Tile';
import { cfg } from '../config/GameConfig';


function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export class BoardManager implements IManager {
  private boardTiles: Tile[] = [];

  readonly container: Container;

  private layout!: LayoutResult;
  private inputBlocked = true;

  private readonly unsubs: Array<() => void> = [];

  constructor(app: Application) {
    this.container = new Container();
    this.container.sortableChildren = true;
    app.stage.addChild(this.container);

    this.unsubs.push(
      bus.on('layout_changed',       ({ layout }) => this._onLayoutChanged(layout)),
      bus.on('tile_moved_to_hand',   ({ tile})   => this.removeTile(tile)),
      bus.on('tile_returned_to_board', ({ tile, wait_for }) => this.restoreTile(tile, wait_for)),
      bus.on('shuffle_requested',    ()           => this.shuffle()),
      bus.on('game_end', () => {
        this._updateBlockedAllTiles(true);
        gsap.to(this.container, { alpha: 0, duration: 0.4, ease: 'power2.in' });
      }),
    );
  }

  async playIntro(): Promise<void> {
    if (!this.layout) throw new Error('[BoardManager] playIntro called before layout is set.');

    this._updateBlockedAllTiles(true);

    const loader = new LevelLoader();
    this.boardTiles = loader.load();

    for (const tile of this.boardTiles) {
      tile.showBack();
      this.container.addChild(tile);
    }

    this._applyLayout(this.layout);

    const appearPromises = this.boardTiles.map((tile, i) =>
      tile.appear(i * cfg.board.tileAppearDelay)
    );
    await Promise.all(appearPromises);

    const xPositions = [... new Set(this.boardTiles.map(t => Math.round(2 * t.gridX)).sort((a, b) => a - b))];
    const xToDelay   = new Map(xPositions.map((x, i) => [x, i * cfg.board.tileFlipDelay]));

    const flipPromises = this.boardTiles.map(tile =>
      tile.flipIn(xToDelay.get(Math.round(2 * tile.gridX)) ?? 0)
    );
    await Promise.all(flipPromises);

    
    this.inputBlocked = false;
    this._updateBlockedAllTiles(false);

    bus.emit('intro_complete', {});
  }

  
  private _onLayoutChanged(layout: LayoutResult): void {
    this.layout = layout;
    this._applyLayout(layout);
  }

  private _applyLayout(layout: LayoutResult): void {
    for (const tile of this.boardTiles) {
      AnimationManager.kill(tile);
      const rect = boardTileRect(tile, layout);
      tile.update(rect.x, rect.y, rect.w, rect.h);
    }
    this._updateBlockedAllTiles(this.inputBlocked); // cause move animation are killed midway
  }
  

  async shuffle(): Promise<void> {
    if (this.inputBlocked) return;
    this._updateBlockedAllTiles(true);

    const types = this.boardTiles.map(t => t.typeIndex);
    shuffleArray(types);
    
    const xPositions = [... new Set(this.boardTiles.map(t => Math.round(2 * t.gridX)).sort((a, b) => a - b))];
    const xToDelay   = new Map(xPositions.map((x, i) => [x, i * cfg.board.tileFlipDelay]));

    const flipPromises = this.boardTiles.map((tile, index) =>
        tile.flipOut(xToDelay.get(Math.round(2 * tile.gridX)) ?? 0).then(() =>
        tile.setType(types[index])).then(() =>
        tile.flipIn(xToDelay.get(Math.round(2 * tile.gridX)) ?? 0))
    );
    await Promise.all(flipPromises);

    this._updateBlockedAllTiles(false);

    bus.emit('play_sound', { alias: 'sfxPick' });
  }

  
  private _updateBlockedAllTiles(blocked: boolean): void {
    this.inputBlocked = blocked;
    for (const tile of this.boardTiles) {
      if (blocked) {
        tile.setInteractable(false);
      } else {
        tile.updateAvailability();
      }
    }
  }

  get isEmpty(): boolean {
    return this.boardTiles.length === 0;
  }

  removeTile(tile: Tile): void {
    const idx = this.boardTiles.lastIndexOf(tile);
    if (idx === -1) return;
    this.boardTiles.splice(idx, 1);
    if (this.isEmpty)
    {
      bus.emit('game_end', { outcome: 'win' })
      bus.emit('play_sound', { alias: 'sfxWin' });
    }
  }

  async restoreTile(tile: Tile, wait_for?: Promise<void>): Promise<void> {
    this.boardTiles.push(tile);
    tile.undoReturn();
    
    if (wait_for) await wait_for;
    AnimationManager.kill(tile);
    const rect = boardTileRect(tile, this.layout);
    tile.moveTo(rect.x, rect.y, 'tile_return_to_board');
  }

  
  destroy(): void {
    this.unsubs.forEach(u => u());
    this.unsubs.length = 0;

    for (const tile of this.boardTiles) tile.destroy();
    this.boardTiles.length = 0;

    this.container.destroy({ children: true });
  }
}