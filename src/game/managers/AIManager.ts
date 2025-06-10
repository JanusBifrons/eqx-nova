import type { IGameEngine } from '../interfaces/IGameEngine';
import type { AIShipConfig, AIBehaviorConfig } from '../interfaces/IAI';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { ICompositeShip } from '../interfaces/ICompositeShip';
import { AIShip } from '../entities/AIShip';
import { AIBehavior } from '../entities/AIBehavior';
import { CompositeShipFactory } from '../factories/CompositeShipFactory';

/**
 * AIManager - Manages all AI ships in the game
 * Following Single Responsibility Principle: only manages AI ships
 * Following Dependency Inversion Principle: depends on abstractions
 */
export class AIManager {
  private readonly _gameEngine: IGameEngine;

  private readonly _aiShips: Map<string, AIShip> = new Map();

  private _shipIdCounter: number = 0;

  private _onFireLaser?: (
    position: Vector2D,
    rotation: number,
    velocity?: Vector2D
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
      velocity?: Vector2D
    ) => boolean
  ): void {
    this._onFireLaser = callback;
  }

  /**
   * Create an AI ship with the given configuration
   */
  public createAIShip(config: AIShipConfig): AIShip {
    const shipId = `ai_ship_${this._shipIdCounter++}`;
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
   * Create multiple AI ships with different configurations
   */
  public spawnAIFleet(): void {
    const worldDims = this._gameEngine.getWorldDimensions();
    const shipConfigs: AIShipConfig[] = [
      // Red aggressive hunter (3-part T-shape)
      {
        position: { x: worldDims.width * 0.2, y: worldDims.height * 0.2 },
        partPositions: [
          { x: 0, y: 0 }, // Center
          { x: -16, y: 0 }, // Left
          { x: 16, y: 0 }, // Right
        ],
        partSize: 16,
        partColor: 0xff0000, // Red
        faction: 'red_faction',
        behaviorType: 'hunter',
        fireRate: 800,
        detectionRange: 300,
        lives: 3,
      },

      // Blue defensive patrol (4-part cross)
      {
        position: { x: worldDims.width * 0.8, y: worldDims.height * 0.2 },
        partPositions: [
          { x: 0, y: 0 }, // Center
          { x: -16, y: 0 }, // Left
          { x: 16, y: 0 }, // Right
          { x: 0, y: -16 }, // Top
        ],
        partSize: 16,
        partColor: 0x0000ff, // Blue
        faction: 'blue_faction',
        behaviorType: 'defensive',
        fireRate: 1200,
        detectionRange: 250,
        lives: 4,
      },

      // Purple aggressive fighter (2-part horizontal)
      {
        position: { x: worldDims.width * 0.2, y: worldDims.height * 0.8 },
        partPositions: [
          { x: -8, y: 0 }, // Left
          { x: 8, y: 0 }, // Right
        ],
        partSize: 16,
        partColor: 0xff00ff, // Purple
        faction: 'purple_faction',
        behaviorType: 'aggressive',
        fireRate: 600,
        detectionRange: 200,
        lives: 2,
      },

      // Orange patrol ship (5-part plus shape)
      {
        position: { x: worldDims.width * 0.8, y: worldDims.height * 0.8 },
        partPositions: [
          { x: 0, y: 0 }, // Center
          { x: -16, y: 0 }, // Left
          { x: 16, y: 0 }, // Right
          { x: 0, y: -16 }, // Top
          { x: 0, y: 16 }, // Bottom
        ],
        partSize: 16,
        partColor: 0xffa500, // Orange
        faction: 'orange_faction',
        behaviorType: 'patrol',
        fireRate: 1000,
        detectionRange: 280,
        lives: 5,
      },

      // Yellow hunter (single part - fast)
      {
        position: { x: worldDims.width * 0.5, y: worldDims.height * 0.1 },
        partPositions: [
          { x: 0, y: 0 }, // Single part
        ],
        partSize: 16,
        partColor: 0xffff00, // Yellow
        faction: 'yellow_faction',
        behaviorType: 'hunter',
        fireRate: 500,
        detectionRange: 350,
        lives: 1,
      },

      // Cyan defensive (L-shape)
      {
        position: { x: worldDims.width * 0.5, y: worldDims.height * 0.9 },
        partPositions: [
          { x: 0, y: 0 }, // Corner
          { x: 16, y: 0 }, // Right
          { x: 0, y: -16 }, // Up
        ],
        partSize: 16,
        partColor: 0x00ffff, // Cyan
        faction: 'cyan_faction',
        behaviorType: 'defensive',
        fireRate: 900,
        detectionRange: 220,
        lives: 3,
      },
    ];

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
    // Update all active AI ships
    for (const [shipId, aiShip] of this._aiShips) {
      if (aiShip.isActive) {
        aiShip.update(deltaTime);
      } else {
        // Remove inactive ships
        this._aiShips.delete(shipId);
      }
    }
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

    return this._onFireLaser(position, rotation, velocity);
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
