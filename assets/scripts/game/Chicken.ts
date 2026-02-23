import { _decorator, Component, Node, Animation, AnimationState, tween, Vec3, Button } from 'cc';
import { LuksManager } from './LuksManager';
import { Luk } from './Luk';
import { BalanceController } from './BalanceController';
import { ProgressBar } from './ProgressBar';
import { BariersController } from './BariersController';
import { ChickenCar } from './ChickenCar';
import { CarsController } from './CarsController';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND } from '../common/events';
import super_html from '../super_html/super_html_playable';

const { ccclass, property } = _decorator;

/**
 * Chicken controls the chicken character and its jumps between hatches (luks).
 */
@ccclass('Chicken')
export class Chicken extends Component {
  @property(CarsController)
  private carsController: CarsController = null;

  @property(Animation)
  private animation: Animation = null;

  @property(LuksManager)
  private luksManager: LuksManager = null;

  @property(BalanceController)
  private balanceController: BalanceController = null;

  @property(ProgressBar)
  private progressBar: ProgressBar = null;

  @property(BariersController)
  private bariersController: BariersController = null;

  @property(ChickenCar)
  private chickenCar: ChickenCar = null;

  @property(Button)
  private goButton: Button = null;

  @property(Node)
  private endScreen: Node = null;

  @property(Node)
  private bonusPopup: Node = null;

  @property({
    type: Node,
    tooltip: 'EndCard (win) screen root node to show on completion',
  })
  private endCardScreen: Node = null;

  @property({
    tooltip: 'Zero-based luk index at which the game freezes and shows EndCard (fourth step = 3)',
  })
  private endCardLukIndex: number = 3;

  @property({
    tooltip: 'Jump duration in seconds',
  })
  private jumpDuration: number = 0.5;

  @property({
    tooltip: 'Jump arc height',
  })
  private jumpArcHeight: number = 100;

  @property({
    tooltip: 'Death luk index (guaranteed death hatch). Third luk = 2',
  })
  private deathLukIndex: number = 2;

  // Current luk index (-1 at game start)
  private currentLukIndex: number = -1;

  // Flag to prevent multiple jumps
  private isJumping: boolean = false;

  // Flag that controls are disabled (chicken is on the death luk)
  private isControlDisabled: boolean = false;

  // Cached Vec3 for reuse (memory optimization)
  private readonly _tempVec3_1: Vec3 = new Vec3();
  private readonly _tempVec3_2: Vec3 = new Vec3();
  private readonly _tempVec3_3: Vec3 = new Vec3();
  private readonly _tempVec3_4: Vec3 = new Vec3();

  // Animation cache (avoid repeated lookups)
  private _jumpAnimationState: AnimationState = null;
  private _idleAnimationState: AnimationState = null;
  private _animationsCached: boolean = false;

  /**
   * Initialization on start
   */
  start() {
    // Ensure Animation component reference exists
    if (!this.animation) {
      this.animation = this.getComponent(Animation);
    }

    // Cache animation states
    this.cacheAnimationStates();

    // Play idle animation on start
    if (this.animation) {
      this.playIdleAnimation();
    }

    // Deactivate endScreen (FailScreen) at start regardless of editor state
    if (this.endScreen) {
      this.endScreen.active = false;
    }

    if(this.bonusPopup){
      this.bonusPopup.active = false;
    }
  }

  /**
   * Cache animation states for performance
   */
  private cacheAnimationStates(): void {
    if (!this.animation || this._animationsCached) {
      return;
    }

    this._jumpAnimationState = this.animation.getState('chicken_jump');
    this._idleAnimationState = this.animation.getState('chicken_idle');
    this._animationsCached = true;
  }

