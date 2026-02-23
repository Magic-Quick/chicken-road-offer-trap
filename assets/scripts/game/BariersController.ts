import { _decorator, Component, Node, Animation } from 'cc';
const { ccclass, property } = _decorator;

/**
 * BariersController manages an array of barrier nodes.
 * Barriers are shown when the chicken jumps onto corresponding luks.
 */
@ccclass('BariersController')
export class BariersController extends Component {
    @property([Node])
    public bariers: Node[] = [];

    /** Initialization on start */
    start() {
        // Hide all barriers by default
        this.hideAllBariers();
    }

    /** Hide all barriers */
    public hideAllBariers(): void {
        this.bariers.forEach(barier => {
            if (barier) {
                barier.active = false;
            }
        });
    }

    /** Show barrier by index */
    public showBarier(index: number): void {
        if (index >= 0 && index < this.bariers.length) {
            const barier = this.bariers[index];
            if (barier) {
                barier.active = true;
                
                // Play show animation if present
                const animation = barier.getComponent(Animation);
                if (animation) {
                    animation.play('show_barier');
                }
            }
        }
    }

    /** Hide barrier by index */
    public hideBarier(index: number): void {
        if (index >= 0 && index < this.bariers.length) {
            const barier = this.bariers[index];
            if (barier) {
                barier.active = false;
            }
        }
    }

    /** Get barrier by index */
    public getBarier(index: number): Node | null {
        if (index >= 0 && index < this.bariers.length) {
            return this.bariers[index];
        }
        return null;
    }

    /** Get barrier count */
    public getBariersCount(): number {
        return this.bariers.length;
    }

    /** Add a barrier node to the array */
    public addBarier(barier: Node): void {
        if (barier && this.bariers.indexOf(barier) === -1) {
            this.bariers.push(barier);
            // Newly added barrier is hidden by default
            barier.active = false;
        }
    }

    /** Remove a barrier node from the array */
    public removeBarier(barier: Node): void {
        const index = this.bariers.indexOf(barier);
        if (index !== -1) {
            this.bariers.splice(index, 1);
        }
    }

    /** Reset all barriers (e.g. on restart) */
    public reset(): void {
        this.hideAllBariers();
    }

    /** Cleanup on destroy */
    protected onDestroy(): void {
        this.bariers = [];
    }
}