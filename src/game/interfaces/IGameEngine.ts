import type { Entity } from '../../engine/entity';
import type {
  Vector2D,
  CollisionEvent,
} from '../../engine/interfaces/IPhysicsSystem';
import type { KeyboardInputEvent } from '../../engine/input';
import type { ICameraSystem } from '../../engine/interfaces/ICamera';
import type { IModularShip } from '../entities/v2/interfaces/IModularShip';

/**
 * Game-specific engine interface following Interface Segregation Principle
 * Only exposes what the game layer actually needs
 */
export interface IGameEngine {
  // Entity creation
  createTriangularShip(position: Vector2D, size: number): Entity;
  createModularShip(position: Vector2D, shipType?: string): IModularShip;
  createAsteroid(
    position: Vector2D,
    size: number,
    vertices: Vector2D[],
    isStatic?: boolean
  ): Entity;
  createLaser(position: Vector2D, width: number, height: number): Entity;

  // Debug utilities
  createDebugMarker(position: Vector2D, color?: number): Entity;

  // Entity management
  removeEntity(entityId: string): void;

  // Physics operations (abstracted)
  applyForceToEntity(entity: Entity, force: Vector2D): void;
  setEntityRotation(entity: Entity, rotation: number): void;
  setEntityPosition(entity: Entity, position: Vector2D): void;
  setEntityVelocity(entity: Entity, velocity: Vector2D): void;
  getEntityVelocity(entity: Entity): Vector2D | null;
  setEntityAngularVelocity(entity: Entity, angularVelocity: number): void;
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

  // Camera operations
  getCameraSystem(): ICameraSystem;
  lookAt(target: Vector2D | Entity): void;

  // Input operations
  getMousePosition(): Vector2D | null;

  // System access for debugging
  getPhysicsSystem(): any; // Returns the physics system for debug purposes
  getRendererSystem(): any; // Returns the renderer system for debug purposes
}

export interface PhysicsConfig {
  gravity?: Vector2D;
  airResistance?: number;
  // World-level physics properties
  world?: {
    gravity?: Vector2D;
    gravityScale?: number;
    constraintIterations?: number;
    positionIterations?: number;
    velocityIterations?: number;
    enableSleeping?: boolean;
    timing?: {
      timeScale?: number;
      timestamp?: number;
    };
  };
  // Default body properties that will be applied to new bodies
  defaultBodyProperties?: {
    restitution?: number;
    friction?: number;
    frictionStatic?: number;
    frictionAir?: number;
    density?: number;
    inertia?: number;
    inverseInertia?: number;
    mass?: number;
    inverseMass?: number;
    slop?: number;
    sleepThreshold?: number;
    sleepTimeScale?: number;
  };
  // Engine-level properties
  engine?: {
    enableSleeping?: boolean;
    positionIterations?: number;
    velocityIterations?: number;
    constraintIterations?: number;
    timing?: {
      timeScale?: number;
      timestamp?: number;
    };
  };
}
