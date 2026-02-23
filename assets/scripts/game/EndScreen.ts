import { _decorator, Component, Node, Label, tween, Vec3, UITransform, director, UIOpacity } from 'cc';
import { Egg, EggType } from './Egg';
import { BalanceController } from './BalanceController';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND } from '../common/events';
import super_html from '../super_html/super_html_playable';
const { ccclass, property } = _decorator;

/**
 * EndScreen controls the end-of-game screen.
 * It tracks opening all eggs and applies rewards in order:
 * 1) Fixed egg — adds a fixed amount
 * 2) Percent egg — adds a percent of current balance
 * 3) Multiplier egg — multiplies the balance
 */
@ccclass('EndScreen')
export class EndScreen extends Component {
  @property(Egg)
  public fixedEgg: Egg = null;

  @property(Egg)
  public percentEgg: Egg = null;

  @property(Egg)
  public multiplierEgg: Egg = null;

  @property(BalanceController)
  public balanceController: BalanceController = null;

  @property(Node)
  public balanceNode: Node = null;

  @property({
    type: Node,
    tooltip: 'Canvas (parent node for flying rewards)',
  })
  public canvas: Node = null;

  @property({
    type: Node,
    tooltip: 'WinPanel - victory panel',
  })
  public winPanel: Node = null;

  @property({
    type: Label,
    tooltip: 'Label to display final balance on WinPanel',
  })
  public winRewardLabel: Label = null;

  @property({
    tooltip: 'Reward flight duration to balance (seconds)',
  })
  private flyDuration: number = 1.0;

  @property({
    tooltip: 'EndScreen fade-in duration (seconds)',
  })
  private endScreenFadeDuration: number = 0.5;

  @property({
    tooltip: 'WinPanel appear animation duration (seconds)',
  })
  private winPanelAnimationDuration: number = 0.5;

  @property({
    tooltip: 'Delay between processing eggs (seconds)',
  })
  private delayBetweenEggs: number = 0.5;

  @property({
    tooltip: 'Delay before reward processing after all eggs are opened (seconds)',
  })
  private delayBeforeProcessing: number = 1.0;

  // Egg open flags
  private fixedEggOpened: boolean = false;
  private percentEggOpened: boolean = false;
  private multiplierEggOpened: boolean = false;

  // Flag that rewards have been processed
  private rewardsProcessed: boolean = false;

  // Cached Vec3 for optimization
  private readonly _tempVec3: Vec3 = new Vec3();
  private readonly _tempVec3Scale: Vec3 = new Vec3();

  /**
   * Initialization on start
   */
  start() {
    this.resetState();

    // Hide WinPanel at start
    if (this.winPanel) {
      this.winPanel.active = false;
      this.winPanel.setScale(Vec3.ZERO);
    }
  }

  /**
   * Called when the node is enabled
   */
  onEnable() {
    // Smoothly fade-in EndScreen
    this.fadeIn();
  }

  /**
   * Fade-in EndScreen
   */
  private fadeIn(): void {
    // Get or add UIOpacity to the EndScreen node
    let uiOpacity = this.node.getComponent(UIOpacity);
    if (!uiOpacity) {
      uiOpacity = this.node.addComponent(UIOpacity);
    }

    // Start opacity at 0
    uiOpacity.opacity = 0;

    // Fade animation: opacity 0 → 255
    tween(uiOpacity)
      .to(
        this.endScreenFadeDuration,
        { opacity: 255 },
        {
          easing: 'sineOut', // Smooth appear
        },
      )
      .start();
  }

  /**
   * Reset EndScreen state
   */
  public resetState(): void {
    this.fixedEggOpened = false;
    this.percentEggOpened = false;
    this.multiplierEggOpened = false;
    this.rewardsProcessed = false;
  }

  /**
   * Called when an egg is opened
   * @param egg Egg that was opened
   */
  public onEggOpened(egg: Egg): void {
    if (!egg) {
      return;
    }

    // Determine egg type and set corresponding flag
    const eggType = egg.getEggType();

    switch (eggType) {
      case EggType.FIXED:
        this.fixedEggOpened = true;
        break;
      case EggType.PERCENT:
        this.percentEggOpened = true;
        break;
      case EggType.MULTIPLIER:
        this.multiplierEggOpened = true;
        break;
    }

    // Check if all eggs are opened
    this.checkAllEggsOpened();
  }

