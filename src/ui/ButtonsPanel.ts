import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';
import { bus } from '../core/EventBus';
import type { IManager } from '../core/IManager';
import { buttonRect } from '../config/Layout';
import { getTexture } from '../core/AssetLoader';
import { Button } from './Button';

export class ButtonsPanel implements IManager {
  private readonly container: Container;
  private readonly buttons:   [Button, Button, Button];
  private readonly undoBtn:   Button;
  private readonly shuffleBtn: Button;
  private readonly soundBtn:  Button;
  private hasGameEnded: boolean = false;

  private muted = false;

  private readonly unsubs: Array<() => void> = [];

  constructor(app: Application) {
    this.container = new Container();
    app.stage.addChild(this.container);

    this.undoBtn = new Button({
      texture: getTexture('btnUndo'),
      onClick: () => bus.emit('undo_requested', {}),
    });
    this.undoBtn.setEnabled(false); // disabled until something is on the undo stack

    this.shuffleBtn = new Button({
      texture: getTexture('btnShuffle'),
      onClick: () => bus.emit('shuffle_requested', {}),
    });

    this.soundBtn = new Button({
      texture: getTexture('btnSoundOn'),
      onClick: () => this._onSoundToggle(),
    });

    this.buttons = [this.undoBtn, this.shuffleBtn, this.soundBtn];
    for (const btn of this.buttons) this.container.addChild(btn);

    this.unsubs.push(
      bus.on('layout_changed', ({ layout }) => {
        for (let i = 0; i < this.buttons.length; i++) {
          const r = buttonRect(i, layout);
          this.buttons[i].update(r.x, r.y, r.w, r.h);
        }
      }),
      bus.on('undo_available', ({ canUndo }) => { if (!this.hasGameEnded) { this.undoBtn.setEnabled(canUndo) }}),
      bus.on('game_end', () => {
        this.hasGameEnded = true;
        this.undoBtn.setEnabled(false);
        this.shuffleBtn.setEnabled(false);
      }),
    );
  }

  private _onSoundToggle(): void {
    this.muted = !this.muted;
    bus.emit('sound_toggle', { muted: this.muted });
    this.soundBtn.setIconTexture(
      getTexture(this.muted ? 'btnSoundOff' : 'btnSoundOn')
    );
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.container.destroy({ children: true });
  }
}