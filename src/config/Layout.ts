import { cfg } from './GameConfig';
import type { TileData } from '../objects/Tile';

export interface LayoutResult {
  unitSize: number;
  tilePxW: number;
  tilePxH: number;
  tileStepX: number;
  tileStepY: number;
  boardX: number;
  boardY: number;
  handTilesY: number;
  buttonsY: number;
  screenW: number;
  screenH: number;
}

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boardTileRect(data: Pick<TileData, 'gridX' | 'gridY' | 'layer'>, layout: LayoutResult): TileRect {
  const { unitSize, tilePxW, tilePxH, tileStepX, tileStepY, boardX, boardY } = layout;
  const layerYOffset = data.layer * cfg.board.layerYOffsetUnits * unitSize;
  const layerXOffset = data.layer * cfg.board.layerXOffsetUnits * unitSize;

  return {
    x: boardX + data.gridX * tileStepX - layerXOffset,
    y: boardY + data.gridY * tileStepY - layerYOffset,
    w: tilePxW,
    h: tilePxH,
  };
}


export function handTileRect(slotIndex: number, layout: LayoutResult): TileRect {
  const { unitSize, tilePxW, tilePxH, handTilesY, screenW } = layout;
  const totalSlots = cfg.hand.slots;
  const spacing = cfg.hand.tileSpacingUnits * unitSize;
  const rowW = totalSlots * tilePxW + (totalSlots - 1) * spacing;
  const startX = screenW / 2 - rowW / 2 + tilePxW / 2;

  return {
    x: startX + slotIndex * (tilePxW + spacing),
    y: handTilesY,
    w: tilePxW,
    h: tilePxH,
  };
}

export function buttonRect(index: number, layout: LayoutResult): TileRect {
  const { unitSize, buttonsY, screenW } = layout;
  const pxSize  = cfg.buttons.sizeUnits    * unitSize;
  const spacing = cfg.buttons.spacingUnits * unitSize;
  const count   = cfg.buttons.count;
  const totalW  = count * pxSize + (count - 1) * spacing;
  const startX  = screenW / 2 - totalW / 2 + pxSize / 2;
 
  return {
    x: startX + index * (pxSize + spacing),
    y: buttonsY,
    w: pxSize,
    h: pxSize,
  };
}

export function calculateLayout(screenW: number, screenH: number): LayoutResult {
  const TW = cfg.tile.widthUnits;
  const TH = cfg.tile.heightUnits;
  const OX = cfg.tile.overlapXUnits;
  const OY = cfg.tile.overlapYUnits;

  const stepXUnits = TW - OX;
  const stepYUnits = TH - OY;

  const handContainerUnitsH = TH + 2 * cfg.hand.marginUnits;
  const handContainerUnitsW = TW * cfg.hand.slots + cfg.hand.tileSpacingUnits * (cfg.hand.slots - 1) + 2 * cfg.hand.marginUnits;
  const buttonsContainerUnitsH = cfg.buttons.sizeUnits + 2 * cfg.buttons.marginUnits;
  const buttonsContainerUnitsW = cfg.buttons.sizeUnits * cfg.buttons.count + cfg.buttons.spacingUnits * (cfg.buttons.count - 1) + 2 * cfg.buttons.marginUnits;


  const bottomStripUnitsH = handContainerUnitsH + buttonsContainerUnitsH;

  const boardAreaUnitsW = TW + (cfg.board.cols - 1) * stepXUnits + 2 * cfg.board.paddingUnits;
  const boardAreaUnitsH = TH + (cfg.board.rows - 1) * stepYUnits + 2 * cfg.board.paddingUnits;

  const tileSizeFromW = screenW / Math.max(boardAreaUnitsW, handContainerUnitsW, buttonsContainerUnitsW);
  const tileSizeFromH = screenH / (boardAreaUnitsH + bottomStripUnitsH);
  const unitSize = Math.min(tileSizeFromW, tileSizeFromH);

  const tilePxW = TW * unitSize;
  const tilePxH = TH * unitSize;
  const tileStepX = stepXUnits * unitSize;
  const tileStepY = stepYUnits * unitSize;

  const handTilesY = screenH - handContainerUnitsH / 2 * unitSize;
  const buttonsY = screenH - (handContainerUnitsH + buttonsContainerUnitsH / 2) * unitSize;

  const freeH   = screenH - bottomStripUnitsH * unitSize;
  const boardX  = screenW/2 - tileStepX * (cfg.board.cols - 1)/2;
  const boardY  = freeH/2 - tileStepY * (cfg.board.rows - 1) / 2;

  return {
    unitSize,
    tilePxW,
    tilePxH,
    tileStepX,
    tileStepY,
    boardX,
    boardY,
    handTilesY,
    buttonsY,
    screenW,
    screenH,
  };
}