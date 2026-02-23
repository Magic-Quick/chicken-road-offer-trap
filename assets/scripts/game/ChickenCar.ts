import { _decorator, Component, Node, Vec3, tween, Prefab, instantiate, Animation } from 'cc';
import { Chicken } from './Chicken';
import { LuksManager } from './LuksManager';
import { Luk } from './Luk';
import { CarsController } from './CarsController';
import { Car } from './Car';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND } from '../common/events';

const { ccclass, property } = _decorator;

@ccclass('ChickenCar')
export class ChickenCar extends Component {
  @property(Node)
  private carNode: Node = null;

  @property({
    type: Node,
    tooltip: 'Position on the car where the chicken lands',
  })
  private carPosition: Node = null;

  @property(Chicken)
  private chicken: Chicken = null;

  @property(LuksManager)
  private luksManager: LuksManager = null;

  @property(CarsController)
  private carsController: CarsController = null;

  @property({
    type: Prefab,
    tooltip: 'Car explosion prefab',
  })
  private carExplosionPrefab: Prefab = null;

  @property({
    type: Node,
    tooltip: 'Exit point from the car (EndPoint)',
  })
  private endPoint: Node = null;

  @property({
    type: Animation,
    tooltip: 'Animation component for car_engine',
  })
  private carEngineAnimation: Animation = null;

  @property({
    type: Node,
    tooltip: 'Smoke effect node',
  })
  private dymNode: Node = null;

  @property({
    tooltip: 'Luk index after which chicken jumps onto the car',
  })
  private lukIndexForCarJump: number = 1;

  @property({
    tooltip: 'Duration of movement to the car in seconds',
  })
  private moveToCarDuration: number = 0.5;

  @property({
    tooltip: 'Jump arc height when jumping to the car',
  })
  private jumpToCarArcHeight: number = 100;

  @property({
    tooltip: 'Chicken scale while on the car',
  })
  private chickenScaleInCar: number = 0.7;

  @property({
    tooltip: 'Car speed while moving with chicken (pixels/sec)',
  })
  private carSpeed: number = 200;

  @property({
    tooltip: 'Collision check distance to other cars',
  })
  private collisionCheckDistance: number = 100;

  @property({
    tooltip: 'Car destroy animation duration',
  })
  private carDestroyDuration: number = 0.3;

  // Flag indicating chicken is on the car
  private isChickenOnCar: boolean = false;

  // Flag indicating car is moving
  private isCarMoving: boolean = false;

  // Target luk for the car
  private targetLuk: Luk = null;

  // Original parent of the chicken (for potential restore)
  private originalChickenParent: Node = null;

  // Chicken local position inside the car
  private chickenLocalPosInCar: Vec3 = new Vec3(0, 0, 0);

  // Cached Vec3 for reuse (memory optimization)
  private readonly _tempVec3_1: Vec3 = new Vec3();
  private readonly _tempVec3_2: Vec3 = new Vec3();
  private readonly _tempVec3_3: Vec3 = new Vec3();
  private readonly _tempVec3_4: Vec3 = new Vec3();

  // Cache for collision checks (updated only while moving)
  private _chickenCarWorldPos: Vec3 = new Vec3();
  private _collisionCheckSquaredDistance: number = 0;

  /** Initialization */
  start() {
    // Precompute squared distance for collision checks (avoid sqrt)
    this._collisionCheckSquaredDistance = this.collisionCheckDistance * this.collisionCheckDistance;
  }

  /**
   * Whether the chicken should jump to the car
   */
  public shouldJumpToCar(currentLukIndex: number): boolean {
    return currentLukIndex === this.lukIndexForCarJump;
  }

