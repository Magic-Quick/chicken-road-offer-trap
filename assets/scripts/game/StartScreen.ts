import { _decorator, Component, Node, Animation, Button } from 'cc';
import { Chicken } from './Chicken';
import { BalanceController } from './BalanceController';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_TAP } from '../common/events';

const { ccclass, property } = _decorator;

/**
 * StartScreen controls the initial screen and the GO button.
 * Disables GO at startup and while the chicken is jumping.
 */
@ccclass('StartScreen')
export class StartScreen extends Component {
    @property(Button)
    private goButton: Button = null;

    @property(Animation)
    private animation: Animation = null;

    @property(Chicken)
    private chicken: Chicken = null;

    @property(BalanceController)
    private balanceController: BalanceController = null;

    @property({ type: Node, tooltip: 'Finger pointer shown on the Start Screen' })
    private startFinger: Node = null;

    @property({ type: Node, tooltip: 'Finger pointer shown near the GO button on gameplay screen' })
    private goFinger: Node = null;

    /**
     * Called when the component is enabled.
     */
    onEnable() {
        // When screen appears, make GO button non-interactable
        if (this.goButton) {
            this.goButton.interactable = false;
        }

        // Show only Start Screen finger while Start Screen is active
        if (this.startFinger) this.startFinger.active = true;
        if (this.goFinger) this.goFinger.active = false;
    }

    /**
     * Per-frame check to disable GO while jumping
     */
    update() {
        if (!this.goButton || !this.chicken) {
            return;
        }

        // Check if chicken is jumping
        const isJumping = this.chicken.getIsJumping();
        
        // If jumping — make button non-interactable.
        // Otherwise leave as-is (it will be enabled after hiding the screen).
        if (isJumping && this.goButton.interactable) {
            this.goButton.interactable = false;
        }
    }

    /**
     * Hide the start screen with animation.
     * After animation ends, deactivate node, enable GO, and add 500 to balance.
     */
    public hideScreen(): void {
        // Publish TAP to unlock audio subsystem
        GlobalEventBus.publish({ type: EVT_TAP });

        // Add 500 to balance on hiding the screen
        if (this.balanceController) {
            this.balanceController.addBalance(400);
        }

        if (!this.animation) {
            // Still enable the button and hide the screen
            this.finishHiding();
            return;
        }

        // Check animation state for hide_start_screen
        const hideState = this.animation.getState('hide_start_screen');
        if (!hideState) {
            // Still enable the button and hide the screen
            this.finishHiding();
            return;
        }

        // Stop current animations and play hide
        this.animation.stop();

        // Play hide animation
        this.animation.play('hide_start_screen');

        // Wait until animation ends, then hide node and enable button
        this.scheduleOnce(() => {
            this.finishHiding();
        }, hideState.duration);
    }

    /**
     * Finalize hiding: deactivate node and enable the GO button
     */
    private finishHiding(): void {
        // Enable GO button
        if (this.goButton) {
            this.goButton.interactable = true;
        }

        // Toggle fingers: hide Start finger, show GO finger when Start Screen is hidden
        if (this.startFinger) this.startFinger.active = false;
        if (this.goFinger) this.goFinger.active = true;

        // Deactivate this screen
        this.node.active = false;
    }
}