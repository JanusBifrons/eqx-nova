import type { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type {
  CompositeShipConfig,
  ShipPartType,
} from '../interfaces/ICompositeShip';
import { CompositeShip } from '../entities/CompositeShip';
import { ShipPartFactory } from './ShipPartFactory';

/**
 * CompositeShipFactory - Creates composite ships from configuration
 * Follows Single Responsibility Principle: only creates composite ships
 * Follows Open/Closed Principle: extensible through configuration
 * Follows Factory Pattern for consistent object creation
 */
export class CompositeShipFactory {
  /**
   * Create a composite ship from configuration
   */
  public static create(
    engine: Engine,
    config: CompositeShipConfig,
    shipId: string,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    // Default part types if not specified
    const partTypes = config.partTypes
      ? [...config.partTypes] // Convert readonly to mutable
      : new Array(config.partPositions.length).fill('armor' as ShipPartType);

    // Create ship parts using the factory
    const parts = ShipPartFactory.createMultiple(
      engine,
      config.centerPosition,
      [...config.partPositions], // Convert readonly array to mutable
      partTypes,
      config.partSize,
      shipId,
      {
        color: config.partColor, // Can be undefined to use part type colors
        density: 0.01, // Increased from 0.001 - more realistic mass
        friction: 0.3,
        frictionAir: 0.02, // Increased air resistance for better control
      }
    );

    return new CompositeShip(
      shipId,
      parts,
      engine,
      config.centerPosition,
      config.lives ?? 3,
      onDestroy
    );
  }

  /**
   * Create a single-part ship for testing (simplest possible composite ship)
   */
  public static createSinglePartShip(
    engine: Engine,
    position: Vector2D,
    shipId: string,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    const partSize = 16; // Size of the single square part

    const config: CompositeShipConfig = {
      centerPosition: position,
      partSize,
      partPositions: [
        { x: 0, y: 0 }, // Single part at center
      ],
      partTypes: ['cockpit'], // Single cockpit part
      lives: 3,
    };

    return this.create(engine, config, shipId, onDestroy);
  }

  /**
   * Create a simple 2-part ship (horizontal layout)
   */
  public static createTwoPartShip(
    engine: Engine,
    position: Vector2D,
    shipId: string,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    const partSize = 16; // Size of each square part
    const spacing = partSize; // Space between parts

    const config: CompositeShipConfig = {
      centerPosition: position,
      partSize,
      partPositions: [
        { x: -spacing / 2, y: 0 }, // Left part
        { x: spacing / 2, y: 0 }, // Right part
      ],
      partTypes: ['engine', 'weapon'], // Engine on left, weapon on right
      lives: 3,
    };

    return this.create(engine, config, shipId, onDestroy);
  }

  /**
   * Create a simple 3-part ship (T-shape)
   */
  public static createThreePartShip(
    engine: Engine,
    position: Vector2D,
    shipId: string,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    const partSize = 16;
    const spacing = partSize;

    const config: CompositeShipConfig = {
      centerPosition: position,
      partSize,
      partPositions: [
        { x: 0, y: 0 }, // Center part
        { x: -spacing, y: 0 }, // Left part
        { x: spacing, y: 0 }, // Right part
      ],
      partTypes: ['cockpit', 'engine', 'weapon'], // Cockpit center, engine left, weapon right
      lives: 3,
    };

    return this.create(engine, config, shipId, onDestroy);
  }

  /**
   * Create a 4-part ship (plus/cross shape)
   */
  public static createFourPartShip(
    engine: Engine,
    position: Vector2D,
    shipId: string,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    const partSize = 16;
    const spacing = partSize;

    const config: CompositeShipConfig = {
      centerPosition: position,
      partSize,
      partPositions: [
        { x: 0, y: 0 }, // Center part
        { x: -spacing, y: 0 }, // Left part
        { x: spacing, y: 0 }, // Right part
        { x: 0, y: -spacing }, // Top part
      ],
      partColor: 0x00ff00,
      lives: 4,
    };

    return this.create(engine, config, shipId, onDestroy);
  }

  /**
   * Create a custom ship from part positions
   */
  public static createCustomShip(
    engine: Engine,
    position: Vector2D,
    partPositions: Vector2D[],
    partSize: number,
    shipId: string,
    color: number = 0x00ff00,
    lives: number = 3,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    const config: CompositeShipConfig = {
      centerPosition: position,
      partSize,
      partPositions,
      partColor: color,
      lives,
    };

    return this.create(engine, config, shipId, onDestroy);
  }

  /**
   * Create a very long thin ship for testing damage system
   */
  public static createLongThinShip(
    engine: Engine,
    position: Vector2D,
    shipId: string,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    const partSize = 12; // Smaller parts for a thinner look
    const spacing = partSize;

    // Create a long horizontal line of 8 parts
    const partPositions: Vector2D[] = [];

    for (let i = 0; i < 8; i++) {
      partPositions.push({ x: (i - 3.5) * spacing, y: 0 });
    }
    const config: CompositeShipConfig = {
      centerPosition: position,
      partSize,
      partPositions,
      partColor: 0xff4444, // Red color to distinguish from regular ships
      lives: 3,
    };

    return this.create(engine, config, shipId, onDestroy);
  }

  /**
   * Create an impressive flagship-class player ship
   * "Sovereign-class" Heavy Cruiser with strategic part placement
   *
   * Design Features:
   * - 24 total parts arranged in a large, imposing profile
   * - Central command bridge with forward sensor array
   * - Dual engine nacelles for powerful thrust
   * - Multiple weapon platforms for heavy firepower
   * - Shield generators for defensive coverage
   * - Armor plating for structural integrity
   * - Cargo/utility bays for versatility
   * - Strategic part type distribution using the cockpit-based breakage system
   *
   * This flagship is significantly larger and more capable than AI ships,
   * giving the player a proper "big cool ship" as requested.
   */
  public static createPlayerFlagship(
    engine: Engine,
    position: Vector2D,
    shipId: string,
    onDestroy?: (ship: CompositeShip) => void
  ): CompositeShip {
    const partSize = 20; // Size matching AI ships

    // Grid helper function - converts grid coordinates to world coordinates
    const gridToWorld = (gridX: number, gridY: number): Vector2D => ({
      x: gridX * partSize,
      y: gridY * partSize,
    });

    // PLAYER FLAGSHIP - "Sovereign-class" Heavy Cruiser
    // Large, well-balanced ship with impressive profile
    const flagshipGrid = [
      // Command tower/bridge (center column)
      gridToWorld(0, 0), // Command center (cockpit)
      gridToWorld(0, -1), // Upper bridge
      gridToWorld(0, -2), // Forward sensor array

      // Main hull (central spine)
      gridToWorld(-1, 0), // Port main hull
      gridToWorld(1, 0), // Starboard main hull
      gridToWorld(-2, 0), // Port rear hull
      gridToWorld(2, 0), // Starboard rear hull

      // Engine nacelles (rear thrust)
      gridToWorld(-3, 0), // Port engine core
      gridToWorld(3, 0), // Starboard engine core
      gridToWorld(-3, 1), // Port engine exhaust
      gridToWorld(3, 1), // Starboard engine exhaust

      // Weapon platforms (forward firepower)
      gridToWorld(-1, -1), // Port forward weapon
      gridToWorld(1, -1), // Starboard forward weapon
      gridToWorld(-2, -1), // Port main weapon
      gridToWorld(2, -1), // Starboard main weapon

      // Shield generators (defensive coverage)
      gridToWorld(-1, 1), // Port shield generator
      gridToWorld(1, 1), // Starboard shield generator

      // Armor plating (structural support)
      gridToWorld(-2, 1), // Port armor section
      gridToWorld(2, 1), // Starboard armor section

      // Cargo/utility bays (side extensions)
      gridToWorld(-1, -2), // Port utility bay
      gridToWorld(1, -2), // Starboard utility bay

      // Additional structural support
      gridToWorld(0, 1), // Rear command support
      gridToWorld(-3, -1), // Port wing support
      gridToWorld(3, -1), // Starboard wing support
    ];

    // Define part types for strategic functionality
    const partTypes: ShipPartType[] = [
      'cockpit', // Command center (0,0)
      'armor', // Upper bridge (0,-1)
      'armor', // Forward sensor array (0,-2)

      'armor', // Port main hull (-1,0)
      'armor', // Starboard main hull (1,0)
      'armor', // Port rear hull (-2,0)
      'armor', // Starboard rear hull (2,0)

      'engine', // Port engine core (-3,0)
      'engine', // Starboard engine core (3,0)
      'engine', // Port engine exhaust (-3,1)
      'engine', // Starboard engine exhaust (3,1)

      'weapon', // Port forward weapon (-1,-1)
      'weapon', // Starboard forward weapon (1,-1)
      'weapon', // Port main weapon (-2,-1)
      'weapon', // Starboard main weapon (2,-1)

      'shield', // Port shield generator (-1,1)
      'shield', // Starboard shield generator (1,1)

      'armor', // Port armor section (-2,1)
      'armor', // Starboard armor section (2,1)

      'cargo', // Port utility bay (-1,-2)
      'cargo', // Starboard utility bay (1,-2)

      'armor', // Rear command support (0,1)
      'armor', // Port wing support (-3,-1)
      'armor', // Starboard wing support (3,-1)
    ];

    const config: CompositeShipConfig = {
      centerPosition: position,
      partSize,
      partPositions: flagshipGrid,
      partTypes: partTypes,
      lives: 5, // Player gets more lives since it's a bigger, more capable ship
    };

    return this.create(engine, config, shipId, onDestroy);
  }
}
