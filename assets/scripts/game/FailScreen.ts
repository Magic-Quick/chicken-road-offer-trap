import { _decorator, Component, Node, Label, Sprite, tween, Vec3, UIOpacity, Color } from 'cc';
import { BalanceController } from './BalanceController';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND, EVT_PLAY_SOUND_LOOP } from '../common/events';
import { FollowCameraX } from './FollowCameraX';
import super_html from '../super_html/super_html_playable';
const { ccclass, property } = _decorator;

/**
 * FailScreen — loss screen sequence.
 * Visual sequence:
 * 1) Screen shake (camera)
 * 2) Red blackout fade-in
 * 3) Balance reset
 * 4) "LOSER!" label appears
 * 5) Pulsing "TRY AGAIN" button → click goes to store
 */
@ccclass('FailScreen')
export class FailScreen extends Component {
  @property({
    type: Node,
    tooltip: 'Blackout — full-screen colored overlay (Sprite)',
  })
  public blackout: Node = null;

  @property({
    type: Node,
    tooltip: 'Loser Label — node with "LOSER!" text',
  })
  public loserLabel: Node = null;

  @property({
    type: Node,
    tooltip: 'TryAgain — TRY AGAIN button',
  })
  public tryAgainButton: Node = null;

  @property({
    type: Node,
    tooltip: 'Finger — pointer to action',
  })
  public finger: Node = null;

  @property(BalanceController)
  public balanceController: BalanceController = null;

  @property({
    type: Node,
    tooltip: 'Camera — camera node used for screen shake',
  })
  public cameraNode: Node = null;

  @property({
    tooltip: 'Screen shake duration (sec)',
  })
  private shakeDuration: number = 0.6;

  @property({
    tooltip: 'Shake intensity (pixels)',
  })
  private shakeIntensity: number = 25;

  @property({
    tooltip: 'Delay before showing LOSER after blackout (sec)',
  })
  private loserDelay: number = 0.3;

  @property({
    tooltip: 'Blackout fade-in duration (sec)',
  })
  private blackoutFadeDuration: number = 0.4;

  @property({
    tooltip: 'LOSER appear duration (sec)',
  })
  private loserAppearDuration: number = 0.4;

  @property({
    tooltip: 'Delay before showing TRY AGAIN (sec)',
  })
  private tryAgainDelay: number = 0.5;

  // Saved original camera position to restore after shake
  private cameraOriginalPos: Vec3 = new Vec3();

  // Flag that show() is already in progress (avoid double-call from onEnable)
  private isShowing: boolean = false;

  // Reference to FollowCameraX to temporarily disable during shake
  private followCameraX: FollowCameraX = null;

