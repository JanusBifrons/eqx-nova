import type {
  Vector2D,
  IPhysicsBody,
  CompoundBodyPart,
} from '../../engine/interfaces/IPhysicsSystem';
import type { IPhysicsSystem } from '../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../engine/interfaces/IRendererSystem';
import type { ShipBlock } from '../utils/ShipSplitter';
import { ShipSplitter } from '../utils/ShipSplitter';
import { v4 as uuidv4 } from 'uuid';

/**
 * BlockConfig for ComplexModularShip blocks
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
 * ComplexModularShipSplitter - Extends the base ship splitter for ComplexModularShip integration
 *
 * This class provides integration between the generic ShipSplitter and the ComplexModularShip
 * implementation, handling the conversion between block configurations and physics bodies.
 *
 * Following SOLID principles:
 * - Single Responsibility: Handles only ComplexModularShip splitting operations
 * - Open/Closed: Extends ShipSplitter without modifying it
 * - Interface Segregation: Provides specific interface for complex ship operations
 * - Dependency Inversion: Depends on abstractions for physics and rendering
 */
export class ComplexModularShipSplitter {
  /**
   * Split a ComplexModularShip after damage, creating new ships and debris
   *
   * @param blockConfigs - Current block configurations of the ship
   * @param shipPosition - Current world position of the ship
   * @param shipRotation - Current rotation of the ship
   * @param physicsSystem - Physics system for creating new bodies
   * @param rendererSystem - Renderer system for creating visual objects
   * @param originalBodyId - ID of the original physics body to remove
   * @returns Object containing new ship composites and debris composites
   */
  public static splitComplexModularShip(
    blockConfigs: BlockConfig[],
    shipPosition: Vector2D,
    shipRotation: number,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    originalBodyId: string
  ): {
    newShips: {
      body: IPhysicsBody;
      blocks: BlockConfig[];
      renderIds: string[];
    }[];
    debris: {
      body: IPhysicsBody;
      blocks: BlockConfig[];
      renderIds: string[];
    }[];
  } {
    console.log(
      `🔧 Splitting ComplexModularShip with ${blockConfigs.length} blocks`
    );

    // Convert BlockConfigs to ShipBlocks for the splitter
    const shipBlocks = this.convertToShipBlocks(blockConfigs, physicsSystem);

    // Remove the original physics body
    const originalBody = physicsSystem
      .getAllBodies()
      .find(body => body.id === originalBodyId);
    if (originalBody) {
      physicsSystem.removeBody(originalBody);
      console.log(`🔧 Removed original ship body: ${originalBodyId}`);
    }

    // Use the base splitter to find connected groups
    const splitResult = ShipSplitter.splitShipComposite(
      shipBlocks,
      physicsSystem
    );

    // Convert ship groups back to ComplexModularShip format
    const newShips = this.createNewShipComposites(
      splitResult.newShips,
      shipPosition,
      shipRotation,
      physicsSystem,
      rendererSystem
    );

    const debris = this.createDebrisComposites(
      splitResult.debris,
      shipPosition,
      shipRotation,
      physicsSystem,
      rendererSystem
    );

    console.log(
      `🔧 Created ${newShips.length} new ships and ${debris.length} debris groups`
    );

    return { newShips, debris };
  }

  /**
   * Convert BlockConfigs to ShipBlocks for use with the base splitter
   *
   * @param blockConfigs - Array of block configurations
   * @param physicsSystem - Physics system for creating temporary bodies
   * @returns Array of ShipBlocks
   */
  private static convertToShipBlocks(
    blockConfigs: BlockConfig[],
    physicsSystem: IPhysicsSystem
  ): ShipBlock[] {
    const shipBlocks: ShipBlock[] = [];

    for (const config of blockConfigs) {
      // Create a temporary physics body for this block
      // In the actual ship, these would be parts of a compound body
      const body = physicsSystem.createRectangle(
        config.offset.x,
        config.offset.y,
        config.size.x,
        config.size.y,
        { isStatic: true } // Temporary bodies are static
      );

      // Convert offset to grid position (assuming 16x16 grid)
      const gridSize = 16;
      const gridPos = {
        x: Math.round(config.offset.x / gridSize),
        y: Math.round(config.offset.y / gridSize),
      };

      const shipBlock: ShipBlock = {
        body,
        gridPos,
        type: config.type.toLowerCase(), // Normalize type for comparison
        id: config.id,
        health: config.health,
        maxHealth: config.maxHealth || 100,
      };

      shipBlocks.push(shipBlock);
    }

    return shipBlocks;
  }

