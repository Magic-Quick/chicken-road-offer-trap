import { _decorator, Component, UIOpacity, tween, UITransform, view, Size } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('DarkenOverlay')
export class DarkenOverlay extends Component {

  @property
  fadeDuration: number = 0.4;

  @property
  targetOpacity: number = 0.72;

  private _uiOpacity: UIOpacity = null!;
  private _uiTransform: UITransform = null!;
  private _resizeCallback: () => void;

  onLoad() {

    this._uiTransform = this.getComponent(UITransform)!;

    this._resizeCallback = this._resizeToScreen.bind(this);

  }

  onEnable() {

    this._resizeToScreen();

    view.on('canvas-resize', this._resizeCallback, this);

    this._fadeIn();

  }

  onDisable() {

    view.off('canvas-resize', this._resizeCallback, this);

  }

  private _resizeToScreen() {

    const visibleSize: Size = view.getVisibleSize();

    this._uiTransform.setContentSize(
      visibleSize.width,
      visibleSize.height
    );

    // ensure centered
    this.node.setPosition(0, 0, 0);

  }

  private _fadeIn() {

    this._uiOpacity = this.getComponent(UIOpacity)
      || this.addComponent(UIOpacity);

    this._uiOpacity.opacity = 0;

    tween(this._uiOpacity)
      .to(this.fadeDuration, {
        opacity: Math.round(this.targetOpacity * 255)
      })
      .start();

  }

}