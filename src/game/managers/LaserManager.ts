import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IGameEngine } from '../interfaces/IGameEngine';

interface LaserData {
  entity: Entity;
  createdAt: number;
}

/**
 * LaserManager - Handles laser creation, updating, and cleanup
 * Following Single Responsibility Principle
 */
export class LaserManager {
  private lasers: LaserData[] = [];

  private lastFireTime = 0;

  private gameEngine: IGameEngine;

  private readonly LASER_SPEED = 12.0; // Much faster speed - pixels per frame

  private readonly LASER_LIFETIME = 2000; // milliseconds

  private readonly LASER_COOLDOWN = 100; // milliseconds - reduced for better continuous firing

  private readonly LASER_WIDTH = 3;
  private readonly LASER_HEIGHT = 8;

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;
  }

  public fireLaser(position: Vector2D, rotation: number, shipVelocity?: Vector2D): boolean {
    const now = performance.now();

    if (now - this.lastFireTime < this.LASER_COOLDOWN) {
      return false;
    }
    const laserX = position.x + Math.cos(rotation) * 25;
    const laserY = position.y + Math.sin(rotation) * 25;

    const entity = this.gameEngine.createLaser(
      { x: laserX, y: laserY },
      this.LASER_WIDTH,
      this.LASER_HEIGHT
    );

    // Rotate the laser to point in the direction it's traveling
    // Add 90 degrees (π/2 radians) to correct the orientation since rectangles default to vertical
    this.gameEngine.setEntityRotation(entity, rotation + Math.PI / 2);

    // Set direct velocity instead of applying force for predictable speed
    const velocityX = Math.cos(rotation) * this.LASER_SPEED;
    const velocityY = Math.sin(rotation) * this.LASER_SPEED;

    // Add ship velocity inheritance for better feel when firing while moving
    const finalVelocity = {
      x: velocityX + (shipVelocity?.x || 0),
      y: velocityY + (shipVelocity?.y || 0)
    };

    this.gameEngine.setEntityVelocity(entity, finalVelocity);

    this.lasers.push({
      entity,
      createdAt: now,
    });

    this.lastFireTime = now;

    return true;
  }

  public update(_deltaTime: number): void {
    this.cleanupExpiredLasers();
  }

  private cleanupExpiredLasers(): void {
    const now = performance.now();
    const expiredLasers: LaserData[] = [];

    this.lasers.forEach(laserData => {
      if (now - laserData.createdAt > this.LASER_LIFETIME) {
        expiredLasers.push(laserData);
      }
    });

    expiredLasers.forEach(laserData => {
      this.removeLaser(laserData);
    });
  }

  public findLaserByEntity(entity: Entity): LaserData | null {
    return this.lasers.find(l => l.entity === entity) || null;
  }

  public removeLaser(laserData: LaserData): void {
    const index = this.lasers.indexOf(laserData);

    if (index > -1) {
      this.lasers.splice(index, 1);
      this.gameEngine.removeEntity(laserData.entity.id);
    }
  }

  public getAllLasers(): LaserData[] {
    return [...this.lasers];
  }

  public destroy(): void {
    this.lasers.forEach(laserData => {
      this.gameEngine.removeEntity(laserData.entity.id);
    });
    this.lasers = [];
  }
}
