/**
 * Integration example for ship splitting functionality in EQX Nova
 *
 * This file demonstrates how to use the enhanced ComplexModularShip class
 * with connectivity-based ship splitting logic.
 *
 * @example Usage in game logic:
 * ```typescript
 * // Create ship with splitting callbacks
 * const ship = new ComplexModularShip(
 *   entityManager,
 *   physicsSystem,
 *   rendererSystem,
 *   position,
 *   debrisManager,
 *   undefined, // auto-generate ID
 *   {
 *     onNewShipCreated: (shipData) => {
 *       // Handle new ship creation after splitting
 *       console.log('New ship created with', shipData.blocks.length, 'blocks');
 *       const newShip = ComplexModularShip.createFromSplitData(
 *         entityManager,
 *         physicsSystem,
 *         rendererSystem,
 *         shipData,
 *         debrisManager,
 *         splitCallbacks // Pass same callbacks for recursive splitting
 *       );
 *       gameManager.addShip(newShip);
 *     },
 *     onDebrisCreated: (debrisData) => {
 *       // Handle debris creation after splitting
 *       console.log('Debris created with', debrisData.blocks.length, 'blocks');
 *       debrisManager.addDebris(debrisData);
 *     }
 *   }
 * );
 *
 * // When ship takes damage, splitting is automatically handled
 * const wasDestroyed = ship.takeDamageAtPosition(damagePosition, 50);
 * if (wasDestroyed) {
 *   // Ship was either completely destroyed or split into parts
 *   gameManager.removeShip(ship);
 * }
 * ```
 */

import type { EntityManager } from '../../engine/entity/EntityManager';
import type {
  IPhysicsSystem,
  Vector2D,
} from '../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../engine/interfaces/IRendererSystem';
import type { DebrisManager } from '../managers/DebrisManager';
import { ComplexModularShip } from '../entities/v2/ComplexModularShip';

/**
 * Interface for split ship/debris data
 */
interface SplitData {
  blocks: Array<{
    id: string;
    offset: Vector2D;
    type: string;
    size: Vector2D;
    health: number;
  }>;
  position: Vector2D;
  rotation: number;
}

/**
 * Ship splitting integration manager
 * Provides high-level methods for managing ship splitting in the game
 */
export class ShipSplittingManager {
  /**
   * Create a ComplexModularShip with full splitting support
   *
   * @param entityManager - Entity manager instance
   * @param physicsSystem - Physics system instance
   * @param rendererSystem - Renderer system instance
   * @param position - Initial ship position
   * @param debrisManager - Debris manager for handling split debris
   * @param gameManager - Game manager with addShip/removeShip methods
   * @returns A new ComplexModularShip with splitting callbacks configured
   */
  public static createShipWithSplitting(
    entityManager: EntityManager,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    position: Vector2D,
    debrisManager: DebrisManager,
    gameManager: {
      addShip: (ship: ComplexModularShip) => void;
      removeShip: (ship: ComplexModularShip) => void;
      addDebris: (debris: SplitData) => void;
    }
  ): ComplexModularShip {
    const splitCallbacks = {
      onNewShipCreated: (shipData: SplitData) => {
        console.log(
          `🚀 Creating new ship from split with ${shipData.blocks.length} blocks`
        );
        // Create new ship with same splitting capabilities
        const newShip = ComplexModularShip.createFromSplitData(
          entityManager,
          physicsSystem,
          rendererSystem,
          shipData as any, // Type compatibility - the internal types match
          debrisManager,
          splitCallbacks // Recursive splitting support
        );

        // Add to game
        gameManager.addShip(newShip);
      },

      onDebrisCreated: (debrisData: SplitData) => {
        console.log(
          `🗑️ Creating debris from split with ${debrisData.blocks.length} blocks`
        );

        // Add debris to game (could create simple physics bodies for debris)
        gameManager.addDebris(debrisData);
      },
    };

    return new ComplexModularShip(
      entityManager,
      physicsSystem,
      rendererSystem,
      position,
      debrisManager,
      undefined, // auto-generate ID
      splitCallbacks
    );
  }

  /**
   * Damage a ship and handle any resulting splits
   *
   * @param ship - The ship to damage
   * @param position - World position of damage
   * @param damage - Amount of damage to apply
   * @param gameManager - Game manager for removing destroyed ships
   * @returns True if ship was destroyed/split
   */
  public static damageShipWithSplitting(
    ship: ComplexModularShip,
    position: Vector2D,
    damage: number,
    gameManager: { removeShip: (ship: ComplexModularShip) => void }
  ): boolean {
    const wasDestroyed = ship.takeDamageAtPosition(position, damage);

    if (wasDestroyed) {
      console.log('🔥 Ship was destroyed or split - removing from game');
      gameManager.removeShip(ship);
      return true;
    }

    return false;
  }

  /**
   * Create a simple debris object from split data
   * This is a utility method for creating basic debris physics bodies
   *
   * @param debrisData - Split debris data
   * @param physicsSystem - Physics system instance
   * @param rendererSystem - Renderer system instance
   * @returns Basic debris object with physics and rendering
   */
  public static createDebrisFromSplitData(
    debrisData: SplitData,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem
  ): { id: string; cleanup: () => void } {
    const debrisId = `debris_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const renderIds: string[] = [];
    const physicsBody = physicsSystem.createCircle(
      debrisData.position.x,
      debrisData.position.y,
      8, // Small radius for debris
      {
        isStatic: false,
        density: 0.0005, // Light debris
        friction: 0.2,
        restitution: 0.4,
      }
    );

    // Create simple render object for the debris cluster
    const renderObjectId = `${debrisId}_render`;
    rendererSystem.createRenderObject({
      id: renderObjectId,
      position: debrisData.position,
      angle: 0,
      width: 16,
      height: 16,
      color: 0x666666, // Gray debris
      type: 'rectangle',
    });
    renderIds.push(renderObjectId);

    return {
      id: debrisId,
      cleanup: () => {
        physicsSystem.removeBody(physicsBody);
        for (const id of renderIds) {
          rendererSystem.removeRenderObject(id);
        }
      },
    };
  }
}

export type { SplitData };
