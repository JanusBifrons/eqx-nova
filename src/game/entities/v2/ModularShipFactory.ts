import type { IPhysicsSystem } from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { EntityManager } from '../../../engine/entity/EntityManager';
import type { Vector2D } from '../../../engine/interfaces/IPhysicsSystem';
import { ModularShip } from './ModularShip';

/**
 * Factory for creating modular ship configurations
 * Leverages existing engine systems for maximum utility reuse
 */
export class ModularShipFactory {
  private physicsSystem: IPhysicsSystem;
  private rendererSystem: IRendererSystem;
  private entityManager: EntityManager;

  constructor(
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    entityManager: EntityManager
  ) {
    this.physicsSystem = physicsSystem;
    this.rendererSystem = rendererSystem;
    this.entityManager = entityManager;
  }
  /**
   * Create a simple linear ship for testing structural breaks
   * Layout: [C][R][R][R] where C=cockpit, R=regular component
   */
  public createLinearTestShip(position: Vector2D): ModularShip {
    const ship = new ModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      20, // component size
      `linear_ship_${Date.now()}`
    );

    // Set initial position
    ship.setPosition(position);

    // Add cockpit at center
    ship.addComponent({ x: 0, y: 0 }, true);

    // Add components extending to the right
    ship.addComponent({ x: 1, y: 0 }, false);
    ship.addComponent({ x: 2, y: 0 }, false);
    ship.addComponent({ x: 3, y: 0 }, false);

    console.log(
      `🏗️ Created linear test ship at (${position.x}, ${position.y})`
    );
    return ship;
  }
  /**
   * Create a cross-shaped ship for testing complex structural breaks
   * Layout:
   *    [R]
   * [R][C][R]
   *    [R]
   */
  public createCrossTestShip(position: Vector2D): ModularShip {
    const ship = new ModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      20, // component size
      `cross_ship_${Date.now()}`
    );

    // Set initial position
    ship.setPosition(position);

    // Add cockpit at center
    ship.addComponent({ x: 0, y: 0 }, true);

    // Add arms of the cross
    ship.addComponent({ x: 1, y: 0 }, false); // Right
    ship.addComponent({ x: -1, y: 0 }, false); // Left
    ship.addComponent({ x: 0, y: 1 }, false); // Up
    ship.addComponent({ x: 0, y: -1 }, false); // Down

    console.log(`✚ Created cross test ship at (${position.x}, ${position.y})`);
    return ship;
  }

  /**
   * Create a simple 2x2 compact ship
   * Layout:
   * [C][R]
   * [R][R]
   */
  public createCompactTestShip(position: Vector2D): ModularShip {
    const ship = new ModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      20, // component size
      `compact_ship_${Date.now()}`
    );

    // Set initial position
    ship.setPosition(position);

    // Add cockpit at origin
    ship.addComponent({ x: 0, y: 0 }, true);

    // Add other components to form a 2x2 square
    ship.addComponent({ x: 1, y: 0 }, false);
    ship.addComponent({ x: 0, y: 1 }, false);
    ship.addComponent({ x: 1, y: 1 }, false);

    console.log(
      `⬜ Created compact test ship at (${position.x}, ${position.y})`
    );
    return ship;
  }
  /**
   * Create a player flagship using SIMPLE SPOKE PATTERN for coordinate debugging
   * Layout (using grid coordinates):
   *        2
   *        |
   *   8 ---0--- 4
   *        |
   *        6
   * Where 0=Cockpit (center), and numbered blocks extend in cardinal directions
   */ public createPlayerFlagship(position: Vector2D): ModularShip {
    const ship = new ModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      20, // component size
      `flagship_${Date.now()}`
    );

    // Set initial position
    ship.setPosition(position);
    console.log('=== CREATING SIMPLE SINGLE BLOCK PLAYER SHIP ===');

    // Just add cockpit at center
    ship.addComponent({ x: 0, y: 0 }, true);
    console.log('📍 Single Block: COCKPIT at grid (0, 0)');

    console.log('=== SINGLE BLOCK SHIP CREATED ===');
    return ship;
  }

  /**
   * Create a single block ship for basic testing
   * Layout: [C] (just a cockpit)
   */
  public createSingleBlockShip(position: Vector2D): ModularShip {
    const ship = new ModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      20, // component size
      `single_block_ship_${Date.now()}`
    );

    // Set initial position
    ship.setPosition(position);

    // Add only cockpit
    ship.addComponent({ x: 0, y: 0 }, true);

    console.log(
      `🔲 Created single block ship at (${position.x}, ${position.y})`
    );
    return ship;
  }
}
