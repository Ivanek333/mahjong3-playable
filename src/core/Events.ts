import type { AudioAlias } from '../config/GameConfig';
import type { LayoutResult } from '../config/Layout';
import type { Tile } from '../objects/Tile';


export interface EventPayloadMap {
  layout_changed: { layout: LayoutResult };

  tile_picked: { tile: Tile };
  tile_moved_to_hand: { tile: Tile };
  tile_returned_to_board: { tile: Tile, wait_for?: Promise<void> };

  intro_complete: Record<string, never>;
  game_end: { outcome: 'win' | 'lose' };

  shuffle_requested: Record<string, never>;
  undo_requested: Record<string, never>;
  undo_available: { canUndo: boolean };

  play_sound: { alias: AudioAlias };
  sound_toggle: { muted: boolean };

  spawn_particles: { x: number; y: number; amount: number; speed: number; dieoff: number };
}

export type EventKey = keyof EventPayloadMap;

export type GameState =
  | 'boot'
  | 'intro'
  | 'playing'
  | 'game_end'