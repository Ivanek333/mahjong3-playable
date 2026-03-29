import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { visualizer } from "rollup-plugin-visualizer";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Plugin } from "vite";

function inlineGameConfig(options: { prettyPrint?: boolean } = {}): Plugin {
  const { prettyPrint = false } = options;
  return {
    name: "inline-game-config",
    transformIndexHtml() {
      const raw = readFileSync(resolve(__dirname, "gameconfig.json"), "utf-8");
      const parsed = JSON.parse(raw);
      const serialized = prettyPrint
        ? JSON.stringify(parsed, null, 2)
        : JSON.stringify(parsed);
      return [
        {
          tag: "script",
          attrs: { id: "game-config" },
          children: `window.__GAME_CONFIG__ = ${serialized};`,
          injectTo: "head-prepend",
        },
      ];
    },
  };
}


export default defineConfig({
  plugins: [
    inlineGameConfig({ prettyPrint: false }),
    viteSingleFile({ removeViteModuleLoader: true }),
    visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true }),
  ],

  build: {
    target: "es2020",
    sourcemap: false,
    reportCompressedSize: false,
    assetsInlineLimit: 0,
    cssCodeSplit: false,

    /*   // everything is useless
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.info", "console.warn", "console.debug"],
        passes: 3,
        ecma: 2020,
        unsafe_math: true,
        toplevel: true,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },//*/
    /*
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        propertyWriteSideEffects: false,
      },
      output: {
        codeSplitting: false,
      },
    },//*/
  },

  
  optimizeDeps: {
    include: ["pixi.js", "gsap", "@pixi/particle-emitter"],
  },
});