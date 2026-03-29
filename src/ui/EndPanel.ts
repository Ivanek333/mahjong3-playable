import { Container, Text } from 'pixi.js';
import type { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { bus } from '../core/EventBus';
import type { IManager } from '../core/IManager';
import type { LayoutResult } from '../config/Layout';
import { cfg } from '../config/GameConfig';
import { Button } from './Button';

const outcome_texts = {
  win:  { title: 'Level complete', button: 'Play more' },
  lose: { title: 'No more moves',  button: 'Try again' },
} as const;

export class EndPanel implements IManager {
  private readonly container: Container;
  private readonly titleText: Text;
  private readonly actionBtn: Button;

  private readonly unsubs: Array<() => void> = [];

  constructor(app: Application) {
    this.container       = new Container();
    this.container.alpha = 0;
    this.container.eventMode = 'none';
    app.stage.addChild(this.container);

    this.titleText = new Text({
      text:  '',
      style: { fill: '#ffffff', fontWeight: 'bold', align: 'center',
        dropShadow: { color: '#000000', blur: 3, distance: 4, alpha: 0.7, angle: Math.PI * 0.6 }
      },
    });
    this.titleText.anchor.set(0.5);
    this.container.addChild(this.titleText);

    this.actionBtn = new Button({ label:   '', onClick: () => { } });
    this.container.addChild(this.actionBtn);

    this.unsubs.push(
      bus.on('layout_changed', ({ layout }) => { this._applyLayout(layout); }),
      bus.on('game_end', ({ outcome }) => this._show(outcome)),
    );
  }

  private _show(outcome: 'win' | 'lose'): void {
    const texts = outcome_texts[outcome];
    this.titleText.text = texts.title;
    this.actionBtn.setLabel(texts.button);

    this.container.eventMode = 'static';
    gsap.to(this.container, {
      alpha:    1,
      duration: 0.5,
      ease:     'power2.out',
    });
  }

  private _applyLayout(layout: LayoutResult): void {
    const { unitSize, screenW, screenH } = layout;
    const ep = cfg.endPanel;
    const cx = screenW / 2;
    const cy = screenH / 2;

    this.titleText.style.fontSize = ep.titleFontSizeUnits * unitSize;
    this.titleText.x = cx;
    this.titleText.y = cy + ep.titleOffsetYUnits * unitSize;

    const btnW = ep.buttonWidthUnits  * unitSize;
    const btnH = ep.buttonHeightUnits * unitSize;
    this.actionBtn.update(
      cx,
      cy + ep.buttonOffsetYUnits * unitSize,
      btnW,
      btnH,
    );
    this.actionBtn.labelText!.style.fontSize = ep.buttonFontSizeUnits * unitSize;
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.container.destroy({ children: true });
  }
}