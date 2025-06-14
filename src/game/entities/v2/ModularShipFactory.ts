import type { IPhysicsSystem } from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { EntityManager } from '../../../engine/entity/EntityManager';
import type { Vector2D } from '../../../engine/interfaces/IPhysicsSystem';
import { SimpleDebugShip } from './SimpleDebugShip';

/**
 * TEMPORARY SIMPLIFIED Factory for debugging physics/rendering alignment
 * Only creates SimpleDebugShip until ModularShip issues are resolved
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
   * TEMPORARY: Create a simple debug ship for testing physics/rendering alignment
   * This replaces complex modular ships with a single rectangle
   */
  public createSimpleDebugShip(
    position: Vector2D,
    debrisManager?: any
  ): SimpleDebugShip {
    console.log(
      '🔧 Creating SIMPLE DEBUG SHIP instead of complex modular ship'
    );

    return new SimpleDebugShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      position,
      debrisManager
    );
  }

  // Temporary methods that just call createSimpleDebugShip for compatibility
  public createPlayerFlagship(
    position: Vector2D,
    debrisManager?: any
  ): SimpleDebugShip {
    console.log('🔧 createPlayerFlagship() redirected to SimpleDebugShip');
    return this.createSimpleDebugShip(position, debrisManager);
  }

  public createLinearTestShip(
    position: Vector2D,
    debrisManager?: any
  ): SimpleDebugShip {
    console.log('🔧 createLinearTestShip() redirected to SimpleDebugShip');
    return this.createSimpleDebugShip(position, debrisManager);
  }

  public createCrossTestShip(position: Vector2D): SimpleDebugShip {
    console.log('🔧 createCrossTestShip() redirected to SimpleDebugShip');
    return this.createSimpleDebugShip(position);
  }

  public createCompactTestShip(position: Vector2D): SimpleDebugShip {
    console.log('🔧 createCompactTestShip() redirected to SimpleDebugShip');
    return this.createSimpleDebugShip(position);
  }

  public createSingleBlockShip(position: Vector2D): SimpleDebugShip {
    console.log('🔧 createSingleBlockShip() redirected to SimpleDebugShip');
    return this.createSimpleDebugShip(position);
  }
}