  /**
   * Create new ship composites from split groups
   *
   * @param shipGroups - Groups of blocks that form new ships
   * @param originalPosition - Original ship position
   * @param originalRotation - Original ship rotation
   * @param physicsSystem - Physics system
   * @param rendererSystem - Renderer system
   * @returns Array of new ship composite objects
   */
  private static createNewShipComposites(
    shipGroups: ShipBlock[][],
    originalPosition: Vector2D,
    originalRotation: number,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem
  ): { body: IPhysicsBody; blocks: BlockConfig[]; renderIds: string[] }[] {
    const newShips = [];

    for (let i = 0; i < shipGroups.length; i++) {
      const group = shipGroups[i];
      console.log(`🚀 Creating new ship from group of ${group.length} blocks`);

      // Calculate center of mass for the new ship
      const centerOfMass = ShipSplitter.calculateGroupCenterOfMass(group, 16);

      // Calculate world position for the new ship
      const cos = Math.cos(originalRotation);
      const sin = Math.sin(originalRotation);
      const worldCenterX =
        originalPosition.x +
        (centerOfMass.x * 16 * cos - centerOfMass.y * 16 * sin);
      const worldCenterY =
        originalPosition.y +
        (centerOfMass.x * 16 * sin + centerOfMass.y * 16 * cos);

      const newShipPosition = { x: worldCenterX, y: worldCenterY };

      // Convert ShipBlocks back to BlockConfigs
      const blockConfigs = this.convertToBlockConfigs(group, centerOfMass);

      // Create new compound physics body
      const compoundBody = this.createCompoundBodyFromBlocks(
        blockConfigs,
        newShipPosition,
        physicsSystem
      );

      // Create render objects
      const renderIds = this.createRenderObjectsForBlocks(
        blockConfigs,
        newShipPosition,
        originalRotation,
        rendererSystem,
        `ship_split_${i}`
      );

      newShips.push({
        body: compoundBody,
        blocks: blockConfigs,
        renderIds,
      });
    }

    return newShips;
  }

  /**
   * Create debris composites from split groups
   *
   * @param debrisGroups - Groups of blocks that form debris
   * @param originalPosition - Original ship position
   * @param originalRotation - Original ship rotation
   * @param physicsSystem - Physics system
   * @param rendererSystem - Renderer system
   * @returns Array of debris composite objects
   */
  private static createDebrisComposites(
    debrisGroups: ShipBlock[][],
    originalPosition: Vector2D,
    originalRotation: number,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem
  ): { body: IPhysicsBody; blocks: BlockConfig[]; renderIds: string[] }[] {
    const debris = [];

    for (let i = 0; i < debrisGroups.length; i++) {
      const group = debrisGroups[i];
      console.log(`🗑️ Creating debris from group of ${group.length} blocks`);

      // Calculate center of mass for the debris
      const centerOfMass = ShipSplitter.calculateGroupCenterOfMass(group, 16);

      // Calculate world position for the debris
      const cos = Math.cos(originalRotation);
      const sin = Math.sin(originalRotation);
      const worldCenterX =
        originalPosition.x +
        (centerOfMass.x * 16 * cos - centerOfMass.y * 16 * sin);
      const worldCenterY =
        originalPosition.y +
        (centerOfMass.x * 16 * sin + centerOfMass.y * 16 * cos);

      const debrisPosition = { x: worldCenterX, y: worldCenterY };

      // Convert ShipBlocks back to BlockConfigs
      const blockConfigs = this.convertToBlockConfigs(group, centerOfMass);

      // Create physics body for debris (with different properties than ships)
      const debrisBody = this.createDebrisBodyFromBlocks(
        blockConfigs,
        debrisPosition,
        physicsSystem
      );

      // Create render objects with debris-like appearance
      const renderIds = this.createRenderObjectsForBlocks(
        blockConfigs,
        debrisPosition,
        originalRotation,
        rendererSystem,
        `debris_split_${i}`,
        true // Mark as debris for different visual style
      );

      debris.push({
        body: debrisBody,
        blocks: blockConfigs,
        renderIds,
      });
    }

    return debris;
  }

  /**
   * Convert ShipBlocks back to BlockConfigs
   *
   * @param group - Group of ShipBlocks
   * @param centerOfMass - Center of mass to offset from
   * @returns Array of BlockConfigs
   */
  private static convertToBlockConfigs(
    group: ShipBlock[],
    centerOfMass: { x: number; y: number }
  ): BlockConfig[] {
    return group.map(block => {
      // Remove the temporary physics body
      // (In production, you might want to handle this differently)

      // Calculate offset relative to the new center of mass
      const offsetX = (block.gridPos.x - centerOfMass.x) * 16;
      const offsetY = (block.gridPos.y - centerOfMass.y) * 16;

      return {
        id: block.id,
        offset: { x: offsetX, y: offsetY },
        type: block.type.toUpperCase(), // Convert back to original format
        size: { x: 16, y: 16 }, // Standard block size
        health: block.health || 100,
        maxHealth: block.maxHealth || 100,
      };
    });
  }

