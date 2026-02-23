import { _decorator, Component, Node, Vec3 } from 'cc';
import { Car } from './Car';
import { BariersController } from './BariersController';
import { Chicken } from './Chicken';
import { GlobalEventBus } from '../common/event-bus';
import { EVT_PLAY_SOUND } from '../common/events';

const { ccclass, property } = _decorator;

/**
 * CarsController manages an array of cars.
 * Checks barrier positions and stops cars when needed.
 * Car indices correspond to barrier indices.
 */
@ccclass('CarsController')
export class CarsController extends Component {
  @property([Car])
  public cars: Car[] = [];

  @property(BariersController)
  private bariersController: BariersController = null;

  @property(Chicken)
  private chicken: Chicken = null;

  @property({
    tooltip: 'Distance from a barrier at which a car stops',
  })
  private stopDistance: number = 300;

  @property({
    tooltip: 'Max distance for computing car sound volume',
  })
  private maxSoundDistance: number = 1000;

  @property({
    tooltip: 'Position epsilon to avoid jitter',
  })
  private positionEpsilon: number = 1.0;

  @property({
    tooltip: 'Car speed when boosted on death luk (pixels/sec)',
  })
  private deathBoostSpeed: number = 2000;

  @property({
    tooltip: 'Collision distance between chicken and car (by Y)',
  })
  private chickenCollisionDistance: number = 80;

  // Cache for barriers (avoid repeated getBarier calls)
  private _bariersCache: (Node | null)[] = [];
  private _bariersCacheDirty: boolean = true;

  // Cached Vec3 for reuse
  private readonly _tempVec3_1: Vec3 = new Vec3();

  // Previous car Y positions to detect threshold crossing
  private _previousCarY: number[] = [];

  // Index of the car that should hit the chicken (-1 = inactive)
  private _deathCarIndex: number = -1;

  // Callback when chicken is hit by a car
  private _onChickenHitCallback: (() => void) | null = null;

  /**
   * Per-frame update
   */
  lateUpdate(deltaTime: number) {
    if (!this.bariersController) {
      return;
    }

    // Update barrier cache if needed
    if (this._bariersCacheDirty) {
      this.updateBariersCache();
      this._bariersCacheDirty = false;
    }

    const cars = this.cars;
    const carsLength = cars.length;

    // Process each car
    for (let i = 0; i < carsLength; i++) {
      const car = cars[i];
      if (!car || !car.node) {
        continue;
      }

      // If this is the death car — skip barrier interaction (it must pass through)
      // Chicken collision is handled via Car stop target
      if (i === this._deathCarIndex) {
        continue;
      }

      // Get barrier from cache
      const barier = i < this._bariersCache.length ? this._bariersCache[i] : null;

      // Handle interaction with barrier
      this.handleCarBarierInteraction(car, barier);

      // Check car sound for the next car after chicken's current luk
      this.checkCarSound(car, i);
    }
  }

  /**
   * Update barrier cache
   */
  private updateBariersCache(): void {
    if (!this.bariersController) {
      this._bariersCache = [];
      return;
    }

    const maxIndex = Math.max(this.cars.length - 1, 0);
    this._bariersCache.length = 0;

    for (let i = 0; i <= maxIndex; i++) {
      this._bariersCache.push(this.bariersController.getBarier(i));
    }
  }

  /**
   * Handle car-barrier interaction
   */
  private handleCarBarierInteraction(car: Car, barier: Node | null): void {
    // If car is being destroyed — skip
    if (car.getIsDestroying()) {
      return;
    }

    // If no barrier or inactive — resume movement
    if (!barier || !barier.active) {
      if (!car.getIsMoving()) {
        car.resumeMovement();
      }
      return;
    }

    // Get world positions
    const carWorldY = car.node.worldPosition.y;
    const barierWorldY = barier.worldPosition.y;
    const distanceToBarier = carWorldY - barierWorldY;

    // Target distance: car should be stopDistance above barrier
    const targetDistance = this.stopDistance;
    const distanceError = Math.abs(distanceToBarier - targetDistance);

    // Ensure car didn't pass too far
    // Barrier zone: barierY - stopDistance/4 <= carY <= barierY + stopDistance
    const minBarierY = barierWorldY - this.stopDistance / 4;

    if (carWorldY < minBarierY) {
      // Car is too far down, outside barrier zone — just resume if needed
      if (!car.getIsMoving()) {
        car.resumeMovement();
      }
      return;
    }

    // If car is at/below stopDistance (and not too far)
    if (distanceToBarier <= this.stopDistance) {
      // If already stopped and within epsilon — do nothing
      if (!car.getIsMoving() && distanceError <= this.positionEpsilon) {
        return;
      }

      // Stop first to avoid jitter
      if (car.getIsMoving()) {
        car.stopMovement();
      }

      // Snap back only if beyond epsilon and not destroying to avoid jitter
      if (distanceError > this.positionEpsilon && !car.getIsDestroying()) {
        // Compute target world Y: exactly stopDistance above barrier
        const targetWorldY = barierWorldY + this.stopDistance;

        // Current local position
        Vec3.copy(this._tempVec3_1, car.node.position);

        // World/local Y diff
        const worldYDifference = targetWorldY - carWorldY;

        // Apply difference to local position
        const newLocalY = this._tempVec3_1.y + worldYDifference;

        // Set new local position
        car.node.setPosition(this._tempVec3_1.x, newLocalY, this._tempVec3_1.z);
      }
    }
    // If car is far from barrier
    else {
      // Resume movement
      if (!car.getIsMoving()) {
        car.resumeMovement();
      }
    }
  }

