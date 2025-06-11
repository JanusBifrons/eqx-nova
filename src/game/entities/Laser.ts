import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

/**
 * Laser class - Represents a laser projectile in the asteroids game
 * Following Single Responsibility Principle - handles only laser-specific logic
 */
export class Laser {
  public readonly entity: Entity;

  public readonly velocity: Vector2D;

  private lifeTimeRemaining: number;

  private readonly onDestroy: (laser: Laser) => void;

  constructor(
    entity: Entity,
    velocity: Vector2D,
    lifeTime: number,
    onDestroy: (laser: Laser) => void
  ) {
    this.entity = entity;
    this.velocity = velocity;
    this.lifeTimeRemaining = lifeTime;
    this.onDestroy = onDestroy;
  }

  /**
   * Update the laser - decreases lifetime and handles self-destruction
   * @param deltaTime Time since last update in milliseconds
   * @returns true if the laser should be removed
   */
  public update(deltaTime: number): boolean {
    this.lifeTimeRemaining -= deltaTime;

    if (this.lifeTimeRemaining <= 0) {
      this.destroy();

      return true;
    }
return false;
  }

  /**
   * Destroy the laser and notify the callback
   */
  public destroy(): void {
    this.onDestroy(this);
  }

  /**
   * Check if the laser has expired
   */
  public get isExpired(): boolean {
    return this.lifeTimeRemaining <= 0;
  }

  /**
   * Get remaining lifetime as a percentage (0-1)
   */
  public get lifeTimePercentage(): number {
    return Math.max(0, this.lifeTimeRemaining / 2000); // Assuming 2000ms max lifetime
  }
}