  /**
   * Start full FailScreen sequence.
   * Is automatically called from onEnable() when node activates.
   */
  public show(): void {
    if (this.isShowing) return;
    this.isShowing = true;

    // Node is already active (show is called from onEnable)
    this.node.active = true;

    // Play dead chicken sound
    GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'dead_chicken' });

    // Hide children before animation
    if (this.blackout) this.blackout.active = false;
    if (this.loserLabel) this.loserLabel.active = false;
    if (this.tryAgainButton) this.tryAgainButton.active = false;
    if (this.finger) this.finger.active = false;

    // Cache FollowCameraX to disable during shake
    this.followCameraX = this.cameraNode ? this.cameraNode.getComponent(FollowCameraX) : null;

    // 1) Screen Shake (camera)
    this.screenShake(() => {
      // 2) Red Blackout fade-in
      this.showRedBlackout(() => {
        // 3) Reset balance
        this.resetBalance();

          // 4) Show LOSER! after a delay
        this.scheduleOnce(() => {
          this.showLoserLabel();

            // 5) Show TRY AGAIN button
          this.scheduleOnce(() => {
            this.showTryAgainButton();
          }, this.tryAgainDelay);
        }, this.loserDelay);
      });
    });
  }

  /**
   * Called when node is enabled.
   * When enabled via node.active = true — auto-runs show().
   */
  onEnable() {
    // Use setTimeout to ensure show() runs after full activation & lifecycle.
    if (!this.isShowing) {
      setTimeout(() => {
        if (this.node && this.node.active && !this.isShowing) {
          this.show();
        }
      }, 0);
    }
  }

  /** Screen shake */
  private screenShake(onComplete?: () => void): void {
    if (!this.cameraNode) {
      if (onComplete) onComplete();
      return;
    }

    // Temporarily disable FollowCameraX so shake isn't overwritten
    if (this.followCameraX) {
      this.followCameraX.enabled = false;
    }

    const shakeCount = 14;
    const interval = this.shakeDuration / shakeCount;

    Vec3.copy(this.cameraOriginalPos, this.cameraNode.position);

    this.performShake(shakeCount, interval, 0, onComplete);
  }

  /** Recursive camera shake */
  private performShake(totalSteps: number, interval: number, currentStep: number, onComplete?: () => void): void {
    if (currentStep >= totalSteps) {
      // Restore camera position
      this.cameraNode.setPosition(this.cameraOriginalPos);
      // Re-enable FollowCameraX
      if (this.followCameraX) {
        this.followCameraX.enabled = true;
      }
      if (onComplete) onComplete();
      return;
    }

    const decay = 1 - currentStep / totalSteps;
    const offsetX = (Math.random() * 2 - 1) * this.shakeIntensity * decay;
    const offsetY = (Math.random() * 2 - 1) * this.shakeIntensity * decay;

    this.cameraNode.setPosition(this.cameraOriginalPos.x + offsetX, this.cameraOriginalPos.y + offsetY, this.cameraOriginalPos.z);

    this.scheduleOnce(() => {
      this.performShake(totalSteps, interval, currentStep + 1, onComplete);
    }, interval);
  }

  /** Show red blackout with fade-in */
  private showRedBlackout(onComplete?: () => void): void {
    if (!this.blackout) {
      if (onComplete) onComplete();
      return;
    }

    this.blackout.active = true;

    // Set red color on Sprite
    const sprite = this.blackout.getComponent(Sprite);
    if (sprite) {
      sprite.color = new Color(180, 0, 0, 255);
    }

    // Fade-in via UIOpacity
    let uiOpacity = this.blackout.getComponent(UIOpacity);
    if (!uiOpacity) {
      uiOpacity = this.blackout.addComponent(UIOpacity);
    }
    uiOpacity.opacity = 0;

    tween(uiOpacity)
      .to(this.blackoutFadeDuration, { opacity: 220 }, { easing: 'sineOut' })
      .call(() => {
        if (onComplete) onComplete();
      })
      .start();
  }

  /** Reset balance */
  private resetBalance(): void {
    if (this.balanceController) {
      this.balanceController.setBalance(0);
    }
  }

  /** Show LOSER label with animation and sound */
  private showLoserLabel(): void {
    if (!this.loserLabel) return;

    // Set label text
    const label = this.loserLabel.getComponent(Label);
    // if (label) {
    //   label.string = 'LOSER!';
    //   label.color = new Color(255, 50, 50, 255);
    // }

    // Set scale=0 BEFORE activation to avoid flicker
    this.loserLabel.setScale(Vec3.ZERO);
    this.loserLabel.active = true;

    // Looping fail sound
    GlobalEventBus.publish({ type: EVT_PLAY_SOUND_LOOP, soundType: 'fail_chicken' });

    // Appear animation: scale 0 → 1 with backOut (pop-out)
    tween(this.loserLabel)
      .to(this.loserAppearDuration, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .call(() => {
        // Start LOSER label pulsing
        this.startLoserPulse();
      })
      .start();
  }

  /** Pulse the LOSER label */
  private startLoserPulse(): void {
    if (!this.loserLabel) return;

    tween(this.loserLabel)
      .to(0.5, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineInOut' })
      .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
  }

  /** Show TRY AGAIN button with pulsing and finger */
  private showTryAgainButton(): void {
    // game_end — end-of-game signal for analytics
    super_html.game_end();

    if (this.tryAgainButton) {
      // Set button label text
      const label = this.tryAgainButton.getComponentInChildren(Label);
      if (label) {
        label.string = 'TRY AGAIN';
      }

      // Set scale=0 BEFORE activation
      this.tryAgainButton.setScale(Vec3.ZERO);
      this.tryAgainButton.active = true;

      // Appear animation
      tween(this.tryAgainButton)
        .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .call(() => {
          // Start button pulse
          this.startButtonPulse();
        })
        .start();
    }

    // Show finger
    if (this.finger) {
      this.finger.active = true;
    }
  }

  /** Pulse animation for TRY AGAIN button */
  private startButtonPulse(): void {
    if (!this.tryAgainButton) return;

    tween(this.tryAgainButton)
      .to(0.4, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' })
      .to(0.4, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
  }

  /** TRY AGAIN click handler — open store page */
  public onTryAgainClicked(): void {
    super_html.download();
  }
}