  /**
   * Check and play car sound when crossing Y=900.
   * Volume depends on distance to chicken (max 0.5, min 0).
   */
  private checkCarSound(car: Car, carIndex: number): void {
    if (!this.chicken || !car || !car.node || !car.node.active) {
      return;
    }

    // Current car Y
    const carY = car.node.worldPosition.y;

    // Init previous array if needed
    while (this._previousCarY.length <= carIndex) {
      this._previousCarY.push(carY);
    }

    const prevY = this._previousCarY[carIndex];

    // Detect crossing threshold 900 by Y (from > to <=)
    if (prevY > 900 && carY <= 900) {
      // Distance to chicken
      const chickenY = this.chicken.node.worldPosition.y;
      const distance = Math.abs(carY - chickenY);

      // Compute volume by distance (0..0.5)
      const volume = Math.max(0, Math.min(0.5, 0.5 * (1 - distance / this.maxSoundDistance)));

      // Play the sound
      GlobalEventBus.publish({ type: EVT_PLAY_SOUND, soundType: 'car', volume: volume });
    }

    // Save current position for next frame
    this._previousCarY[carIndex] = carY;
  }

  /** Get car by index */
  public getCar(index: number): Car | null {
    if (index >= 0 && index < this.cars.length) {
      return this.cars[index];
    }
    return null;
  }

  /** Get cars count */
  public getCarsCount(): number {
    return this.cars.length;
  }

  /** Add a car to the array */
  public addCar(car: Car): void {
    if (car && this.cars.indexOf(car) === -1) {
      this.cars.push(car);
    }
  }

  /** Remove a car from the array */
  public removeCar(car: Car): void {
    const index = this.cars.indexOf(car);
    if (index !== -1) {
      this.cars.splice(index, 1);
    }
  }

  /** Stop all cars */
  public stopAllCars(): void {
    this.cars.forEach((car) => {
      if (car) {
        car.stopMovement();
      }
    });
  }

  /** Resume all cars */
  public resumeAllCars(): void {
    this.cars.forEach((car) => {
      if (car) {
        car.resumeMovement();
      }
    });
  }

  /** Reset all cars (e.g. for restart) */
  public reset(): void {
    this.cars.forEach((car) => {
      if (car) {
        car.reset();
      }
    });

    // Reset stored positions
    this._previousCarY = [];
  }

  /** Set BariersController */
  public setBariersController(controller: BariersController): void {
    this.bariersController = controller;
    this._bariersCacheDirty = true; // Mark cache as dirty
  }

  /** Invalidate barrier cache (call when barriers change) */
  public invalidateBariersCache(): void {
    this._bariersCacheDirty = true;
  }

  /**
   * Boosts a car by index to guarantee hitting the chicken.
   * The car ignores barriers and moves at max speed.
   * If the car is near/below the chicken it first goes off-screen down,
   * then teleports above and rushes down to the chicken.
   * The car stops exactly at chicken's world Y, covering it.
   */
  public boostCarForDeath(carIndex: number, onHit: () => void): void {
    if (carIndex < 0 || carIndex >= this.cars.length) {
      return;
    }

    const car = this.cars[carIndex];
    if (!car || !car.node) {
      return;
    }

    this._deathCarIndex = carIndex;
    this._onChickenHitCallback = onHit;

    // Get chicken world Y
    let chickenWorldY = 0;
    if (this.chicken && this.chicken.node) {
      chickenWorldY = this.chicken.node.worldPosition.y;
    }

    // Minimum distance above in world coordinates
    const minDistanceAbove = 400;
    const carWorldY = car.node.worldPosition.y;

    // Stop exactly on the chicken (world coordinates)
    const stopCallback = () => {
      this._deathCarIndex = -1;
      if (this._onChickenHitCallback) {
        const callback = this._onChickenHitCallback;
        this._onChickenHitCallback = null;
        callback();
      }
    };

    // If car is already well above the chicken — just boost
    if (carWorldY > chickenWorldY + minDistanceAbove) {
      car.setSpeed(this.deathBoostSpeed);
      car.setStopTarget(this.chicken.node, stopCallback);
      car.invalidatePositionCache();
      car.resumeMovement();
      return;
    }

    // Car is close/below — send it down, then spawn above and rush down
    // Stop normal movement
    car.stopMovement();

    // Compute world/local Y difference before teleport
    const worldLocalDiff = carWorldY - car.node.position.y;

    // Teleport below screen immediately (invisible)
    const currentPos = car.node.getPosition();
    const belowScreenY = car.getBottomBoundary() - 200;
    car.node.setPosition(currentPos.x, belowScreenY, currentPos.z);
    car.invalidatePositionCache();

    // After a short delay, teleport above and start moving fast
    this.scheduleOnce(() => {
      // Place the car above the chicken (local coords)
      const spawnLocalY = chickenWorldY + minDistanceAbove - worldLocalDiff;
      car.node.setPosition(currentPos.x, spawnLocalY, currentPos.z);
      car.invalidatePositionCache();
      car.setSpeed(this.deathBoostSpeed);
      car.setStopTarget(this.chicken.node, stopCallback);
      car.resumeMovement();
    }, 0.15);
  }

  /** Cleanup on destroy */
  protected onDestroy(): void {
    this.cars = [];
    this._bariersCache = [];
    this._onChickenHitCallback = null;
  }
}
