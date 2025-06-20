import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
// import type { ICompositeShip } from '../interfaces/ICompositeShip'; // Removed - old system
import type { IAIBehavior, AIBehaviorConfig } from '../interfaces/IAI';

/**
 * AIBehavior - Base implementation for AI ship behavior
 * Following Single Responsibility Principle: manages only AI decision making
 * Following Strategy Pattern: different behaviors can be swapped
 */
export class AIBehavior implements IAIBehavior {
  private readonly _id: string;

  private readonly _ship: any; // TODO: Migrate to IModularShip

  private readonly _config: AIBehaviorConfig;

  private _target: Vector2D | any | null = null; // TODO: Migrate to IModularShip

  private _isActive: boolean = true;

  private _isDisabled: boolean = false; // New flag to disable AI for testing

  private _lastFireTime: number = 0;

  private _patrolPoints: Vector2D[] = [];

  private _currentPatrolIndex: number = 0;

  private _lastTargetScan: number = 0;

  constructor(id: string, ship: any, config: AIBehaviorConfig) {
    // TODO: Migrate to IModularShip
    this._id = id;
    this._ship = ship;
    this._config = config;

    // Initialize patrol points for patrol behavior
    if (config.behaviorType === 'patrol') {
      this.initializePatrolPoints();
    }
  }

  public get id(): string {
    return this._id;
  }

  public get ship(): any {
    // TODO: Migrate to IModularShip
    return this._ship;
  }

  public get target(): Vector2D | any | null {
    // TODO: Migrate to IModularShip
    return this._target;
  }

  public get isActive(): boolean {
    return this._isActive && this._ship.isAlive;
  }

  /**
   * Disable AI movement and shooting for testing
   */
  public disable(): void {
    this._isDisabled = true;
  }

  /**
   * Enable AI movement and shooting
   */
  public enable(): void {
    this._isDisabled = false;
  }

  /**
   * Check if AI is disabled
   */
  public get isDisabled(): boolean {
    return this._isDisabled;
  }

  public get lastFireTime(): number {
    return this._lastFireTime;
  }

