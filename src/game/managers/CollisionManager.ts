import type { Entity } from '../../engine/entity';
import type { CollisionEvent } from '../../engine/interfaces/IPhysicsSystem';
import type { PlayerManager } from './PlayerManager';
import type { LaserManager } from './LaserManager';
import type { AsteroidManager } from './AsteroidManager';

/**
 * CollisionManager - Handles collision detection and resolution
 * Following Single Responsibility Principle
 */
export class CollisionManager {
  private playerManager: PlayerManager;
  private laserManager: LaserManager;
  private asteroidManager: AsteroidManager;

  constructor(
    playerManager: PlayerManager,
    laserManager: LaserManager,
    asteroidManager: AsteroidManager
  ) {
    this.playerManager = playerManager;
    this.laserManager = laserManager;
    this.asteroidManager = asteroidManager;
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
    }    // Check player-asteroid collisions
    const isPlayerA = entityA === this.playerManager.getPlayer();
    const isPlayerB = entityB === this.playerManager.getPlayer();
    const playerAsteroidData =
      asteroidData && (isPlayerA || isPlayerB) ? asteroidData : null;

    if (playerAsteroidData) {
      this.handlePlayerAsteroidCollision(playerAsteroidData);
    }
  }

  private findEntityByPhysicsBodyId(physicsBodyId: string): Entity | null {
    const player = this.playerManager.getPlayer();
    if (player?.physicsBodyId === physicsBodyId) {
      return player;
    }    const laser = this.laserManager
      .getAllLasers()
      .find(l => l.entity.physicsBodyId === physicsBodyId);
    if (laser) return laser.entity;

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

  private handlePlayerAsteroidCollision(_asteroidData: any): void {
    // Player no longer takes damage from asteroids
    // Collision is detected but ignored
  }
}
