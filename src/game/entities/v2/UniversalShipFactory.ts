import type { IShip, IShipConfiguration } from './interfaces/IShip';
import type { IPhysicsSystem } from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { EntityManager } from '../../../engine/entity/EntityManager';
import { ComplexModularShip } from './ComplexModularShip';
import { SimpleDebugShip } from './SimpleDebugShip';

/**
 * Universal Ship Factory - Creates ships with unified interface
 * Both player and AI ships use this same factory with different configurations
 */
export class UniversalShipFactory {
  private physicsSystem: IPhysicsSystem;
  private rendererSystem: IRendererSystem;
  private entityManager: EntityManager;

  // Callbacks for ship/debris registration
  private shipRegistrationCallback?: (ship: IShip) => void;
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
    shipCallback?: (ship: IShip) => void,
    debrisCallback?: (debrisData: any) => void
  ): void {
    this.shipRegistrationCallback = shipCallback;
    this.debrisRegistrationCallback = debrisCallback;
  }

  /**
   * Create any ship using the unified interface
   * This method replaces all the specific ship creation methods
   */
  public createShip(config: IShipConfiguration, debrisManager?: any): IShip {
    console.log(
      `🚀 Creating ${config.shipType} ship at (${config.position.x}, ${config.position.y})`
    );

    let ship: IShip;

    switch (config.shipType) {
      case 'player_flagship':
        ship = this.createPlayerFlagship(config, debrisManager);
        break;

      case 'ai_complex':
        ship = this.createComplexAIShip(config, debrisManager);
        break;

      case 'ai_simple':
        ship = this.createSimpleAIShip(config, debrisManager);
        break;

      case 'ai_custom':
        ship = this.createCustomAIShip(config, debrisManager);
        break;

      default:
        throw new Error(`Unknown ship type: ${config.shipType}`);
    }

    // Register with game system if callback is available
    if (this.shipRegistrationCallback) {
      this.shipRegistrationCallback(ship);
    }

    console.log(`✅ Created ${config.shipType} ship with ID: ${ship.id}`);
    return ship;
  }

  /**
   * Create player flagship - uses ComplexModularShip
   */
  private createPlayerFlagship(
    config: IShipConfiguration,
    debrisManager?: any
  ): IShip {
    const splitCallbacks = this.createSplitCallbacks(debrisManager);

    return new ComplexModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      config.position,
      debrisManager,
      undefined, // auto-generate ID
      splitCallbacks
    );
  }

  /**
   * Create complex AI ship - also uses ComplexModularShip
   */
  private createComplexAIShip(
    config: IShipConfiguration,
    debrisManager?: any
  ): IShip {
    const splitCallbacks = this.createSplitCallbacks(debrisManager);

    return new ComplexModularShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      config.position,
      debrisManager,
      undefined, // auto-generate ID
      splitCallbacks
    );
  }

  /**
   * Create simple AI ship - uses SimpleDebugShip for now
   */
  private createSimpleAIShip(
    config: IShipConfiguration,
    debrisManager?: any
  ): IShip {
    return new SimpleDebugShip(
      this.entityManager,
      this.physicsSystem,
      this.rendererSystem,
      config.position,
      debrisManager
    );
  }

  /**
   * Create custom AI ship with specific block configuration
   */
  private createCustomAIShip(
    config: IShipConfiguration,
    debrisManager?: any
  ): IShip {
    // TODO: Implement custom ship creation based on config.blockConfigs
    // For now, fallback to complex ship
    return this.createComplexAIShip(config, debrisManager);
  }

  /**
   * Create split callbacks for ship breaking mechanics
   */
  private createSplitCallbacks(debrisManager?: any) {
    return {
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
          this.createSplitCallbacks(debrisManager) // Recursive splitting support
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
  }
}