  public setTarget(target: Vector2D | any | null): void {
    // TODO: Migrate to IModularShip
    this._target = target;

    // Debug logging for target setting
    if (target && Math.random() < 0.01) {
      // 1% chance to log
      if ('position' in target) {
        const pos = target.position;
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          console.log(
            `AI ${this._id}: set ship target at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`
          );
        }
      } else if ('centerPosition' in target) {
        const pos = target.centerPosition;
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          console.log(
            `AI ${this._id}: set ship target at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`
          );
        }
      } else if (target.x !== undefined && target.y !== undefined) {
        console.log(
          `AI ${this._id}: set position target at (${target.x.toFixed(1)}, ${target.y.toFixed(1)})`
        );
      }
    }
  }

  public activate(): void {
    this._isActive = true;
  }

  public deactivate(): void {
    this._isActive = false;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Scan for targets periodically
    const now = performance.now();

    if (now - this._lastTargetScan > 1000) {
      // Scan every second
      this.scanForTargets();
      this._lastTargetScan = now;
    }
    // Update behavior based on type
    switch (this._config.behaviorType) {
      case 'aggressive':
        this.updateAggressiveBehavior(deltaTime);
        break;
      case 'defensive':
        this.updateDefensiveBehavior(deltaTime);
        break;
      case 'patrol':
        this.updatePatrolBehavior(deltaTime);
        break;
      case 'hunter':
        this.updateHunterBehavior(deltaTime);
        break;
    }
    // Apply movement based on decisions
    this.applyMovement(deltaTime);
  }

  public destroy(): void {
    this._isActive = false;
    this._target = null;
  }

  public shouldFire(): boolean {
    if (!this._target || !this.isActive || this._isDisabled) return false;

    const now = performance.now();

    if (now - this._lastFireTime < this._config.fireRate) return false;

    const targetPos = this.getTargetPosition();

    if (!targetPos) return false;

    const distance = this.getDistanceToTarget();
    const angle = this.getAngleToTarget();
    const shipAngle = this._ship.rotation;

    // Check if target is in range and roughly in front of ship
    const angleDiff = Math.abs(this.normalizeAngle(angle - shipAngle));
    const inRange = distance < this._config.detectionRange;
    const inCone = angleDiff < Math.PI / 6; // 30 degree cone

    const shouldFire = inRange && inCone;

    // Debug logging (occasionally to avoid spam)
    if (Math.random() < 0.001) {
      // 0.1% chance to log
      console.log(
        `AI ${this._id}: target distance=${distance.toFixed(1)}, angleDiff=${((angleDiff * 180) / Math.PI).toFixed(1)}°, shouldFire=${shouldFire}`
      );
    }
    return shouldFire;
  }

  public shouldRotate(): boolean {
    if (!this.isActive || this._isDisabled) return false;

    const targetAngle = this.getDesiredRotation();
    const currentAngle = this._ship.rotation;
    const angleDiff = Math.abs(this.normalizeAngle(targetAngle - currentAngle));

    return angleDiff > 0.1; // Rotate if more than ~6 degrees off
  }

  public shouldThrust(): boolean {
    if (!this.isActive || this._isDisabled) return false;

    const targetPos = this.getTargetPosition();

    if (!targetPos) return false;

    const distance = this.getDistanceToTarget();
    const velocity = this._ship.velocity;
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

    // Thrust if we're far from target and not moving too fast
    return distance > 100 && speed < this._config.maxSpeed;
  }

  public getDesiredRotation(): number {
    const targetPos = this.getTargetPosition();

    if (!targetPos) return this._ship.rotation;

    return this.getAngleToTarget();
  }

  public recordFired(): void {
    this._lastFireTime = performance.now();
  }

  private scanForTargets(): void {
    // In a real implementation, this would scan for nearby enemy ships
    // For now, we'll keep the current target if it exists
    // This method can be extended to detect other AI ships or the player
  }

  private updateAggressiveBehavior(_deltaTime: number): void {
    // Aggressive AI: Always pursues and attacks targets
    if (!this._target) {
      // Look for the closest enemy (in a full implementation)
      // For now, stay put or patrol randomly
      this.randomMovement();
    }
  }

  private updateDefensiveBehavior(_deltaTime: number): void {
    // Defensive AI: Only attacks when threatened, otherwise holds position
    if (this._target) {
      const distance = this.getDistanceToTarget();

      if (distance > this._config.detectionRange * 0.8) {
        // Target is far, disengage
        this._target = null;
      }
    }
  }

  private updatePatrolBehavior(_deltaTime: number): void {
    // Patrol AI: Moves between patrol points, attacks if threatened
    if (!this._target) {
      this.updatePatrolMovement();
    }
    // If target found, switch to aggressive mode temporarily
  }

  private updateHunterBehavior(_deltaTime: number): void {
    // Hunter AI: Actively seeks and pursues targets
    if (!this._target) {
      // Search pattern - in a full implementation, this would actively hunt
      this.searchMovement();
    }
  }

  private applyMovement(deltaTime: number): void {
    if (!this.isActive || this._isDisabled) return;

    // Apply rotation
    if (this.shouldRotate()) {
      const targetAngle = this.getDesiredRotation();
      const currentAngle = this._ship.rotation;
      const angleDiff = this.normalizeAngle(targetAngle - currentAngle);

      const rotationStep = this._config.rotationSpeed * deltaTime;
      const newAngle =
        currentAngle +
        Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationStep);

      this._ship.setRotation(newAngle);
    }
    // Apply thrust
    this._ship.setThrust(this.shouldThrust());

    // Note: Firing is handled by AIShip class, not here
    // The shouldFire() method is called by AIShip to determine when to fire
  }

  private getTargetPosition(): Vector2D | null {
    if (!this._target) return null;

    if ('position' in this._target) {
      return this._target.position;
    } else if ('centerPosition' in this._target) {
      return this._target.centerPosition;
    } else {
      return this._target as Vector2D;
    }
  }

  private getDistanceToTarget(): number {
    const targetPos = this.getTargetPosition();

    if (!targetPos) return Infinity;

    const shipPos = this._ship.position;

    return Math.sqrt(
      (targetPos.x - shipPos.x) ** 2 + (targetPos.y - shipPos.y) ** 2
    );
  }

  private getAngleToTarget(): number {
    const targetPos = this.getTargetPosition();

    if (!targetPos) return this._ship.rotation;

    const shipPos = this._ship.position;

    return Math.atan2(targetPos.y - shipPos.y, targetPos.x - shipPos.x);
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;

    while (angle < -Math.PI) angle += 2 * Math.PI;

    return angle;
  }

  private initializePatrolPoints(): void {
    // Handle both old and new ship systems
    const shipPos = this._ship.position;
    if (!shipPos) {
      console.warn(
        'AIBehavior: Ship has no position property, skipping patrol initialization'
      );
      return;
    }

    const radius = 200;

    // Create 4 patrol points in a square pattern
    this._patrolPoints = [
      { x: shipPos.x + radius, y: shipPos.y + radius },
      { x: shipPos.x - radius, y: shipPos.y + radius },
      { x: shipPos.x - radius, y: shipPos.y - radius },
      { x: shipPos.x + radius, y: shipPos.y - radius },
    ];
  }

  private updatePatrolMovement(): void {
    if (this._patrolPoints.length === 0) return;

    const currentTarget = this._patrolPoints[this._currentPatrolIndex];
    // Use position for unified ship system
    const shipPos = this._ship.position;
    const distance = Math.sqrt(
      (currentTarget.x - shipPos.x) ** 2 + (currentTarget.y - shipPos.y) ** 2
    );

    if (distance < 50) {
      // Reached patrol point, move to next
      this._currentPatrolIndex =
        (this._currentPatrolIndex + 1) % this._patrolPoints.length;
    }
    // Set current patrol point as temporary target
    this.setTarget(currentTarget);
  }

  private randomMovement(): void {
    // Simple random movement for aggressive AI without targets
    if (Math.random() < 0.01) {
      // 1% chance per update to change direction
      const randomAngle = Math.random() * 2 * Math.PI;
      const randomDistance = 100 + Math.random() * 200;
      // Use position for unified ship system
      const shipPos = this._ship.position;

      this.setTarget({
        x: shipPos.x + Math.cos(randomAngle) * randomDistance,
        y: shipPos.y + Math.sin(randomAngle) * randomDistance,
      });
    }
  }

  private searchMovement(): void {
    // Search pattern for hunter AI
    const now = performance.now();
    const searchRadius = 150;
    const searchSpeed = 0.001; // radians per millisecond

    const angle = (now * searchSpeed) % (2 * Math.PI);
    // Use position for unified ship system
    const shipPos = this._ship.position;

    this.setTarget({
      x: shipPos.x + Math.cos(angle) * searchRadius,
      y: shipPos.y + Math.sin(angle) * searchRadius,
    });
  }
}