  /** Move the chicken onto the car */
  public moveChickenToCar(chickenNode: Node, onComplete?: () => void): void {
    if (!this.carNode) {
      if (onComplete) onComplete();
      return;
    }

    if (!this.carPosition) {
      if (onComplete) onComplete();
      return;
    }

    // Save original parent
    this.originalChickenParent = chickenNode.parent;

    // Get world position of the landing point on the car
    Vec3.copy(this._tempVec3_1, this.carPosition.worldPosition);
    const chickenParent = chickenNode.parent;

    if (chickenParent) {
      chickenParent.inverseTransformPoint(this._tempVec3_2, this._tempVec3_1);
    } else {
      Vec3.copy(this._tempVec3_2, this._tempVec3_1);
    }

    const currentPosition = chickenNode.getPosition();
    Vec3.set(this._tempVec3_3, this._tempVec3_2.x, this._tempVec3_2.y, this._tempVec3_2.z);

    // Arc mid-point for the jump
    Vec3.set(
      this._tempVec3_4,
      (currentPosition.x + this._tempVec3_3.x) / 2,
      currentPosition.y + this.jumpToCarArcHeight,
      currentPosition.z,
    );

    // Get current chicken scale
    const currentScale = chickenNode.scale.clone();
    Vec3.set(this._tempVec3_1, this.chickenScaleInCar, this.chickenScaleInCar, this.chickenScaleInCar);
    const targetScale = this._tempVec3_1;

    // Animate jump to car
    tween(chickenNode)
      .to(
        this.moveToCarDuration / 2,
        { position: this._tempVec3_4 },
        {
          easing: 'linear',
        },
      )
      .to(
        this.moveToCarDuration / 2,
        { position: this._tempVec3_3 },
        {
          easing: 'linear',
          onComplete: () => {
            // Make chicken a child of the car
            Vec3.copy(this._tempVec3_1, chickenNode.worldPosition);
            chickenNode.setParent(this.carNode);

            // Convert to local position relative to the car
            this.carNode.inverseTransformPoint(this._tempVec3_2, this._tempVec3_1);
            chickenNode.setPosition(this._tempVec3_2);

            // Save local position for potential restore
            Vec3.copy(this.chickenLocalPosInCar, this._tempVec3_2);

            this.isChickenOnCar = true;

            // Play engine animation
            if (this.carEngineAnimation) {
              this.carEngineAnimation.play('car_engine');
            }

            // Enable smoke effect
            if (this.dymNode) {
              this.dymNode.active = true;
            }

            if (onComplete) {
              onComplete();
            }
          },
        },
      )
      .start();

    // Animate scaling down simultaneously
    tween(chickenNode)
      .to(
        this.moveToCarDuration,
        { scale: targetScale },
        {
          easing: 'linear',
        },
      )
      .start();
  }

  /**
   * Start car movement (with chicken) to the next luk
   */
  public startCarMovement(nextLukIndex: number, chickenNode: Node, onReachLuk?: (luk: Luk, lukIndex: number) => void): void {
    if (!this.luksManager) {
      return;
    }

    if (!this.carNode) {
      return;
    }

    // Get target luk
    this.targetLuk = this.luksManager.getLuk(nextLukIndex);

    if (!this.targetLuk) {
      return;
    }
    this.isCarMoving = true;

    // Get target luk position
    Vec3.copy(this._tempVec3_1, this.targetLuk.node.worldPosition);
    const carParent = this.carNode.parent;

    if (carParent) {
      carParent.inverseTransformPoint(this._tempVec3_2, this._tempVec3_1);
    } else {
      Vec3.copy(this._tempVec3_2, this._tempVec3_1);
    }

    // Get current car position
    const currentCarPos = this.carNode.getPosition();

    // Distance → duration
    const distance = Math.abs(this._tempVec3_2.x - currentCarPos.x);
    const duration = distance / this.carSpeed;

    // Build target car position (change X only)
    Vec3.set(this._tempVec3_3, this._tempVec3_2.x, currentCarPos.y, currentCarPos.z);

    // Animate car movement (chicken is child and moves with it)
    tween(this.carNode)
      .to(
        duration,
        { position: this._tempVec3_3 },
        {
          easing: 'linear',
          onComplete: () => {
            this.isCarMoving = false;

            // Chicken stays on the car — do not restore original parent
            // isChickenOnCar remains true

            // Invoke callback
            if (onReachLuk) {
              onReachLuk(this.targetLuk, nextLukIndex);
            }
          },
        },
      )
      .start();
  }

  /** Per-frame: check collisions with other cars */
  update(deltaTime: number) {
    // Check collisions only while the car is moving
    if (!this.isCarMoving || !this.carNode || !this.carsController) {
      return;
    }

    // Update cached position only while moving
    Vec3.copy(this._chickenCarWorldPos, this.carNode.worldPosition);
    this.checkCarCollisions();
  }

  /**
   * Check collisions with other cars (optimized: squared distance)
   */
  private checkCarCollisions(): void {
    if (!this.carsController || !this.carNode) {
      return;
    }

    const cars = this.carsController.cars;
    const carsLength = cars.length;

    for (let i = 0; i < carsLength; i++) {
      const car = cars[i];
      if (!car || !car.node || !car.node.active) {
        continue;
      }

      // Skip cars that are being destroyed
      if (car.getIsDestroying()) {
        continue;
      }

      // Use squared distance (avoid sqrt)
      Vec3.subtract(this._tempVec3_1, this._chickenCarWorldPos, car.node.worldPosition);
      const sqrDistance = this._tempVec3_1.lengthSqr();

      if (sqrDistance <= this._collisionCheckSquaredDistance) {
        this.destroyCar(car);
      }
    }
  }

