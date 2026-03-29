import { gsap } from 'gsap';
import type { Container } from 'pixi.js';
import { cfg, type AnimationAlias } from '../config/GameConfig';
import type { IManager } from '../core/IManager';


interface BasePayload {
  delay?: number;
}

export interface AnimationPayloadMap {
  tile_appear: BasePayload;
  tile_pick: BasePayload;
  tile_move_to_hand: BasePayload & { x: number; y: number; };
  tile_return_to_board: BasePayload & { x: number; y: number; onComplete?: () => void; };
  tile_match_remove: BasePayload & { onComplete?: () => void; };
  tile_hand_shift: BasePayload & { x: number; };
  flip_in: BasePayload & { onMidpoint: () => void; };
  flip_out: BasePayload & { onMidpoint: () => void; };
  button_press: BasePayload;
  hand_full_shake: BasePayload;
}


class _AnimationManager implements IManager {
  play<K extends AnimationAlias>(
    clip: K,
    target: Container,
    params: AnimationPayloadMap[K],
  ): Promise<void> {
    return new Promise<void>(resolve => {
      this._buildTween(clip, target, params, resolve);
    });
  }

  kill(target: Container): void {
    gsap.killTweensOf(target);
  }

  private _buildTween<K extends AnimationAlias>(
    clip: K,
    target: Container,
    params: AnimationPayloadMap[K],
    onDone: () => void,
  ): void {
    const delay = (params as BasePayload).delay ?? 0;
    const overwrite = 'auto' as const;
    const a = cfg.animations;

    switch (clip as AnimationAlias) {
      case 'tile_appear': {
        target.scale.set(0);
        target.alpha = 0;
        gsap.to(target, {
          pixi: { scaleX: 1, scaleY: 1, alpha: 1 },
          duration: a.tile_appear.duration,
          ease: 'back.out(1.4)',
          delay, overwrite,
          onComplete: onDone,
        });
        break;
      }

      case 'tile_pick': {
        const c       = a.tile_pick;
        const originY = target.y;
        const tl      = gsap.timeline({ delay, onComplete: onDone });
        tl.to(target, {
          pixi: { scaleX: 1.12, scaleY: 1.12, y: originY - c.riseY },
          duration: c.durationUp,
          ease: 'power2.out',
          overwrite,
        }).to(target, {
          pixi: { scaleX: 1, scaleY: 1, y: originY },
          duration: c.durationDown,
          ease: 'power2.in',
          overwrite,
        });
        break;
      }

      case 'tile_move_to_hand': {
        const p = params as AnimationPayloadMap['tile_move_to_hand'];
        gsap.to(target, {
          pixi: { x: p.x, y: p.y },
          duration: a.tile_move_to_hand.duration,
          ease: 'power3.out',
          delay, overwrite,
          onComplete: onDone,
        });
        break;
      }

      case 'tile_return_to_board': {
        const p = params as AnimationPayloadMap['tile_return_to_board'];
        gsap.to(target, {
          pixi: { x: p.x, y: p.y },
          duration: a.tile_return_to_board.duration,
          ease: 'power2.out',
          delay, overwrite,
          onComplete: () => { p.onComplete?.(); onDone(); },
        });
        break;
      }

      case 'tile_match_remove': {
        const p = params as AnimationPayloadMap['tile_match_remove'];
        const c = a.tile_match_remove;
        const tl = gsap.timeline({
          delay,
          onComplete: () => { p.onComplete?.(); onDone(); },
        });
        tl.to(target, {
          pixi: { brightness: 2 },
          duration: c.flashDuration,
          ease: 'none',
          overwrite,
        }).to(target, {
          pixi: { scaleX: 0, scaleY: 0, alpha: 0, brightness: 1 },
          duration: c.shrinkDuration,
          ease: 'power2.in',
          overwrite,
        });
        break;
      }

      case 'tile_hand_shift': {
        const p = params as AnimationPayloadMap['tile_hand_shift'];
        gsap.to(target, {
          pixi: { x: p.x },
          duration: a.tile_hand_shift.duration,
          ease: 'power2.out',
          delay, overwrite,
          onComplete: onDone,
        });
        break;
      }

      case 'flip_in': {
        const p    = params as AnimationPayloadMap['flip_in'];
        const half = a.flip_in.duration / 2;
        target.scale.set(1, 1);
        target.alpha = 1;
        const tl = gsap.timeline({ delay, onComplete: onDone });
        tl.to(target, {
            pixi: { scaleX: 0.5, scaleY: 0.5 },
            duration: half,
            ease: 'power1.in',
            overwrite,
            onComplete: p.onMidpoint,
        }).to(target, {
            pixi: { scaleX: 1, scaleY: 1 },
            duration: half,
            ease: 'power1.out',
            overwrite,
        });
        break;
        }

    case 'flip_out': {
        const p    = params as AnimationPayloadMap['flip_out'];
        const half = a.flip_out.duration / 2;
        const tl   = gsap.timeline({ delay: delay, onComplete: onDone });
        tl.to(target, {
            pixi: { scaleX: 0.5, scaleY: 0.5 },
            duration: half,
            ease: 'power1.in',
            overwrite,
            onComplete: p.onMidpoint,
        }).to(target, {
            pixi: { scaleX: 1, scaleY: 1 },
            duration: half,
            ease: 'power1.out',
            overwrite,
        }).to(target, { duration: a.flip_out.delay_before_flip_in });
        break;
        }


      case 'button_press': {
        const c  = a.button_press;
        const tl = gsap.timeline({ delay, onComplete: onDone });
        tl.to(target, {
          pixi: { scaleX: c.scaleDown, scaleY: c.scaleDown },
          duration: c.durationDown,
          ease: 'power2.out',
          overwrite,
        }).to(target, {
          pixi: { scaleX: 1, scaleY: 1 },
          duration: c.durationUp,
          ease: 'elastic.out(1, 0.4)',
          overwrite,
        });
        break;
      }

      case 'hand_full_shake': {
        const c  = a.hand_full_shake;
        const ox = target.x;
        const d  = c.distance * target.width;
        gsap.to(target, {
          keyframes: {
            x: [ox - d, ox + d, ox - d * 0.8, ox + d * 0.8, ox - d * 0.4, ox + d * 0.4, ox],
            easeEach: 'power1.inOut',
          },
          duration: c.duration,
          delay, overwrite,
          onComplete: onDone,
        });
        break;
      }

      default: {
        const _: never = clip as never;
        console.warn(`[AnimationManager] Unknown clip: "${_ as string}"`);
        onDone();
      }
    }
  }


  destroy(): void {
    gsap.globalTimeline.clear();
  }
}

export const AnimationManager = new _AnimationManager();