import { cfg, type TilePosition } from '../config/GameConfig';
import { getTexture } from '../core/AssetLoader';
import { Tile } from '../objects/Tile';


function posKey(x: number, y: number): string {
  return `${Math.round(x * 2)};${Math.round(y * 2)}`;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export class LevelLoader {
  private nextId = 0;

  load(): Tile[] {
    const { layers: raw_layers, tileTypes } = cfg.level;
    const layers = raw_layers.map(l => l.map(pos => ({ x: pos[0], y: pos[1] })))

    if (layers.length === 0) {
      throw new Error('[LevelLoader] Level has no layers.');
    }
    const tilesTexturesAmount = Object.entries(cfg.assets.tiles).length;
    if (tilesTexturesAmount !== tileTypes) {
      throw new Error(
        `[LevelLoader] cfg.assets.tiles length (${tilesTexturesAmount}) ` +
        `must equal tileTypes (${tileTypes}).`
      );
    }

    
    const positionSets: Set<string>[] = layers.map(
      layer => new Set(layer.map(p => posKey(p.x, p.y)))
    );

    for (let li = 1; li < layers.length; li++) {
      for (const tile of layers[li]!) {
        this._validateSupport(tile, li, positionSets[li - 1]!);
      }
    }

    const total = layers.reduce((sum, layer) => sum + layer.length, 0);

    if (total % 3 !== 0) {
      throw new Error(
        `[LevelLoader] Total tile count (${total}) is not a multiple of 3.`
      );
    }

    const typeAssignments = this._distributeTypes(total, tileTypes);

    
    const tilesByKey: Map<string, Tile>[] = layers.map(() => new Map());
    const allTiles: Tile[] = [];
    let assignIdx = 0;

    for (let li = 0; li < layers.length; li++) {
      for (const pos of layers[li]!) {
        const tile = this._createTile(pos, li);
        tile.setType(typeAssignments[assignIdx++]!);
        tilesByKey[li]!.set(posKey(pos.x, pos.y), tile);
        allTiles.push(tile);
      }
    }

    
    for (let li = 1; li < layers.length; li++) {
      for (const pos of layers[li]!) {
        const above = tilesByKey[li]!.get(posKey(pos.x, pos.y))!;

        for (const key of this._belowCandidateKeys(pos)) {
          const below = tilesByKey[li - 1]!.get(key);
          if (!below) continue;
          above.bottomNeighbours.push(below);
          below.topNeighbours.push(above);
        }
      }
    }

    for (const tile of allTiles) {
      tile.updateAvailability();
    }

    return allTiles;
  }


  private _validateSupport(
    tile: TilePosition,
    layerIndex: number,
    belowSet: Set<string>,
  ): void {
    const { x: tx, y: ty } = tile;

    for (const [cx, cy, corner_shifter] of [
      [tx - 0.5, ty - 0.5, () => { return { dx: 0.5, dy: 0.5 }}],
      [tx + 0.5, ty - 0.5, () => { return { dx: -0.5, dy: 0.5 }}],
      [tx - 0.5, ty + 0.5, () => { return { dx: 0.5, dy: -0.5 }}],
      [tx + 0.5, ty + 0.5, () => { return { dx: -0.5, dy: -0.5 }}],
    ] as [number, number, () => { dx: number, dy: number }][]) {
      const D = corner_shifter();
      const { dx, dy } = D;
      const covered =
        belowSet.has(posKey(cx, cy)) ||
        belowSet.has(posKey(cx + dx, cy)) ||
        belowSet.has(posKey(cx, cy + dy)) ||
        belowSet.has(posKey(cx + dx, cy + dy));

      if (!covered) {
        throw new Error(
          `[LevelLoader] Layer ${layerIndex} tile at (${tx}, ${ty}) ` +
          `has no support beneath corner (${cx}, ${cy}).`
        );
      }
    }
  }

  
  private _belowCandidateKeys(pos: TilePosition): string[] {
    const { x, y } = pos;
    const offsets = [-0.5, 0, 0.5];
    const keys: string[] = [];
    for (const dx of offsets) {
      for (const dy of offsets) {
        keys.push(posKey(x + dx, y + dy));
      }
    }
    return keys;
  }

  private _distributeTypes(total: number, tileTypes: number): number[] {
    const base     = Math.floor(Math.floor(total / tileTypes) / 3) * 3;
    const assigned = base * tileTypes;
    let leftover   = total - assigned;

    if (leftover % 3 !== 0) {
      throw new Error(
        `[LevelLoader] Internal: leftover (${leftover}) not a multiple of 3.`
      );
    }

    const counts      = new Array<number>(tileTypes).fill(base);
    const typeIndices = Array.from({ length: tileTypes }, (_, i) => i);
    shuffleArray(typeIndices);

    for (let ti = 0; leftover > 0; leftover -= 3, ti++) {
      counts[typeIndices[ti % tileTypes]!]! += 3;
    }

    const assignments: number[] = [];
    for (let t = 0; t < tileTypes; t++) {
      for (let k = 0; k < counts[t]!; k++) assignments.push(t);
    }
    shuffleArray(assignments);
    return assignments;
  }

  private _createTile(pos: TilePosition, layerIndex: number): Tile {
    const texture = getTexture('tileBack');
    return new Tile(
      { id: this.nextId++, gridX: pos.x, gridY: pos.y, layer: layerIndex },
      texture,
    );
  }
}