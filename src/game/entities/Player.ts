import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

/**
 * Player class - Represents the player ship in the asteroids game
 * Following Single Responsibility Principle - handles only player-specific logic
 */
export class Player {
  public readonly entity: Entity;
  private _rotation: number = 0;
  private _thrust: boolean = false;
  private _lives: number = 3;
  private _isInvulnerable: boolean = false;
  private _invulnerabilityTimer: number = 0;
  private readonly INVULNERABILITY_DURATION = 3000; // 3 seconds
  private readonly onDestroy: (player: Player) => void;

  constructor(entity: Entity, onDestroy: (player: Player) => void) {
    this.entity = entity;
    this.onDestroy = onDestroy;
  }

  /**
   * Get current rotation in radians
   */
  public get rotation(): number {
    return this._rotation;
  }

  /**
   * Set rotation in radians
   */
  public set rotation(angle: number) {
    this._rotation = angle;
  }

  /**
   * Get thrust state
   */
  public get thrust(): boolean {
    return this._thrust;
  }

  /**
   * Set thrust state
   */
  public set thrust(thrusting: boolean) {
    this._thrust = thrusting;
  }

  /**
   * Get number of lives remaining
   */
  public get lives(): number {
    return this._lives;
  }

  /**
   * Check if player is invulnerable
   */
  public get isInvulnerable(): boolean {
    return this._isInvulnerable;
  }

  /**
   * Check if player is alive
   */
  public get isAlive(): boolean {
    return this._lives > 0;
  }

  /**
   * Get collision radius for the player ship
   */
  public get collisionRadius(): number {
    return 10; // Radius for collision detection
  }

  /**
   * Update player logic
   * @param deltaTime Time since last update in milliseconds
   */
  public update(deltaTime: number): void {
    if (this._isInvulnerable) {
      this._invulnerabilityTimer -= deltaTime;
      if (this._invulnerabilityTimer <= 0) {
        this._isInvulnerable = false;
        this._invulnerabilityTimer = 0;
      }
    }
  }

  /**
   * Take damage (lose a life)
   * @returns true if the player died
   */
  public takeDamage(): boolean {
    if (this._isInvulnerable) {
      return false;
    }

    this._lives--;

    if (this._lives > 0) {
      // Make player temporarily invulnerable
      this._isInvulnerable = true;
      this._invulnerabilityTimer = this.INVULNERABILITY_DURATION;
      return false;
    } else {
      this.destroy();
      return true;
    }
  }

  /**
   * Reset player position and state after respawn
   * @param position New position to spawn at
   */
  public respawn(position: Vector2D): void {
    this._rotation = 0;
    this._thrust = false;
    this._isInvulnerable = true;
    this._invulnerabilityTimer = this.INVULNERABILITY_DURATION;

    // Position will be set by the game manager
  }

  /**
   * Get the forward direction vector based on current rotation
   */
  public get forwardDirection(): Vector2D {
    return {
      x: Math.cos(this._rotation),
      y: Math.sin(this._rotation),
    };
  }

  /**
   * Destroy the player and notify the callback
   */
  public destroy(): void {
    this.onDestroy(this);
  }
}
