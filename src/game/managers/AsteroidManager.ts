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
  private asteroids: AsteroidData[] = []; private gameEngine: IGameEngine;
  private readonly ASTEROID_MIN_SPEED = 0.3; // Slightly slower for better control in expanded space
  private readonly ASTEROID_MAX_SPEED = 2.0; // Increased max speed for variety
  private readonly SIZE_MAP = {
    large: 40,
    medium: 25,
    small: 15,
  };

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;
  } public spawnInitialAsteroids(): void {
    // Spawn many more asteroids to fill the expanded game space (4x viewport)

    // First spawn asteroids at the edges
    // 12 large asteroids for major obstacles
    for (let i = 0; i < 12; i++) {
      this.createRandomAsteroid('large');
    }
    // 15 medium asteroids for variety and challenge
    for (let i = 0; i < 15; i++) {
      this.createRandomAsteroid('medium');
    }
    // 8 small asteroids for detail and visual interest
    for (let i = 0; i < 8; i++) {
      this.createRandomAsteroid('small');
    }

    // Then spawn additional asteroids throughout the interior space
    this.spawnInteriorAsteroids(12);

    console.log('Spawned initial asteroids: 35 at edges + 12 interior = 47 total asteroids');
  } public spawnAsteroidWave(score: number): void {
    // Scale asteroid count for the expanded game space
    // Base of 8 asteroids, increasing by 2 for every 500 points, max of 20
    const numAsteroids = Math.min(8 + Math.floor(score / 500) * 2, 20);

    // Spawn a mix of sizes for variety
    const largeCount = Math.floor(numAsteroids * 0.5); // 50% large
    const mediumCount = Math.floor(numAsteroids * 0.3); // 30% medium  
    const smallCount = numAsteroids - largeCount - mediumCount; // 20% small

    for (let i = 0; i < largeCount; i++) {
      this.createRandomAsteroid('large');
    }
    for (let i = 0; i < mediumCount; i++) {
      this.createRandomAsteroid('medium');
    }
    for (let i = 0; i < smallCount; i++) {
      this.createRandomAsteroid('small');
    }

    // At higher scores, also spawn some interior asteroids for added challenge
    if (score > 2000) {
      const interiorCount = Math.min(Math.floor(score / 2000) * 2, 6);
      this.spawnInteriorAsteroids(interiorCount);
      console.log(`Spawned asteroid wave: ${largeCount} large, ${mediumCount} medium, ${smallCount} small (${numAsteroids} edge) + ${interiorCount} interior`);
    } else {
      console.log(`Spawned asteroid wave: ${largeCount} large, ${mediumCount} medium, ${smallCount} small (${numAsteroids} total)`);
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
  } public getAsteroidCount(): number {
    return this.asteroids.length;
  }

  /**
   * Spawn additional asteroids throughout the interior of the game world
   * This fills the expanded space beyond just edge spawning
   */
  public spawnInteriorAsteroids(count: number = 10): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const safeZoneRadius = Math.min(dimensions.width, dimensions.height) * 0.1; // 10% of smaller dimension

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let attempts = 0;
      const maxAttempts = 50;

      // Keep trying until we find a position outside the safe zone around the player
      do {
        x = Math.random() * dimensions.width;
        y = Math.random() * dimensions.height;
        attempts++;

        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );

        if (distanceFromCenter > safeZoneRadius) {
          break;
        }
      } while (attempts < maxAttempts);

      // If we couldn't find a good position, fall back to edge spawning
      if (attempts >= maxAttempts) {
        this.createRandomAsteroid('medium');
        continue;
      }

      // Randomly choose size with bias toward smaller asteroids for interior
      const sizeRandom = Math.random();
      let size: 'large' | 'medium' | 'small';
      if (sizeRandom < 0.3) {
        size = 'large';
      } else if (sizeRandom < 0.7) {
        size = 'medium';
      } else {
        size = 'small';
      }

      this.createAsteroid(size, x, y);
    }

    console.log(`Spawned ${count} interior asteroids throughout the game world`);
  }

  /**
   * Maintain asteroid density in the expanded game world
   * Should be called periodically to ensure good asteroid distribution
   */
  public maintainAsteroidDensity(targetCount: number = 40): void {
    const currentCount = this.getAsteroidCount();

    if (currentCount < targetCount) {
      const needed = Math.min(targetCount - currentCount, 8); // Don't spawn too many at once

      // Mix of edge and interior spawning
      const edgeCount = Math.ceil(needed * 0.7); // 70% from edges
      const interiorCount = needed - edgeCount; // 30% interior

      // Spawn edge asteroids
      for (let i = 0; i < edgeCount; i++) {
        const sizeRandom = Math.random();
        if (sizeRandom < 0.4) {
          this.createRandomAsteroid('large');
        } else if (sizeRandom < 0.8) {
          this.createRandomAsteroid('medium');
        } else {
          this.createRandomAsteroid('small');
        }
      }

      // Spawn interior asteroids
      if (interiorCount > 0) {
        this.spawnInteriorAsteroids(interiorCount);
      }

      console.log(`Maintaining asteroid density: spawned ${needed} asteroids (${edgeCount} edge, ${interiorCount} interior)`);
    }
  }

  public destroy(): void {
    this.asteroids.forEach(asteroidData => {
      this.gameEngine.removeEntity(asteroidData.entity.id);
    });
    this.asteroids = [];
  }
}
