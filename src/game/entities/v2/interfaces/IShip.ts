import type { Vector2D } from '../../../../engine/interfaces/IPhysicsSystem';

/**
 * Generic Ship Interface - Common interface for all ships
 * This ensures both player and AI ships have the same capabilities
 */
export interface IShip {
  readonly id: string;
  readonly position: Vector2D;
  readonly rotation: number;
  readonly velocity: Vector2D;
  readonly isAlive: boolean;
  readonly isDestroyed: boolean;
  readonly physicsBodyId?: string | null;
  readonly faction?: string;

  // Compatibility aliases
  readonly isActive?: boolean; // alias for isAlive

  // Structure for modular ships (optional for simple ships) - using any to avoid conflicts
  readonly structure?: any;

  // Legacy ship reference for compatibility
  readonly ship?: any;

  // Movement controls - shared by all ships
  setPosition(position: Vector2D): void;
  setRotation(rotation: number): void;
  setAngularVelocity(velocity: number): void;
  applyForce(force: Vector2D): void;
  setThrust(enabled: boolean): void; // For AI movement control

  // Weapon system - shared by all ships
  getWeaponFiringPositions(): Array<{
    position: Vector2D;
    rotation: number;
  }>;
  canFireWeapons(): boolean;
  recordWeaponsFired(): void;

  // Damage system - shared by all ships
  takeDamageAtPosition(position: Vector2D, damage?: number): boolean;

  // Advanced damage system for modular ships
  takeDamageAtComponent?(componentId: string, damage?: number): boolean;
  takeDamageAtComponentId?(componentId: string, damage?: number): boolean; // Advanced ship methods
  getActiveParts?(): any[];
  parts?: any[];
  takeDamageAtPartIndex(partIndex: number, damage?: number): boolean;

  // Lifecycle
  update(deltaTime: number): void;
  destroy(): void;
}

/**
 * Ship Control Interface - Defines how a ship can be controlled
 * This separates the ship from its control mechanism
 */
export interface IShipController {
  readonly id: string;
  readonly ship: IShip;
  readonly isActive: boolean;

  // Access method
  getShip(): IShip;

  // Control methods - implemented differently for player vs AI
  turnLeft(): void;
  turnRight(): void;
  thrust(): void;
  stopThrust(): void;
  fire(): boolean;

  // Update and lifecycle
  update(deltaTime: number): void;
  destroy(): void;
}

/**
 * Ship Factory Configuration
 * Generic configuration for creating any ship type
 */
export interface IShipConfiguration {
  position: Vector2D;
  shipType: 'player_flagship' | 'ai_simple' | 'ai_complex' | 'ai_custom';

  // Optional ship design overrides
  blockConfigs?: Array<{
    offset: Vector2D;
    size: Vector2D;
    type: string;
    health: number;
  }>;

  // Optional appearance overrides
  colors?: Record<string, number>;

  // Optional physics overrides
  mass?: number;
  thrustForce?: number;
  rotationSpeed?: number;
}
