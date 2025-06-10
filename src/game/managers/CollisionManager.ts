import type { Entity } from '../../engine/entity';
import type { CollisionEvent } from '../../engine/interfaces/IPhysicsSystem';
import type { PlayerManager } from './PlayerManager';
import type { LaserManager } from './LaserManager';
import type { AsteroidManager } from './AsteroidManager';
import type { AIManager } from './AIManager';

/**
 * CollisionManager - Handles collision detection and resolution
 * Following Single Responsibility Principle
 */
export class CollisionManager {
  private playerManager: PlayerManager;

  private laserManager: LaserManager;

  private asteroidManager: AsteroidManager;

  private aiManager: AIManager | null = null;

  constructor(
    playerManager: PlayerManager,
    laserManager: LaserManager,
    asteroidManager: AsteroidManager
  ) {
    this.playerManager = playerManager;
    this.laserManager = laserManager;
    this.asteroidManager = asteroidManager;
  }

  public setAIManager(aiManager: AIManager): void {
    this.aiManager = aiManager;
  }

  public handleCollision(event: CollisionEvent): void {
    const { bodyA, bodyB } = event;

    // Find which entities these bodies belong to
    const entityA = this.findEntityByPhysicsBodyId(bodyA.id);
    const entityB = this.findEntityByPhysicsBodyId(bodyB.id);

    if (!entityA || !entityB) return;

    // Check laser-asteroid collisions
    const laserData =
      this.laserManager.findLaserByEntity(entityA) ||
      this.laserManager.findLaserByEntity(entityB);
    const asteroidData =
      this.asteroidManager.findAsteroidByEntity(entityA) ||
      this.asteroidManager.findAsteroidByEntity(entityB);

    if (laserData && asteroidData) {
      this.handleLaserAsteroidCollision(laserData, asteroidData);
      return;
    }

    // Check player-asteroid collisions (traditional player or composite ship parts)
    const isPlayerCollision =
      this.isPlayerEntity(entityA) || this.isPlayerEntity(entityB);
    const playerAsteroidData =
      asteroidData && isPlayerCollision ? asteroidData : null;

    if (playerAsteroidData) {
      this.handlePlayerAsteroidCollision(playerAsteroidData, entityA, entityB);
      return;
    }

    // Check AI ship-asteroid collisions
    const aiShipA = this.aiManager?.findAIShipByEntity(entityA);
    const aiShipB = this.aiManager?.findAIShipByEntity(entityB);
    const aiShip = aiShipA || aiShipB;

    if (aiShip && asteroidData) {
      this.handleAIShipAsteroidCollision(aiShip, asteroidData);
      return;
    }

    // Check laser-AI ship collisions
    if (laserData && aiShip) {
      this.handleLaserAIShipCollision(laserData, aiShip);
      return;
    }

    // Check laser-player collisions (player getting hit by AI lasers)
    if (laserData && isPlayerCollision) {
      this.handleLaserPlayerCollision(laserData, entityA, entityB);
      return;
    }

    // Check AI ship vs AI ship collisions
    if (aiShipA && aiShipB && aiShipA !== aiShipB) {
      this.handleAIShipCollision(aiShipA, aiShipB);
      return;
    }

    // Check AI ship vs player collisions
    if (aiShip && isPlayerCollision) {
      this.handleAIShipPlayerCollision(aiShip, entityA, entityB);
      return;
    }
  }

  private findEntityByPhysicsBodyId(physicsBodyId: string): Entity | null {
    // Check traditional player
    const player = this.playerManager.getPlayer();

    if (player?.physicsBodyId === physicsBodyId) {
      return player;
    }
    // Check composite ship parts
    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip) {
      const parts = compositeShip.parts;
      const part = parts.find(p => p.entity.physicsBodyId === physicsBodyId);

      if (part) return part.entity;
    }

    // Check AI ships
    if (this.aiManager) {
      const aiShips = this.aiManager.getAllAIShips();
      for (const aiShip of aiShips) {
        const parts = aiShip.ship.parts;
        const part = parts.find(p => p.entity.physicsBodyId === physicsBodyId);
        if (part) return part.entity;
      }
    }

    // Check lasers
    const laser = this.laserManager
      .getAllLasers()
      .find(l => l.entity.physicsBodyId === physicsBodyId);

    if (laser) return laser.entity;

    // Check asteroids
    const asteroid = this.asteroidManager
      .getAllAsteroids()
      .find(a => a.entity.physicsBodyId === physicsBodyId);

    if (asteroid) return asteroid.entity;