  /** Destroy a car with animation and spawn explosion */
  private destroyCar(car: Car): void {
    if (!car || !car.node) {
      return;
    }

    // Mark as destroying so it cannot be pushed back
    car.setDestroying(true);

    // Play car destroy sound
    GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'car_destroy' });

    // Save car position for explosion
    Vec3.copy(this._tempVec3_1, car.node.worldPosition);
    const carParent = car.node.parent;

    // Animate car scale to 0
    Vec3.set(this._tempVec3_2, 0, 0, 0);
    tween(car.node)
      .to(
        this.carDestroyDuration,
        { scale: this._tempVec3_2 },
        {
          easing: 'sineIn',
          onComplete: () => {
            // Deactivate car
            car.node.active = false;

            // Restore scale for potential reuse
            car.node.setScale(1, 1, 1);

            // Clear destroying flag
            car.setDestroying(false);
          },
        },
      )
      .start();

    // Spawn explosion prefab at car position
    if (this.carExplosionPrefab && carParent) {
      const explosion = instantiate(this.carExplosionPrefab);
      carParent.addChild(explosion);

      // Convert world to local under parent
      carParent.inverseTransformPoint(this._tempVec3_3, this._tempVec3_1);
      explosion.setPosition(this._tempVec3_3);

      // Destroy explosion object after its animation
      const animation = explosion.getComponent(Animation);
      if (animation) {
        // Get animation state (defaultClip if available)
        const animationState =
          animation.getState('car_expolution') || (animation.defaultClip ? animation.getState(animation.defaultClip.name) : null);

        if (animationState) {
          // Destroy after animation completes
          this.scheduleOnce(() => {
            if (explosion && explosion.isValid) {
              explosion.destroy();
            }
          }, animationState.duration);
        } else {
          // Fallback: destroy after default duration (0.27s)
          this.scheduleOnce(() => {
            if (explosion && explosion.isValid) {
              explosion.destroy();
            }
          }, 0.27);
        }
      } else {
        // No Animation component — destroy after small delay
        this.scheduleOnce(() => {
          if (explosion && explosion.isValid) {
            explosion.destroy();
          }
        }, 0.27);
      }
    }
  }

  /** Is the chicken on the car */
  public isChickenOnCarNow(): boolean {
    return this.isChickenOnCar;
  }

  /** Is the car moving now */
  public isCarMovingNow(): boolean {
    return this.isCarMoving;
  }

  /** Is current luk the last one */
  public isOnLastLuk(currentLukIndex: number): boolean {
    if (!this.luksManager) {
      return false;
    }
    const totalLuks = this.luksManager.getLuksCount();
    // Last luk index is (totalLuks - 1)
    return currentLukIndex >= totalLuks - 1;
  }

  /** Jump out of the car to the EndPoint */
  public jumpToEndPoint(chickenNode: Node, onComplete?: () => void): void {
    if (!this.endPoint) {
      if (onComplete) onComplete();
      return;
    }

    // Do NOT restore original parent — keep chicken under the car
    // This prevents render order issues in hierarchy

    this.isChickenOnCar = false;

    // Stop engine animation
    if (this.carEngineAnimation) {
      this.carEngineAnimation.stop();
    }

    // Disable smoke
    if (this.dymNode) {
      this.dymNode.active = false;
    }

    // Target EndPoint position
    Vec3.copy(this._tempVec3_1, this.endPoint.worldPosition);

    // Chicken remains child of the car => convert using current parent
    const chickenParent = chickenNode.parent;

    if (chickenParent) {
      chickenParent.inverseTransformPoint(this._tempVec3_2, this._tempVec3_1);
    } else {
      Vec3.copy(this._tempVec3_2, this._tempVec3_1);
    }

    const currentPosition = chickenNode.getPosition();
    Vec3.set(this._tempVec3_3, this._tempVec3_2.x, this._tempVec3_2.y, this._tempVec3_2.z);

    // Arc mid-point
    Vec3.set(
      this._tempVec3_4,
      (currentPosition.x + this._tempVec3_3.x) / 2,
      currentPosition.y + this.jumpToCarArcHeight,
      currentPosition.z,
    );

    // Target scale (return to normal size)
    Vec3.set(this._tempVec3_1, 1, 1, 1);
    const targetScale = this._tempVec3_1;

    // Animate jump to EndPoint
    tween(chickenNode)
      .to(
        this.moveToCarDuration / 2,
        { position: this._tempVec3_4 },
        {
          easing: 'linear',
        },
      )
      .to(
        this.moveToCarDuration / 2,
        { position: this._tempVec3_3 },
        {
          easing: 'linear',
          onComplete: () => {
            if (onComplete) {
              onComplete();
            }
          },
        },
      )
      .start();

    // Animate scaling back to 1 simultaneously
    tween(chickenNode)
      .to(
        this.moveToCarDuration,
        { scale: targetScale },
        {
          easing: 'linear',
        },
      )
      .start();
  }

  /** Reset state */
  public reset(): void {
    this.isChickenOnCar = false;
    this.isCarMoving = false;
    this.targetLuk = null;
    this.originalChickenParent = null;

    // Stop all tweens on the car
    if (this.carNode) {
      tween(this.carNode).stop();
    }

    // Stop engine animation
    if (this.carEngineAnimation) {
      this.carEngineAnimation.stop();
    }

    // Disable smoke
    if (this.dymNode) {
      this.dymNode.active = false;
    }
  }
}
