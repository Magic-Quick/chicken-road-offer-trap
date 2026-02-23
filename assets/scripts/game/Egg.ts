import { _decorator, Component, Sprite, Label, Node, tween, Vec3, Enum } from 'cc';
import { EndScreen } from './EndScreen';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND } from '../common/events';

const { ccclass, property } = _decorator;

/**
 * Egg types
 */
export enum EggType {
    /** Fixed reward (€2000) */
    FIXED = 0,
    /** Percent of current balance (e.g., 20%) */
    PERCENT = 1,
    /** Multiplier (e.g., x2) */
    MULTIPLIER = 2
}

/**
 * Egg represents a reward egg.
 * Controls egg sprite, reward label, coins effect, and finger pointer.
 */
@ccclass('Egg')
export class Egg extends Component {
    @property(Sprite)
    public view: Sprite = null;

    @property(Label)
    public rewardLabel: Label = null;

    @property(Node)
    public coinsExpl: Node = null;

    @property(Node)
    public finger: Node = null;

    @property(EndScreen)
    public endScreen: EndScreen = null;

    @property({
            type: Enum(EggType),
            tooltip: 'Egg type (fixed, percent, multiplier)'
    })
    public eggType: EggType = EggType.FIXED;

    @property({
            tooltip: 'Reward value (for fixed — amount, percent — percentage, multiplier — factor)'
    })
    public rewardValue: number = 2000;

    @property({
            tooltip: 'Duration to hide egg view (seconds)'
    })
    private hideViewDuration: number = 0.3;

    @property({
            tooltip: 'Duration to show reward label (seconds)'
    })
    private showLabelDuration: number = 0.4;

    @property({
            tooltip: 'Duration of one reward label pulse cycle (seconds)'
    })
    private pulseDuration: number = 0.8;

    @property({
            tooltip: 'Minimum scale during pulse'
    })
    private pulseScaleMin: number = 0.9;

    @property({
            tooltip: 'Maximum scale during pulse'
    })
    private pulseScaleMax: number = 1.1;

    // Cached Vec3 for reuse
    private readonly _tempVec3: Vec3 = new Vec3();
    private readonly _tempVec3Pulse: Vec3 = new Vec3();

    /** Initialization on start */
    start() {
        this.initializeState();
    }

    /** Initialize child component states */
    private initializeState(): void {
        // Set rewardLabel scale to 0
        if (this.rewardLabel && this.rewardLabel.node) {
            this.rewardLabel.node.setScale(Vec3.ZERO);
        }

        // Disable coins effect
        if (this.coinsExpl) {
            this.coinsExpl.active = false;
        }

        // Update reward text according to type
        this.updateRewardText();
    }

    /** Update reward label text based on egg type */
    private updateRewardText(): void {
        if (!this.rewardLabel) {
            return;
        }

        let rewardText = '';

        switch (this.eggType) {
            case EggType.FIXED:
                rewardText = `€${this.rewardValue}`;
                break;

            case EggType.PERCENT:
                rewardText = `${this.rewardValue}%`;
                break;

            case EggType.MULTIPLIER:
                rewardText = `x${this.rewardValue}`;
                break;
        }

        this.rewardLabel.string = rewardText;
    }

    /**
     * Reveal the reward with animation:
     * - egg view hides (scale to 0)
     * - rewardLabel shows (scale 0 → 1)
     * - coins effect turns on
     * - finger turns off
     */
    public showReward(): void {
        // Play egg tap sound
        GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'egg_taped' });

        // Stop any previous tweens on view and rewardLabel
        if (this.view && this.view.node) {
            tween(this.view.node).stop();
        }
        if (this.rewardLabel && this.rewardLabel.node) {
            tween(this.rewardLabel.node).stop();
        }

        // Hide finger
        this.hideFinger();

        // Animate egg view hide
        this.hideView(() => {
            // After hiding view: show label and activate coins
            this.showLabel();
            this.activateCoinsEffect();
            
            // Notify EndScreen that this egg is opened
            this.notifyEndScreen();
        });
    }

    /** Hide the egg sprite with animation */
    private hideView(onComplete?: () => void): void {
        if (!this.view || !this.view.node) {
            if (onComplete) onComplete();
            return;
        }

        // Scale down to 0 with easing
        tween(this.view.node)
            .to(this.hideViewDuration, { scale: Vec3.ZERO }, {
                easing: 'backIn', // Pull-in effect
                onComplete: () => {
                    if (onComplete) onComplete();
                }
            })
            .start();
    }

    /** Show reward label with animation */
    private showLabel(): void {
        if (!this.rewardLabel || !this.rewardLabel.node) {
            return;
        }

        // Refresh text just in case
        this.updateRewardText();

        // Start with scale = 0
        this.rewardLabel.node.setScale(Vec3.ZERO);

        // Animate scale 0 → 1
        Vec3.set(this._tempVec3, 1, 1, 1);

        tween(this.rewardLabel.node)
            .to(this.showLabelDuration, { scale: this._tempVec3 }, {
                easing: 'backOut', // Pop-out with bounce
                onComplete: () => {
                    // Start pulsing after reveal
                    this.startLabelPulse();
                }
            })
            .start();
    }

    /** Start infinite pulsing of reward label */
    private startLabelPulse(): void {
        if (!this.rewardLabel || !this.rewardLabel.node) {
            return;
        }

        // Create vectors for min/max scale
        Vec3.set(this._tempVec3, this.pulseScaleMin, this.pulseScaleMin, this.pulseScaleMin);
        Vec3.set(this._tempVec3Pulse, this.pulseScaleMax, this.pulseScaleMax, this.pulseScaleMax);

        // Looping pulse tween
        tween(this.rewardLabel.node)
            .to(this.pulseDuration / 2, { scale: this._tempVec3Pulse }, {
                easing: 'sineInOut'
            })
            .to(this.pulseDuration / 2, { scale: this._tempVec3 }, {
                easing: 'sineInOut'
            })
            .union() // Merge into a single cycle
            .repeatForever() // Repeat infinitely
            .start();
    }

    /** Activate coins explosion effect */
    private activateCoinsEffect(): void {
        if (!this.coinsExpl) {
            return;
        }

        this.coinsExpl.active = true;
    }

    /** Hide finger pointer */
    private hideFinger(): void {
        if (!this.finger) {
            return;
        }

        this.finger.active = false;
    }

    /** Notify EndScreen that this egg has been opened */
    private notifyEndScreen(): void {
        if (this.endScreen) {
            this.endScreen.onEggOpened(this);
        }
    }

    /** Set egg type and value, then update visuals */
    public setEggType(type: EggType, value: number): void {
        this.eggType = type;
        this.rewardValue = value;
        this.updateRewardText();
    }

    /** Get current egg type */
    public getEggType(): EggType {
        return this.eggType;
    }

    /** Get reward value */
    public getRewardValue(): number {
        return this.rewardValue;
    }

    /** Reset egg to initial state */
    public reset(): void {
        // Stop all tweens (including pulse)
        if (this.view && this.view.node) {
            tween(this.view.node).stop();
            this.view.node.setScale(Vec3.ONE); // Restore view scale
        }

        if (this.rewardLabel && this.rewardLabel.node) {
            tween(this.rewardLabel.node).stop();
            this.rewardLabel.node.setScale(Vec3.ZERO); // Hide label
        }

        // Disable coins effect
        if (this.coinsExpl) {
            this.coinsExpl.active = false;
        }

        // Enable finger again
        if (this.finger) {
            this.finger.active = true;
        }
    }
}