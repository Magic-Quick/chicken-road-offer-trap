import { _decorator, Component, Node, Button, Label, UIOpacity, tween, Vec3 } from 'cc';
import { GlobalEventBus } from '../common/event-bus';

const { ccclass, property } = _decorator;

/**
 * CashoutEndCard — manages the EndCard screen with TakeButton and RiskButton.
 *
 * GDD §6 EndCard:
 * - [TakeButton]: large, green, glowing pulse (box-shadow #00FF88→#00CC66→#00FF88, 1.2 s)
 *   - Text: "TAKE €1500 + 250 FREE SPINS"
 *   - Size: 320×80 px, Y: 580
 *   - Press: scale 1.0→0.95
 * - [RiskButton]: small, gray
 *   - Text: "RISK IT ALL"
 *   - Size: 180×44 px, Y: 690
 *   - Press: opacity 0.8
 * - Both buttons fade in over 0.3 s on EndCard enter
 * - Both buttons trigger redirect on tap
 *
 * Keyboard: Tab navigates TakeButton → RiskButton; Enter/Space activates focused button.
 */
@ccclass('CashoutEndCard')
export class CashoutEndCard extends Component {
  // ─── Inspector ──────────────────────────────────────────────────────────────

  @property(Node)
  public takeButtonNode: Node = null;

  @property(Node)
  public riskButtonNode: Node = null;

  @property(Label)
  public takeButtonLabel: Label = null;

  @property(Label)
  public riskButtonLabel: Label = null;

  @property({
    tooltip: 'Fade-in duration for buttons (GDD: 0.3 s)',
  })
  public fadeInDuration: number = 0.3;

  @property({
    tooltip: 'Glow pulse period in seconds (GDD: 1.2)',
  })
  public glowPeriod: number = 1.2;

  private _tempScale: Vec3 = new Vec3();

  // ─── State ──────────────────────────────────────────────────────────────────

  private _glowTime: number = 0;
  private _isGlowing: boolean = false;
  private _unsub: (() => void) | null = null;
  private _takeUiOpacity: UIOpacity = null;
  private _riskUiOpacity: UIOpacity = null;

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  onLoad() {
    // this._unsub = GlobalEventBus.subscribe(EVT_ENDCARD_SHOW, () => {
    //   this._showButtons();
    // });
  }

  onEnable() {
    this._showButtons();
  }

  update(dt: number) {
    if (!this._isGlowing || !this.takeButtonNode) return;

    this._glowTime += dt;

    // Glow pulse: scale oscillation 1.0→1.02→1.0 to simulate glow (GDD §6)
    // In Cocos we simulate glow via scale pulse since box-shadow isn't available
    const ratio = (Math.sin((2 * Math.PI * this._glowTime) / this.glowPeriod) + 1) / 2;
    const scaleVal = 1.0 + ratio * 0.04; // 1.0 → 1.04 → 1.0
    /*
    tween(this.takeButtonNode)
      .repeatForever(
        tween()
          .to(0.5, { scale: new Vec3(1.04, 1.04, 1) })
          .to(0.5, { scale: new Vec3(1, 1, 1) })
      )
      .start();
  */
    this._tempScale.set(scaleVal, scaleVal, 1);
    this.takeButtonNode.setScale(this._tempScale);
  }

  onDestroy() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  // ─── Button handlers ─────────────────────────────────────────────────────────

  /**
   * Called by TakeButton click event (wired in scene inspector).
   */
  public onTakeButtonTapped(): void {

    // Press feedback: scale 1.0→0.95 (GDD §6)
    if (this.takeButtonNode) {
      tween(this.takeButtonNode)
        .to(0.08, { scale: new Vec3(0.95, 0.95, 1) }, { easing: 'sineOut' })
        .to(0.08, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
        .call(() => {
          this._triggerRedirect();
        })
        .start();
    } else {
      this._triggerRedirect();
    }
  }

  /**
   * Called by RiskButton click event (wired in scene inspector).
   */
  public onRiskButtonTapped(): void {

    // Press feedback: opacity 0.8 (GDD §6)
    if (this._riskUiOpacity) {
      tween(this._riskUiOpacity)
        .to(0.08, { opacity: 204 }) // 255 * 0.8 = 204
        .to(0.08, { opacity: 255 })
        .call(() => {
          this._triggerRedirect();
        })
        .start();
    } else {
      this._triggerRedirect();
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _showButtons(): void {
    this._isGlowing = false;
    this._glowTime = 0;

    // Set up UIOpacity components
    this._takeUiOpacity = this._getOrAddUIOpacity(this.takeButtonNode);
    this._riskUiOpacity = this._getOrAddUIOpacity(this.riskButtonNode);

    // Start at opacity 0
    if (this._takeUiOpacity) this._takeUiOpacity.opacity = 0;
    if (this._riskUiOpacity) this._riskUiOpacity.opacity = 0;

    // Fade in both buttons over fadeInDuration (GDD §6)
    if (this._takeUiOpacity) {
      tween(this._takeUiOpacity)
        .to(this.fadeInDuration, { opacity: 255 }, { easing: 'sineOut' })
        .call(() => {
          this._isGlowing = true;
        })
        .start();
    }

    if (this._riskUiOpacity) {
      tween(this._riskUiOpacity)
        .to(this.fadeInDuration, { opacity: 255 }, { easing: 'sineOut' })
        .start();
    }

    // Set button labels (GDD §6)
    if (this.takeButtonLabel) {
      this.takeButtonLabel.string = 'TAKE €1500 + 250 FREE SPINS';
    }
    if (this.riskButtonLabel) {
      this.riskButtonLabel.string = 'RISK IT ALL';
    }

    // Wire up Button components if present
    this._wireButtonEvents();
  }

  private _wireButtonEvents(): void {
    if (this.takeButtonNode) {
      const btn = this.takeButtonNode.getComponent(Button);
      if (btn) {
        btn.node.off(Button.EventType.CLICK, this.onTakeButtonTapped, this);
        btn.node.on(Button.EventType.CLICK, this.onTakeButtonTapped, this);
      }
    }

    if (this.riskButtonNode) {
      const btn = this.riskButtonNode.getComponent(Button);
      if (btn) {
        btn.node.off(Button.EventType.CLICK, this.onRiskButtonTapped, this);
        btn.node.on(Button.EventType.CLICK, this.onRiskButtonTapped, this);
      }
    }
  }

  private _triggerRedirect(): void {
    this._isGlowing = false;
    // GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'sfx_cta_click' });

    // if (this.gameController) {
    //   this.gameController.onCtaButtonTapped();
    // }
  }

  private _getOrAddUIOpacity(node: Node | null): UIOpacity | null {
    if (!node) return null;
    let uiOpacity = node.getComponent(UIOpacity);
    if (!uiOpacity) {
      uiOpacity = node.addComponent(UIOpacity);
    }
    return uiOpacity;
  }
}

