import type { IPhysicsSystem } from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { EntityManager } from '../../../engine/entity/EntityManager';
import type { Vector2D } from '../../../engine/interfaces/IPhysicsSystem';
import { SimpleDebugShip } from './SimpleDebugShip';
import { ComplexModularShip } from './ComplexModularShip';

/**
 * TEMPORARY SIMPLIFIED Factory for debugging physics/rendering alignment
 * Creates either SimpleDebugShip or ComplexModularShip based on request
 */
export class ModularShipFactory {
  private physicsSystem: IPhysicsSystem;
  private rendererSystem: IRendererSystem;
  private entityManager: EntityManager;

  // Callbacks for ship/debris registration
  private shipRegistrationCallback?: (ship: ComplexModularShip) => void;
  private debrisRegistrationCallback?: (debrisData: any) => void;

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
   * Set callbacks for registering new ships and debris with the game system
   */
  public setRegistrationCallbacks(
    shipCallback?: (ship: ComplexModularShip) => void,
    debrisCallback?: (debrisData: any) => void
  ): void {
    this.shipRegistrationCallback = shipCallback;
    this.debrisRegistrationCallback = debrisCallback;
  }

  /**
   * Create a complex modular ship with advanced weapon systems and proper split callbacks
   */
  public createComplexModularShip(
    position: Vector2D,
    debrisManager?: any
  ): ComplexModularShip {
    console.log(
      '🚀 Creating COMPLEX MODULAR SHIP with advanced weapon systems'
    );

    // Set up split callbacks to properly register new ships and debris
    const splitCallbacks = {
      onNewShipCreated: (shipData: any) => {
        console.log(
          `🚀 Split created new ship with ${shipData.blocks.length} blocks`
        );

        // Create the new ship instance
        const newShip = ComplexModularShip.createFromSplitData(
          this.entityManager,
          this.physicsSystem,
          this.rendererSystem,
          shipData,
          debrisManager,
          splitCallbacks // Recursive splitting support
        );

        // Register with game system if callback is available
        if (this.shipRegistrationCallback) {
          this.shipRegistrationCallback(newShip);
        } else {
          console.warn(
            '⚠️ No ship registration callback set - new ship may not be properly registered'
          );
        }
      },

      onDebrisCreated: (debrisData: any) => {
        console.log(
          `🗑️ Split created debris with ${debrisData.blocks.length} blocks`
        );

        // Register debris with game system if callback is available
        if (this.debrisRegistrationCallback) {
          this.debrisRegistrationCallback(debrisData);
        } else {
          console.warn(
            '⚠️ No debris registration callback set - debris may not be properly managed'
          );
        }
      },
    };

    return new ComplexModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      position,
      debrisManager,
      undefined, // auto-generate ID
      splitCallbacks
    );
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
  // Updated to create the complex ship for the player
  public createPlayerFlagship(
    position: Vector2D,
    debrisManager?: any
  ): ComplexModularShip {
    console.log('� createPlayerFlagship() creating ComplexModularShip');
    return this.createComplexModularShip(position, debrisManager);
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
