export interface TilePosition { x: number; y: number; }
export type Layer = TilePosition[];
export interface LevelConfig {
  tileTypes: number;
  layers: number[][][];
}


export interface AnimationConfigMap {
  tile_appear:          { duration: number };
  tile_pick:            { riseY: number; durationUp: number; durationDown: number };
  tile_move_to_hand:    { duration: number };
  tile_return_to_board: { duration: number };
  tile_match_remove:    { flashDuration: number; shrinkDuration: number };
  tile_hand_shift:      { duration: number };
  flip_in:              { duration: number };
  flip_out:             { duration: number, delay_before_flip_in: number };
  button_press:         { scaleDown: number; durationDown: number; durationUp: number };
  hand_full_shake:      { duration: number; distance: number };
}
export type AnimationAlias = keyof AnimationConfigMap;

export type VolumeConfigs = Record<AudioAlias, number>;
export type ParticleColorSet = [string, string, string];

export interface GameConfig {
  board: {
    cols:               number;
    rows:               number;
    paddingUnits:       number;
    layerXOffsetUnits:  number;
    layerYOffsetUnits:  number;
    tileAppearDelay: number;
    tileFlipDelay: number;
  };
  tile: {
    widthUnits:  number;
    heightUnits: number;
    overlapXUnits: number;
    overlapYUnits: number;
  };
  hand: {
    slots:            number;
    tileSpacingUnits: number;
    marginUnits:      number;
  };
  buttons: {
    count:        number;
    sizeUnits:    number;
    spacingUnits: number;
    marginUnits:  number;
  };
  tutorial: {
    focusGridX:           number;
    focusGridY:           number;
    focusLayer:           number;
    focusRadiusUnits:     number;
    gradientFeatherUnits: number;
    tintColor:            string;
    tintAlpha:            number;
  };
  endPanel: {
    titleFontSizeUnits:  number;
    titleOffsetYUnits:   number;
    buttonFontSizeUnits: number;
    buttonWidthUnits:    number;
    buttonHeightUnits:   number;
    buttonOffsetYUnits:  number;
  };
  volume: VolumeConfigs;
  assets: {
    backgrounds: {
      background1: string;
      background2: string;
      background3: string;
      background4: string;
      background5: string;
      background6: string;
      background7: string;
      background8: string;
    };
    tiles: {
      tileBamboo1: string;
      tileBamboo2: string;
      tileBamboo3: string;
      tileCircle1: string;
      tileCircle2: string;
      tileCircle3: string;
      tilePinyin1: string;
      tilePinyin2: string;
      tilePinyin3: string;
      tileFlower:  string;
    };
    textures: {
      tileBack:    string;
      btnUndo:     string;
      btnShuffle:  string;
      btnSoundOn:  string;
      btnSoundOff: string;
      slotBg:      string;
    };
    audio: {
      bgm:      string;
      sfxPick:  string;
      sfxMatch: string;
      sfxWin:   string;
      sfxLose:  string;
    };
  };
  animations: AnimationConfigMap;
  particles: {
    colors: {
      background1: ParticleColorSet;
      background2: ParticleColorSet;
      background3: ParticleColorSet;
      background4: ParticleColorSet;
      background5: ParticleColorSet;
      background6: ParticleColorSet;
      background7: ParticleColorSet;
      background8: ParticleColorSet;
    };
    ambient: {
      maxCount: number;
      speed: number;
      speedVariance: number;
      lifetime: number;
      lifetimeVariance: number;
      direction: number;
      directionVariance: number;
      spawnRate: number;
    };
  };
  level: LevelConfig;
}

declare global {
  interface Window {
    __GAME_CONFIG__: GameConfig;
  }
}

export const cfg: GameConfig = window.__GAME_CONFIG__ as GameConfig;

export type BackgroundAlias = keyof typeof cfg.assets.backgrounds;
export type TilesAlias = keyof typeof cfg.assets.tiles;
export type TextureAlias = keyof typeof cfg.assets.textures | TilesAlias | BackgroundAlias;
export type AudioAlias   = keyof typeof cfg.assets.audio;