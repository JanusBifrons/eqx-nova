import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IPhysicsSystem } from '../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../engine/interfaces/IRendererSystem';
import { ComplexModularShipSplitter } from '../utils/ComplexModularShipSplitter';

/**
 * Integration methods for adding ship splitting functionality to ComplexModularShip
 *
 * This file provides the methods that should be integrated into the ComplexModularShip class
 * to enable ship splitting when blocks are destroyed.
 *
 * Usage:
 * 1. Add these methods to the ComplexModularShip class
 * 2. Call checkAndHandleShipSplitting() after any block is destroyed
 * 3. The system will automatically handle splitting and cleanup
 */

/**
 * Interface for block configuration (should match the one in ComplexModularShip)
 */
interface BlockConfig {
  id: string;
  offset: Vector2D;
  type: string;
  size: Vector2D;
  health: number;
  maxHealth?: number;
}

/**
 * Methods to add to ComplexModularShip class for ship splitting functionality
 */
export class ComplexModularShipSplitIntegration {
  /**
   * Check if the ship should split after block destruction and handle it
   * This method should be called from ComplexModularShip after any block is destroyed
   *
   * @param blockConfigs - Current block configurations (with destroyed blocks already removed)
   * @param shipPosition - Current world position of the ship
   * @param shipRotation - Current rotation of the ship
   * @param physicsSystem - Physics system instance
   * @param rendererSystem - Renderer system instance
   * @param currentPhysicsBodyId - ID of the current ship's physics body
   * @param renderObjectIds - Current render object IDs (will be cleaned up)
   * @param onNewShipCreated - Callback when a new ship is created from splitting
   * @param onDebrisCreated - Callback when debris is created from splitting
   * @returns True if the ship was split, false if it remains intact
   */
  public static checkAndHandleShipSplitting(
    blockConfigs: BlockConfig[],
    shipPosition: Vector2D,
    shipRotation: number,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    currentPhysicsBodyId: string,
    renderObjectIds: string[],
    onNewShipCreated?: (shipData: {
      body: any;
      blocks: BlockConfig[];
      renderIds: string[];
    }) => void,
    onDebrisCreated?: (debrisData: {
      body: any;
      blocks: BlockConfig[];
      renderIds: string[];
    }) => void
  ): boolean {
    // If no blocks remain, ship is completely destroyed
    if (blockConfigs.length === 0) {
      console.log('🔧 Ship completely destroyed - no blocks remaining');
      this.cleanupShipResources(
        currentPhysicsBodyId,
        renderObjectIds,
        physicsSystem,
        rendererSystem
      );
      return true;
    }

    // If only one block remains, check if it's a cockpit
    if (blockConfigs.length === 1) {
      const lastBlock = blockConfigs[0];
      if (lastBlock.type !== 'COCKPIT') {
        console.log(
          '🔧 Last remaining block is not a cockpit - ship destroyed'
        );
        this.cleanupShipResources(
          currentPhysicsBodyId,
          renderObjectIds,
          physicsSystem,
          rendererSystem
        );
        return true;
      }
      // Single cockpit remains - ship survives but is severely damaged
      console.log(
        '🔧 Only cockpit remains - ship survives but heavily damaged'
      );
      return false;
    }

    // Check if we need to split the ship
    const shouldSplit = this.shouldSplitShip(blockConfigs);

    if (!shouldSplit) {
      console.log('🔧 Ship remains connected - no splitting needed');
      return false;
    }

    console.log('🔧 Ship connectivity broken - initiating splitting sequence');

    // Clean up current render objects
    this.cleanupRenderObjects(renderObjectIds, rendererSystem);

    // Perform the split
    const splitResult = ComplexModularShipSplitter.splitComplexModularShip(
      blockConfigs,
      shipPosition,
      shipRotation,
      physicsSystem,
      rendererSystem,
      currentPhysicsBodyId
    );

    // Handle new ships
    for (const newShip of splitResult.newShips) {
      console.log(`🚀 New ship created with ${newShip.blocks.length} blocks`);
      if (onNewShipCreated) {
        onNewShipCreated(newShip);
      }
    }

    // Handle debris
    for (const debris of splitResult.debris) {
      console.log(`🗑️ Debris created with ${debris.blocks.length} blocks`);
      if (onDebrisCreated) {
        onDebrisCreated(debris);
      }
    }

    return true;
  }

  /**
   * Check if the ship should split based on connectivity analysis
   * This is a quick check before doing the full splitting operation
   *
   * @param blockConfigs - Current block configurations
   * @returns True if the ship should split
   */
  private static shouldSplitShip(blockConfigs: BlockConfig[]): boolean {
    if (blockConfigs.length <= 1) {
      return false;
    }

    // Create a simplified connectivity check
    // Convert to grid positions for analysis
    const gridPositions = new Set<string>();
    const gridSize = 16;

    for (const config of blockConfigs) {
      const gridX = Math.round(config.offset.x / gridSize);
      const gridY = Math.round(config.offset.y / gridSize);
      gridPositions.add(`${gridX},${gridY}`);
    }

    // Do a flood fill to check connectivity
    const visited = new Set<string>();
    const queue: string[] = [];

    // Start from the first block
    const firstBlock = blockConfigs[0];
    const startX = Math.round(firstBlock.offset.x / gridSize);
    const startY = Math.round(firstBlock.offset.y / gridSize);
    const startKey = `${startX},${startY}`;

    queue.push(startKey);
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const [x, y] = current.split(',').map(Number);

      // Check adjacent positions
      const adjacent = [
        `${x + 1},${y}`,
        `${x - 1},${y}`,
        `${x},${y + 1}`,
        `${x},${y - 1}`,
      ];

      for (const adjKey of adjacent) {
        if (gridPositions.has(adjKey) && !visited.has(adjKey)) {
          visited.add(adjKey);
          queue.push(adjKey);
        }
      }
    }

