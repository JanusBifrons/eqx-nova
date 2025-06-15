import type { IGameEngine } from '../interfaces/IGameEngine';
import type { AIShipConfig } from '../interfaces/IAI';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IModularShip } from '../entities/v2/interfaces/IModularShip';
import { AIShip } from '../entities/AIShip';
import { AIBehavior } from '../entities/AIBehavior';
import { ComplexModularShip } from '../entities/v2/ComplexModularShip';
import { v4 as uuidv4 } from 'uuid';

/**
 * AIManager - Manages all AI ships in the game
 * Following Single Responsibility Principle: only manages AI ships
 * Following Dependency Inversion Principle: depends on abstractions
 */
export class AIManager {
  private readonly _gameEngine: IGameEngine;
  private readonly _aiShips: Map<string, AIShip> = new Map();
  private readonly _modularAIShips: Map<string, IModularShip> = new Map();
  private _aiDisabledForTesting: boolean = false;

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
   * Create an AI ship with the given configuration using modular ships
   */
  public createAIShip(config: AIShipConfig): AIShip {
    console.log(
      `🔨 Creating AI ship: ${config.faction} at (${config.position.x}, ${config.position.y})`
    );

    // Create a unique ID for this AI ship
    const shipId = uuidv4();

    // Create a modular ship using the faction-specific design
    const modularShip = this.createModularShipForFaction(
      config.faction,
      config.position,
      shipId
    );

    // Store the modular ship
    this._modularAIShips.set(shipId, modularShip);

    // Create an AI behavior controller for this ship (but disabled)
    const aiBehavior = new AIBehavior(shipId, modularShip, {
      behaviorType: 'patrol',
      fireRate: 0, // Disabled for testing
      detectionRange: 0, // Disabled for testing
      rotationSpeed: 0, // Disabled for testing
      thrustForce: 0, // Disabled for testing
      maxSpeed: 0, // Disabled for testing
    });
    aiBehavior.disable(); // Disable movement and shooting for testing

    // Create the AIShip wrapper
    const aiShip = new AIShip(shipId, modularShip, aiBehavior, config.faction);

    // Store the AI ship
    this._aiShips.set(shipId, aiShip);

    console.log(`✅ Created modular AI ship: ${config.faction} (${shipId})`);
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
      console.log(
        `🔧 Grid (${gridX}, ${gridY}) -> World (${result.x}, ${result.y})`
      );

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
      gridToWorld(0, 0), // Center
      gridToWorld(1, 0), // Right
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

    // Player spawns at world center, so place AI ships within viewport distance from center
    const centerX = worldDims.width / 2;
    const centerY = worldDims.height / 2;

    // Place ships within ~400 pixels of center (typical viewport is around 800x600)

    return [
      // RED DREADNOUGHT - Heavy assault battleship (top-left of center)
      {
        position: { x: centerX - 200, y: centerY - 150 },
        partPositions: redDreadnoughtGrid,
        partSize: 20,
        faction: 'red_dreadnought',
        behaviorType: 'aggressive',
        fireRate: 400,
        detectionRange: 450,
        lives: 12,
      },

      // BLUE FORTRESS - Defensive battleship (top-right of center)
      {
        position: { x: centerX + 250, y: centerY - 100 },
        partPositions: blueFortressGrid,
        partSize: 20,
        faction: 'blue_fortress',
        behaviorType: 'defensive',
        fireRate: 600,
        detectionRange: 400,
        lives: 15,
      },

      // PURPLE DESTROYER - Fast attack ship (left of center)
      {
        position: { x: centerX - 300, y: centerY + 50 },
        partPositions: purpleDestroyerGrid,
        partSize: 20, // Changed from 18 to match grid size
        faction: 'purple_destroyer',
        behaviorType: 'hunter',
        fireRate: 300,
        detectionRange: 400,
        lives: 10,
      },

      // ORANGE CARRIER - Support battleship (bottom-right of center)
      {
        position: { x: centerX + 180, y: centerY + 200 },
        partPositions: orangeCarrierGrid,
        partSize: 20,
        faction: 'orange_carrier',
        behaviorType: 'patrol',
        fireRate: 600,
        detectionRange: 500,
        lives: 16,
      },

      // YELLOW INTERCEPTOR - Ultra-fast strike craft (top of center)
      {
        position: { x: centerX + 50, y: centerY - 250 },
        partPositions: yellowInterceptorGrid,
        partSize: 20, // Changed from 18 to match grid size
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
      `Spawned ${shipConfigs.length} AI ships close to player at world center`
    );

    // Disable AI movement and shooting for testing
    this.disableAllAI();
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

    // Update modular AI ships
    for (const [shipId, modularShip] of this._modularAIShips) {
      if (modularShip.isAlive) {
        modularShip.update(deltaTime);
      } else {
        // Mark destroyed ships for removal
        inactiveShipIds.push(shipId);
      }
    }

    // Remove inactive ships after iteration to avoid modifying map during iteration
    inactiveShipIds.forEach(shipId => {
      this._aiShips.delete(shipId);
      this._modularAIShips.delete(shipId);
    });

    // Make AI ships target each other and the player
    this.updateAITargeting();
  }

  /**
   * Set player as target for all AI ships
   */
  public setPlayerTarget(playerShip: any | null): void {
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
   * Get all modular AI ships
   */
  public getAllModularAIShips(): IModularShip[] {
    return Array.from(this._modularAIShips.values());
  }

  /**
   * Find AI ship by entity
   */
  public findAIShipByEntity(entity: any): AIShip | null {
    for (const aiShip of this._aiShips.values()) {
      if (aiShip.isActive) {
        // Handle virtual entities created for modular ships
        if (entity?.isModularShip && entity.modularShip === aiShip.ship) {
          return aiShip;
        }

        // Handle both old ship format (parts) and new modular ship format (structure.components)
        let foundPart = null;

        if (aiShip.ship.parts) {
          // Old ship format
          foundPart = aiShip.ship.parts.find(
            (part: any) => part.entity === entity
          );
        } else if (aiShip.ship.structure?.components) {
          // New modular ship format
          foundPart = aiShip.ship.structure.components.find(
            (component: any) => component.entity === entity
          );
        }

        if (foundPart) {
          return aiShip;
        }

        // For modular ships with compound physics bodies, check by physics body ID
        if (aiShip.ship.physicsBodyId && entity?.physicsBodyId) {
          if (aiShip.ship.physicsBodyId === entity.physicsBodyId) {
            return aiShip;
          }
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
  /* TODO: Enable when AI migration complete
  private handleShipDestroyed(shipId: string): void {
    const aiShip = this._aiShips.get(shipId);

    if (aiShip) {
      aiShip.destroy();
      this._aiShips.delete(shipId);
      console.log(`AI ship destroyed: ${shipId}`);
    }
  }
  */

  /* TODO: Enable when AI migration complete
  /**
   * Handle AI firing
   */
  /*
  private handleAIFire(ship: any): boolean {
    if (!this._onFireLaser) return false;

    // Check if ship has weapon parts
    const weaponParts = ship.getWeaponParts();

    if (weaponParts.length === 0) {
      console.log(`⚠️ AI ship ${ship.id} has no weapon parts - cannot fire`);

      return false;
    }
    const rotation = ship.rotation;
    const velocity = ship.velocity;

    // Fire from all weapon positions
    const firingPositions = ship.getWeaponFiringPositions();
    let firedCount = 0;

    firingPositions.forEach((position: any) => {
      if (this._onFireLaser) {
        const success = this._onFireLaser(
          position,
          rotation,
          velocity,
          ship.id
        );

        if (success) firedCount++;
      }
    });

    if (firedCount > 0) {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.05) {
        // 5% chance to log
        const effectiveness = ship.getWeaponEffectiveness();
        console.log(
          `🤖 AI ship ${ship.id} fired ${firedCount} lasers (${(effectiveness * 100).toFixed(0)}% effective)`
        );
      }

      return true;
    }
    return false;
  }
  */

  /**
   * Update AI targeting logic
   */
  private updateAITargeting(): void {
    // Skip targeting updates if AI is disabled for testing
    if (this._aiDisabledForTesting) {
      return;
    }

    const activeShips = this.getAllAIShips();

    for (const aiShip of activeShips) {
      // Find the closest enemy ship from a different faction
      let closestEnemy: any | null = null;
      let closestDistance = Infinity;

      for (const otherShip of activeShips) {
        if (otherShip.faction !== aiShip.faction && otherShip.isActive) {
          // Get position for AI ship - try centerPosition first, then position
          const aiShipPos =
            (aiShip.ship as any).centerPosition || aiShip.ship.position;

          // Get position for other ship - try centerPosition first, then position
          const otherShipPos =
            (otherShip.ship as any).centerPosition || otherShip.ship.position;

          const distance = this.getDistance(aiShipPos, otherShipPos);

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
  private getDistance(
    pos1: Vector2D | undefined,
    pos2: Vector2D | undefined
  ): number {
    // Handle undefined positions - return a large distance to avoid targeting
    if (!pos1 || !pos2) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }

  /**
   * Disable all AI ships for testing (stops movement and shooting)
   */
  public disableAllAI(): void {
    let disabledCount = 0;
    for (const aiShip of this._aiShips.values()) {
      if (aiShip.isActive) {
        aiShip.behavior.disable();
        disabledCount++;
      }
    }
    this._aiDisabledForTesting = true;
    console.log(
      `🚫 Disabled ${disabledCount} AI ships for testing - ships remain visible but won't move or shoot`
    );
  }

  /**
   * Enable all AI ships (allows movement and shooting)
   */
  public enableAllAI(): void {
    let enabledCount = 0;
    for (const aiShip of this._aiShips.values()) {
      if (aiShip.isActive) {
        aiShip.behavior.enable();
        enabledCount++;
      }
    }
    this._aiDisabledForTesting = false;
    console.log(`✅ Enabled ${enabledCount} AI ships`);
  }

  /**
   * Create a modular ship with different geometric patterns based on faction
   */
  private createModularShipForFaction(
    faction: string,
    position: Vector2D,
    shipId: string
  ): IModularShip {
    const engineAdapter = this._gameEngine as any;
    const engine = engineAdapter.engine;

    // For now, all AI ships use the same ComplexModularShip design
    // In the future, we could create different ship designs based on faction
    const modularShip = new ComplexModularShip(
      engine.getEntityManager(),
      engine.getPhysicsSystem(),
      engine.getRendererSystem(),
      position,
      null, // No debris manager for AI ships
      shipId
    );

    console.log(
      `🏭 Created ${faction} modular ship with complex design at (${position.x}, ${position.y})`
    );
    return modularShip;
  }
}
