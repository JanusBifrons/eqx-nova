import type { IGameEngine } from '../interfaces/IGameEngine';
import type { AIShipConfig, AIBehaviorConfig } from '../interfaces/IAI';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { ICompositeShip } from '../interfaces/ICompositeShip';
import { AIShip } from '../entities/AIShip';
import { AIBehavior } from '../entities/AIBehavior';
import { CompositeShipFactory } from '../factories/CompositeShipFactory';
import { v4 as uuidv4 } from 'uuid';

/**
 * AIManager - Manages all AI ships in the game
 * Following Single Responsibility Principle: only manages AI ships
 * Following Dependency Inversion Principle: depends on abstractions
 */
export class AIManager {
  private readonly _gameEngine: IGameEngine;

  private readonly _aiShips: Map<string, AIShip> = new Map();

  private _onFireLaser?: (
    position: Vector2D,
    rotation: number,
    velocity?: Vector2D,
    sourceId?: string
  ) => boolean;

  constructor(gameEngine: IGameEngine) {
    this._gameEngine = gameEngine;
  }

  /**
   * Set the laser firing callback
   */
  public setFireLaserCallback(
    callback: (
      position: Vector2D,
      rotation: number,
      velocity?: Vector2D,
      sourceId?: string
    ) => boolean
  ): void {
    this._onFireLaser = callback;
  }

  /**
   * Create an AI ship with the given configuration
   */
  public createAIShip(config: AIShipConfig): AIShip {
    const shipId = uuidv4(); // Use proper UUID instead of counter

    console.log(
      `🤖 Creating AI ship ${config.faction} with ${config.partPositions.length} parts:`
    );
    console.log(
      `🤖 Part positions:`,
      config.partPositions.map(p => `(${p.x},${p.y})`).join(', ')
    );
    console.log(`🤖 Part size: ${config.partSize}`);

    // Create the composite ship
    const compositeShip = CompositeShipFactory.createCustomShip(
      (this._gameEngine as any).engine, // Access underlying engine
      config.position,
      [...config.partPositions], // Convert readonly to mutable
      config.partSize,
      shipId,
      config.partColor,
      config.lives,
      () => this.handleShipDestroyed(shipId)
    );

    // Create AI behavior
    const behaviorConfig: AIBehaviorConfig = {
      behaviorType: config.behaviorType,
      fireRate: config.fireRate,
      detectionRange: config.detectionRange,
      rotationSpeed: 0.003, // Same as player
      thrustForce: 0.002, // Same as player
      maxSpeed: 5.0,
    };

    const behavior = new AIBehavior(
      `${shipId}_behavior`,
      compositeShip,
      behaviorConfig
    );

    // Create AI ship with firing callback
    const aiShip = new AIShip(
      shipId,
      compositeShip,
      behavior,
      config.faction,
      () => this.handleAIFire(compositeShip)
    );

    this._aiShips.set(shipId, aiShip);

    console.log(`Created AI ship: ${shipId} with faction: ${config.faction}`);

    return aiShip;
  }

