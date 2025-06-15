import type { Vector2D, IPhysicsBody, IPhysicsSystem } from '../../engine/interfaces/IPhysicsSystem';

/**
 * ShipBlock - Represents a single block/component in a modular ship
 * Used by the ship splitting system for connectivity analysis
 */
export interface ShipBlock {
    /** The Matter.js physics body for this block */
    body: IPhysicsBody;
    /** Grid position of the block within the ship */
    gridPos: { x: number; y: number };
    /** Type of the block (e.g., "cockpit", "engine", "weapon", "armor") */
    type: string;
    /** Unique identifier for this block */
    id: string;
    /** Health/damage state of this block */
    health?: number;
    /** Maximum health of this block */
    maxHealth?: number;
}

/**
 * ShipSplitterResult - Result of splitting a ship composite
 */
export interface ShipSplitterResult {
    /** New ship composites (groups with cockpits) */
    newShips: ShipBlock[][];
    /** Debris composites (groups without cockpits) */
    debris: ShipBlock[][];
}

/**
 * ShipSplitter - Handles connectivity-based ship splitting for modular ships
 * 
 * This system:
 * 1. Analyzes remaining blocks after damage to find connected groups
 * 2. Classifies groups as "ships" (with cockpit) or "debris" (without cockpit)
 * 3. Provides the foundation for creating new physics composites
 * 
 * Following SOLID principles:
 * - Single Responsibility: Only handles connectivity analysis and grouping
 * - Open/Closed: Extensible for different block types and ship configurations
 * - Interface Segregation: Focused interface for ship splitting operations
 * - Dependency Inversion: Depends on abstractions (interfaces) not implementations
 */
export class ShipSplitter {
  /**
   * Split a ship composite into contiguous parts and classify them as ships or debris
   * 
   * @param blocks - All remaining blocks of the ship after damage
   * @param physicsSystem - The Matter.js physics system for creating new bodies
   * @returns Object containing arrays of new ships and debris groups
   */  public static splitShipComposite(
    blocks: ShipBlock[],
    _physicsSystem: IPhysicsSystem
): ShipSplitterResult {
        console.log(`🔧 Starting ship splitting analysis for ${blocks.length} blocks`);

        if (blocks.length === 0) {
            return { newShips: [], debris: [] };
        }

        // If only one block remains, classify it based on whether it's a cockpit
        if (blocks.length === 1) {
            const singleBlock = blocks[0];
            const hasCockpit = singleBlock.type === 'cockpit';

            console.log(`🔧 Single block remaining: ${singleBlock.type} (${hasCockpit ? 'ship' : 'debris'})`);

            return {
                newShips: hasCockpit ? [[singleBlock]] : [],
                debris: hasCockpit ? [] : [[singleBlock]]
            };
        }

        // Find connected groups using flood fill algorithm
        const groups = this.findConnectedGroups(blocks);

        console.log(`🔧 Found ${groups.length} connected groups`);

        // Classify groups as ships or debris based on cockpit presence
        const newShips: ShipBlock[][] = [];
        const debris: ShipBlock[][] = [];

        for (const group of groups) {
            const hasCockpit = group.some(block => block.type === 'cockpit');
            const target = hasCockpit ? newShips : debris;
            target.push(group);

            console.log(`🔧 Group of ${group.length} blocks classified as ${hasCockpit ? 'ship' : 'debris'}`);
        }

        console.log(`🔧 Split result: ${newShips.length} ships, ${debris.length} debris groups`);

        return { newShips, debris };
    }

