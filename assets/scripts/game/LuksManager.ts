import { _decorator, Component } from 'cc';
import { Luk } from './Luk';
const { ccclass, property } = _decorator;

/**
 * LuksManager manages an array of Luk objects.
 */
@ccclass('LuksManager')
export class LuksManager extends Component {
    @property([Luk])
    private luks: Luk[] = [];

    /** Initialization on start */
    start() {
        // Initialize if needed
    }

    /** Add a new luk to the array */
    public addLuk(luk: Luk): void {
        if (luk && this.luks.indexOf(luk) === -1) {
            this.luks.push(luk);
        }
    }

    /** Remove a luk from the array */
    public removeLuk(luk: Luk): void {
        const index = this.luks.indexOf(luk);
        if (index !== -1) {
            this.luks.splice(index, 1);
        }
    }

    /** Remove a luk by index */
    public removeLukAt(index: number): void {
        if (index >= 0 && index < this.luks.length) {
            this.luks.splice(index, 1);
        }
    }

    /** Get luk by index */
    public getLuk(index: number): Luk | null {
        if (index >= 0 && index < this.luks.length) {
            return this.luks[index];
        }
        return null;
    }

    /** Get all luks */
    public getAllLuks(): Luk[] {
        return [...this.luks];
    }

    /** Get luks count */
    public getLuksCount(): number {
        return this.luks.length;
    }

    /** Clear all luks */
    public clearAllLuks(): void {
        this.luks = [];
    }

    /** Show all luks */
    public showAllLuks(): void {
        this.luks.forEach(luk => {
            if (luk && luk.sprite && luk.sprite.node) {
                luk.sprite.node.active = true;
            }
        });
    }

    /** Hide all luks */
    public hideAllLuks(): void {
        this.luks.forEach(luk => {
            if (luk && luk.sprite && luk.sprite.node) {
                luk.sprite.node.active = false;
            }
        });
    }

    /** Get visible luks */
    public getVisibleLuks(): Luk[] {
        return this.luks.filter(luk => {
            return luk && luk.sprite && luk.sprite.node && luk.sprite.node.active;
        });
    }

    /** Cleanup on destroy */
    protected onDestroy(): void {
        this.clearAllLuks();
    }
}