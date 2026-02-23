import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * FollowCameraX makes a node follow the camera on X only.
 * Useful for UI/background nodes that must stay at fixed Y/Z.
 */
@ccclass('FollowCameraX')
export class FollowCameraX extends Component {
    @property({
        type: Node,
        tooltip: 'Camera the object should follow'
    })
    private camera: Node = null;

    @property({
        tooltip: 'Follow smoothing (0 = instant, higher = smoother)'
    })
    private smoothTime: number = 0;

    @property({
        tooltip: 'Additional X offset relative to the camera'
    })
    private offsetX: number = 0;

    // Fixed initial Y and Z coordinates of the node
    private fixedY: number = 0;
    private fixedZ: number = 0;

    // Initialization flag
    private initialized: boolean = false;

    /** Initialization on start */
    start() {
        this.initialize();
    }

    /** Initialize fixed coordinates */
    private initialize(): void {
        if (!this.camera) {
            return;
        }

        // Save initial Y and Z coordinates
        const currentPosition = this.node.position;
        this.fixedY = currentPosition.y;
        this.fixedZ = currentPosition.z;
        this.initialized = true;
    }

    /** Per-frame update */
    lateUpdate(deltaTime: number) {
        if (!this.initialized || !this.camera) {
            return;
        }

        this.followCameraX(deltaTime);
    }

    /** Follow the camera on X */
    private followCameraX(deltaTime: number): void {
        // Camera X
        const cameraX = this.camera.position.x;
        
        // Target X with offset
        const targetX = cameraX + this.offsetX;

        // Current position
        const currentPosition = this.node.position;

        let newX: number;

        if (this.smoothTime <= 0) {
            // Instant follow
            newX = targetX;
        } else {
            // Smooth follow (lerp)
            const t = Math.min(1, deltaTime / this.smoothTime);
            newX = currentPosition.x + (targetX - currentPosition.x) * t;
        }

        // Set new position only if it changed (avoid extra TRANSFORM_CHANGED)
        const epsilon = 0.001;
        if (Math.abs(currentPosition.x - newX) > epsilon) {
            this.node.setPosition(newX, this.fixedY, this.fixedZ);
        }
    }

    /** Set the camera node */
    public setCamera(camera: Node): void {
        this.camera = camera;
        this.initialized = false;
        this.initialize();
    }

    /** Get the current camera node */
    public getCamera(): Node {
        return this.camera;
    }

    /** Set X offset */
    public setOffsetX(offset: number): void {
        this.offsetX = offset;
    }

    /** Get X offset */
    public getOffsetX(): number {
        return this.offsetX;
    }

    /** Set smoothing time */
    public setSmoothTime(time: number): void {
        this.smoothTime = Math.max(0, time);
    }

    /** Reset fixed coordinates based on current node position */
    public resetFixedCoordinates(): void {
        const currentPosition = this.node.position;
        this.fixedY = currentPosition.y;
        this.fixedZ = currentPosition.z;
    }
}