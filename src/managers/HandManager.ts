import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';
import { bus } from '../core/EventBus';
import type { IManager } from '../core/IManager';
import { handTileRect } from '../config/Layout';
import type { LayoutResult } from '../config/Layout';
import { cfg } from '../config/GameConfig';
import { AnimationManager } from './AnimationManager';
import { Slot } from '../objects/Slot';
import type { Tile } from '../objects/Tile';

type UndoPick = Tile;
interface UndoClear {
    tiles: ReadonlyArray<{ tile: Tile; slotIndex: number; toBoard: boolean }>;
}

type UndoEntry = UndoPick | UndoClear;

function isUndoClear(entry: UndoEntry): entry is UndoClear {
  return 'tiles' in (entry as object);
}


export class HandManager implements IManager {
  private readonly container: Container;
  private readonly slotSprites: Slot[] = [];

  private readonly hand: Array<Tile | null>;

  private readonly discarded: Tile[] = [];
  private readonly undoStack: UndoEntry[] = [];

  private layout!: LayoutResult;
  private readonly unsubs: Array<() => void> = [];

  constructor(app: Application) {
    this.container = new Container();
    this.container.zIndex = -5;
    app.stage.addChild(this.container);

    this.hand = Array<Tile | null>(cfg.hand.slots).fill(null);

    for (let i = 0; i < cfg.hand.slots; i++) {
      const slot = new Slot();
      this.container.addChild(slot);
      this.slotSprites.push(slot);
    }

    this.unsubs.push(
      bus.on('layout_changed', ({ layout }) => this._applyLayout(layout)),
      bus.on('tile_picked',    ({ tile: tileRef }) => void this._onTilePicked(tileRef)),
      bus.on('undo_requested', () => void this._onUndoRequested()),
    );
  }

  private _applyLayout(layout: LayoutResult): void {
    this.layout = layout;

    for (let i = 0; i < this.slotSprites.length; i++) {
      const r = handTileRect(i, layout);
      this.slotSprites[i].update(r.x, r.y, r.w, r.h);
    }

    for (let i = 0; i < this.hand.length; i++) {
      const tile = this.hand[i];
      if (!tile) continue;
      AnimationManager.kill(tile);
      const r = handTileRect(i, layout);
      tile.update(r.x, r.y, r.w, r.h);
    }
  }

  private async _onTilePicked(tile: Tile): Promise<void> {
    const slotIndex = this.hand.indexOf(null); // looking for empty space
    if (slotIndex === -1) {
      bus.emit('game_end', { outcome: 'lose' });
      bus.emit('play_sound', { alias: 'sfxLose' });
      return;
    }

    bus.emit('tile_moved_to_hand', { tile })
    this.hand[slotIndex] = tile;
    this.undoStack.push(tile);
    bus.emit('undo_available', { canUndo: true });

    const matchTrio = this._findMatch(tile.typeIndex);
    if (matchTrio) {
      this._commitMatch(matchTrio, tile);
    }

    await tile.pick();
    const targetRect = handTileRect(slotIndex, this.layout);
    await tile.moveTo(targetRect.x, targetRect.y, 'tile_move_to_hand');

    bus.emit('spawn_particles', {
      x:      targetRect.x,
      y:      targetRect.y,
      amount: 6,
      speed:  130,
      dieoff: 0.85,
    });

    if (matchTrio) {
      this._animateMatchRemove(matchTrio);
    } else {
      const handFull = this.hand.every(t => t !== null);
      if (handFull) {
        bus.emit('game_end', { outcome: 'lose' });
        bus.emit('play_sound', { alias: 'sfxLose' });
      }
    }
  }

  private _findMatch(typeIndex: number): [Tile, Tile, Tile] | null {
    const found: Tile[] = [];
    for (const t of this.hand) {
      if (t && t.typeIndex === typeIndex) {
        found.push(t);
        if (found.length === 3) return found as [Tile, Tile, Tile];
      }
    }
    return null;
  }

  private _commitMatch(trio: [Tile, Tile, Tile], trigger: Tile): void {
    const entries = trio.map(t => ({
      tile:      t,
      slotIndex: this.hand.indexOf(t),
    }));

    for (const { slotIndex } of entries) {
      if (slotIndex !== -1) this.hand[slotIndex] = null;
    }
    for (const { tile } of entries) this.discarded.push(tile);

    const idx = this.undoStack.lastIndexOf(trigger);
    if (idx !== -1) this.undoStack.splice(idx, 1);

    const undoClear = entries
      .map(e => ({ tile: e.tile, slotIndex: e.slotIndex, toBoard: e.tile === trigger }));

    this.undoStack.push({ tiles: undoClear });

    bus.emit('play_sound', { alias: 'sfxMatch' });
  }

  private _animateMatchRemove(trio: [Tile, Tile, Tile]): void {
    for (const tile of trio) {
      bus.emit('spawn_particles', {
        x:      tile.x,
        y:      tile.y,
        amount: 14,
        speed:  200,
        dieoff: 1.3,
      });
      
      tile.playMatchRemove();
    }
  }

  
  private async _onUndoRequested(): Promise<void> {
    const entry = this.undoStack.pop();
    if (!entry) return;
    bus.emit('undo_available', { canUndo: this.undoStack.length > 0 });

    if (isUndoClear(entry)) {
      await this._undoClear(entry);
    } else {
      this._undoPick(entry);
    }
  }

  private _undoPick(tile: Tile): void {
    const slotIndex = this.hand.indexOf(tile);
    if (slotIndex !== -1) this.hand[slotIndex] = null;
    bus.emit('tile_returned_to_board', { tile: tile });
  }


  private async _undoClear(entry: UndoClear): Promise<void> {
    var toBoardPromise;
    for (const { tile, slotIndex, toBoard } of entry.tiles) {
      const di = this.discarded.indexOf(tile);
      if (di !== -1) this.discarded.splice(di, 1);
      
      if (!toBoard) this.hand[slotIndex] = tile;
      AnimationManager.kill(tile);

      const r = handTileRect(slotIndex, this.layout);
      tile.update(r.x, r.y, r.w, r.h);
      const promise = tile.appear();
      if (toBoard) toBoardPromise = promise;
    }

    const toBoard = entry.tiles.find(({ toBoard }) => toBoard)!.tile;
    bus.emit('tile_returned_to_board', { tile: toBoard, wait_for: toBoardPromise });
  }

  
  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.container.destroy({ children: true });
  }
}