  /**
   * Jump the chicken to the next luk
   */
  public jump(): void {
    // Prevent double jump
    if (this.isJumping) {
      return;
    }

    // Ignore input if control is disabled (on death luk)
    if (this.isControlDisabled) {
      return;
    }

    // Play button click sound at jump start
    GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'button_click' });

    // Ensure luks manager exists
    if (!this.luksManager) {
      return;
    }

    // Compute next luk index
    const nextLukIndex = this.currentLukIndex + 1;

    // Get next luk
    const nextLuk = this.luksManager.getLuk(nextLukIndex);

    if (!nextLuk) {
      return;
    }

    // Set jumping flag
    this.isJumping = true;

    // Play jump animation
    this.playJumpAnimation(() => {
      // Return to idle after jump finishes
      this.playIdleAnimation();
    });

    // Move chicken to the next luk
    this.moveToLuk(nextLuk, nextLukIndex);
  }

  /**
   * Play jump animation
   * @param onComplete Callback after animation ends
   */
  private playJumpAnimation(onComplete?: () => void): void {
    if (!this.animation) {
      if (onComplete) onComplete();
      return;
    }

    // Use cached animation state
    if (!this._jumpAnimationState) {
      this.cacheAnimationStates();
      if (!this._jumpAnimationState) {
        if (onComplete) onComplete();
        return;
      }
    }

    // Stop current animations
    this.animation.stop();

    // Play jump
    this.animation.play('chicken_jump');

    // Schedule callback roughly at animation end
    if (onComplete) {
      this.scheduleOnce(() => {
        onComplete();
      }, this._jumpAnimationState.duration);
    }
  }

  /**
   * Play idle animation
   */
  private playIdleAnimation(): void {
    if (!this.animation) {
      return;
    }

    this.animation.stop();
    this.animation.play('chicken_idle');
  }

  /**
   * Move the chicken to the specified luk
   * @param luk Target luk
   * @param lukIndex Luk index
   */
  private moveToLuk(luk: Luk, lukIndex: number): void {
    if (!luk || !luk.node) {
      this.isJumping = false;
      return;
    }

    // Get world positions
    Vec3.copy(this._tempVec3_1, luk.node.worldPosition);

    // Convert luk world position to chicken's local space
    const chickenParent = this.node.parent;

    if (chickenParent) {
      // With a parent, convert world to local
      chickenParent.inverseTransformPoint(this._tempVec3_2, this._tempVec3_1);
    } else {
      // No parent: use world coordinates as-is
      Vec3.copy(this._tempVec3_2, this._tempVec3_1);
    }

    // Current local position
    const currentPosition = this.node.getPosition();

    // New position: change only X
    Vec3.set(this._tempVec3_3, this._tempVec3_2.x, currentPosition.y, currentPosition.z);

    // Mid-point of arc
    Vec3.set(
      this._tempVec3_4,
      (currentPosition.x + this._tempVec3_3.x) / 2, // Mid between current and target
      currentPosition.y + this.jumpArcHeight, // Raise to arc height
      currentPosition.z,
    );

    // Animate arc jump with two tweens
    tween(this.node)
      // First half — rise to arc peak
      .to(
        this.jumpDuration / 2,
        { position: this._tempVec3_4 },
        {
          easing: 'linear', // Linear ascent
        },
      )
      // Second half — descend to target
      .to(
        this.jumpDuration / 2,
        { position: this._tempVec3_3 },
        {
          easing: 'linear', // Linear descent
          onComplete: () => {
            // Update current luk index
            this.currentLukIndex = lukIndex;

            // Clear jumping flag
            this.isJumping = false;

            // Get luk reward amount
            const lukAmount = luk.getAmount();

            // Add to balance if controller exists
            if (this.balanceController && lukAmount > 0) {
              this.balanceController.addBalance(lukAmount);
            }

            // Update progress bar if present
            if (this.progressBar) {
              this.progressBar.updateProgress(lukIndex);
            }

            // Show barrier for this index (except death luk)
            if (this.bariersController && lukIndex !== this.deathLukIndex) {
              this.bariersController.showBarier(lukIndex);
            }

            // Notify luk that chicken reached it
            luk.onChickenReached(); 

            // If reached the EndCard luk (e.g., fourth step), freeze and show EndCard
            if (lukIndex === this.endCardLukIndex) {
              this.triggerEndCard();
              return;
            }
            // Check death luk
            if (lukIndex === this.deathLukIndex) {
              this.triggerDeath();
            }
          },
        },
      )
      .start();
  }

  public showBonusPopup(): void {
    GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'button_click' });
    this.BonusPopupShow();
  }

  private BonusPopupShow(): void {
    super_html.game_end();
    if(this.bonusPopup){
      this.endCardScreen.active = false;
      this.bonusPopup.active = true;
    }
  }

  /**
   * Trigger death sequence on the death luk:
   * - Disable controls (GO button)
   * - Boost a car to guarantee collision
   */
  private triggerDeath(): void {
    // Disable controls
    this.isControlDisabled = true;
    this.isJumping = true; // Block further jumps

    // Disable GO button
    if (this.goButton) {
      this.goButton.interactable = false;
    }

    // Boost car on this lane to ensure collision
    if (this.carsController) {
      this.carsController.boostCarForDeath(this.deathLukIndex, () => {
        this.onChickenHitByCar();
      });
    } else {
      // Fallback: if no CarsController, call collision after a short delay
      this.scheduleOnce(() => {
        this.onChickenHitByCar();
      }, 0.5);
    }
  }

  /**
   * Called when the car hits the chicken
   */
  private onChickenHitByCar(): void {
    // Fire game_end
    super_html.game_end();

    // Enable FailScreen (car_destroy sound is played inside FailScreen.show())
    if (this.endScreen) {
      this.endScreen.active = true;
    }
  }

  /**
   * Freezes gameplay and shows the EndCard screen (win flow).
   */
  private triggerEndCard(): void {
    // Disable controls and further jumps
    this.isControlDisabled = true;
    this.isJumping = true;

    // Disable GO button
    if (this.goButton) {
      this.goButton.interactable = false;
    }

    // Stop cars
    if (this.carsController) {
      this.carsController.stopAllCars();
    }

    // Optionally stop ChickenCar visuals/movement
    if (this.chickenCar) {
      this.chickenCar.reset();
    }

    // Analytics end signal
    super_html.game_end();

    // Show EndCard screen
    if (this.endCardScreen) {
      this.endCardScreen.active = true;
    }
  }

  /**
   * Get current luk index
   */
  public getCurrentLukIndex(): number {
    return this.currentLukIndex;
  }

  /**
   * Is the chicken currently jumping
   */
  public getIsJumping(): boolean {
    return this.isJumping;
  }

  /**
   * Reset chicken state (e.g. for game restart)
   */
  public reset(): void {
    this.currentLukIndex = -1;
    this.isJumping = false;
    this.isControlDisabled = false;

    // Stop all tweens on the node
    tween(this.node).stop();

    // Return to idle animation
    if (this.animation) {
      this.playIdleAnimation();
    }

    // Reset all barriers
    if (this.bariersController) {
      this.bariersController.reset();
    }

    // Reset ChickenCar
    if (this.chickenCar) {
      this.chickenCar.reset();
    }
  }
}
