import type { Entity } from '../../engine/entity';
import type { IGameEngine } from '../interfaces/IGameEngine';
import { ShapeUtils } from '../utils/ShapeUtils';

interface AsteroidData {
  entity: Entity;
  size: 'large' | 'medium' | 'small';
}

/**
 * AsteroidManager - Handles asteroid creation, spawning, and management
 * Following Single Responsibility Principle
 */
export class AsteroidManager {
  private asteroids: AsteroidData[] = [];
  private gameEngine: IGameEngine; private readonly ASTEROID_MIN_SPEED = 0.5;
  private readonly ASTEROID_MAX_SPEED = 1.5;
  private readonly SIZE_MAP = {
    large: 40,
    medium: 25,
    small: 15,
  };

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;
  }
  public spawnInitialAsteroids(): void {
    // Spawn a mix of large and medium asteroids for more variety
    // 4 large asteroids
    for (let i = 0; i < 4; i++) {
      this.createRandomAsteroid('large');
    }

    // 3 medium asteroids for additional challenge and visual interest
    for (let i = 0; i < 3; i++) {
      this.createRandomAsteroid('medium');
    }

    console.log('Spawned initial asteroids: 4 large, 3 medium');
  }

  public spawnAsteroidWave(score: number): void {
    const numAsteroids = Math.min(3 + Math.floor(score / 1000), 8);
    for (let i = 0; i < numAsteroids; i++) {
      this.createRandomAsteroid('large');
    }
  }

  private createRandomAsteroid(size: 'large' | 'medium' | 'small'): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const position = ShapeUtils.getRandomEdgePosition(
      dimensions.width,
      dimensions.height
    );
    this.createAsteroid(size, position.x, position.y);
  } public createAsteroid(
    size: 'large' | 'medium' | 'small',
    x: number,
    y: number
  ): void {
    const asteroidRadius = this.SIZE_MAP[size] / 2;
    const vertices = ShapeUtils.createIrregularPolygon(asteroidRadius, 8, 0.4);

    const entity = this.gameEngine.createAsteroid(
      { x, y },
      this.SIZE_MAP[size],
      vertices
    );    // Apply initial linear velocity for gentle movement
    const speed =
      this.ASTEROID_MIN_SPEED +
      Math.random() * (this.ASTEROID_MAX_SPEED - this.ASTEROID_MIN_SPEED);
    const angle = Math.random() * Math.PI * 2;

    // Use direct velocity setting instead of forces for more predictable movement
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    this.gameEngine.setEntityVelocity(entity, { x: velocityX, y: velocityY });

    // Add gentle rotation for visual interest
    const angularVelocity = (Math.random() - 0.5) * 0.02; // Random rotation between -0.01 and 0.01 rad/frame
    this.gameEngine.setEntityAngularVelocity(entity, angularVelocity); this.asteroids.push({ entity, size });
    console.log(`Created ${size} asteroid at (${x.toFixed(1)}, ${y.toFixed(1)}) with velocity (${velocityX.toFixed(2)}, ${velocityY.toFixed(2)}) pixels/frame, angular velocity: ${angularVelocity.toFixed(4)} rad/frame`);
  }

  public breakAsteroid(asteroidData: AsteroidData): void {
    const position = asteroidData.entity.position;

    // Remove original asteroid
    this.removeAsteroid(asteroidData);

    // Create smaller asteroids
    if (asteroidData.size === 'large') {
      for (let i = 0; i < 2; i++) {
        this.createAsteroid('medium', position.x, position.y);
      }
    } else if (asteroidData.size === 'medium') {
      for (let i = 0; i < 2; i++) {
        this.createAsteroid('small', position.x, position.y);
      }
    }
    // Small asteroids just disappear
  }

  public findAsteroidByEntity(entity: Entity): AsteroidData | null {
    return this.asteroids.find(a => a.entity === entity) || null;
  }

  public removeAsteroid(asteroidData: AsteroidData): void {
    const index = this.asteroids.indexOf(asteroidData);
    if (index > -1) {
      this.asteroids.splice(index, 1);
      this.gameEngine.removeEntity(asteroidData.entity.id);
    }
  }

  public getAllAsteroids(): AsteroidData[] {
    return [...this.asteroids];
  }
  public getAsteroidCount(): number {
    return this.asteroids.length;
  }

  public destroy(): void {
    this.asteroids.forEach(asteroidData => {
      this.gameEngine.removeEntity(asteroidData.entity.id);
    });
    this.asteroids = [];
  }
}
