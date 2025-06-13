import type { Entity } from '../../../../engine/entity';

/**
 * Grid position for components in ship construction
 */
export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Simplified ship component interface for the redesigned system
 * Following Interface Segregation Principle - minimal, focused interface
 */
export interface IShipComponent {
  readonly id: string;
  readonly entity: Entity;
  readonly gridPosition: GridPosition;
  readonly size: number;
  readonly isDestroyed: boolean;
  readonly health: number;
  readonly maxHealth: number;

  // State management
  takeDamage(amount: number): boolean;
  destroy(): void;

  // Visual feedback
  flashDamage(): void;
  update(deltaTime: number): void;
}
