import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * CameraFollower makes a camera follow a target node.
 * It preserves the initial offset between camera and target.
 */
@ccclass('CameraFollower')
export class CameraFollower extends Component {
    @property({
        type: Node,
        tooltip: 'Target to follow (e.g., chicken)'
    })
    private target: Node = null;

    @property({
        tooltip: 'Camera follow smoothing (0 = instant, higher = smoother)'
    })
    private smoothTime: number = 0;

    // Stored offset between camera and target
    private offset: Vec3 = new Vec3();

    // Initialization flag
    private initialized: boolean = false;

    /** Initialization on start */
    start() {
        this.initializeOffset();
    }

    /** Initialize offset between camera and target */
    private initializeOffset(): void {
        if (!this.target) {
            return;
        }

        // Compute initial offset using world positions.
        // Convert target world position to camera's local space.
        const cameraParent = this.node.parent;
        let targetLocalPos: Vec3;
        
        if (cameraParent) {
            targetLocalPos = new Vec3();
            cameraParent.inverseTransformPoint(targetLocalPos, this.target.worldPosition);
        } else {
            targetLocalPos = this.target.worldPosition.clone();
        }
        
        this.offset = this.node.position.clone().subtract(targetLocalPos);
        this.initialized = true;
    }

    /** Per-frame update */
    lateUpdate(deltaTime: number) {
        if (!this.initialized || !this.target) {
            return;
        }

        this.followTarget(deltaTime);
    }

    /**
     * Follow target on X axis only, using world coordinates
     */
    private followTarget(deltaTime: number): void {
        // Convert target world position to camera's local space
        const cameraParent = this.node.parent;
        let targetLocalPos: Vec3;
        
        if (cameraParent) {
            targetLocalPos = new Vec3();
            cameraParent.inverseTransformPoint(targetLocalPos, this.target.worldPosition);
        } else {
            targetLocalPos = this.target.worldPosition.clone();
        }
        
        // Target X = target.x + offset.x
        const targetX = targetLocalPos.x + this.offset.x;
        
        // Current camera local position
        const currentPosition = this.node.position;

        if (this.smoothTime <= 0) {
            // Instant follow on X only
            this.node.setPosition(targetX, currentPosition.y, currentPosition.z);
        } else {
            // Smooth follow on X only
            const t = Math.min(1, deltaTime / this.smoothTime);
            const newX = currentPosition.x + (targetX - currentPosition.x) * t;

            this.node.setPosition(newX, currentPosition.y, currentPosition.z);
        }
    }

    /** Set a new follow target */
    public setTarget(target: Node): void {
        this.target = target;
        this.initialized = false;
        this.initializeOffset();
    }

    /** Get current follow target */
    public getTarget(): Node {
        return this.target;
    }

    /** Manually set offset */
    public setOffset(offset: Vec3): void {
        this.offset = offset.clone();
    }

    /** Get current offset */
    public getOffset(): Vec3 {
        return this.offset.clone();
    }

    /** Reset offset using current positions */
    public resetOffset(): void {
        this.initializeOffset();
    }
}