  /**
   * Grid-based ship design system
   * All parts must be placed on a logical grid where adjacent parts connect
   */
  private createGridBasedShipConfigurations(worldDims: {
    width: number;
    height: number;
  }): AIShipConfig[] {
    const GRID_SIZE = 20; // Each grid cell is 20 pixels

    // Helper function to convert grid coordinates to world coordinates
    const gridToWorld = (gridX: number, gridY: number) => {
      const result = {
        x: gridX * GRID_SIZE,
        y: gridY * GRID_SIZE,
      };
      console.log(`🔧 Grid (${gridX}, ${gridY}) -> World (${result.x}, ${result.y})`);
      return result;
    };

    // Helper function to validate that all parts form a connected component
    const validateConnectivity = (
      gridPositions: { x: number; y: number }[]
    ) => {
      if (gridPositions.length === 0) return false;
      if (gridPositions.length === 1) return true;

      // Convert to grid coordinates for easier connectivity checking
      const gridSet = new Set();
      gridPositions.forEach(pos => {
        const gridX = Math.round(pos.x / GRID_SIZE);
        const gridY = Math.round(pos.y / GRID_SIZE);
        gridSet.add(`${gridX},${gridY}`);
      });

      // BFS to check connectivity
      const start = gridPositions[0];
      const startGridX = Math.round(start.x / GRID_SIZE);
      const startGridY = Math.round(start.y / GRID_SIZE);

      const visited = new Set();
      const queue = [`${startGridX},${startGridY}`];
      visited.add(`${startGridX},${startGridY}`);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const [x, y] = current.split(',').map(Number);

        // Check all 4 adjacent cells (no diagonals for basic connectivity)
        const neighbors = [
          `${x + 1},${y}`,
          `${x - 1},${y}`,
          `${x},${y + 1}`,
          `${x},${y - 1}`,
        ];

        neighbors.forEach(neighbor => {
          if (gridSet.has(neighbor) && !visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      return visited.size === gridSet.size;
    };

    // RED DREADNOUGHT - Heavy battleship in arrow formation
    const redDreadnoughtGrid = [
      // Main spine (horizontal line)
      gridToWorld(0, 0), // Center
      gridToWorld(-1, 0), // Rear 1
      gridToWorld(-2, 0), // Rear 2
      gridToWorld(-3, 0), // Rear 3 (engines)
      gridToWorld(1, 0), // Front 1
      gridToWorld(2, 0), // Front 2 (nose)

      // Upper wing (connected to center)
      gridToWorld(0, -1), // Upper center
      gridToWorld(-1, -1), // Upper rear
      gridToWorld(1, -1), // Upper front
      gridToWorld(0, -2), // Upper tip

      // Lower wing (connected to center)
      gridToWorld(0, 1), // Lower center
      gridToWorld(-1, 1), // Lower rear
      gridToWorld(1, 1), // Lower front
      gridToWorld(0, 2), // Lower tip

      // Diagonal corner smoothing (optional "leaves")
      gridToWorld(-2, -1), // Upper rear diagonal
      gridToWorld(-2, 1), // Lower rear diagonal
    ];

    // BLUE FORTRESS - Defensive square formation
    const blueFortressGrid = [
      // Central core (3x3 square)
      gridToWorld(0, 0), // Center
      gridToWorld(-1, 0),
      gridToWorld(1, 0), // Horizontal line
      gridToWorld(0, -1),
      gridToWorld(0, 1), // Vertical line
      gridToWorld(-1, -1),
      gridToWorld(1, -1), // Upper corners
      gridToWorld(-1, 1),
      gridToWorld(1, 1), // Lower corners

      // Extensions (connected to edges)
      gridToWorld(2, 0), // Right extension
      gridToWorld(-2, 0), // Left extension
      gridToWorld(0, 2), // Bottom extension
      gridToWorld(0, -2), // Top extension

      // Outer corners for reinforcement
      gridToWorld(2, -1), // Right-top diagonal
      gridToWorld(2, 1), // Right-bottom diagonal
    ];

    // PURPLE DESTROYER - Sleek linear design
    const purpleDestroyerGrid = [
      // Main body (horizontal line)
      gridToWorld(0, 0), // Center
      gridToWorld(-1, 0), // Rear 1
      gridToWorld(-2, 0), // Rear 2 (engines)
      gridToWorld(1, 0), // Front 1
      gridToWorld(2, 0), // Front 2
      gridToWorld(3, 0), // Nose

      // Side wings (minimal, connected to main body)
      gridToWorld(0, -1), // Upper wing
      gridToWorld(0, 1), // Lower wing

      // Engine pods (connected to rear)
      gridToWorld(-2, -1), // Upper engine
      gridToWorld(-2, 1), // Lower engine
    ];

    // ORANGE CARRIER - Wide T-formation
    const orangeCarrierGrid = [
      // Central spine
      gridToWorld(0, 0), // Command center
      gridToWorld(-1, 0), // Rear command
      gridToWorld(-2, 0), // Engine core
      gridToWorld(1, 0), // Front command

      // Wide flight deck (horizontal)
      gridToWorld(0, -1),
      gridToWorld(0, -2),
      gridToWorld(0, -3), // Port deck
      gridToWorld(0, 1),
      gridToWorld(0, 2),
      gridToWorld(0, 3), // Starboard deck

      // Support structure
      gridToWorld(-1, -1),
      gridToWorld(-1, 1), // Rear supports
      gridToWorld(1, -1),
      gridToWorld(1, 1), // Front supports

      // Landing bay extensions
      gridToWorld(-1, -2),
      gridToWorld(-1, 2), // Extended bays
      gridToWorld(1, -2),
      gridToWorld(1, 2), // Extended bays
    ];

    // YELLOW INTERCEPTOR - Compact V-shape
    const yellowInterceptorGrid = [
      // SIMPLIFIED FOR TESTING - Just a 3-part horizontal line
      gridToWorld(-1, 0), // Left
      gridToWorld(0, 0),  // Center  
      gridToWorld(1, 0),  // Right
    ];

    // CYAN CRUISER - Diamond formation
    const cyanCruiserGrid = [
      // Diamond core
      gridToWorld(0, 0), // Center
      gridToWorld(1, 0), // Front
      gridToWorld(-1, 0), // Rear
      gridToWorld(0, -1), // Top
      gridToWorld(0, 1), // Bottom

      // Secondary ring
      gridToWorld(1, -1), // Front-top
      gridToWorld(1, 1), // Front-bottom
      gridToWorld(-1, -1), // Rear-top
      gridToWorld(-1, 1), // Rear-bottom

      // Extensions
      gridToWorld(2, 0), // Extended nose
      gridToWorld(-2, 0), // Extended tail
      gridToWorld(0, -2), // Extended top
      gridToWorld(0, 2), // Extended bottom
    ];

    // Validate all ship designs
    const shipGrids = [
      { name: 'Red Dreadnought', grid: redDreadnoughtGrid },
      { name: 'Blue Fortress', grid: blueFortressGrid },
      { name: 'Purple Destroyer', grid: purpleDestroyerGrid },
      { name: 'Orange Carrier', grid: orangeCarrierGrid },
      { name: 'Yellow Interceptor', grid: yellowInterceptorGrid },
      { name: 'Cyan Cruiser', grid: cyanCruiserGrid },
    ];

    shipGrids.forEach(ship => {
      const isValid = validateConnectivity(ship.grid);
      console.log(
        `🔧 ${ship.name} grid connectivity: ${isValid ? '✅ VALID' : '❌ INVALID'}`
      );
      if (!isValid) {
        console.error(
          `❌ ${ship.name} has disconnected parts! This will cause ship breakage.`
        );
      }
    });

    return [
      // RED DREADNOUGHT - Heavy assault battleship
      {
        position: { x: worldDims.width * 0.1, y: worldDims.height * 0.1 },
        partPositions: redDreadnoughtGrid,
        partSize: 20,
        partColor: 0xff0000, // Red
        faction: 'red_dreadnought',
        behaviorType: 'aggressive',
        fireRate: 400,
        detectionRange: 450,
        lives: 12,
      },

      // BLUE FORTRESS - Defensive battleship
      {
        position: { x: worldDims.width * 0.9, y: worldDims.height * 0.1 },
        partPositions: blueFortressGrid,
        partSize: 20,
        partColor: 0x0000ff, // Blue
        faction: 'blue_fortress',
        behaviorType: 'defensive',
        fireRate: 600,
        detectionRange: 400,
        lives: 15,
      },

      // PURPLE DESTROYER - Fast attack ship
      {
        position: { x: worldDims.width * 0.1, y: worldDims.height * 0.5 },
        partPositions: purpleDestroyerGrid,
        partSize: 20, // Changed from 18 to match grid size
        partColor: 0xff00ff, // Purple
        faction: 'purple_destroyer',
        behaviorType: 'hunter',
        fireRate: 300,
        detectionRange: 400,
        lives: 10,
      },

      // ORANGE CARRIER - Support battleship
      {
        position: { x: worldDims.width * 0.85, y: worldDims.height * 0.85 },
        partPositions: orangeCarrierGrid,
        partSize: 20,
        partColor: 0xffa500, // Orange
        faction: 'orange_carrier',
        behaviorType: 'patrol',
        fireRate: 600,
        detectionRange: 500,
        lives: 16,
      },

      // YELLOW INTERCEPTOR - Ultra-fast strike craft
      {
        position: { x: worldDims.width * 0.5, y: worldDims.height * 0.1 },
        partPositions: yellowInterceptorGrid,
        partSize: 20, // Changed from 18 to match grid size
        partColor: 0xffff00, // Yellow
        faction: 'yellow_interceptor',
        behaviorType: 'hunter',
        fireRate: 200,
        detectionRange: 600,
        lives: 8,
      },

      // CYAN CRUISER - Balanced medium ship
      {
        position: { x: worldDims.width * 0.5, y: worldDims.height * 0.9 },
        partPositions: cyanCruiserGrid,
        partSize: 20, // Changed from 18 to match grid size
        partColor: 0x00ffff, // Cyan
        faction: 'cyan_cruiser',
        behaviorType: 'patrol',
        fireRate: 500,
        detectionRange: 350,
        lives: 13,
      },
    ];
  }

  /**
   * Create multiple AI ships with different configurations
   */
  public spawnAIFleet(): void {
    const worldDims = this._gameEngine.getWorldDimensions();

    const shipConfigs = this.createGridBasedShipConfigurations(worldDims);

    // Create all AI ships
    shipConfigs.forEach(config => {
      this.createAIShip(config);
    });

    console.log(
      `Spawned ${shipConfigs.length} AI ships with different configurations`
    );
  }

  /**
   * Update all AI ships
   */
  public update(deltaTime: number): void {
    // Collect inactive ships to remove after iteration
    const inactiveShipIds: string[] = [];

    // Update all active AI ships
    for (const [shipId, aiShip] of this._aiShips) {
      if (aiShip.isActive) {
        aiShip.update(deltaTime);
      } else {
        // Mark inactive ships for removal
        inactiveShipIds.push(shipId);
      }
    }

    // Remove inactive ships after iteration to avoid modifying map during iteration
    inactiveShipIds.forEach(shipId => {
      this._aiShips.delete(shipId);
    });

    // Make AI ships target each other and the player
    this.updateAITargeting();
  }

  /**
   * Set player as target for all AI ships
   */
  public setPlayerTarget(playerShip: ICompositeShip | null): void {
    let targetCount = 0;

    for (const aiShip of this._aiShips.values()) {
      if (aiShip.isActive && playerShip) {
        aiShip.setTarget(playerShip);
        targetCount++;
      }
    }
    // Debug logging (occasionally)
    if (Math.random() < 0.001 && targetCount > 0) {
      // 0.1% chance to log
      console.log(`Set player target for ${targetCount} AI ships`);
    }
  }

  /**
   * Get all active AI ships
   */
  public getAllAIShips(): AIShip[] {
    return Array.from(this._aiShips.values()).filter(ship => ship.isActive);
  }

  /**
   * Find AI ship by entity
   */
  public findAIShipByEntity(entity: any): AIShip | null {
    for (const aiShip of this._aiShips.values()) {
      if (aiShip.isActive) {
        const parts = aiShip.ship.parts;
        const foundPart = parts.find(part => part.entity === entity);

        if (foundPart) {
          return aiShip;
        }
      }
    }
    return null;
  }

  /**
   * Handle AI ship destruction
   */
  public handleAIShipDamage(aiShip: AIShip): boolean {
    return aiShip.takeDamage();
  }

  /**
   * Clean up all AI ships
   */
  public destroy(): void {
    for (const aiShip of this._aiShips.values()) {
      aiShip.destroy();
    }
    this._aiShips.clear();
  }

  /**
   * Handle when an AI ship is destroyed
   */
  private handleShipDestroyed(shipId: string): void {
    const aiShip = this._aiShips.get(shipId);

    if (aiShip) {
      aiShip.destroy();
      this._aiShips.delete(shipId);
      console.log(`AI ship destroyed: ${shipId}`);
    }
  }

  /**
   * Handle AI firing
   */
  private handleAIFire(ship: ICompositeShip): boolean {
    if (!this._onFireLaser) return false;

    const position = ship.centerPosition;
    const rotation = ship.rotation;
    const velocity = ship.velocity;

    return this._onFireLaser(position, rotation, velocity, ship.id);
  }

  /**
   * Update AI targeting logic
   */
  private updateAITargeting(): void {
    const activeShips = this.getAllAIShips();

    for (const aiShip of activeShips) {
      // Find the closest enemy ship from a different faction
      let closestEnemy: ICompositeShip | null = null;
      let closestDistance = Infinity;

      for (const otherShip of activeShips) {
        if (otherShip.faction !== aiShip.faction && otherShip.isActive) {
          const distance = this.getDistance(
            aiShip.ship.centerPosition,
            otherShip.ship.centerPosition
          );

          if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = otherShip.ship;
          }
        }
      }
      // Set target if found and within detection range
      if (closestEnemy && closestDistance < 300) {
        // Default detection range
        aiShip.setTarget(closestEnemy);
      }
    }
  }

  /**
   * Calculate distance between two points
   */
  private getDistance(pos1: Vector2D, pos2: Vector2D): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }
}
