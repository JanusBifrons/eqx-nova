import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IGameEngine } from '../interfaces/IGameEngine';

export type LaserSource = 'player' | 'ai' | string; // Allow for specific AI ship IDs

interface LaserData {
  entity: Entity;
  createdAt: number;
  source: LaserSource; // Track who fired this laser
  sourceId?: string; // Specific ID for AI ships
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

  private readonly LASER_COOLDOWN = 50; // milliseconds - reduced for multiple weapon parts

  private readonly LASER_WIDTH = 8; // Rotated: width becomes the length

  private readonly LASER_HEIGHT = 3; // Rotated: height becomes the thickness

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;
  }

  public fireLaser(
    position: Vector2D,
    rotation: number,
    shipVelocity?: Vector2D,
    source: LaserSource = 'player',
    sourceId?: string
  ): boolean {
    const now = performance.now();

    // Only apply global cooldown for traditional player firing (single weapon)
    // For modular ships with multiple weapons, let the ship's weapon system handle cooldowns
    if (
      source === 'player' &&
      !sourceId &&
      now - this.lastFireTime < this.LASER_COOLDOWN
    ) {
      return false;
    }
    // For modular ships, the rotation is already the correct firing direction
    // For traditional ships, we need to convert from ship coordinate system
    const laserAngle = rotation; // Use rotation directly now that ship provides correct firing angle
    const laserX = position.x + Math.cos(laserAngle) * 25;
    const laserY = position.y + Math.sin(laserAngle) * 25;

    const entity = this.gameEngine.createLaser(
      { x: laserX, y: laserY },
      this.LASER_WIDTH,
      this.LASER_HEIGHT
    );

    // Rotate the laser to point in the direction it's traveling
    // Use corrected angle to align with ship coordinate system
    this.gameEngine.setEntityRotation(entity, laserAngle);

    // Set direct velocity instead of applying force for predictable speed
    const velocityX = Math.cos(laserAngle) * this.LASER_SPEED;
    const velocityY = Math.sin(laserAngle) * this.LASER_SPEED;

    // Add ship velocity inheritance for better feel when firing while moving
    const finalVelocity = {
      x: velocityX + (shipVelocity?.x || 0),
      y: velocityY + (shipVelocity?.y || 0),
    };

    this.gameEngine.setEntityVelocity(entity, finalVelocity);

    this.lasers.push({
      entity,
      createdAt: now,
      source,
      sourceId,
    });

    // Only update global fire time for traditional single-weapon firing
    if (source === 'player' && !sourceId) {
      this.lastFireTime = now;
    }

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
