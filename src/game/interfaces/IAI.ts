import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { ICompositeShip } from './ICompositeShip';

/**
 * Interface for AI behavior
 * Following Interface Segregation Principle - focused on AI concerns
 */
export interface IAIBehavior {
  readonly id: string;
  readonly ship: ICompositeShip;
  readonly target: Vector2D | ICompositeShip | null;
  readonly isActive: boolean;
  readonly lastFireTime: number;

  // Behavior control
  setTarget(target: Vector2D | ICompositeShip | null): void;
  activate(): void;
  deactivate(): void;
  update(deltaTime: number): void;
  destroy(): void;
  // Decision making
  shouldFire(): boolean;
  shouldRotate(): boolean;
  shouldThrust(): boolean;
  getDesiredRotation(): number;
  recordFired(): void;
}

/**
 * Interface for AI ship management
 * Following Interface Segregation Principle - focused on AI ship concerns
 */
export interface IAIShip {
  readonly id: string;
  readonly ship: ICompositeShip;
  readonly behavior: IAIBehavior;
  readonly faction: string;
  readonly isActive: boolean;

  // State management
  update(deltaTime: number): void;
  setTarget(target: Vector2D | ICompositeShip | null): void;
  destroy(): void;

  // Combat
  fireLaser(): boolean;
  takeDamage(): boolean;
}

/**
 * Configuration for creating AI ships
 * Following Open/Closed Principle - extensible AI configurations
 */
export interface AIShipConfig {
  readonly position: Vector2D;
  readonly partPositions: ReadonlyArray<Vector2D>;
  readonly partSize: number;
  readonly partColor: number;
  readonly faction: string;
  readonly behaviorType: 'aggressive' | 'defensive' | 'patrol' | 'hunter';
  readonly fireRate: number; // milliseconds between shots
  readonly detectionRange: number;
  readonly lives: number;
}

/**
 * Configuration for AI behavior
 * Following Open/Closed Principle - extensible behavior configurations
 */
export interface AIBehaviorConfig {
  readonly behaviorType: 'aggressive' | 'defensive' | 'patrol' | 'hunter';
  readonly fireRate: number;
  readonly detectionRange: number;
  readonly rotationSpeed: number;
  readonly thrustForce: number;
  readonly maxSpeed: number;
}