    /**
     * Find connected groups of blocks using flood fill algorithm
     * 
     * @param blocks - Array of ship blocks to analyze
     * @returns Array of connected groups, each group is an array of blocks
     */
    private static findConnectedGroups(blocks: ShipBlock[]): ShipBlock[][] {
        const visited = new Set<ShipBlock>();
        const blockMap = this.createGridLookupMap(blocks);
        const groups: ShipBlock[][] = [];

        for (const block of blocks) {
            if (visited.has(block)) continue;

            // Start a new connected group
            const group: ShipBlock[] = [];
            const queue: ShipBlock[] = [block];
            visited.add(block);

            // Flood fill to find all connected blocks
            while (queue.length > 0) {
                const current = queue.pop()!;
                group.push(current);

                // Check all adjacent positions (4-directional connectivity)
                const { x, y } = current.gridPos;
                const adjacentPositions = [
                    { x: x + 1, y },
                    { x: x - 1, y },
                    { x, y: y + 1 },
                    { x, y: y - 1 },
                ];

                for (const pos of adjacentPositions) {
                    const neighbour = blockMap.get(this.gridKey(pos));
                    if (neighbour && !visited.has(neighbour)) {
                        visited.add(neighbour);
                        queue.push(neighbour);
                    }
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Create a fast lookup map from grid position to block
     * 
     * @param blocks - Array of ship blocks
     * @returns Map from grid position key to block
     */
    private static createGridLookupMap(blocks: ShipBlock[]): Map<string, ShipBlock> {
        const blockMap = new Map<string, ShipBlock>();

        for (const block of blocks) {
            const key = this.gridKey(block.gridPos);
            blockMap.set(key, block);
        }

        return blockMap;
    }

    /**
     * Generate a string key for a grid position
     * 
     * @param pos - Grid position with x and y coordinates
     * @returns String key for the position
     */
    private static gridKey(pos: { x: number; y: number }): string {
        return `${pos.x},${pos.y}`;
    }

    /**
     * Remove all blocks from the physics world
     * Use this before creating new composites from the split groups
     * 
     * @param blocks - Array of blocks to remove from physics world
     * @param physicsSystem - The physics system to remove bodies from
     */
    public static removeBlocksFromWorld(
        blocks: ShipBlock[],
        physicsSystem: IPhysicsSystem
    ): void {
        console.log(`🔧 Removing ${blocks.length} blocks from physics world`);

        for (const block of blocks) {
            physicsSystem.removeBody(block.body);
        }
    }

    /**
     * Utility method to convert grid coordinates to world coordinates
     * This is useful when creating new composites from split groups
     * 
     * @param gridPos - Grid position
     * @param gridSize - Size of each grid cell
     * @param shipOrigin - World position of the ship's origin (0,0) grid position
     * @returns World coordinates
     */
    public static gridToWorld(
        gridPos: { x: number; y: number },
        gridSize: number,
        shipOrigin: Vector2D
    ): Vector2D {
        return {
            x: shipOrigin.x + (gridPos.x * gridSize),
            y: shipOrigin.y + (gridPos.y * gridSize)
        };
    }

  /**
   * Calculate the center of mass for a group of blocks
   * Useful for positioning new composites after splitting
   * 
   * @param group - Array of blocks in the group
   * @param gridSize - Size of each grid cell
   * @returns Center of mass in grid coordinates
   */  public static calculateGroupCenterOfMass(
        group: ShipBlock[],
        _gridSize: number
    ): { x: number; y: number } {
        if (group.length === 0) {
            return { x: 0, y: 0 };
        }

        let totalX = 0;
        let totalY = 0;

        for (const block of group) {
            totalX += block.gridPos.x;
            totalY += block.gridPos.y;
        }

        return {
            x: totalX / group.length,
            y: totalY / group.length
        };
    }

    /**
     * Check if a group has a specific block type
     * 
     * @param group - Array of blocks to check
     * @param blockType - Type of block to look for
     * @returns True if the group contains the specified block type
     */
    public static groupHasBlockType(group: ShipBlock[], blockType: string): boolean {
        return group.some(block => block.type === blockType);
    }

    /**
     * Get all blocks of a specific type from a group
     * 
     * @param group - Array of blocks to search
     * @param blockType - Type of block to find
     * @returns Array of blocks matching the specified type
     */
    public static getBlocksOfType(group: ShipBlock[], blockType: string): ShipBlock[] {
        return group.filter(block => block.type === blockType);
    }

    /**
     * Validate that a group of blocks is properly connected
     * This is a sanity check to ensure the splitting algorithm worked correctly
     * 
     * @param group - Array of blocks to validate
     * @returns True if all blocks in the group are connected
     */
    public static validateGroupConnectivity(group: ShipBlock[]): boolean {
        if (group.length <= 1) {
            return true;
        }

        const blockMap = this.createGridLookupMap(group);
        const visited = new Set<ShipBlock>();
        const queue: ShipBlock[] = [group[0]];
        visited.add(group[0]);

        while (queue.length > 0) {
            const current = queue.pop()!;
            const { x, y } = current.gridPos;

            const adjacentPositions = [
                { x: x + 1, y },
                { x: x - 1, y },
                { x, y: y + 1 },
                { x, y: y - 1 },
            ];

            for (const pos of adjacentPositions) {
                const neighbour = blockMap.get(this.gridKey(pos));
                if (neighbour && !visited.has(neighbour)) {
                    visited.add(neighbour);
                    queue.push(neighbour);
                }
            }
        }

        const isValid = visited.size === group.length;

        if (!isValid) {
            console.warn(`⚠️ Group validation failed: ${visited.size} reachable blocks out of ${group.length} total blocks`);
        }

        return isValid;
    }
}