  /**
   * Checks if all eggs are open and starts reward processing
   */
  private checkAllEggsOpened(): void {
    // If all eggs are open and rewards not yet processed
    if (this.fixedEggOpened && this.percentEggOpened && this.multiplierEggOpened && !this.rewardsProcessed) {
      this.rewardsProcessed = true;

      // Add a delay before processing to let the last animation finish
      this.scheduleOnce(() => {
        this.processRewards();
      }, this.delayBeforeProcessing);
    }
  }

  /**
   * Process rewards in order
   */
  private processRewards(): void {
    // Sequence: Fixed → Percent → Multiplier
    this.processFixedEgg(() => {
      this.scheduleOnce(() => {
        this.processPercentEgg(() => {
          this.scheduleOnce(() => {
            this.processMultiplierEgg();
          }, this.delayBetweenEggs);
        });
      }, this.delayBetweenEggs);
    });
  }

  /**
   * Process Fixed Egg
   * @param onComplete Callback after completion
   */
  private processFixedEgg(onComplete?: () => void): void {
    if (!this.fixedEgg || !this.fixedEgg.rewardLabel || !this.balanceController) {
      if (onComplete) onComplete();
      return;
    }

    const rewardValue = this.fixedEgg.getRewardValue();

    this.flyRewardToBalance(this.fixedEgg.rewardLabel.node, () => {
      // Add fixed amount to balance
      this.balanceController.addBalance(rewardValue);

      if (onComplete) onComplete();
    });
  }

  /**
   * Process Percent Egg
   * @param onComplete Callback after completion
   */
  private processPercentEgg(onComplete?: () => void): void {
    if (!this.percentEgg || !this.percentEgg.rewardLabel || !this.balanceController) {
      if (onComplete) onComplete();
      return;
    }

    const percentValue = this.percentEgg.getRewardValue();
    const currentBalance = this.balanceController.getBalance();

    this.flyRewardToBalance(this.percentEgg.rewardLabel.node, () => {
      // Add percent of current balance
      const bonusAmount = currentBalance * (percentValue / 100);
      this.balanceController.addBalance(bonusAmount);

      if (onComplete) onComplete();
    });
  }

  /**
   * Process Multiplier Egg
   * @param onComplete Callback after completion
   */
  private processMultiplierEgg(onComplete?: () => void): void {
    if (!this.multiplierEgg || !this.multiplierEgg.rewardLabel || !this.balanceController) {
      if (onComplete) onComplete();
      return;
    }

    const multiplierValue = this.multiplierEgg.getRewardValue();
    const currentBalance = this.balanceController.getBalance();

    this.flyRewardToBalance(this.multiplierEgg.rewardLabel.node, () => {
      // Multiply current balance
      const newBalance = currentBalance * multiplierValue;
      this.balanceController.setBalance(newBalance);

      // After last egg, show WinPanel
      this.scheduleOnce(() => {
        this.showWinPanel();
      }, 0.3);

      if (onComplete) onComplete();
    });
  }

