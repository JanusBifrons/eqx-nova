import type { Entity } from '../../engine/entity';
import type {
  CollisionEvent,
  Vector2D,
} from '../../engine/interfaces/IPhysicsSystem';
import type { PlayerManager } from './PlayerManager';
import type { LaserManager } from './LaserManager';
import type { AsteroidManager } from './AsteroidManager';
import type { AIManager } from './AIManager';

/**
 * CollisionManager - Handles collision detection and resolution
 * Following Single Responsibility Principle
 *
 * Player immunity is ENABLED to prevent damage from collisions.
 * To allow damage: Set playerImmune = false in constructor
 * or use setPlayerImmunity(false) method.
 */
export class CollisionManager {
  private playerManager: PlayerManager;

  private laserManager: LaserManager;

  private asteroidManager: AsteroidManager;

  private aiManager: AIManager | null = null;

  // Player immunity toggle - DISABLED for testing ship splitting
  private playerImmune: boolean = false; // DISABLED to allow testing ship damage and splitting

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

  // TEMPORARY: Methods to control player immunity for testing
  public setPlayerImmunity(immune: boolean): void {
    this.playerImmune = immune;
    console.log(`🛡️ Player immunity ${immune ? 'ENABLED' : 'DISABLED'}`);
  }

  public getPlayerImmunity(): boolean {
    return this.playerImmune;
  }

