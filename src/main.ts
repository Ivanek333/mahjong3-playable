import './style.css'
import { Application } from 'pixi.js';
import { GameManager } from './managers/GameManager';


async function bootstrap(): Promise<void> {
  const app = new Application();

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resizeTo: window,

    backgroundColor: 0x1a1a2e,
    antialias: true,
    autoDensity: true,       // respects devicePixelRatio for crisp rendering
    resolution: window.devicePixelRatio || 1,
  });

  document.getElementById('app')!.appendChild(app.canvas);

  const gm = new GameManager(app);
  await gm.init();

  if (import.meta.env.DEV) {
    (window as Window & { __gm?: GameManager }).__gm = gm;
  }
}

bootstrap().catch(console.error);