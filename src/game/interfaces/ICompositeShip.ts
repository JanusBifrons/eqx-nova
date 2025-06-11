import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

/**
 * Ship part types with different functions and visual styles
 */
export type ShipPartType =
  | 'cockpit' // Command center - bright cyan
  | 'engine' // Provides thrust - orange/red
  | 'weapon' // Fires lasers - yellow/gold
  | 'armor' // Basic structure - gray/white
  | 'shield' // Defensive systems - blue
  | 'cargo'; // Storage/utility - brown

/**
 * Interface for individual ship parts
 * Following Interface Segregation Principle - focused on ship part concerns
 */
export interface IShipPart {
  readonly entity: Entity;
  readonly partId: string;
  readonly partType: ShipPartType;
  readonly relativePosition: Vector2D;
  readonly size: number;
  readonly isDestroyed: boolean;
  readonly isConnected: boolean;
  readonly connectedParts: ReadonlySet<string>;
  readonly position: Vector2D;
  readonly angle: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly damagePercentage: number;
  readonly baseColor: number;

  destroy(): void;
  disconnect(): void;
  connectToPart(partId: string): void;
  disconnectFromPart(partId: string): void;
  disconnectFromAllParts(): void;
  updatePosition(
    shipPosition: Vector2D,
    shipRotation: number,
    engine?: any
  ): void;
  isActive(): boolean;
  takeDamage(amount: number): boolean;
  showImpactEffect(): void;
  updateVisualDamage(): void;
  setEngine(engine: any): void;
  update(deltaTime: number): void;
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
  readonly velocity: Vector2D;

  // State management
  setRotation(angle: number): void;
  setThrust(thrusting: boolean): void;
  takeDamage(): boolean;
  respawn(position: Vector2D): void;
  update(deltaTime: number): void;
  destroy(): void;

  // Part management
  destroyPart(partId: string): void;
  takeDamageAtPart(partId: string, amount: number): boolean;
  getActiveParts(): ReadonlyArray<IShipPart>;
  getDestroyedParts(): ReadonlyArray<IShipPart>;

  // Functional part type management
  getWeaponParts(): ReadonlyArray<IShipPart>;
  getEngineParts(): ReadonlyArray<IShipPart>;
  getWeaponFiringPositions(): Vector2D[];
  getEngineEffectiveness(): number;
  getWeaponEffectiveness(): number;
}

/**
 * Configuration for creating a composite ship
 * Following Open/Closed Principle - extensible ship configurations
 */
export interface CompositeShipConfig {
  readonly centerPosition: Vector2D;
  readonly partSize: number;
  readonly partPositions: ReadonlyArray<Vector2D>;
  readonly partTypes?: ReadonlyArray<ShipPartType>; // Optional part types, defaults to 'armor'
  readonly partColor?: number; // Optional override color (overrides part type colors)
  readonly lives?: number;
}
