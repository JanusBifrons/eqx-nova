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

    // Log ALL collisions for debugging
    console.log(
      `🔥 COLLISION DETECTED: BodyA=${bodyA.id} vs BodyB=${bodyB.id}`
    );

    // Find which entities these bodies belong to
    const entityA = this.findEntityByPhysicsBodyId(bodyA.id);
    const entityB = this.findEntityByPhysicsBodyId(bodyB.id);

    console.log(
      `🔍 Entity lookup: A=${entityA?.id || 'NULL'} B=${entityB?.id || 'NULL'}`
    );

    if (!entityA || !entityB) {
      console.log(`❌ Missing entities - skipping collision`);
      return;
    }

    // Check what types of entities we have
    const laserData =
      this.laserManager.findLaserByEntity(entityA) ||
      this.laserManager.findLaserByEntity(entityB);
    const asteroidData =
      this.asteroidManager.findAsteroidByEntity(entityA) ||
      this.asteroidManager.findAsteroidByEntity(entityB);

    console.log(
      `🎯 Entity types: Laser=${!!laserData} Asteroid=${!!asteroidData}`
    );

    // Check for player entities
    const isPlayerCollisionA = this.isPlayerEntity(entityA);
    const isPlayerCollisionB = this.isPlayerEntity(entityB);
    const isPlayerCollision = isPlayerCollisionA || isPlayerCollisionB;

    console.log(
      `👤 Player check: A=${isPlayerCollisionA} B=${isPlayerCollisionB} Either=${isPlayerCollision}`
    );

    // Check for AI ships
    const aiShipA = this.aiManager?.findAIShipByEntity(entityA);
    const aiShipB = this.aiManager?.findAIShipByEntity(entityB);
    const aiShip = aiShipA || aiShipB;

    console.log(
      `🤖 AI Ship check: A=${!!aiShipA} B=${!!aiShipB} Either=${!!aiShip}`
    );

    if (laserData && asteroidData) {
      console.log(`💥 LASER-ASTEROID COLLISION DETECTED!`);
      this.handleLaserAsteroidCollision(laserData, asteroidData);
      return;
    }

    // Check player-asteroid collisions (traditional player or composite ship parts)
    const playerAsteroidData =
      asteroidData && isPlayerCollision ? asteroidData : null;

    if (playerAsteroidData) {
      console.log(`💥 PLAYER-ASTEROID COLLISION DETECTED!`);
      this.handlePlayerAsteroidCollision(playerAsteroidData, entityA, entityB);
      return;
    }

    // Check AI ship-asteroid collisions
    if (aiShip && asteroidData) {
      console.log(`💥 AI SHIP-ASTEROID COLLISION DETECTED!`);
      this.handleAIShipAsteroidCollision(aiShip, asteroidData);
      return;
    }

    // Check laser-AI ship collisions
    if (laserData && aiShip) {
      console.log(`💥 LASER-AI SHIP COLLISION DETECTED!`);

      // Check for friendly fire
      const targetEntity = aiShip.ship.parts[0]?.entity; // Get representative entity
      if (targetEntity && this.isLaserFriendlyFire(laserData, targetEntity)) {
        return; // Ignore friendly fire
      }

      this.handleLaserAIShipCollision(laserData, aiShip);
      return;
    }

    // Check laser-player collisions (player getting hit by AI lasers)
    if (laserData && isPlayerCollision) {
      console.log(`💥 LASER-PLAYER COLLISION DETECTED!`);

      // Check for friendly fire - get player entity for checking
      const playerEntity = isPlayerCollisionA ? entityA : entityB;
      if (this.isLaserFriendlyFire(laserData, playerEntity)) {
        return; // Ignore friendly fire
      }

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

    // Check composite ship compound body AND individual parts
    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip) {
      // CRITICAL FIX: Check if this is the main compound body physics ID
      const compoundBody = (compositeShip as any)._compoundBody;
      if (compoundBody && compoundBody.id === physicsBodyId) {
        console.log(
          `🎯 Found composite ship compound body: ${physicsBodyId} -> ${compositeShip.id}`
        );
        // Return the first part's entity as a representative (for collision handling)
        const activeParts = compositeShip.getActiveParts();
        if (activeParts.length > 0) {
          return activeParts[0].entity;
        }
      }

      // Also check individual parts (for when ship has broken apart)
      const parts = compositeShip.parts;
      const part = parts.find(p => p.entity.physicsBodyId === physicsBodyId);

      if (part) return part.entity;
    }

    // Check AI ships compound bodies AND individual parts
    if (this.aiManager) {
      const aiShips = this.aiManager.getAllAIShips();

      for (const aiShip of aiShips) {
        // Check AI ship compound body
        const compoundBody = (aiShip.ship as any)._compoundBody;
        if (compoundBody && compoundBody.id === physicsBodyId) {
          console.log(
            `🎯 Found AI ship compound body: ${physicsBodyId} -> ${aiShip.ship.id}`
          );
          // Return the first part's entity as a representative
          const activeParts = aiShip.ship.getActiveParts();
          if (activeParts.length > 0) {
            return activeParts[0].entity;
          }
        }

        // Check individual parts
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
    console.log('🎯 LASER-AI SHIP collision detected!');

    // Remove laser
    this.laserManager.removeLaser(laserData);

    // For now, let's damage a random part or use the composite ship damage method
    const compositeShip = aiShip.ship;
    if (compositeShip && compositeShip.takeDamageAtPart) {
      // Find the first active part to damage
      const activeParts = compositeShip.getActiveParts();
      if (activeParts.length > 0) {
        const targetPart = activeParts[0];
        const damageAmount = 30; // Laser damage
        const wasDestroyed = compositeShip.takeDamageAtPart(
          targetPart.partId,
          damageAmount
        );
        console.log(
          '🎯 AI ship part hit:',
          wasDestroyed ? 'destroyed' : 'damaged'
        );
      }
    }

    // Also try the old damage method as fallback
    if (this.aiManager) {
      const wasDestroyed = this.aiManager.handleAIShipDamage(aiShip);
      if (wasDestroyed) {
        console.log(`🎯 AI ship destroyed by laser: ${aiShip.id}`);
      }
    }
  }

  private handleLaserPlayerCollision(
    laserData: any,
    entityA: Entity,
    entityB: Entity
  ): void {
    // Remove laser
    this.laserManager.removeLaser(laserData);

    // Determine which entity is the player entity
    const playerEntity = this.isPlayerEntity(entityA) ? entityA : entityB;

    // For composite ships, handle part-by-part damage
    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip && !compositeShip.isInvulnerable) {
      // Check if this was a compound body collision (playerEntity is a representative)
      const compoundBody = (compositeShip as any)._compoundBody;
      let hitPart = null;

      if (
        compoundBody &&
        (entityA === playerEntity || entityB === playerEntity)
      ) {
        // This is a compound body collision - damage a random active part since we can't determine exact hit location
        const activeParts = compositeShip.getActiveParts();
        if (activeParts.length > 0) {
          const randomIndex = Math.floor(Math.random() * activeParts.length);
          hitPart = activeParts[randomIndex];
          console.log(
            `🎯 Compound body hit! Damaging random part: ${hitPart.partId}`
          );
        }
      } else {
        // Try to find the specific part that was hit (for individual part collisions)
        const parts = compositeShip.parts;
        hitPart = parts.find(part => part.entity === playerEntity);
        if (hitPart) {
          console.log(`🎯 Individual part hit: ${hitPart.partId}`);
        }
      }

      if (hitPart) {
        // Damage the part that was hit
        const damageAmount = 30; // Laser damage amount
        const wasDestroyed = compositeShip.takeDamageAtPart(
          hitPart.partId,
          damageAmount
        );
        console.log(
          `🎯 Player laser hit! Part ${hitPart.partId} ${wasDestroyed ? 'DESTROYED' : 'damaged'}. Parts remaining: ${compositeShip.getActiveParts().length}`
        );
      } else {
        console.log(
          `⚠️ Could not determine which part was hit in player collision`
        );
      }
    } else if (compositeShip?.isInvulnerable) {
      console.log(`🛡️ Player is invulnerable - laser hit ignored`);
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

  private handleAIShipPlayerCollision(
    aiShip: any,
    entityA: Entity,
    entityB: Entity
  ): void {
    // Determine which entity is the player entity
    const playerEntity = this.isPlayerEntity(entityA) ? entityA : entityB;

    // Both AI ship and player take damage
    if (this.aiManager) {
      const aiDestroyed = this.aiManager.handleAIShipDamage(aiShip);
      console.log(
        `AI ship ${aiDestroyed ? 'destroyed' : 'damaged'} in player collision`
      );
    }
    // Handle player damage
    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip && playerEntity) {
      const parts = compositeShip.parts;
      const hitPart = parts.find(part => part.entity === playerEntity);

      if (hitPart && !compositeShip.isInvulnerable) {
        // Damage the specific part that was hit with a large amount
        const damageAmount = 50; // Collisions do more damage than lasers
        compositeShip.takeDamageAtPart(hitPart.partId, damageAmount);
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
        // Damage the specific part that was hit with a large amount
        const damageAmount = 60; // Asteroids do heavy damage
        compositeShip.takeDamageAtPart(hitPart.partId, damageAmount);
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

  /**
   * Check if a laser collision should be ignored due to friendly fire
   */
  private isLaserFriendlyFire(laserData: any, targetEntity: Entity): boolean {
    // Import LaserSource type if needed
    const laserSource = laserData.source;
    const laserSourceId = laserData.sourceId;

    // Check if laser is from player hitting player
    if (laserSource === 'player' && this.isPlayerEntity(targetEntity)) {
      console.log(
        '🚫 FRIENDLY FIRE: Player laser hitting player ship - ignoring collision'
      );
      return true;
    }

    // Check if laser is from AI hitting the same AI ship
    if (laserSource === 'ai' && laserSourceId) {
      const targetAIShip = this.aiManager?.findAIShipByEntity(targetEntity);
      if (targetAIShip && targetAIShip.ship.id === laserSourceId) {
        console.log(
          `🚫 FRIENDLY FIRE: AI ship ${laserSourceId} laser hitting itself - ignoring collision`
        );
        return true;
      }
    }

    return false;
  }
}
