import type { IGameEngine } from '../interfaces/IGameEngine';
import type { AIShipConfig } from '../interfaces/IAI';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type {
  IShip,
  IShipController,
  IShipConfiguration,
} from '../entities/v2/interfaces/IShip';
import { UniversalShipFactory } from '../entities/v2/UniversalShipFactory';
import { AIShipController } from '../entities/v2/AIShipController';
import { AIBehavior } from '../entities/AIBehavior';
import { v4 as uuidv4 } from 'uuid';

/**
 * AIManager - Manages all AI ships in the game using unified ship system
 * Following Single Responsibility Principle: only manages AI ships
 * Following Dependency Inversion Principle: depends on abstractions
 */
export class AIManager {
  private readonly _gameEngine: IGameEngine;
  private readonly _aiShipControllers: Map<string, IShipController> = new Map();
  private readonly _universalShipFactory: UniversalShipFactory;
  private _aiDisabledForTesting: boolean = false;

  // Laser firing callback - accessed via methods, not directly used
  // @ts-ignore: Property is used via getter/setter methods
  private _onFireLaser?: (
    position: Vector2D,
    rotation: number,
    velocity?: Vector2D,
    sourceId?: string
  ) => boolean;

  constructor(gameEngine: IGameEngine) {
    this._gameEngine = gameEngine;

    // Access the underlying engine systems
    const engineAdapter = gameEngine as any;
    const engine = engineAdapter.engine;

    // Create universal factory for all ships
    this._universalShipFactory = new UniversalShipFactory(
      engine.getPhysicsSystem(),
      engine.getRendererSystem(),
      engine.getEntityManager()
    );
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
   * Create an AI ship with the given configuration using unified ship system
   */
  public createAIShip(config: AIShipConfig): IShipController {
    console.log(
      `🔨 Creating AI ship: ${config.faction} at (${config.position.x}, ${config.position.y})`
    );

    // Create a unique ID for this AI ship
    const shipId = uuidv4();

    // Create ship configuration for universal factory
    const shipConfig: IShipConfiguration = {
      position: config.position,
      shipType: this.determineShipType(config),
      // TODO: Add custom block configurations for different AI ship designs
    };

    // Create the ship using universal factory
    const ship = this._universalShipFactory.createShip(shipConfig);

    // Create AI behavior controller for this ship
    const aiBehavior = new AIBehavior(shipId, ship, {
      behaviorType: config.behaviorType || 'patrol',
      fireRate: config.fireRate || 500,
      detectionRange: config.detectionRange || 400,
      rotationSpeed: 0.002,
      thrustForce: 0.003,
      maxSpeed: 5,
    });

    // Disable AI for testing if flag is set
    if (this._aiDisabledForTesting) {
      aiBehavior.disable();
    }

    // Create the AI ship controller
    const aiController = new AIShipController(ship, aiBehavior, config.faction);

    // Store the AI ship controller
    this._aiShipControllers.set(shipId, aiController);

    console.log(`✅ Created AI ship controller: ${config.faction} (${shipId})`);
    return aiController;
  }

  /**
   * Determine the ship type based on AI configuration
   */
  private determineShipType(
    config: AIShipConfig
  ): IShipConfiguration['shipType'] {
    // For now, create simple AI ships. This can be enhanced to create different types
    // based on config.faction or other properties
    if (
      config.faction.includes('flagship') ||
      config.faction.includes('dreadnought')
    ) {
      return 'ai_complex';
    }
    return 'ai_simple';
  }

  /**
   * Create multiple AI ships from configurations
   */
  public createAIFleet(): void {
    const worldDims = this._gameEngine.getWorldDimensions();
    const shipConfigs = this.createGridBasedShipConfigurations(worldDims);

    console.log(`🚁 Creating AI fleet with ${shipConfigs.length} ships`);

    for (const config of shipConfigs) {
      this.createAIShip(config);
    }

    console.log(
      `✅ AI fleet created with ${this._aiShipControllers.size} ships`
    );
  }

  /**
   * Update all AI ships
   */
  public update(deltaTime: number): void {
    for (const [shipId, controller] of this._aiShipControllers) {
      if (controller.isActive) {
        controller.update(deltaTime);
      } else {
        // Remove inactive controllers
        this._aiShipControllers.delete(shipId);
        console.log(`🗑️ Removed inactive AI ship controller: ${shipId}`);
      }
    }
  }

  /**
   * Set target for all AI ships
   */
  public setTargetForAllAI(target: Vector2D | any | null): void {
    for (const controller of this._aiShipControllers.values()) {
      if (controller.isActive && 'setTarget' in controller) {
        (controller as any).setTarget(target);
      }
    }
  }

  /**
   * Get all active AI ship controllers
   */
  public getActiveShipControllers(): IShipController[] {
    return Array.from(this._aiShipControllers.values()).filter(
      controller => controller.isActive
    );
  }

  /**
   * Get all AI ships (for compatibility)
   */
  public getAIShips(): IShip[] {
    return Array.from(this._aiShipControllers.values())
      .filter(controller => controller.isActive)
      .map(controller => controller.ship);
  }

  /**
   * Destroy all AI ships
   */
  public destroyAll(): void {
    for (const controller of this._aiShipControllers.values()) {
      controller.destroy();
    }
    this._aiShipControllers.clear();
    console.log('🗑️ All AI ships destroyed');
  }

  /**
   * Grid-based ship design system (same as before)
   */
  private createGridBasedShipConfigurations(worldDims: {
    width: number;
    height: number;
  }): AIShipConfig[] {
    const GRID_SIZE = 20; // Each grid cell is 20 pixels

    // Helper function to convert grid coordinates to world coordinates
    const gridToWorld = (gridX: number, gridY: number) => {
      return {
        x: gridX * GRID_SIZE,
        y: gridY * GRID_SIZE,
      };
    };

    // Player spawns at world center, so place AI ships within viewport distance from center
    const centerX = worldDims.width / 2;
    const centerY = worldDims.height / 2;

    return [
      // RED DREADNOUGHT - Heavy assault battleship (top-left of center)
      {
        position: { x: centerX - 200, y: centerY - 150 },
        partPositions: [
          gridToWorld(-4, 0),
          gridToWorld(-3, 0),
          gridToWorld(-2, 0),
          gridToWorld(-1, 0),
          gridToWorld(0, 0),
          gridToWorld(1, 0),
          gridToWorld(2, 0),
          gridToWorld(3, 0),
          gridToWorld(4, 0),
          gridToWorld(0, -1),
          gridToWorld(0, 1),
        ],
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
        partPositions: [
          gridToWorld(0, -4),
          gridToWorld(0, -3),
          gridToWorld(0, -2),
          gridToWorld(0, -1),
          gridToWorld(0, 0),
          gridToWorld(0, 1),
          gridToWorld(0, 2),
          gridToWorld(0, 3),
          gridToWorld(0, 4),
          gridToWorld(-1, 0),
          gridToWorld(1, 0),
        ],
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
        partPositions: [
          gridToWorld(-5, 0),
          gridToWorld(-4, 0),
          gridToWorld(-3, 0),
          gridToWorld(-2, 0),
          gridToWorld(-1, 0),
          gridToWorld(0, 0),
          gridToWorld(1, 0),
          gridToWorld(2, 0),
          gridToWorld(3, 0),
          gridToWorld(4, 0),
          gridToWorld(5, 0),
        ],
        partSize: 20,
        faction: 'purple_destroyer',
        behaviorType: 'hunter',
        fireRate: 300,
        detectionRange: 400,
        lives: 10,
      },

      // YELLOW INTERCEPTOR - Ultra-fast strike craft (top of center)
      {
        position: { x: centerX + 50, y: centerY - 250 },
        partPositions: [
          gridToWorld(-1, 0),
          gridToWorld(0, 0),
          gridToWorld(1, 0),
          gridToWorld(2, 0),
        ],
        partSize: 20,
        faction: 'yellow_interceptor',
        behaviorType: 'patrol',
        fireRate: 500,
        detectionRange: 350,
        lives: 13,
      },
    ];
  }

  /**
   * Enable/disable AI for testing
   */
  public setAIDisabled(disabled: boolean): void {
    this._aiDisabledForTesting = disabled;

    // Apply to existing AI ships
    for (const controller of this._aiShipControllers.values()) {
      if ('behavior' in controller) {
        const behavior = (controller as any).behavior;
        if (disabled) {
          behavior.disable();
        } else {
          behavior.enable();
        }
      }
    }

    console.log(`🤖 AI ${disabled ? 'disabled' : 'enabled'} for testing`);
  }

  /**
   * Check if any AI ships can fire at a position
   */
  public canAnyAIFireAt(position: Vector2D): boolean {
    for (const controller of this._aiShipControllers.values()) {
      if (controller.isActive && 'canAttack' in controller) {
        // Check if this AI can attack the position
        const canAttack = (controller as any).canAttack({
          position,
          isAlive: true,
        });
        if (canAttack && controller.ship.canFireWeapons()) {
          return true;
        }
      }
    }
    return false;
  }
}
