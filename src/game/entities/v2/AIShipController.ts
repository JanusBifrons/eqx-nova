import type { IShip, IShipController } from './interfaces/IShip';
import type { Vector2D } from '../../../engine/interfaces/IPhysicsSystem';
import type { IAIBehavior } from '../../interfaces/IAI';

/**
 * AI Ship Controller - Handles AI behavior for ship control
 * This controller uses AI behavior patterns to control the ship
 */
export class AIShipController implements IShipController {
  private _ship: IShip;
  private _id: string;
  private _isActive: boolean = true;
  private _behavior: IAIBehavior;
  private _faction: string;

  // AI control parameters (configurable per ship type)
  private readonly ROTATION_SPEED: number;
  private readonly THRUST_FORCE: number;

  constructor(
    ship: IShip,
    behavior: IAIBehavior,
    faction: string,
    config?: {
      rotationSpeed?: number;
      thrustForce?: number;
    }
  ) {
    this._ship = ship;
    this._id = `ai_controller_${ship.id}`;
    this._behavior = behavior;
    this._faction = faction;

    // Set AI-specific parameters (different from player)
    this.ROTATION_SPEED = config?.rotationSpeed ?? 0.002; // Slightly slower than player
    this.THRUST_FORCE = config?.thrustForce ?? 0.003; // Slightly weaker than player
  }

  public get id(): string {
    return this._id;
  }

  public get ship(): IShip {
    return this._ship;
  }

  public get isActive(): boolean {
    return this._isActive && this._ship.isAlive && this._behavior.isActive;
  }

  public get behavior(): IAIBehavior {
    return this._behavior;
  }

  public get faction(): string {
    return this._faction;
  }

  /**
   * Get the controlled ship
   */
  public getShip(): IShip {
    return this._ship;
  }

  // IShipController interface implementation
  public turnLeft(): void {
    if (!this.isActive) return;

    // Apply left rotation to ship
    this._ship.setAngularVelocity(-this.ROTATION_SPEED);
  }

  public turnRight(): void {
    if (!this.isActive) return;

    // Apply right rotation to ship
    this._ship.setAngularVelocity(this.ROTATION_SPEED);
  }

  public thrust(): void {
    if (!this.isActive) return;

    // Apply thrust force in the direction the ship is facing
    const currentAngle = this._ship.rotation;
    const thrustVector = {
      x: Math.cos(currentAngle) * this.THRUST_FORCE,
      y: Math.sin(currentAngle) * this.THRUST_FORCE,
    };
    this._ship.applyForce(thrustVector);
  }

  public stopThrust(): void {
    // AI doesn't explicitly stop thrust - it just stops calling thrust()
    // This could be enhanced with active braking if needed
  }

  public fire(): boolean {
    if (!this.isActive || !this._ship.canFireWeapons()) {
      return false;
    }

    // Record that we fired to update the behavior's timing
    this._behavior.recordFired();
    this._ship.recordWeaponsFired();
    return true;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Update AI behavior (makes decisions about what to do)
    this._behavior.update(deltaTime);

    // Apply AI decisions to ship controls
    this.applyAIDecisions();

    // Update the ship itself
    this._ship.update(deltaTime);
  }

  /**
   * Apply AI behavior decisions to ship controls
   */
  private applyAIDecisions(): void {
    if (!this.isActive) return;

    // Check if AI wants to rotate
    if (this._behavior.shouldRotate()) {
      const desiredRotation = this.getDesiredRotation();
      const currentRotation = this._ship.rotation;
      const angleDiff = this.normalizeAngle(desiredRotation - currentRotation);

      if (angleDiff > 0.1) {
        this.turnRight();
      } else if (angleDiff < -0.1) {
        this.turnLeft();
      }
    }

    // Check if AI wants to thrust
    if (this._behavior.shouldThrust()) {
      this.thrust();
    }

    // Check if AI wants to fire
    if (this._behavior.shouldFire()) {
      this.fire();
    }
  }

  /**
   * Get the rotation the AI wants to face
   */
  private getDesiredRotation(): number {
    const target = this._behavior.target;
    if (!target) return this._ship.rotation;

    const shipPos = this._ship.position;
    const targetPos = this.getTargetPosition(target);

    if (!targetPos) return this._ship.rotation;

    return Math.atan2(targetPos.y - shipPos.y, targetPos.x - shipPos.x);
  }

  /**
   * Get position from target (which might be a ship or a position)
   */
  private getTargetPosition(target: any): Vector2D | null {
    if (!target) return null;

    // If target has centerPosition (old ship format)
    if ('centerPosition' in target && target.centerPosition) {
      return target.centerPosition;
    }

    // If target has position (new ship format)
    if ('position' in target && target.position) {
      return target.position;
    }

    // If target is a plain Vector2D
    if (target.x !== undefined && target.y !== undefined) {
      return target;
    }

    return null;
  }

  /**
   * Normalize angle to [-π, π] range
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  /**
   * Set target for AI behavior
   */
  public setTarget(target: Vector2D | any | null): void {
    this._behavior.setTarget(target);
  }

  /**
   * Check if this AI can attack the given target
   */
  public canAttack(target: any): boolean {
    if (!this.isActive) return false;

    // For now, AI ships attack anyone who isn't their faction
    // In a more complex game, this could check alliances, etc.
    return target && target.isAlive;
  }

  /**
   * Take damage and handle destruction
   */
  public takeDamage(): boolean {
    if (!this.isActive) return false;

    // Delegate to ship's damage system
    const wasDestroyed = this._ship.takeDamageAtPartIndex(0, 25);

    if (wasDestroyed || !this._ship.isAlive) {
      this.destroy();
      return true;
    }

    return false;
  }

  public destroy(): void {
    this._isActive = false;
    this._behavior.destroy();
  }
}