  /**
   * Animate reward flight to balance with a parabolic trajectory
   * @param rewardLabelNode Node that displays reward text
   * @param onComplete Callback after animation ends
   */
  private flyRewardToBalance(rewardLabelNode: Node, onComplete?: () => void): void {
    if (!rewardLabelNode || !this.balanceNode || !this.canvas) {
      if (onComplete) onComplete();
      return;
    }

    // Play reward flight sound
    GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'fly_bonus' });

    // Target world position — balance node
    const targetWorldPos = new Vec3();
    Vec3.copy(targetWorldPos, this.balanceNode.worldPosition);

    // Current world position of reward label
    const currentWorldPos = new Vec3();
    Vec3.copy(currentWorldPos, rewardLabelNode.worldPosition);

    // Current world scale
    const currentWorldScale = new Vec3();
    Vec3.copy(currentWorldScale, rewardLabelNode.worldScale);

    // Arc height is 30% of the distance between points
    const distance = Vec3.distance(currentWorldPos, targetWorldPos);
    const arcHeight = distance * 0.3;

    // Reparent to Canvas for consistent coordinate space
    rewardLabelNode.removeFromParent();
    this.canvas.addChild(rewardLabelNode);

    // Restore world position/scale under new parent
    rewardLabelNode.setWorldPosition(currentWorldPos);
    rewardLabelNode.setWorldScale(currentWorldScale);

    // Save initial angle
    const startAngle = rewardLabelNode.angle;

    // Parallel tween for parabolic flight, scaling and rotation
    tween(rewardLabelNode)
      .parallel(
        // Parabolic trajectory
        tween().to(
          this.flyDuration,
          {},
          {
            easing: 'sineInOut',
            onUpdate: (target: any, ratio: number) => {
              // Lerp X and Y
              const pos = new Vec3();
              Vec3.lerp(pos, currentWorldPos, targetWorldPos, ratio);

              // Add parabola offset (peak at the middle)
              const parabola = 4 * arcHeight * ratio * (1 - ratio);
              pos.y += parabola;

              rewardLabelNode.setWorldPosition(pos);
            },
          },
        ),
        // Dynamic scale: increase then decrease
        tween().to(
          this.flyDuration,
          {},
          {
            easing: 'sineInOut',
            onUpdate: (target: any, ratio: number) => {
              // First grow to 120%, then shrink to 0
              let scaleMultiplier: number;
              if (ratio < 0.3) {
                // First 30% — grow
                scaleMultiplier = 1 + (ratio / 0.3) * 0.2;
              } else {
                // Then smoothly shrink to 0
                scaleMultiplier = 1.2 * (1 - (ratio - 0.3) / 0.7);
              }

              const scale = new Vec3();
              Vec3.multiplyScalar(scale, currentWorldScale, scaleMultiplier);
              rewardLabelNode.setWorldScale(scale);
            },
          },
        ),
        // Rotation (2 full turns)
        tween().to(
          this.flyDuration,
          {},
          {
            easing: 'linear',
            onUpdate: (target: any, ratio: number) => {
              rewardLabelNode.angle = startAngle + 720 * ratio;
            },
          },
        ),
      )
      .call(() => {
        // Destroy label node after animation ends
        rewardLabelNode.destroy();

        if (onComplete) onComplete();
      })
      .start();
  }

  /**
   * Force processing rewards (for testing)
   */
  public forceProcessRewards(): void {
    if (!this.rewardsProcessed) {
      this.rewardsProcessed = true;
      this.processRewards();
    }
  }

  /**
   * Are all eggs opened
   */
  public areAllEggsOpened(): boolean {
    return this.fixedEggOpened && this.percentEggOpened && this.multiplierEggOpened;
  }

  /**
   * Are rewards already processed
   */
  public areRewardsProcessed(): boolean {
    return this.rewardsProcessed;
  }

  /**
   * Show WinPanel with animation
   */
  private showWinPanel(): void {
    super_html.game_end();
    if (!this.winPanel) {
      return;
    }

    // Play victory panel sound
    GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'win_panel' });

    // Get and format final balance
    const finalBalance = this.balanceController ? this.balanceController.getBalance() : 0;
    const formattedBalance = this.formatBalance(finalBalance);

    // Set text into RewardLabel
    if (this.winRewardLabel) {
      this.winRewardLabel.string = formattedBalance;
    }

    // Activate WinPanel
    this.winPanel.active = true;

    // Appear animation: scale 0 → 1 with bounce
    Vec3.set(this._tempVec3, 1, 1, 1);

    tween(this.winPanel)
      .to(
        this.winPanelAnimationDuration,
        { scale: this._tempVec3 },
        {
          easing: 'backOut', // Pop-out with slight bounce
        },
      )
      .start();
  }

  /**
   * Format balance like "€13.000" (thousands separated by dot)
   */
  private formatBalance(balance: number): string {
    // Round to integer
    const roundedBalance = Math.round(balance);

    // Convert to string
    let balanceStr = roundedBalance.toString();

    // Add thousands separators (dot)
    balanceStr = balanceStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Add euro sign
    return `€${balanceStr}`;
  }
}
