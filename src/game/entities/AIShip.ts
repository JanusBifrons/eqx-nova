import type { ICompositeShip } from '../interfaces/ICompositeShip';
import type { IAIShip, IAIBehavior } from '../interfaces/IAI';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

/**
 * AIShip - Represents an AI-controlled ship
 * Following Single Responsibility Principle: manages only AI ship state
 * Following Composition Pattern: uses AIBehavior for decision making
 */
export class AIShip implements IAIShip {
  private readonly _id: string;

  private readonly _ship: ICompositeShip;

  private readonly _behavior: IAIBehavior;

  private readonly _faction: string;

  private _isActive: boolean = true;

  private _onFireLaser?: () => boolean;

  constructor(
    id: string,
    ship: ICompositeShip,
    behavior: IAIBehavior,
    faction: string,
    onFireLaser?: () => boolean
  ) {
    this._id = id;
    this._ship = ship;
    this._behavior = behavior;
    this._faction = faction;
    this._onFireLaser = onFireLaser;
  }

  public get id(): string {
    return this._id;
  }

  public get ship(): ICompositeShip {
    return this._ship;
  }

  public get behavior(): IAIBehavior {
    return this._behavior;
  }

  public get faction(): string {
    return this._faction;
  }

  public get isActive(): boolean {
    return this._isActive && this._ship.isAlive && this._behavior.isActive;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Update behavior (handles movement and decision making)
    this._behavior.update(deltaTime);

    // Handle firing
    if (this._behavior.shouldFire()) {
      this.fireLaser();
    }
    // Update the ship itself
    this._ship.update(deltaTime);
  }

  public setTarget(target: Vector2D | ICompositeShip | null): void {
    this._behavior.setTarget(target);
  }

  public fireLaser(): boolean {
    if (!this.isActive || !this._onFireLaser) return false;

    const success = this._onFireLaser();

    if (success) {
      // Record that we fired to update the behavior's timing
      this._behavior.recordFired();
      console.log(`AI ship ${this._id} fired laser!`);
    }

    return success;
  }

  public takeDamage(): boolean {
    if (!this.isActive) return false;

    const wasDestroyed = this._ship.takeDamage();

    if (wasDestroyed || !this._ship.isAlive) {
      this.destroy();

      return true;
    }
    return false;
  }

  public destroy(): void {
    this._isActive = false;
    this._behavior.destroy();

    if (this._ship.isAlive) {
      this._ship.destroy();
    }
  }

  /**
   * Check if this AI ship can attack the given target
   */
  public canAttack(target: ICompositeShip): boolean {
    if (!this.isActive) return false;

    // For now, AI ships attack anyone who isn't their faction
    // In a more complex game, this could check alliances, etc.
    return target.isAlive;
  }

  /**
   * Get the forward firing position for this ship
   */
  public getFiringPosition(): Vector2D {
    const position = this._ship.centerPosition;
    const rotation = this._ship.rotation;
    const offset = 25; // Distance in front of ship

    return {
      x: position.x + Math.cos(rotation) * offset,
      y: position.y + Math.sin(rotation) * offset,
    };
  }

  /**
   * Get the current velocity for laser inheritance
   */
  public getVelocity(): Vector2D {
    return this._ship.velocity;
  }
}
