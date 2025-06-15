import type { CollisionEvent } from '../../engine/interfaces/IPhysicsSystem';
import { GenericCollisionSystem } from '../collision';
import { ModularShipCollisionAdapter } from '../collision/adapters/ModularShipCollisionAdapter';
import {
  LaserCollisionAdapter,
  AsteroidCollisionAdapter,
} from '../collision/adapters/ProjectileCollisionAdapters';
import type { PlayerManager } from './PlayerManager';
import type { LaserManager } from './LaserManager';
import type { AsteroidManager } from './AsteroidManager';
import type { AIManager } from './AIManager';

/**
 * Refactored collision manager using the new generic collision system
 *
 * BENEFITS:
 * - Single Responsibility: Only orchestrates, doesn't handle specifics
 * - Open/Closed: Easy to add new entity types without modification
 * - No Code Duplication: Generic handling for all collision types
 * - Testable: Each component can be tested independently
 * - Maintainable: Clear separation of concerns
 */
export class RefactoredCollisionManager {
  private readonly collisionSystem = new GenericCollisionSystem();
  private readonly entityAdapters = new Map<string, any>();
  private readonly playerManager: PlayerManager;
  private readonly laserManager: LaserManager;
  private readonly asteroidManager: AsteroidManager;
  private aiManager: AIManager | null = null;

  constructor(
    playerManager: PlayerManager,
    laserManager: LaserManager,
    asteroidManager: AsteroidManager,
    aiManager: AIManager | null = null
  ) {
    this.playerManager = playerManager;
    this.laserManager = laserManager;
    this.asteroidManager = asteroidManager;
    this.aiManager = aiManager;
    this.initializeEntityRegistration();
  }

  public setAIManager(aiManager: AIManager): void {
    this.aiManager = aiManager;
    this.registerAIShips();
  }

  /**
   * Handle a collision event - now much simpler!
   */
  public handleCollision(event: CollisionEvent): void {
    this.collisionSystem.handleCollision(event);
  }

  /**
   * Register all existing entities with the collision system
   */
  private initializeEntityRegistration(): void {
    this.registerPlayerShips();
    this.registerLasers();
    this.registerAsteroids();
    if (this.aiManager) {
      this.registerAIShips();
    }
  }

  /**
   * Register player modular ships as collision targets
   */
  private registerPlayerShips(): void {
    const modularShip = this.playerManager.getModularShip();
    if (modularShip) {
      const adapter = new ModularShipCollisionAdapter(modularShip);
      this.collisionSystem.registerTarget(adapter);
      this.entityAdapters.set(modularShip.id, adapter);
      console.log(
        `📝 Registered player ship ${modularShip.id} as collision target`
      );
    }
  }

  /**
   * Register AI ships as collision targets
   */
  private registerAIShips(): void {
    if (!this.aiManager) return;

    const aiShips = this.aiManager.getAllAIShips();
    for (const aiShip of aiShips) {
      if (
        aiShip.ship &&
        typeof aiShip.ship.takeDamageAtComponentId === 'function'
      ) {
        const adapter = new ModularShipCollisionAdapter(aiShip.ship);
        this.collisionSystem.registerTarget(adapter);
        this.entityAdapters.set(aiShip.ship.id, adapter);
        console.log(
          `📝 Registered AI ship ${aiShip.ship.id} as collision target`
        );
      }
    }
  }
  /**
   * Register lasers as collision sources
   */
  private registerLasers(): void {
    const lasers = this.laserManager.getAllLasers();
    for (const laser of lasers) {
      const adapter = new LaserCollisionAdapter(laser);
      this.collisionSystem.registerSource(adapter);
      this.entityAdapters.set(laser.entity.id, adapter);
    }
    console.log(`📝 Registered ${lasers.length} lasers as collision sources`);
  }

  /**
   * Register asteroids as collision sources
   */
  private registerAsteroids(): void {
    const asteroids = this.asteroidManager.getAllAsteroids();
    for (const asteroid of asteroids) {
      const adapter = new AsteroidCollisionAdapter(asteroid);
      this.collisionSystem.registerSource(adapter);
      this.entityAdapters.set(asteroid.entity.id, adapter);
    }
    console.log(
      `📝 Registered ${asteroids.length} asteroids as collision sources`
    );
  }
  /**
   * Call this when new entities are created
   */
  public registerNewLaser(laser: any): void {
    const adapter = new LaserCollisionAdapter(laser);
    this.collisionSystem.registerSource(adapter);
    this.entityAdapters.set(laser.entity.id, adapter);
  }

  public registerNewAsteroid(asteroid: any): void {
    const adapter = new AsteroidCollisionAdapter(asteroid);
    this.collisionSystem.registerSource(adapter);
    this.entityAdapters.set(asteroid.entity.id, adapter);
  }

  public registerNewAIShip(aiShip: any): void {
    if (
      aiShip.ship &&
      typeof aiShip.ship.takeDamageAtComponentId === 'function'
    ) {
      const adapter = new ModularShipCollisionAdapter(aiShip.ship);
      this.collisionSystem.registerTarget(adapter);
      this.entityAdapters.set(aiShip.ship.id, adapter);
    }
  }

  /**
   * Call this when entities are destroyed
   */
  public unregisterEntity(entityId: string): void {
    this.entityAdapters.delete(entityId);
    // The collision system will handle cleanup automatically
  }
}

/**
 * MIGRATION NOTES:
 *
 * 1. Replace the old CollisionManager with RefactoredCollisionManager
 * 2. All the complex collision logic is now handled generically
 * 3. Adding new entity types only requires creating an adapter
 * 4. No more duplicate code for different collision combinations
 * 5. Each component is testable in isolation
 *
 * EXTENDING THE SYSTEM:
 *
 * To add a new entity type (e.g., missiles):
 * 1. Create MissileCollisionAdapter implementing ICollisionSource or ICollisionTarget
 * 2. Register missiles in the collision manager
 * 3. No changes needed to core collision logic!
 *
 * This follows SOLID principles:
 * - Single Responsibility: Each class has one job
 * - Open/Closed: Open for extension, closed for modification
 * - Liskov Substitution: Any adapter works with the system
 * - Interface Segregation: Separate source/target interfaces
 * - Dependency Inversion: Depends on abstractions, not implementations
 */
