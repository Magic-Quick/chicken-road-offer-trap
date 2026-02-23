import { _decorator, Component, Vec3, tween } from 'cc';
import { GlobalEventBus } from '../common/event-bus';

const { ccclass, property } = _decorator;

/**
 * ChestController — manages the treasure chest fly-in and idle float animation.
 *
 * GDD §4 Chest:
 * - Entry start: x:195, y:1044 (off-screen bottom)
 * - Entry end:   x:195, y:422  (center-screen)
 * - Entry duration: 0.6 s, cubic-bezier bounce (overshoot 10 px, settle back)
 * - Idle float: ±8 px Y oscillation, period 2.0 s, sine wave
 *
 * The node starts inactive; GameController activates it on Freeze.
 * onEnable() triggers the fly-in automatically.
 */
@ccclass('ChestController')
export class ChestController extends Component {
  // ─── Inspector ──────────────────────────────────────────────────────────────

  @property({ tooltip: 'Chest entry start Y (off-screen bottom, GDD: 1044)' })
  public entryStartY: number = 1044;

  @property({ tooltip: 'Chest land Y (center-screen, GDD: 422)' })
  public landY: number = 422;

  @property({ tooltip: 'Entry duration in seconds (GDD: 0.6)' })
  public entryDuration: number = 0.6;

  @property({ tooltip: 'Float amplitude in px (GDD: 8)' })
  public floatAmplitude: number = 8;

  @property({ tooltip: 'Float period in seconds (GDD: 2.0)' })
  public floatPeriod: number = 2.0;

  @property({ tooltip: 'Overshoot amount in px for bounce effect (GDD: 10)' })
  public overshootPx: number = 10;

  // ─── State ──────────────────────────────────────────────────────────────────

  private _floatTime: number = 0;
  private _isFloating: boolean = false;
  private _unsub: (() => void) | null = null;

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  onLoad() {
    // this._unsub = GlobalEventBus.subscribe(EVT_GAME_FREEZE, () => {
      // GameController will activate this node; onEnable handles the rest
    // });
  }

  onEnable() {
    this._isFloating = false;
    this._floatTime = 0;

    // Position chest off-screen at entry start
    const pos = this.node.position.clone();
    pos.y = this.entryStartY;
    this.node.setPosition(pos);

    // Start fly-in animation
    this._flyIn();
  }

  update(dt: number) {
    if (!this._isFloating) return;

    this._floatTime += dt;

    // Sine wave oscillation: y = landY + sin(2π * t / period) * amplitude
    const pos = this.node.position.clone();
    pos.y = this.landY + Math.sin((2 * Math.PI * this._floatTime) / this.floatPeriod) * this.floatAmplitude;
    this.node.setPosition(pos);
  }

  onDestroy() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  // ─── Fly-in animation ────────────────────────────────────────────────────────

  /**
   * Cubic-bezier bounce: fly to overshoot position, then settle to landY.
   * Simulates GDD §4 "cubic-bezier bounce (overshoot 10 px, settle back)".
   */
  private _flyIn(): void {
    const startPos = new Vec3(this.node.position.x, this.entryStartY, this.node.position.z);
    const overshootPos = new Vec3(this.node.position.x, this.landY - this.overshootPx, this.node.position.z);
    const landPos = new Vec3(this.node.position.x, this.landY, this.node.position.z);

    // Phase 1: fly from off-screen to overshoot (90% of duration)
    // Phase 2: settle from overshoot to land (10% of duration)
    const phase1Duration = this.entryDuration * 0.85;
    const phase2Duration = this.entryDuration * 0.15;

    this.node.setPosition(startPos);

    tween(this.node)
      .to(phase1Duration, { position: overshootPos }, { easing: 'cubicOut' })
      .to(phase2Duration, { position: landPos }, {
        easing: 'sineOut',
        onComplete: () => {
          // Play chest land sound
          // GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'sfx_chest_land' });

          // Start idle float
          this._isFloating = true;
          this._floatTime = 0;
        },
      })
      .start();
  }
}
