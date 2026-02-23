import { _decorator, Component, UIOpacity, tween } from 'cc';

const { ccclass, property } = _decorator;

/**
 * DarkenOverlay — full-screen black rectangle that fades to 0.72 opacity
 * when the Freeze state is entered (GDD §4, §6 Freeze screen).
 *
 * Attach to a full-screen Sprite node with black color.
 * The node should start inactive; GameController activates it on Freeze.
 */
@ccclass('DarkenOverlay')
export class DarkenOverlay extends Component {
  @property({
    tooltip: 'Fade-in duration in seconds (GDD: 0.4)',
  })
  public fadeDuration: number = 0.4;

  @property({
    tooltip: 'Target opacity 0–1 (GDD: 0.72)',
  })
  public targetOpacity: number = 0.72;

  private _uiOpacity: UIOpacity = null;
  private _unsub: (() => void) | null = null;

  onLoad() {
    // this._unsub = GlobalEventBus.subscribe(EVT_GAME_FREEZE, () => {
    //   this._fadeIn();
    // });
  }

  onEnable() {
    // When node becomes active (triggered by GameController), start fade
    this._fadeIn();
  }

  onDestroy() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  private _fadeIn(): void {
    let uiOpacity = this._uiOpacity;
    if (!uiOpacity) {
      uiOpacity = this.node.getComponent(UIOpacity);
      if (!uiOpacity) {
        uiOpacity = this.node.addComponent(UIOpacity);
      }
      this._uiOpacity = uiOpacity;
    }

    // Start from 0 opacity
    uiOpacity.opacity = 0;

    // Target opacity: 0.72 → 255 * 0.72 ≈ 184
    const targetOpacity255 = Math.round(this.targetOpacity * 255);

    tween(uiOpacity)
      .to(this.fadeDuration, { opacity: targetOpacity255 }, { easing: 'linear' })
      .start();
  }
}
