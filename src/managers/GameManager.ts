import { Application, ColorMatrixFilter, Container, Sprite } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';

import { bus } from '../core/EventBus';
import { calculateLayout, type LayoutResult } from '../config/Layout';
import { LoadPixiAssets } from '../core/AssetLoader';
import type { IManager } from '../core/IManager';
import { SoundManager } from './SoundManager';
import { AnimationManager } from './AnimationManager';
import { BoardManager } from './BoardManager';
import { HandManager } from './HandManager';
import { Background } from '../ui/Background';
import { ButtonsPanel } from '../ui/ButtonsPanel';
import { EndPanel } from '../ui/EndPanel';
import { ParticleManager } from './ParticleManager';
import { TutorialOverlay } from '../ui/TutorialOverlay';


function initGsap(): void {
  gsap.registerPlugin(PixiPlugin);
  PixiPlugin.registerPIXI({
    Container,
    Sprite,
    ColorMatrixFilter
  });
}


export class GameManager implements IManager {
  private readonly app: Application;
  private layout!: LayoutResult; // calculated on init

  private soundManager?: SoundManager;
  private animationManager?: typeof AnimationManager;
  private boardManager?: BoardManager;
  private handManager?: HandManager;
  private background?: Background;
  private particleManager?: ParticleManager;
  private buttonsPanel?: ButtonsPanel;
  private endPanel?: EndPanel;
  private tutorialOverlay?: TutorialOverlay;

  private managers: IManager[] = [];

  constructor(app: Application) {
    this.app = app;
    this.app.stage.sortableChildren = true;
  }

  async init(): Promise<void> {
    initGsap();
    this.registerGsapTicker();
    this.registerResizeHandler();

    await LoadPixiAssets();
    //await LoadPixiAssets((progress: number) => { console.log(`${performance.now()} > Loading assets: ${Math.round(progress * 1000)/10}%`) });

    this.soundManager = this.addManager(new SoundManager());
    await this.soundManager.loadAll();
    this.soundManager.startBgm();
    
    this.animationManager = this.addManager(AnimationManager);
    this.boardManager = this.addManager(new BoardManager(this.app));
    this.handManager = this.addManager(new HandManager(this.app));
    this.background = this.addManager(new Background(this.app));
    this.particleManager = this.addManager(new ParticleManager(this.app, this.background.backgroundAlias));
    this.buttonsPanel = this.addManager(new ButtonsPanel(this.app));
    this.endPanel = this.addManager(new EndPanel(this.app));
    this.tutorialOverlay = this.addManager(new TutorialOverlay(this.app));

    // SHUT UP SHUT UP SHUT UP SHUT UP SHUT UP SHUT UP
    this.animationManager;
    this.handManager;
    this.particleManager;
    this.buttonsPanel;
    this.endPanel;
    this.tutorialOverlay;

    this.recalculateLayout();
    this.registerBusListeners();
    this.registerTicker();

    this.boardManager.playIntro();
  }

  private addManager<T extends IManager>(manager: T): T {
    this.managers.push(manager);
    return manager;
  }

  
  private registerGsapTicker(): void {
    gsap.ticker.remove(gsap.updateRoot);
    this.app.ticker.add((ticker: Ticker) => {
      gsap.updateRoot(ticker.lastTime / 1000);
    });
  }

  private registerTicker(): void {
    this.app.ticker.add((_ticker: Ticker) => {
      this.update(_ticker.deltaMS);
    });
  }

  update(deltaMS: number): void {
    for (const m of this.managers) m.update?.(deltaMS);
  }

  
  private readonly unsubs: Array<() => void> = [];
  private registerBusListeners(): void {
    this.unsubs.push(
    );
  }

  
  private recalculateLayout(): void {
    const { width, height } = this.app.screen;
    this.layout = calculateLayout(width, height);
    bus.emit('layout_changed', { layout: this.layout });
  }

  private registerResizeHandler(): void {
    this.app.renderer.on('resize', () => { this.recalculateLayout(); });
  }

  destroy(): void {
    this.unsubs.forEach(u => u());
    this.unsubs.length = 0;
    for (const m of this.managers) m.destroy();
    this.managers.length = 0;
    this.app.ticker.stop();
    this.app.destroy({ removeView: true });
  }
}