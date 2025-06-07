import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

export type AsteroidSize = 'large' | 'medium' | 'small';

/**
 * Asteroid class - Represents an asteroid in the game
 * Following Single Responsibility Principle - handles only asteroid-specific logic
 */
export class Asteroid {
  public readonly entity: Entity;
  public readonly size: AsteroidSize;
  public readonly velocity: Vector2D;
  public readonly baseRadius: number;
  private readonly onDestroy: (asteroid: Asteroid) => void;

  constructor(
    entity: Entity,
    size: AsteroidSize,
    velocity: Vector2D,
    baseRadius: number,
    onDestroy: (asteroid: Asteroid) => void
  ) {
    this.entity = entity;
    this.size = size;
    this.velocity = velocity;
    this.baseRadius = baseRadius;
    this.onDestroy = onDestroy;
  }

  /**
   * Get the collision radius for this asteroid
   */
  public get collisionRadius(): number {
    switch (this.size) {
      case 'large':
        return this.baseRadius;
      case 'medium':
        return this.baseRadius * 0.625; // 25/40
      case 'small':
        return this.baseRadius * 0.375; // 15/40
      default:
        return this.baseRadius;
    }
  }

  /**
   * Get the score value for destroying this asteroid
   */
  public get scoreValue(): number {
    switch (this.size) {
      case 'large':
        return 20;
      case 'medium':
        return 50;
      case 'small':
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Check if this asteroid can break into smaller pieces
   */
  public get canBreak(): boolean {
    return this.size !== 'small';
  }

  /**
   * Get the size that this asteroid breaks into
   */
  public get breakIntoSize(): AsteroidSize | null {
    switch (this.size) {
      case 'large':
        return 'medium';
      case 'medium':
        return 'small';
      default:
        return null;
    }
  }

  /**
   * Get the number of pieces this asteroid breaks into
   */
  public get breakIntoPieces(): number {
    return this.canBreak ? 2 : 0;
  }

  /**
   * Destroy the asteroid and notify the callback
   */
  public destroy(): void {
    this.onDestroy(this);
  }
}
