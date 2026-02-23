import { _decorator, Component, Node, Sprite, Label, Animation } from 'cc';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND } from '../common/events';

const { ccclass, property } = _decorator;

/**
 * Luk represents a single hatch element.
 * Holds a Node with a Sprite and displays an amount.
 */
@ccclass('Luk')
export class Luk extends Component {
    @property(Sprite)
    public sprite: Sprite = null;

    @property(Label)
    public amountLabel: Label = null;

    @property(Animation)
    public animation: Animation = null;

    @property({
        tooltip: 'Reward amount for this luk'
    })
    public amount: number = 0;

    // Flag indicating the chicken already reached this luk
    private chickenReached: boolean = false;

    /** Initialization on start */
    start() {
        this.updateAmountDisplay();
    }

    /** Update amount label text */
    private updateAmountDisplay(): void {
        if (!this.amountLabel) {
            return;
        }

        // Format amount like €100
        const formattedAmount = `€${this.amount}`;
        this.amountLabel.string = formattedAmount;
    }

    /** Called when the chicken reaches this luk */
    public onChickenReached(): void {
        if (this.chickenReached) {
            return;
        }

        this.chickenReached = true;

        // Play success sound
        GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'luke_success' });

        // Play jumped animation
        this.playJumpedAnimation();
    }

    /** Play animation when the chicken jumps on the luk */
    private playJumpedAnimation(): void {
        if (!this.animation) {
            return;
        }

        const jumpedState = this.animation.getState('luk_jumped');
        if (!jumpedState) {
            return;
        }

        // Play 'luk_jumped' animation
        this.animation.play('luk_jumped');
    }

    /** Check if the chicken reached this luk */
    public isChickenReached(): boolean {
        return this.chickenReached;
    }

    /** Set new amount */
    public setAmount(newAmount: number): void {
        this.amount = newAmount;
        this.updateAmountDisplay();
    }

    /** Get current amount */
    public getAmount(): number {
        return this.amount;
    }

    /** Reset luk state */
    public reset(): void {
        this.chickenReached = false;
    }
}