    return null;
  }

  private handleLaserAsteroidCollision(
    laserData: any,
    asteroidData: any
  ): void {
    // Remove laser
    this.laserManager.removeLaser(laserData);

    // Break asteroid (no scoring)
    this.asteroidManager.breakAsteroid(asteroidData);
  }

  private handleLaserAIShipCollision(laserData: any, aiShip: any): void {
    // Remove laser
    this.laserManager.removeLaser(laserData);

    // Damage AI ship
    if (this.aiManager) {
      const wasDestroyed = this.aiManager.handleAIShipDamage(aiShip);
      if (wasDestroyed) {
        console.log(`AI ship destroyed by laser: ${aiShip.id}`);
      }
    }
  }

  private handleLaserPlayerCollision(laserData: any, entityA: Entity, entityB: Entity): void {
    // Remove laser
    this.laserManager.removeLaser(laserData);

    // Determine which entity is the player entity
    const playerEntity = this.isPlayerEntity(entityA) ? entityA : entityB;

    // For composite ships, handle part-by-part damage
    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip && playerEntity) {
      // Find which part was hit
      const parts = compositeShip.parts;
      const hitPart = parts.find(part => part.entity === playerEntity);

      if (hitPart && !compositeShip.isInvulnerable) {
        // Damage the specific part that was hit
        compositeShip.takeDamage();
        console.log(
          'Player hit by AI laser! Parts remaining:',
          parts.filter(p => !p.isDestroyed).length
        );
      }
    }
  }

  private handleAIShipAsteroidCollision(aiShip: any, asteroidData: any): void {
    // AI ships take damage from asteroids
    if (this.aiManager) {
      const wasDestroyed = this.aiManager.handleAIShipDamage(aiShip);
      if (wasDestroyed) {
        console.log(`AI ship destroyed by asteroid: ${aiShip.id}`);
      }
    }

    // Optionally break the asteroid too
    this.asteroidManager.breakAsteroid(asteroidData);
  }

  private handleAIShipCollision(aiShipA: any, aiShipB: any): void {
    // AI ships damage each other on collision
    if (this.aiManager && aiShipA.faction !== aiShipB.faction) {
      // Only damage if different factions
      const wasADestroyed = this.aiManager.handleAIShipDamage(aiShipA);
      const wasBDestroyed = this.aiManager.handleAIShipDamage(aiShipB);
      
      if (wasADestroyed || wasBDestroyed) {
        console.log(`AI ship collision resulted in destruction`);
      }
    }
  }

  private handleAIShipPlayerCollision(aiShip: any, entityA: Entity, entityB: Entity): void {
    // Determine which entity is the player entity
    const playerEntity = this.isPlayerEntity(entityA) ? entityA : entityB;

    // Both AI ship and player take damage
    if (this.aiManager) {
      const aiDestroyed = this.aiManager.handleAIShipDamage(aiShip);
      console.log(`AI ship ${aiDestroyed ? 'destroyed' : 'damaged'} in player collision`);
    }

    // Handle player damage
    const compositeShip = this.playerManager.getCompositeShip();
    if (compositeShip && playerEntity) {
      const parts = compositeShip.parts;
      const hitPart = parts.find(part => part.entity === playerEntity);

      if (hitPart && !compositeShip.isInvulnerable) {
        compositeShip.takeDamage();
        console.log(
          'Player damaged in AI ship collision! Parts remaining:',
          parts.filter(p => !p.isDestroyed).length
        );
      }
    }
  }

  private handlePlayerAsteroidCollision(
    _asteroidData: any,
    entityA: Entity,
    entityB: Entity
  ): void {
    // Determine which entity is the player entity
    const playerEntity = this.isPlayerEntity(entityA) ? entityA : entityB;

    // For composite ships, handle part-by-part damage
    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip && playerEntity) {
      // Find which part was hit
      const parts = compositeShip.parts;
      const hitPart = parts.find(part => part.entity === playerEntity);

      if (hitPart && !compositeShip.isInvulnerable) {
        // Damage the specific part that was hit
        compositeShip.takeDamage();
        console.log(
          'Composite ship hit! Parts remaining:',
          parts.filter(p => !p.isDestroyed).length
        );
      }
    }

    // Traditional player no longer takes damage from asteroids in this implementation
    // But we could add traditional player damage handling here if needed
  }

  private isPlayerEntity(entity: Entity): boolean {
    // Check if entity is traditional player
    const player = this.playerManager.getPlayer();

    if (player && entity === player) {
      return true;
    }
    // Check if entity is part of composite ship
    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip) {
      const parts = compositeShip.parts;

      return parts.some(part => part.entity === entity);
    }
    return false;
  }
}
