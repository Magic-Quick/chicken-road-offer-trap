import { _decorator, Component, Sprite, tween } from 'cc';
import { LuksManager } from './LuksManager';

const { ccclass, property } = _decorator;

/**
 * ProgressBar controls visual progress fill based on the latest luk reached.
 */
@ccclass('ProgressBar')
export class ProgressBar extends Component {
    @property({
        type: Sprite,
        tooltip: 'Sprite used for fill of the progress bar'
    })
    public fillImage: Sprite = null;

    @property({
        type: LuksManager,
        tooltip: 'LuksManager to determine total luks count'
    })
    private luksManager: LuksManager = null;

    @property({
        tooltip: 'Fill animation duration in seconds'
    })
    private fillDuration: number = 0.3;

    // Current progress (0.0 - 1.0)
    private currentProgress: number = 0;

    /** Initialization on start */
    start() {
        // Set initial progress
        this.setProgressImmediate(0);
    }

    /**
     * Update progress using current luk index (0-based)
     */
    public updateProgress(currentLukIndex: number): void {
        if (!this.luksManager) {
            return;
        }

        // Total luks
        const totalLuks = this.luksManager.getLuksCount();

        if (totalLuks === 0) {
            return;
        }

        // Compute progress (index is 0-based; use +1)
        const newProgress = (currentLukIndex + 1) / totalLuks;

        // Animate to new progress
        this.setProgress(newProgress);
    }

    /** Set progress with tween animation (0..1) */
    public setProgress(progress: number): void {
        // Clamp to [0, 1]
        const clampedProgress = Math.max(0, Math.min(1, progress));

        if (!this.fillImage) {
            return;
        }

        // Stop previous animation if any
        tween(this).stop();

        // Start value for tween
        const startProgress = this.currentProgress;

        // Tween wrapper object
        const wrapper = { value: startProgress };

        // Smoothly animate fill value
        tween(wrapper)
            .to(this.fillDuration, {
                value: clampedProgress
            }, {
                onUpdate: () => {
                    // Update value and fillRange during tween
                    this.currentProgress = wrapper.value;
                    this.updateFillRange();
                }
            })
            .start();
    }

    /** Set progress immediately without animation (0..1) */
    public setProgressImmediate(progress: number): void {
        // Clamp to [0, 1]
        this.currentProgress = Math.max(0, Math.min(1, progress));
        this.updateFillRange();
    }

    /** Update sprite fillRange using current progress */
    private updateFillRange(): void {
        if (!this.fillImage) {
            return;
        }

        // Set fillRange (0..1); ensure Sprite Type = FILLED in editor
        this.fillImage.fillRange = this.currentProgress;
    }

    /** Get current progress */
    public getCurrentProgress(): number {
        return this.currentProgress;
    }

    /** Reset the progress bar */
    public reset(): void {
        // Stop tween
        tween(this).stop();
        
        // Reset progress value
        this.setProgressImmediate(0);
    }
}