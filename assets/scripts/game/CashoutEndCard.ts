import {
  _decorator,
  Component,
  Node,
  Button,
  UIOpacity,
  tween,
  Vec3
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CashoutEndCard')
export class CashoutEndCard extends Component {

  @property(Node)
  public takeButtonNode: Node | null = null;

  @property(Node)
  public riskButtonNode: Node | null = null;

  @property
  public fadeInDuration: number = 0.3;

  @property
  public glowPeriod: number = 1.2;

  private _tempScale: Vec3 = new Vec3();

  private _glowTime = 0;
  private _isGlowing = false;

  private _takeUiOpacity: UIOpacity | null = null;
  private _riskUiOpacity: UIOpacity | null = null;

  // ─────────────────────────────

  onEnable() {

    this._showButtons();

  }

  update(dt: number) {

    if (!this._isGlowing || !this.takeButtonNode) return;

    this._glowTime += dt;

    const ratio =
      (Math.sin((2 * Math.PI * this._glowTime) / this.glowPeriod) + 1) * 0.5;

    const scaleVal =
      1 + ratio * 0.04;

    this._tempScale.set(scaleVal, scaleVal, 1);

    this.takeButtonNode.setScale(this._tempScale);

  }

  // ─────────────────────────────
  // Button handlers
  // ─────────────────────────────

  public onTakeButtonTapped(): void {

    if (!this.takeButtonNode) {
      this._triggerRedirect();
      return;
    }

    tween(this.takeButtonNode)
      .to(0.08, { scale: new Vec3(0.95, 0.95, 1) })
      .to(0.08, { scale: new Vec3(1, 1, 1) })
      .call(() => this._triggerRedirect())
      .start();

  }

  public onRiskButtonTapped(): void {

    if (!this._riskUiOpacity) {
      this._triggerRedirect();
      return;
    }

    tween(this._riskUiOpacity)
      .to(0.08, { opacity: 204 })
      .to(0.08, { opacity: 255 })
      .call(() => this._triggerRedirect())
      .start();

  }

  // ─────────────────────────────

  private _showButtons(): void {

    this._isGlowing = false;
    this._glowTime = 0;

    this._takeUiOpacity =
      this._getOrAddUIOpacity(this.takeButtonNode);

    this._riskUiOpacity =
      this._getOrAddUIOpacity(this.riskButtonNode);

    if (this._takeUiOpacity)
      this._takeUiOpacity.opacity = 0;

    if (this._riskUiOpacity)
      this._riskUiOpacity.opacity = 0;

    if (this._takeUiOpacity) {

      tween(this._takeUiOpacity)
        .to(this.fadeInDuration, { opacity: 255 })
        .call(() => {

          this._isGlowing = true;

        })
        .start();

    }

    if (this._riskUiOpacity) {

      tween(this._riskUiOpacity)
        .to(this.fadeInDuration, { opacity: 255 })
        .start();

    }

    this._wireButtons();

  }

  private _wireButtons(): void {

    if (this.takeButtonNode) {

      const btn =
        this.takeButtonNode.getComponent(Button);

      btn?.node.off(Button.EventType.CLICK, this.onTakeButtonTapped, this);

      btn?.node.on(Button.EventType.CLICK, this.onTakeButtonTapped, this);

    }

    if (this.riskButtonNode) {

      const btn =
        this.riskButtonNode.getComponent(Button);

      btn?.node.off(Button.EventType.CLICK, this.onRiskButtonTapped, this);

      btn?.node.on(Button.EventType.CLICK, this.onRiskButtonTapped, this);

    }

  }

  private _triggerRedirect(): void {

    this._isGlowing = false;

    console.log("Redirect to store");

    // playable ads redirect here

  }

  private _getOrAddUIOpacity(node: Node | null): UIOpacity | null {

    if (!node) return null;

    return node.getComponent(UIOpacity)
      || node.addComponent(UIOpacity);

  }

}