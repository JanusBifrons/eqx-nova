import type { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import { Laser } from '../entities/Laser';
import { Asteroid, type AsteroidSize } from '../entities/Asteroid';
import { Player } from '../entities/Player';
import { ShapeUtils } from '../shapes/ShapeUtils';

/**
 * LaserFactory - Creates laser entities
 * Following Single Responsibility Principle and Factory Pattern
 */
export class LaserFactory {
  private static readonly LASER_SPEED = 12.0; // Much faster speed - pixels per frame

  private static readonly LASER_LIFETIME = 2000; // milliseconds

  public static create(
    engine: Engine,
    position: Vector2D,
    direction: Vector2D,
    onDestroy: (laser: Laser) => void
  ): Laser {
    // Create laser entity as a rectangle (physical body for proper collision detection)
    const entity = engine.createRectangle({
      x: position.x,
      y: position.y,
      width: 3,
      height: 8,
      options: {
        color: 0xffff00,
        isStatic: false,
        frictionAir: 0,
        density: 0.001,
        isSensor: false, // Make it a physical body for proper collision detection with compound bodies
      },
    });

    // Set rotation and velocity for the laser
    // Ship parts are oriented to point right at 0 degrees, so no rotation offset needed
    const rotation = Math.atan2(direction.y, direction.x);
    const physicsSystem = engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const laserBody = allBodies.find(body => body.id === entity.physicsBodyId);

    if (laserBody) {
      // Set rotation to point in direction of travel
      physicsSystem.setRotation(laserBody, rotation);

      // Set velocity directly instead of applying force for predictable speed
      const velocityX = direction.x * this.LASER_SPEED;
      const velocityY = direction.y * this.LASER_SPEED;
      physicsSystem.setVelocity(laserBody, { x: velocityX, y: velocityY });
    }
    const velocity = {
      x: direction.x * this.LASER_SPEED,
      y: direction.y * this.LASER_SPEED,
    };

    return new Laser(entity, velocity, this.LASER_LIFETIME, onDestroy);
  }
}

/**
 * AsteroidFactory - Creates asteroid entities
 * Following Single Responsibility Principle and Factory Pattern
 */
export class AsteroidFactory {
  private static readonly SIZE_MAP = {
    large: 40,
    medium: 25,
    small: 15,
  };

  private static readonly SPEED_RANGE = {
    min: 0.5,
    max: 1.5,
  };

  public static create(
    engine: Engine,
    position: Vector2D,
    size: AsteroidSize,
    onDestroy: (asteroid: Asteroid) => void,
    velocity?: Vector2D
  ): Asteroid {
    const baseRadius = this.SIZE_MAP[size];

    // Generate random asteroid shape
    const vertices = ShapeUtils.generateRandomAsteroid(
      baseRadius / 2, // Use half radius for vertices
      0.4, // Irregularity
      8 // Number of vertices
    );

    // Create asteroid entity
    const entity = engine.createPolygon({
      x: position.x,
      y: position.y,
      vertices,
      options: {
        color: 0x888888,
        isStatic: false,
        frictionAir: 0,
        density: 0.001,
      },
    }); // Apply velocity
    const finalVelocity = velocity ?? this.generateRandomVelocity();
    const physicsSystem = engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const asteroidBody = allBodies.find(
      body => body.id === entity.physicsBodyId
    );

    if (asteroidBody) {
      // Use direct velocity setting for more predictable movement
      physicsSystem.setVelocity(asteroidBody, finalVelocity);

      // Add gentle rotation for visual interest
      const angularVelocity = (Math.random() - 0.5) * 0.02;
      physicsSystem.setAngularVelocity(asteroidBody, angularVelocity);
    }
    return new Asteroid(entity, size, finalVelocity, baseRadius / 2, onDestroy);
  }

  public static createAtRandomEdge(
    engine: Engine,
    size: AsteroidSize,
    onDestroy: (asteroid: Asteroid) => void
  ): Asteroid {
    const rendererSystem = engine.getRendererSystem();
    const width = rendererSystem.getWidth();
    const height = rendererSystem.getHeight();

    let x: number, y: number;
    const edge = Math.floor(Math.random() * 4);

    switch (edge) {
      case 0: // Top
        x = Math.random() * width;
        y = -20;
        break;
      case 1: // Right
        x = width + 20;
        y = Math.random() * height;
        break;
      case 2: // Bottom
        x = Math.random() * width;
        y = height + 20;
        break;
      default: // Left
        x = -20;
        y = Math.random() * height;
        break;
    }
    return this.create(engine, { x, y }, size, onDestroy);
  }

  private static generateRandomVelocity(): Vector2D {
    const speed =
      this.SPEED_RANGE.min +
      Math.random() * (this.SPEED_RANGE.max - this.SPEED_RANGE.min);
    const angle = Math.random() * Math.PI * 2;

    return {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };
  }
}

/**
 * PlayerFactory - Creates player entities
 * Following Single Responsibility Principle and Factory Pattern
 */
export class PlayerFactory {
  public static create(
    engine: Engine,
    position: Vector2D,
    onDestroy: (player: Player) => void
  ): Player {
    // Generate triangle ship shape
    const vertices = ShapeUtils.generateTriangleShip(20);

    // Create player entity
    const entity = engine.createPolygon({
      x: position.x,
      y: position.y,
      vertices,
      options: {
        color: 0x00ff00,
        isStatic: false,
        frictionAir: 0.01, // Some air resistance for control
        density: 0.001,
      },
    });

    return new Player(entity, onDestroy);
  }

  // createCompositeShip method removed - replaced by ModularShip system
}