  public handleCollision(event: CollisionEvent): void {
    const { bodyA, bodyB, partInfoA, partInfoB } = event;

    // CRITICAL: Check for modular ship self-collision and ignore it
    const bodyAIsModular = (bodyA as any).isModularShip;
    const bodyBIsModular = (bodyB as any).isModularShip;
    const bodyAShipId = (bodyA as any).modularShipId;
    const bodyBShipId = (bodyB as any).modularShipId;

    if (bodyAIsModular && bodyBIsModular && bodyAShipId === bodyBShipId) {
      // This is a self-collision within the same modular ship - ignore it
      console.log(
        `🛡️ IGNORED: Self-collision within modular ship ${bodyAShipId}`
      );
      return;
    }

    // Log collision for debugging (but only non-self-collisions)
    console.log(
      `🔥 COLLISION DETECTED: BodyA=${bodyA.id} vs BodyB=${bodyB.id}`
    );

    // Enhanced collision logging with part information
    if (partInfoA) {
      console.log(
        `🎯 PRECISE COLLISION: BodyA part ${partInfoA.partIndex} hit`
      );
    }
    if (partInfoB) {
      console.log(
        `🎯 PRECISE COLLISION: BodyB part ${partInfoB.partIndex} hit`
      );
    }

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

    // Store part information for precise collision handling
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

      // Determine which part was hit based on collision info
      const playerPartInfo = isPlayerCollisionA ? partInfoA : partInfoB;
      const contactPoint = event.contactPoint;

      this.handlePlayerAsteroidCollision(
        playerAsteroidData,
        entityA,
        entityB,
        playerPartInfo,
        contactPoint
      );

      return;
    } // Check AI ship-asteroid collisions
    if (aiShip && asteroidData) {
      console.log(`💥 AI SHIP-ASTEROID COLLISION DETECTED!`);
      this.handleAIShipAsteroidCollision(aiShip, asteroidData, event);

      return;
    }
    // Check laser-AI ship collisions
    if (laserData && aiShip) {
      console.log(`💥 LASER-AI SHIP COLLISION DETECTED!`);

      // Check for friendly fire - get representative entity from ship
      let targetEntity = null;
      if (aiShip.ship.parts?.[0]?.entity) {
        // Old ship format
        targetEntity = aiShip.ship.parts[0].entity;
      } else if (aiShip.ship.structure?.components?.[0]?.entity) {
        // New modular ship format
        targetEntity = aiShip.ship.structure.components[0].entity;
      }

      if (targetEntity && this.isLaserFriendlyFire(laserData, targetEntity)) {
        return; // Ignore friendly fire
      }
      this.handleLaserAIShipCollision(laserData, aiShip, event);

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

      // Determine which part was hit based on collision info
      const playerPartInfo = isPlayerCollisionA ? partInfoA : partInfoB;

      this.handleLaserPlayerCollision(
        laserData,
        entityA,
        entityB,
        playerPartInfo
      );

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

    // Check modular ship compound body
    const modularShip = this.playerManager.getModularShip();

    if (modularShip) {
      // Check if this is the main compound body physics ID
      const shipPhysicsBodyId = modularShip.physicsBodyId;

      if (shipPhysicsBodyId === physicsBodyId) {
        console.log(
          `🎯 Found modular ship compound body: ${physicsBodyId} -> ${modularShip.id}`
        );
        // Return a representative entity for collision handling
        // We need to get the cockpit component entity
        const cockpitComponent = modularShip.structure.cockpitComponent;
        if (cockpitComponent) {
          return cockpitComponent.entity;
        }
        // Fallback to first component
        const components = modularShip.structure.components;
        if (components.length > 0) {
          return components[0].entity;
        }
      }

      // Also check individual component entities (for detailed collision handling)
      const components = modularShip.structure.components;
      const component = components.find(
        (c: any) => c && c.entity && c.entity.physicsBodyId === physicsBodyId
      );
      if (component) return component.entity;
    }
    // Check AI ships compound bodies AND individual parts
    if (this.aiManager) {
      const aiShips = this.aiManager.getAllAIShips();

      for (const aiShip of aiShips) {
        // Check AI ship compound body - handle both old and new formats
        let shipPhysicsBodyId = null;

        // Try new modular ship format first
        if (aiShip.ship.physicsBodyId) {
          shipPhysicsBodyId = aiShip.ship.physicsBodyId;
        } else {
          // Try old format compound body
          const compoundBody = (aiShip.ship as any)._compoundBody;
          if (compoundBody) {
            shipPhysicsBodyId = compoundBody.id;
          }
        }

        if (shipPhysicsBodyId === physicsBodyId) {
          console.log(
            `🎯 Found AI ship compound body: ${physicsBodyId} -> ${aiShip.ship.id}`
          );
          // For modular ships, create a virtual entity to represent the ship
          if (aiShip.ship.physicsBodyId) {
            // Return a virtual entity for modular ships
            return {
              id: aiShip.ship.id,
              physicsBodyId: shipPhysicsBodyId,
              position: aiShip.ship.position,
              isModularShip: true,
              modularShip: aiShip.ship,
            } as any;
          } else {
            // For old ships, return the first part's entity as a representative
            const activeParts = aiShip.ship.getActiveParts?.();
            if (activeParts && activeParts.length > 0) {
              return activeParts[0].entity;
            }
          }
        }
        // Check individual parts
        let part = null;
        if (aiShip.ship.parts) {
          // Old ship format
          part = aiShip.ship.parts.find(
            (p: any) =>
              p && p.entity && p.entity.physicsBodyId === physicsBodyId
          );
        } else if (aiShip.ship.structure?.components) {
          // New modular ship format
          part = aiShip.ship.structure.components.find(
            (c: any) =>
              c && c.entity && c.entity.physicsBodyId === physicsBodyId
          );
        }

        if (part) return part.entity;
      }
    }
    // Check lasers
    const laser = this.laserManager
      .getAllLasers()
      .find(l => l && l.entity && l.entity.physicsBodyId === physicsBodyId);

    if (laser) return laser.entity;

    // Check asteroids
    const asteroid = this.asteroidManager
      .getAllAsteroids()
      .find(a => a && a.entity && a.entity.physicsBodyId === physicsBodyId);

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
  private handleLaserAIShipCollision(
    laserData: any,
    aiShip: any,
    collisionEvent?: CollisionEvent
  ): void {
    console.log('🎯 LASER-AI SHIP collision detected!');

    // Remove laser
    this.laserManager.removeLaser(laserData);

    const compositeShip = aiShip.ship;

    if (!compositeShip || !collisionEvent) {
      console.log(
        '⚠️ Missing compositeShip or collisionEvent - using fallback'
      );
      if (this.aiManager) {
        const wasDestroyed = this.aiManager.handleAIShipDamage(aiShip);
        if (wasDestroyed) {
          console.log(`🎯 AI ship destroyed by laser (fallback): ${aiShip.id}`);
        }
      }
      return;
    }

    // Determine which part info belongs to the AI ship (not the laser)
    const { bodyA, bodyB, partInfoA, partInfoB } = collisionEvent;
    const laserEntity = laserData.entity;

    // Find which collision part belongs to the AI ship
    let aiShipPartInfo: { partIndex: number; componentId?: string } | null =
      null;

    if (laserEntity.physicsBodyId === bodyA.id && partInfoB) {
      // Laser is bodyA, AI ship is bodyB
      aiShipPartInfo = {
        partIndex: partInfoB.partIndex,
        componentId: partInfoB.componentId,
      };
      console.log(`🎯 AI ship is bodyB, part info extracted`);
    } else if (laserEntity.physicsBodyId === bodyB.id && partInfoA) {
      // Laser is bodyB, AI ship is bodyA
      aiShipPartInfo = {
        partIndex: partInfoA.partIndex,
        componentId: partInfoA.componentId,
      };
      console.log(`🎯 AI ship is bodyA, part info extracted`);
    }

    // Now use the SAME logic as player collision handling
    if (aiShipPartInfo && typeof aiShipPartInfo.partIndex === 'number') {
      const damageAmount = 15; // Laser damage
      let wasDestroyed = false;

      console.log(`🔍 DEBUG AI SHIP partInfo:`, {
        partIndex: aiShipPartInfo.partIndex,
        componentId: aiShipPartInfo.componentId,
        hasComponentId: !!aiShipPartInfo.componentId,
      });

      // Try different damage methods based on ship type
      if (aiShipPartInfo.componentId && compositeShip.takeDamageAtComponentId) {
        console.log(
          `🎯 Using component ID for precise AI ship damage: ${aiShipPartInfo.componentId}`
        );
        wasDestroyed = compositeShip.takeDamageAtComponentId(
          aiShipPartInfo.componentId,
          damageAmount
        );
      } else if (compositeShip.takeDamageAtPartIndex) {
        console.log(`⚠️ Falling back to part index method for AI ship`);
        wasDestroyed = compositeShip.takeDamageAtPartIndex(
          aiShipPartInfo.partIndex,
          damageAmount
        );
      } else {
        console.log(`⚠️ No compatible damage method found for AI ship`);
      }

      console.log(
        `🎯 AI ship part ${aiShipPartInfo.partIndex} hit:`,
        wasDestroyed ? 'SHIP DESTROYED' : 'component damaged'
      );

      // Only destroy the AI ship entity if the entire ship was destroyed
      if (wasDestroyed && this.aiManager) {
        console.log(`💀 AI ship completely destroyed: ${aiShip.id}`);
        this.aiManager.handleAIShipDamage(aiShip);
      }

      return; // Successfully handled collision
    }

    // Final fallback: If we couldn't identify the specific part, use general damage
    console.log(
      '⚠️ Could not extract part info - using general damage fallback'
    );
    if (this.aiManager) {
      const wasDestroyed = this.aiManager.handleAIShipDamage(aiShip);
      if (wasDestroyed) {
        console.log(`🎯 AI ship destroyed by laser (fallback): ${aiShip.id}`);
      }
      console.log(
        "⚠️ Used fallback damage method - couldn't identify specific part"
      );
    }
  }

  private handleLaserPlayerCollision(
    laserData: any,
    _entityA: Entity,
    _entityB: Entity,
    playerPartInfo?: { partIndex: number; componentId?: string } | null
  ): void {
    // Remove laser
    this.laserManager.removeLaser(laserData);

    // TEMPORARY: Check immunity flag
    if (this.playerImmune) {
      console.log(
        `🛡️ Player is temporarily immune to damage - laser hit ignored`
      );

      return;
    }

    // Handle modular ship laser damage with part precision
    const modularShip = this.playerManager.getModularShip();

    if (
      modularShip &&
      playerPartInfo &&
      typeof playerPartInfo.partIndex === 'number'
    ) {
      // Use precise component ID for damage if available (preferred method)
      const damageAmount = 15; // Laser damage
      let wasDestroyed = false;

      console.log(`🔍 DEBUG LASER playerPartInfo:`, {
        partIndex: playerPartInfo.partIndex,
        componentId: playerPartInfo.componentId,
        hasComponentId: !!playerPartInfo.componentId,
      });

      if (playerPartInfo.componentId) {
        console.log(
          `🎯 Using component ID for precise damage: ${playerPartInfo.componentId}`
        );
        wasDestroyed =
          modularShip.takeDamageAtComponentId?.(
            playerPartInfo.componentId,
            damageAmount
          ) || false;
      } else {
        console.log(
          `⚠️ Falling back to part index method - component ID is missing/null`
        );
        wasDestroyed = modularShip.takeDamageAtPartIndex(
          playerPartInfo.partIndex,
          damageAmount
        );
      }

      console.log(
        `💥 Laser hit modular ship part ${playerPartInfo.partIndex}, destroyed: ${wasDestroyed}`
      );
    } else if (modularShip) {
      // Fallback to position-based damage if no part info
      console.log(`💥 Laser hit modular ship (fallback damage)`);
      // Could implement fallback damage here
    } else {
      // Traditional player damage
      console.log(`💥 Laser hit traditional player`);
    }
  }
  private handleAIShipAsteroidCollision(
    aiShip: any,
    asteroidData: any,
    collisionEvent?: CollisionEvent
  ): void {
    console.log('🎯 AI SHIP-ASTEROID collision detected!');

    const compositeShip = aiShip.ship;

    if (!compositeShip || !collisionEvent) {
      console.log(
        '⚠️ Missing compositeShip or collisionEvent for asteroid - using fallback'
      );
      if (this.aiManager) {
        const wasDestroyed = this.aiManager.handleAIShipDamage(aiShip);
        if (wasDestroyed) {
          console.log(`AI ship destroyed by asteroid (fallback): ${aiShip.id}`);
        }
      }
      // Still break the asteroid
      this.asteroidManager.breakAsteroid(asteroidData);
      return;
    }

    // Determine which part info belongs to the AI ship (not the asteroid)
    const { bodyA, bodyB, partInfoA, partInfoB } = collisionEvent;
    const asteroidEntity = asteroidData.entity;

    // Find which collision part belongs to the AI ship
    let aiShipPartInfo: { partIndex: number; componentId?: string } | null =
      null;

    if (asteroidEntity.physicsBodyId === bodyA.id && partInfoB) {
      // Asteroid is bodyA, AI ship is bodyB
      aiShipPartInfo = {
        partIndex: partInfoB.partIndex,
        componentId: partInfoB.componentId,
      };
      console.log(
        `🎯 AI ship is bodyB in asteroid collision, part info extracted`
      );
    } else if (asteroidEntity.physicsBodyId === bodyB.id && partInfoA) {
      // Asteroid is bodyB, AI ship is bodyA
      aiShipPartInfo = {
        partIndex: partInfoA.partIndex,
        componentId: partInfoA.componentId,
      };
      console.log(
        `🎯 AI ship is bodyA in asteroid collision, part info extracted`
      );
    }

    // Now use the SAME logic as laser collision handling
    if (aiShipPartInfo && typeof aiShipPartInfo.partIndex === 'number') {
      const damageAmount = 35; // Asteroids do heavy damage
      let wasDestroyed = false;

      console.log(`🔍 DEBUG AI SHIP ASTEROID partInfo:`, {
        partIndex: aiShipPartInfo.partIndex,
        componentId: aiShipPartInfo.componentId,
        hasComponentId: !!aiShipPartInfo.componentId,
      });

      // Try component ID first (precise damage)
      if (aiShipPartInfo.componentId && compositeShip.takeDamageAtComponentId) {
        console.log(
          `🎯 Using component ID for precise AI ship asteroid damage: ${aiShipPartInfo.componentId}`
        );
        wasDestroyed = compositeShip.takeDamageAtComponentId(
          aiShipPartInfo.componentId,
          damageAmount
        );
      } else if (compositeShip.takeDamageAtPartIndex) {
        console.log(
          `⚠️ Falling back to part index method for AI ship asteroid collision`
        );
        wasDestroyed = compositeShip.takeDamageAtPartIndex(
          aiShipPartInfo.partIndex,
          damageAmount
        );
      } else {
        console.log(
          `⚠️ No compatible damage method found for AI ship asteroid collision`
        );
      }

      console.log(
        `🎯 AI ship part ${aiShipPartInfo.partIndex} hit by asteroid:`,
        wasDestroyed ? 'SHIP DESTROYED' : 'component damaged'
      );

      // Only destroy the AI ship entity if the entire ship was destroyed
      if (wasDestroyed && this.aiManager) {
        console.log(
          `💀 AI ship completely destroyed by asteroid: ${aiShip.id}`
        );
        this.aiManager.handleAIShipDamage(aiShip);
      }
    } else {
      // Final fallback: If we couldn't identify the specific part, use general damage
      console.log(
        '⚠️ Could not extract part info from asteroid collision - using general damage fallback'
      );
      if (this.aiManager) {
        const wasDestroyed = this.aiManager.handleAIShipDamage(aiShip);
        if (wasDestroyed) {
          console.log(`AI ship destroyed by asteroid (fallback): ${aiShip.id}`);
        }
        console.log(
          "⚠️ Used fallback damage method for asteroid collision - couldn't identify specific part"
        );
      }
    }

    // Break the asteroid
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
    // TEMPORARY: Check immunity flag for player damage
    if (this.playerImmune) {
      console.log(`🛡️ Player is temporarily immune to collision damage`);

      return;
    }
    // Handle player damage (original logic when immunity is disabled)
    const modularShip = this.playerManager.getModularShip();

    if (modularShip && playerEntity) {
      const components = modularShip.structure.components;
      const hitComponent = components.find(
        (component: any) => component.entity === playerEntity
      );

      if (hitComponent && modularShip.isAlive) {
        // Damage the specific component that was hit with a large amount
        const damageAmount = 25; // Collisions do more damage than lasers
        modularShip.takeDamageAtComponent?.(hitComponent.id, damageAmount);
        console.log(
          'Player damaged in AI ship collision! Components remaining:',
          components.filter((c: any) => !c.isDestroyed).length
        );
      }
    }
  }

  private handlePlayerAsteroidCollision(
    _asteroidData: any,
    _entityA: Entity,
    _entityB: Entity,
    playerPartInfo?: { partIndex: number; partBody: any; componentId?: string },
    contactPoint?: Vector2D
  ): void {
    // CRITICAL: Immunity check - ALWAYS prevent damage during testing
    if (this.playerImmune) {
      console.log(`🛡️🛡️🛡️ IMMUNITY ACTIVE - NO DAMAGE WILL BE TAKEN! 🛡️🛡️🛡️`);

      // Still show visual feedback for testing coordinate systems
      const modularShip = this.playerManager.getModularShip();
      if (
        modularShip &&
        playerPartInfo &&
        playerPartInfo.partIndex !== undefined
      ) {
        // ENHANCED: Show collision result for both methods
        if (playerPartInfo.componentId) {
          // Direct component ID method - get component directly
          const hitComponent = modularShip.structure.components.find(
            (c: any) => c.id === playerPartInfo.componentId
          );
          if (hitComponent) {
            const { x, y } = hitComponent.gridPosition;
            let blockInfo;
            if (x === 0 && y === 0) blockInfo = 'Block 0 (COCKPIT/CENTER)';
            else if (x === 0 && y === -1) blockInfo = 'Block 1 (NORTH/TOP)';
            else if (x === 1 && y === 0) blockInfo = 'Block 2 (EAST-1)';
            else if (x === 2 && y === 0) blockInfo = 'Block 3 (EAST-2)';
            else if (x === 0 && y === 1) blockInfo = 'Block 4 (SOUTH-1)';
            else if (x === 0 && y === 2) blockInfo = 'Block 5 (SOUTH-2)';
            else if (x === 0 && y === 3) blockInfo = 'Block 6 (SOUTH-3)';
            else blockInfo = `Block ? (${x}, ${y})`;

            console.log(
              `🎯 === COLLISION TEST RESULTS (COMPONENT ID METHOD) ===`
            );
            console.log(`📍 Hit: ${blockInfo}`);
            console.log(`🆔 Component ID: ${hitComponent.id}`);
            console.log(`🔢 Part Index: ${playerPartInfo.partIndex}`);
            console.log(`📍 Grid Coordinates: (${x}, ${y})`);
            console.log(`✅ Visual flash triggered`);
            console.log(`🛡️ Damage prevented (immunity active)`);
            console.log(`==============================`);

            // Flash the component for visual feedback
            hitComponent.flashDamage();
          }
        } else {
          // Fallback: Part index method
          const components = modularShip.structure.components.filter(
            (c: any) => !c.isDestroyed
          );
          if (playerPartInfo.partIndex < components.length) {
            const hitComponent = components[playerPartInfo.partIndex];

            // Get the block info for clear debugging
            const { x, y } = hitComponent.gridPosition;
            let blockInfo;
            if (x === 0 && y === 0) blockInfo = 'Block 0 (COCKPIT/CENTER)';
            else if (x === 0 && y === -1) blockInfo = 'Block 1 (NORTH/TOP)';
            else if (x === 1 && y === 0) blockInfo = 'Block 2 (EAST-1)';
            else if (x === 2 && y === 0) blockInfo = 'Block 3 (EAST-2)';
            else if (x === 0 && y === 1) blockInfo = 'Block 4 (SOUTH-1)';
            else if (x === 0 && y === 2) blockInfo = 'Block 5 (SOUTH-2)';
            else if (x === 0 && y === 3) blockInfo = 'Block 6 (SOUTH-3)';
            else blockInfo = `Block ? (${x}, ${y})`;

            console.log(
              `🎯 === COLLISION TEST RESULTS (PART INDEX METHOD) ===`
            );
            console.log(`📍 Hit: ${blockInfo}`);
            console.log(`🔢 Part Index: ${playerPartInfo.partIndex}`);
            console.log(`📍 Grid Coordinates: (${x}, ${y})`);
            console.log(`🆔 Component ID: ${hitComponent.id}`);
            console.log(`✅ Visual flash triggered`);
            console.log(`🛡️ Damage prevented (immunity active)`);
            console.log(`==============================`);

            // Flash the component for visual feedback
            hitComponent.flashDamage();
          }
        }
      } else if (contactPoint) {
        console.log(
          `🎯 COLLISION TEST: Hit at contact point (${contactPoint.x.toFixed(1)}, ${contactPoint.y.toFixed(1)})`
        );
      }

      // CRITICAL: Return immediately - prevent any damage
      return;
    }

    // For modular ships, handle component-by-component damage
    const modularShip = this.playerManager.getModularShip();

    if (modularShip && modularShip.isAlive) {
      let damageSuccess = false; // If we have part info (compound body collision), use that to find the component
      if (playerPartInfo && playerPartInfo.partIndex !== undefined) {
        console.log(
          `🎯 Hit component at part index ${playerPartInfo.partIndex}`
        );
        console.log(`🔍 DEBUG playerPartInfo:`, {
          partIndex: playerPartInfo.partIndex,
          componentId: playerPartInfo.componentId,
          hasComponentId: !!playerPartInfo.componentId,
        });
        const damageAmount = 35; // Asteroids do heavy damage

        // Use component ID for precise damage if available (preferred method)
        if (playerPartInfo.componentId) {
          console.log(
            `🎯 Using component ID for precise damage: ${playerPartInfo.componentId}`
          );
          damageSuccess =
            modularShip.takeDamageAtComponentId?.(
              playerPartInfo.componentId,
              damageAmount
            ) || false;
        } else {
          console.log(
            `⚠️ Falling back to part index method - component ID is missing/null`
          );
          damageSuccess = modularShip.takeDamageAtPartIndex(
            playerPartInfo.partIndex,
            damageAmount
          );
        }

        if (damageSuccess) {
          console.log(
            `🔥 Component at part ${playerPartInfo.partIndex} damaged by asteroid! Components remaining:`,
            modularShip.structure.components.filter((c: any) => !c.isDestroyed)
              .length
          );
        }
      }
      // Fallback: Use contact point to find closest component
      else if (contactPoint) {
        console.log(
          `🎯 Using contact point fallback at (${contactPoint.x.toFixed(1)}, ${contactPoint.y.toFixed(1)})`
        );
        damageSuccess = modularShip.takeDamageAtPosition(contactPoint, 35);
        if (damageSuccess) {
          console.log(
            'Modular ship hit by asteroid at contact point! Components remaining:',
            modularShip.structure.components.filter((c: any) => !c.isDestroyed)
              .length
          );
        }
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

    // Check if entity is part of modular ship
    const modularShip = this.playerManager.getModularShip();

    if (modularShip) {
      const components = modularShip.structure.components;
      return components.some((component: any) => component.entity === entity);
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
