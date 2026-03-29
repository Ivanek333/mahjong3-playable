import { Assets, type ProgressCallback, type Texture } from 'pixi.js';
import { cfg, type AudioAlias, type TextureAlias } from '../config/GameConfig';

const allAssets = import.meta.glob('../assets/**/*', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const ASSET_URLS: Record<string, string> = Object.fromEntries(
    Object.entries(allAssets).map(([path, url]) => {
      const chunks = path.split('/');
      const filename = chunks[chunks.length - 1];
      return [filename, url];
    })
);

function resolveAlias<Alias extends TextureAlias | AudioAlias> 
    (aliasMap: Record<Alias, string>): Array<{ alias: Alias; src: string }> {
    return Object.entries(aliasMap).map(([alias, filename]) => {
        const src = ASSET_URLS[filename as string];
        if (!src) throw new Error(
                `[AssetManifest] No inlined asset found for filename "${filename}" ` +
                `(alias: "${alias}"). Check gameconfig.json and that the file exists ` +
                `under src/assets/.`);
        return { alias, src };
    }) as Array<{ alias: Alias; src: string }>;
}

export const TEXTURE_BUNDLE = {
  name: 'textures',
  assets: resolveAlias(cfg.assets.textures),
};
export const TILES_BUNDLE = {
  name: 'tiles',
  assets: resolveAlias(cfg.assets.tiles),
};
export const BACKGROUDS_BUNDLE = {
  name: 'backgrounds',
  assets: resolveAlias(cfg.assets.backgrounds),
};

export const AUDIO_URLS: Record<AudioAlias, string> = Object.fromEntries(
  resolveAlias(cfg.assets.audio).map(({ alias, src }) => [alias, src])
) as Record<AudioAlias, string>;


export function getTexture(key: TextureAlias): Texture {
  return Assets.get<Texture>(key);
}

export function getAudioUrl(alias: AudioAlias): string {
  const url = AUDIO_URLS[alias];
  if (!url) throw new Error(`Audio not loaded: "${alias}"`);
  return url;
}

export async function LoadPixiAssets(onProgress?: ProgressCallback) {
    await Assets.init({ manifest: { bundles: [TEXTURE_BUNDLE, TILES_BUNDLE, BACKGROUDS_BUNDLE] } })
    await Assets.loadBundle(['textures', 'tiles', 'backgrounds'], onProgress);
}