    // If we visited all positions, the ship is still connected
    const isConnected = visited.size === gridPositions.size;

    if (!isConnected) {
      console.log(
        `🔧 Connectivity check: ${visited.size}/${gridPositions.size} blocks reachable - splitting needed`
      );
    }

    return !isConnected;
  }

  /**
   * Clean up all ship resources (physics and rendering)
   *
   * @param physicsBodyId - ID of the physics body to remove
   * @param renderObjectIds - Render object IDs to remove
   * @param physicsSystem - Physics system
   * @param rendererSystem - Renderer system
   */
  private static cleanupShipResources(
    physicsBodyId: string,
    renderObjectIds: string[],
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem
  ): void {
    // Remove physics body
    const physicsBody = physicsSystem
      .getAllBodies()
      .find(body => body.id === physicsBodyId);
    if (physicsBody) {
      physicsSystem.removeBody(physicsBody);
      console.log(`🔧 Removed physics body: ${physicsBodyId}`);
    }

    // Clean up render objects
    this.cleanupRenderObjects(renderObjectIds, rendererSystem);
  }

  /**
   * Clean up render objects
   *
   * @param renderObjectIds - Array of render object IDs to remove
   * @param rendererSystem - Renderer system
   */
  private static cleanupRenderObjects(
    renderObjectIds: string[],
    rendererSystem: IRendererSystem
  ): void {
    for (const renderObjectId of renderObjectIds) {
      try {
        rendererSystem.removeRenderObject(renderObjectId);
      } catch (error) {
        console.warn(
          `⚠️ Failed to remove render object ${renderObjectId}:`,
          error
        );
      }
    }
    console.log(`🔧 Cleaned up ${renderObjectIds.length} render objects`);
  }

  /**
   * Example integration method to add to ComplexModularShip.damageBlock()
   * This shows how to integrate the splitting check into the existing damage system
   *
   * @param originalDamageBlockMethod - The original damageBlock method
   * @param blockIndex - Index of the block being damaged
   * @param damage - Amount of damage
   * @param shipInstance - The ComplexModularShip instance
   * @returns True if the block was destroyed
   */
  public static enhancedDamageBlock(
    originalDamageBlockMethod: (blockIndex: number, damage: number) => boolean,
    blockIndex: number,
    damage: number,
    shipInstance: any // Would be ComplexModularShip in actual usage
  ): boolean {
    // Call the original damage method
    const wasDestroyed = originalDamageBlockMethod.call(
      shipInstance,
      blockIndex,
      damage
    );

    // If a block was destroyed, check if we need to split the ship
    if (wasDestroyed) {
      console.log(
        `🔧 Block ${blockIndex} destroyed - checking for ship splitting`
      );

      // Get the remaining blocks (those not destroyed)
      const remainingBlocks = shipInstance._blockConfigs.filter(
        (block: any) => block.health > 0
      );

      // Check and handle splitting
      const wasSplit = this.checkAndHandleShipSplitting(
        remainingBlocks,
        shipInstance.position,
        shipInstance.rotation,
        shipInstance._physicsSystem,
        shipInstance._rendererSystem,
        shipInstance._physicsBody?.id || '',
        shipInstance._renderObjectIds,
        _newShipData => {
          // Handle new ship creation
          console.log('🚀 New ship created from splitting');
          // Here you would create a new ComplexModularShip instance
          // or notify the game manager to create one
        },
        _debrisData => {
          // Handle debris creation
          console.log('🗑️ Debris created from splitting');
          // Here you would add the debris to a debris manager
          // or handle it as autonomous floating objects
        }
      );

      if (wasSplit) {
        // Mark the original ship as destroyed since it was split
        shipInstance._isDestroyed = true;
      }
    }

    return wasDestroyed;
  }

  /**
   * Utility method to check if a group of blocks has critical components
   * This can be used to determine if a split group should be considered a viable ship
   *
   * @param blocks - Array of block configurations
   * @returns Object with flags for different critical components
   */
  public static analyzeCriticalComponents(blocks: BlockConfig[]): {
    hasCockpit: boolean;
    hasEngine: boolean;
    hasWeapons: boolean;
    blockCount: number;
    isViableShip: boolean;
  } {
    const analysis = {
      hasCockpit: false,
      hasEngine: false,
      hasWeapons: false,
      blockCount: blocks.length,
      isViableShip: false,
    };

    for (const block of blocks) {
      switch (block.type) {
        case 'COCKPIT':
          analysis.hasCockpit = true;
          break;
        case 'ENGINE':
          analysis.hasEngine = true;
          break;
        case 'WEAPON':
          analysis.hasWeapons = true;
          break;
      }
    }

    // A viable ship needs at least a cockpit and some minimum number of blocks
    analysis.isViableShip = analysis.hasCockpit && analysis.blockCount >= 2;

    return analysis;
  }
}
