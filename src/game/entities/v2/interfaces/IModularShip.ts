import type { Vector2D } from '../../../../engine/interfaces/IPhysicsSystem';
import type { IShipStructure } from './IShipStructure';

/**
 * Main ship interface for the redesigned composite ship system
 * Following Interface Segregation Principle - focused, minimal interface
 */
export interface IModularShip {
  readonly id: string;
  readonly structure: IShipStructure;
  readonly position: Vector2D;
  readonly rotation: number;
  readonly isDestroyed: boolean;
  readonly isAlive: boolean;
  readonly physicsBodyId: string | null;
  // Physics
  readonly velocity: Vector2D;
  setPosition(position: Vector2D): void;
  setRotation(rotation: number): void;
  setAngularVelocity(angularVelocity: number): void;
  applyForce(force: Vector2D): void;

  // Damage system
  takeDamageAtPosition(worldPosition: Vector2D, amount: number): boolean;
  takeDamageAtComponent(componentId: string, amount: number): boolean;
  takeDamageAtPartIndex(partIndex: number, amount: number): boolean;

  // State management
  update(deltaTime: number): void;
  destroy(): void;
}

/**
 * Configuration for ship creation
 */
export interface ModularShipConfig {
  readonly id: string;
  readonly position: Vector2D;
  readonly gridSize: number;
  readonly componentSize: number;
  readonly cockpitPosition: { x: number; y: number };
  readonly componentPositions: ReadonlyArray<{ x: number; y: number }>;
}