  /**
   * Create a compound physics body from block configurations
   *
   * @param blockConfigs - Block configurations
   * @param position - World position for the composite
   * @param physicsSystem - Physics system
   * @returns New compound physics body
   */
  private static createCompoundBodyFromBlocks(
    blockConfigs: BlockConfig[],
    position: Vector2D,
    physicsSystem: IPhysicsSystem
  ): IPhysicsBody {
    const parts: CompoundBodyPart[] = blockConfigs.map(config => ({
      type: 'rectangle' as const,
      x: config.offset.x,
      y: config.offset.y,
      width: config.size.x,
      height: config.size.y,
      componentId: config.id,
    }));

    return physicsSystem.createCompoundBody(position.x, position.y, parts, {
      isStatic: false,
      density: 0.001,
      friction: 0.1,
      restitution: 0.3,
      frictionAir: 0.02,
    });
  }

  /**
   * Create a physics body for debris with different properties
   *
   * @param blockConfigs - Block configurations
   * @param position - World position for the debris
   * @param physicsSystem - Physics system
   * @returns New debris physics body
   */
  private static createDebrisBodyFromBlocks(
    blockConfigs: BlockConfig[],
    position: Vector2D,
    physicsSystem: IPhysicsSystem
  ): IPhysicsBody {
    const parts: CompoundBodyPart[] = blockConfigs.map(config => ({
      type: 'rectangle' as const,
      x: config.offset.x,
      y: config.offset.y,
      width: config.size.x,
      height: config.size.y,
      componentId: config.id,
    }));

    return physicsSystem.createCompoundBody(position.x, position.y, parts, {
      isStatic: false,
      density: 0.0005, // Lighter than ships
      friction: 0.2, // Higher friction
      restitution: 0.4, // More bouncy
      frictionAir: 0.03, // More air resistance
    });
  }

  /**
   * Create render objects for the blocks
   *
   * @param blockConfigs - Block configurations
   * @param position - World position
   * @param rotation - Rotation angle
   * @param rendererSystem - Renderer system
   * @param prefix - Prefix for render object IDs
   * @param isDebris - Whether these are debris (affects visual style)
   * @returns Array of render object IDs
   */
  private static createRenderObjectsForBlocks(
    blockConfigs: BlockConfig[],
    position: Vector2D,
    rotation: number,
    rendererSystem: IRendererSystem,
    prefix: string,
    isDebris: boolean = false
  ): string[] {
    const renderIds: string[] = [];
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Color mapping for different block types
    const blockTypeColors: Record<string, number> = {
      COCKPIT: isDebris ? 0x4d2600 : 0xff8c00, // Dim orange for debris
      WEAPON: isDebris ? 0x2d0000 : 0xff4444, // Dim red for debris
      ENGINE: isDebris ? 0x000022 : 0x4444ff, // Dim blue for debris
      ARMOR: isDebris ? 0x222222 : 0x888888, // Darker gray for debris
      SHIELD: isDebris ? 0x002222 : 0x44ffff, // Dim cyan for debris
      CARGO: isDebris ? 0x222200 : 0xffff44, // Dim yellow for debris
      SENSOR: isDebris ? 0x002200 : 0x44ff44, // Dim green for debris
    };

    for (let i = 0; i < blockConfigs.length; i++) {
      const config = blockConfigs[i];
      const renderObjectId = `${prefix}_block_${i}_${uuidv4()}`;

      // Calculate world position of this block
      const blockWorldX =
        position.x + (config.offset.x * cos - config.offset.y * sin);
      const blockWorldY =
        position.y + (config.offset.x * sin + config.offset.y * cos);

      const color =
        blockTypeColors[config.type] || (isDebris ? 0x333333 : 0x888888);

      rendererSystem.createRenderObject({
        id: renderObjectId,
        position: { x: blockWorldX, y: blockWorldY },
        angle: rotation,
        width: config.size.x,
        height: config.size.y,
        color: color,
        type: 'rectangle',
      });

      renderIds.push(renderObjectId);
    }

    return renderIds;
  }

  /**
   * Clean up temporary physics bodies created during the splitting process
   *
   * @param shipBlocks - Array of ship blocks with temporary bodies
   * @param physicsSystem - Physics system to remove bodies from
   */
  public static cleanupTemporaryBodies(
    shipBlocks: ShipBlock[],
    physicsSystem: IPhysicsSystem
  ): void {
    for (const block of shipBlocks) {
      physicsSystem.removeBody(block.body);
    }
    console.log(`🔧 Cleaned up ${shipBlocks.length} temporary physics bodies`);
  }
}
