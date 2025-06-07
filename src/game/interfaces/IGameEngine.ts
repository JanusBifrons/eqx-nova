import type { Entity } from '../../engine/entity';
import type {
  Vector2D,
  CollisionEvent,
} from '../../engine/interfaces/IPhysicsSystem';
import type { KeyboardInputEvent } from '../../engine/input';

/**
 * Game-specific engine interface following Interface Segregation Principle
 * Only exposes what the game layer actually needs
 */
export interface IGameEngine {
  // Entity creation
  createTriangularShip(position: Vector2D, size: number): Entity;
  createAsteroid(
    position: Vector2D,
    size: number,
    vertices: Vector2D[]
  ): Entity;
  createLaser(position: Vector2D, radius: number): Entity;

  // Entity management
  removeEntity(entityId: string): void;

  // Physics operations (abstracted)
  applyForceToEntity(entity: Entity, force: Vector2D): void;
  setEntityRotation(entity: Entity, rotation: number): void;
  setEntityPosition(entity: Entity, position: Vector2D): void;
  wrapEntityPosition(
    entity: Entity,
    bounds: { width: number; height: number }
  ): void;

  // World properties
  getWorldDimensions(): { width: number; height: number };

  // Event handling
  onInput(callback: (event: KeyboardInputEvent) => void): void;
  onCollision(callback: (event: CollisionEvent) => void): void;

  // Physics configuration
  configurePhysics(config: PhysicsConfig): void;
}

export interface PhysicsConfig {
  gravity?: Vector2D;
  airResistance?: number;
}
