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
  private gameEngine: IGameEngine;

  private readonly ASTEROID_MIN_SPEED = 0.05;
  private readonly ASTEROID_MAX_SPEED = 0.15;
  private readonly SIZE_MAP = {
    large: 40,
    medium: 25,
    small: 15,
  };

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;
  }

  public spawnInitialAsteroids(): void {
    for (let i = 0; i < 3; i++) {
      this.createRandomAsteroid('large');
    }
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
  }

  public createAsteroid(
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
    );

    // Apply initial velocity
    const speed =
      this.ASTEROID_MIN_SPEED +
      Math.random() * (this.ASTEROID_MAX_SPEED - this.ASTEROID_MIN_SPEED);
    const angle = Math.random() * Math.PI * 2;

    const forceX = Math.cos(angle) * speed * 0.001;
    const forceY = Math.sin(angle) * speed * 0.001;
    this.gameEngine.applyForceToEntity(entity, { x: forceX, y: forceY });

    this.asteroids.push({ entity, size });
    console.log(`Created ${size} asteroid at:`, x, y);
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

  public getScoreForSize(size: 'large' | 'medium' | 'small'): number {
    switch (size) {
      case 'large':
        return 20;
      case 'medium':
        return 50;
      case 'small':
        return 100;
    }
  }

  public destroy(): void {
    this.asteroids.forEach(asteroidData => {
      this.gameEngine.removeEntity(asteroidData.entity.id);
    });
    this.asteroids = [];
  }
}
