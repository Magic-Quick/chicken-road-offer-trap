import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * Car controls a car moving along the road.
 * It starts with an optional delay, moves along -Y and resets when off-screen.
 */
@ccclass('Car')
export class Car extends Component {
  @property({
    tooltip: 'Delay before movement starts (seconds)',
  })
  private startDelay: number = 0;

  @property({
    tooltip: 'Minimum speed (pixels/sec)',
  })
  private minSpeed: number = 100;

  @property({
    tooltip: 'Maximum speed (pixels/sec)',
  })
  private maxSpeed: number = 300;

  @property({
    tooltip: 'Start Y position',
  })
  private startPositionY: number = 880;

  @property({
    tooltip: 'Bottom Y boundary (car resets below this)',
  })
  private bottomBoundary: number = -880;

  // Current speed
  private currentSpeed: number = 0;

  // Flag indicating whether movement started
  private isMoving: boolean = false;

  // Flag indicating the car is being destroyed
  private isDestroying: boolean = false;

  // Initial position (for reset)
  private initialPosition: Vec3 = new Vec3();

  // Position cache (avoid repeated getPosition)
  private _cachedPosition: Vec3 = new Vec3();
  private _positionDirty: boolean = true;

  // Target node to stop at (car stops when its world Y <= target's world Y)
  private _stopTargetNode: Node | null = null;
  private _onStopCallback: (() => void) | null = null;

  /** Initialization on start */
  start() {
    // Save initial position
    Vec3.copy(this.initialPosition, this.node.getPosition());

    // Start immediately if no delay
    if (this.startDelay <= 0) {
      this.startMovement();
    } else {
      // Start movement after a delay
      this.scheduleOnce(() => {
        this.startMovement();
      }, this.startDelay);
    }
  }

  /** Start movement */
  private startMovement(): void {
    // Randomize speed
    this.randomizeSpeed();

    // Set moving flag
    this.isMoving = true;
  }

  /**
   * Per-frame update (lateUpdate for smoother motion)
   */
  lateUpdate(deltaTime: number) {
    // Skip if not moving
    if (!this.isMoving) {
      return;
    }

    // Get current position (cached)
    if (this._positionDirty) {
      Vec3.copy(this._cachedPosition, this.node.position);
      this._positionDirty = false;
    }

    // Compute new position (move downward on Y)
    let newY = this._cachedPosition.y - this.currentSpeed * deltaTime;

    // Stop at target node when reaching its world Y
    if (this._stopTargetNode) {
      const targetWorldY = this._stopTargetNode.worldPosition.y;
      const carWorldY = this.node.worldPosition.y;
      // Difference between world and local Y (parent offset)
      const worldOffset = carWorldY - this._cachedPosition.y;
      // Predicted world Y after movement
      const predictedWorldY = newY + worldOffset;

      // If car would reach or pass the target
      if (predictedWorldY <= targetWorldY) {
        // Compute local Y corresponding to target world Y
        const targetLocalY = targetWorldY - worldOffset;

        this.node.setPosition(this._cachedPosition.x, targetLocalY, this._cachedPosition.z);
        this._cachedPosition.y = targetLocalY;
        this.isMoving = false;
        // Mark as destroying to prevent CarsController from resuming
        this.isDestroying = true;

        this._stopTargetNode = null;

        // Invoke callback
        if (this._onStopCallback) {
          const callback = this._onStopCallback;
          this._onStopCallback = null;
          callback();
        }
        return;
      }
    }

    // Reset if passed below bottom boundary
    if (newY <= this.bottomBoundary) {
      // If stop target exists, don't reset — continue moving
      if (this._stopTargetNode) {
        // Just update position
        this.node.setPosition(this._cachedPosition.x, newY, this._cachedPosition.z);
        this._cachedPosition.y = newY;
      } else {
        // Reset to start position
        this.resetPosition();
        this._positionDirty = true;
      }
    } else {
      // Update position only if the change is significant
      // This avoids excessive TRANSFORM_CHANGED events
      const epsilon = 0.001;
      const yDiff = this._cachedPosition.y - newY;
      if (Math.abs(yDiff) > epsilon) {
        this.node.setPosition(this._cachedPosition.x, newY, this._cachedPosition.z);
        this._cachedPosition.y = newY;
      }
    }
  }

  /** Reset to start position and randomize speed */
  private resetPosition(): void {
    // Set Y to start value
    this.node.setPosition(this._cachedPosition.x, this.startPositionY, this._cachedPosition.z);
    this._cachedPosition.y = this.startPositionY;

    // Randomize speed again
    this.randomizeSpeed();
  }

  /** Randomize speed within range */
  private randomizeSpeed(): void {
    // Random speed between minSpeed and maxSpeed
    this.currentSpeed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
  }

  /** Get current speed */
  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  /** Set car speed (e.g. for death boost) */
  public setSpeed(speed: number): void {
    this.currentSpeed = speed;
  }

  /** Invalidate cached position (after external position changes) */
  public invalidatePositionCache(): void {
    this._positionDirty = true;
  }

  /**
   * Set the stop target node.
   * Car stops when its world Y reaches target's world Y.
   */
  public setStopTarget(targetNode: Node, onStop: () => void): void {
    this._stopTargetNode = targetNode;
    this._onStopCallback = onStop;
  }

  /** Get start Y position */
  public getStartPositionY(): number {
    return this.startPositionY;
  }

  /** Get bottom Y boundary */
  public getBottomBoundary(): number {
    return this.bottomBoundary;
  }

  /** Is the car moving */
  public getIsMoving(): boolean {
    return this.isMoving;
  }

  /** Stop movement */
  public stopMovement(): void {
    this.isMoving = false;
  }

  /** Resume movement */
  public resumeMovement(): void {
    this.isMoving = true;
  }

  /** Is the car being destroyed */
  public getIsDestroying(): boolean {
    return this.isDestroying;
  }

  /** Set destroying flag */
  public setDestroying(value: boolean): void {
    this.isDestroying = value;
  }

  /** Reset car to its initial state */
  public reset(): void {
    this.isMoving = false;
    this.isDestroying = false;
    this._stopTargetNode = null;
    this._onStopCallback = null;
    this.node.setPosition(this.initialPosition);
    Vec3.copy(this._cachedPosition, this.initialPosition);
    this._positionDirty = false;
    this.currentSpeed = 0;

    // Restart delay timer
    if (this.startDelay > 0) {
      this.scheduleOnce(() => {
        this.startMovement();
      }, this.startDelay);
    } else {
      this.startMovement();
    }
  }
}
