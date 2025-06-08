import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

/**
 * Interface for individual ship parts
 * Following Interface Segregation Principle - focused on ship part concerns
 */
export interface IShipPart {
  readonly entity: Entity;
  readonly partId: string;
  readonly relativePosition: Vector2D;
  readonly size: number;
  readonly isDestroyed: boolean;
  readonly isConnected: boolean;
  readonly connectedParts: ReadonlySet<string>;
  readonly position: Vector2D;
  readonly angle: number;

  destroy(): void;
  disconnect(): void;
  connectToPart(partId: string): void;
  disconnectFromPart(partId: string): void;
  updatePosition(
    shipPosition: Vector2D,
    shipRotation: number,
    engine?: any
  ): void;
  isActive(): boolean;
}

/**
 * Interface for composite ship functionality
 * Following Interface Segregation Principle - focused on composite ship concerns
 */
export interface ICompositeShip {
  readonly id: string;
  readonly parts: ReadonlyArray<IShipPart>;
  readonly isDestroyed: boolean;
  readonly centerPosition: Vector2D;
  readonly rotation: number;
  readonly thrust: boolean;
  readonly lives: number;
  readonly isInvulnerable: boolean;
  readonly isAlive: boolean;
  readonly collisionRadius: number;
  readonly forwardDirection: Vector2D;

  // State management
  setRotation(angle: number): void;
  setThrust(thrusting: boolean): void;
  takeDamage(): boolean;
  respawn(position: Vector2D): void;
  update(deltaTime: number): void;
  destroy(): void;

  // Part management
  destroyPart(partId: string): void;
  getActiveParts(): ReadonlyArray<IShipPart>;
  getDestroyedParts(): ReadonlyArray<IShipPart>;
}

/**
 * Configuration for creating a composite ship
 * Following Open/Closed Principle - extensible ship configurations
 */
export interface CompositeShipConfig {
  readonly centerPosition: Vector2D;
  readonly partSize: number;
  readonly partPositions: ReadonlyArray<Vector2D>;
  readonly partColor: number;
  readonly lives?: number;
}
