import { _decorator, Component, Label, tween } from 'cc';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND } from '../common/events';

const { ccclass, property } = _decorator;

/**
 * BalanceController manages displaying and animating the balance value.
 */
@ccclass('BalanceController')
export class BalanceController extends Component {
    @property(Label)
    private balanceText: Label = null;

    @property({
        tooltip: 'Duration of balance change animation in seconds'
    })
    private animationDuration: number = 1.0;

    // Current balance value
    private balance: number = 0;

    // Displayed balance (for animation)
    private displayedBalance: number = 0;

    // Flag indicating active animation
    private isAnimating: boolean = false;

    /** Initialization on start */
    start() {
        this.updateBalanceDisplay();
    }

    /** Add to balance with animation */
    public addBalance(amount: number): void {
        const oldBalance = this.balance;
        this.balance += amount;
        this.animateBalance(oldBalance, this.balance);
    }

    /** Set balance with animation */
    public setBalance(amount: number): void {
        const oldBalance = this.balance;
        this.balance = amount;
        this.animateBalance(oldBalance, this.balance);
    }

    /** Animate balance change from 'from' to 'to' */
    private animateBalance(from: number, to: number): void {
        // Stop previous animation if any
        if (this.isAnimating) {
            tween(this).stop();
        }

        this.isAnimating = true;
        this.displayedBalance = from;

        // Play balance scrolling sound
        GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'balance_scrolling' });

        // Animation wrapper object
        const animationObject = { value: from };

        tween(animationObject)
            .to(this.animationDuration, { value: to }, {
                easing: 'cubicOut',
                onUpdate: () => {
                    this.displayedBalance = animationObject.value;
                    this.updateBalanceDisplay();
                }
            })
            .call(() => {
                this.isAnimating = false;
                this.displayedBalance = to;
                this.updateBalanceDisplay();
            })
            .start();
    }

    /** Get current balance */
    public getBalance(): number {
        return this.balance;
    }

    /** Update label text to show current displayed balance */
    private updateBalanceDisplay(): void {
        if (!this.balanceText) {
            return;
        }

        // Format displayed balance as €100.00
        const formattedBalance = `€${this.displayedBalance.toFixed(2)}`;
        this.balanceText.string = formattedBalance;
    }

    /** Reset balance to zero */
    public reset(): void {
        // Stop animation
        if (this.isAnimating) {
            tween(this).stop();
            this.isAnimating = false;
        }

        this.balance = 0;
        this.displayedBalance = 0;
        this.updateBalanceDisplay();
    }
}