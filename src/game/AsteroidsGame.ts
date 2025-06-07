import type { Engine } from '../engine';
import type { Entity } from '../engine/entity';
import type { KeyboardInputEvent } from '../engine/input';
import type {
  Vector2D,
  CollisionEvent,
} from '../engine/interfaces/IPhysicsSystem';
import { ShapeUtils } from './utils';

interface LaserData {
  entity: Entity;
  createdAt: number;
}

interface AsteroidData {
  entity: Entity;
  size: 'large' | 'medium' | 'small';
}

/**
 * Refactored AsteroidsGame - Uses engine properly without duplicating functionality
 * Focuses on game logic rather than entity management
 */
export class AsteroidsGame {
  private static instance: AsteroidsGame | null = null;
  private isInitialized = false;
  private isDestroyed = false;
  private engine: Engine | null = null;

  // Game entities - just tracking what we created, engine manages them
  private playerShip: Entity | null = null;
  private lasers: LaserData[] = [];
  private asteroids: AsteroidData[] = [];

  // Player state
  private playerRotation = 0;
  private playerThrust = false;

  // Input state
  private keys: Set<string> = new Set();

  // Game constants
  private readonly PLAYER_ROTATION_SPEED = 0.003;
  private readonly LASER_SPEED = 0.6;
  private readonly LASER_LIFETIME = 2000; // milliseconds
  private readonly ASTEROID_MIN_SPEED = 0.05;
  private readonly ASTEROID_MAX_SPEED = 0.15;
  private readonly THRUST_FORCE = 0.0005;

  // Game state
  private score = 0;
  private lives = 3;
  private gameOver = false;
  private lastLaserTime = 0;
  private readonly LASER_COOLDOWN = 150; // milliseconds

  // Singleton pattern
  public static getInstance(): AsteroidsGame {
    if (!AsteroidsGame.instance) {
      AsteroidsGame.instance = new AsteroidsGame();
    }
    return AsteroidsGame.instance;
  }

  public static resetInstance(): void {
    if (AsteroidsGame.instance) {
      AsteroidsGame.instance.destroy();
      AsteroidsGame.instance = null;
    }
  }

  public initialize(engine: Engine): void {
    if (this.isDestroyed) {
      console.warn('Cannot initialize destroyed game instance');
      return;
    }

    if (this.isInitialized) {
      console.warn(
        'Game already initialized, skipping duplicate initialization'
      );
      return;
    }

    this.engine = engine;
    this.setupGame();
    this.setupInputHandlers();
    this.setupCollisionHandlers();
    this.isInitialized = true;
    console.log('Asteroids game initialized!');
  }

  private setupGame(): void {
    if (!this.engine) return;

    // Configure physics for space environment
    this.engine.getPhysicsSystem().setGravity(0, 0); // No gravity in space

    this.createPlayer();
    this.spawnInitialAsteroids();
  }

  private createPlayer(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const centerX = rendererSystem.getWidth() / 2;
    const centerY = rendererSystem.getHeight() / 2;

    // Create triangular ship using polygon
    const triangleVertices = ShapeUtils.createTriangle(20);

    this.playerShip = this.engine.createPolygon({
      x: centerX,
      y: centerY,
      vertices: triangleVertices,
      options: {
        color: 0x00ff00,
        isStatic: false,
        frictionAir: 0.02, // Some drag to prevent infinite spinning
        density: 0.001,
      },
    });

    console.log('Triangular player ship created at:', centerX, centerY);
  }

  private spawnInitialAsteroids(): void {
    // Start with 3 large asteroids
    for (let i = 0; i < 3; i++) {
      this.createRandomAsteroid('large');
    }
  }

  private createRandomAsteroid(size: 'large' | 'medium' | 'small'): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const width = rendererSystem.getWidth();
    const height = rendererSystem.getHeight();

    // Get random edge position
    const position = ShapeUtils.getRandomEdgePosition(width, height);

    this.createAsteroid(size, position.x, position.y);
  }

  private createAsteroid(
    size: 'large' | 'medium' | 'small',
    x: number,
    y: number
  ): void {
    if (!this.engine) return;

    const sizeMap = {
      large: 40,
      medium: 25,
      small: 15,
    };

    const asteroidRadius = sizeMap[size] / 2;

    // Create irregular polygon for asteroid
    const vertices = ShapeUtils.createIrregularPolygon(asteroidRadius, 8, 0.4);

    const entity = this.engine.createPolygon({
      x,
      y,
      vertices,
      options: {
        color: 0x888888,
        isStatic: false,
        frictionAir: 0, // No air resistance in space
        density: 0.001,
      },
    });

    // Apply initial velocity through physics
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const asteroidBody = allBodies.find(
      body => body.id === entity.physicsBodyId
    );

    if (asteroidBody) {
      const speed =
        this.ASTEROID_MIN_SPEED +
        Math.random() * (this.ASTEROID_MAX_SPEED - this.ASTEROID_MIN_SPEED);
      const angle = Math.random() * Math.PI * 2;

      const forceX = Math.cos(angle) * speed * 0.001;
      const forceY = Math.sin(angle) * speed * 0.001;
      physicsSystem.applyForce(asteroidBody, { x: forceX, y: forceY });
    }

    this.asteroids.push({ entity, size });
    console.log(`Created ${size} asteroid at:`, x, y);
  }

  private setupInputHandlers(): void {
    if (!this.engine) return;

    const inputSystem = this.engine.getInputSystem();

    inputSystem.addEventListener('keyboard', (event: KeyboardInputEvent) => {
      if (event.action === 'down') {
        this.keys.add(event.key.toLowerCase());
      } else if (event.action === 'up') {
        this.keys.delete(event.key.toLowerCase());
      }
    });
  }

  private setupCollisionHandlers(): void {
    if (!this.engine) return;

    const physicsSystem = this.engine.getPhysicsSystem();

    physicsSystem.onCollisionStart((event: CollisionEvent) => {
      this.handleCollision(event);
    });
  }

  private handleCollision(event: CollisionEvent): void {
    const { bodyA, bodyB } = event;

    // Find which entities these bodies belong to
    const entityA = this.findEntityByPhysicsBodyId(bodyA.id);
    const entityB = this.findEntityByPhysicsBodyId(bodyB.id);

    if (!entityA || !entityB) return;

    // Check laser-asteroid collisions
    const laserData =
      this.findLaserByEntity(entityA) || this.findLaserByEntity(entityB);
    const asteroidData =
      this.findAsteroidByEntity(entityA) || this.findAsteroidByEntity(entityB);

    if (laserData && asteroidData) {
      this.handleLaserAsteroidCollision(laserData, asteroidData);
    }

    // Check player-asteroid collisions
    const isPlayerA = entityA === this.playerShip;
    const isPlayerB = entityB === this.playerShip;
    const playerAsteroidData =
      asteroidData && (isPlayerA || isPlayerB) ? asteroidData : null;

    if (playerAsteroidData) {
      this.handlePlayerAsteroidCollision(playerAsteroidData);
    }
  }

  private findEntityByPhysicsBodyId(physicsBodyId: string): Entity | null {
    if (this.playerShip?.physicsBodyId === physicsBodyId) {
      return this.playerShip;
    }

    const laser = this.lasers.find(
      l => l.entity.physicsBodyId === physicsBodyId
    );
    if (laser) return laser.entity;

    const asteroid = this.asteroids.find(
      a => a.entity.physicsBodyId === physicsBodyId
    );
    if (asteroid) return asteroid.entity;

    return null;
  }

  private findLaserByEntity(entity: Entity): LaserData | null {
    return this.lasers.find(l => l.entity === entity) || null;
  }

  private findAsteroidByEntity(entity: Entity): AsteroidData | null {
    return this.asteroids.find(a => a.entity === entity) || null;
  }

  private handleLaserAsteroidCollision(
    laserData: LaserData,
    asteroidData: AsteroidData
  ): void {
    if (!this.engine) return;

    // Remove laser
    this.removeLaser(laserData);

    // Add score
    const points =
      asteroidData.size === 'large'
        ? 20
        : asteroidData.size === 'medium'
          ? 50
          : 100;
    this.score += points;

    // Break asteroid
    this.breakAsteroid(asteroidData);
  }

  private handlePlayerAsteroidCollision(asteroidData: AsteroidData): void {
    this.lives--;

    if (this.lives <= 0) {
      this.gameOver = true;
      console.log('Game Over! Final Score:', this.score);
    } else {
      this.respawnPlayer();
    }
  }

  private breakAsteroid(asteroidData: AsteroidData): void {
    if (!this.engine) return;

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

  private removeLaser(laserData: LaserData): void {
    if (!this.engine) return;

    const index = this.lasers.indexOf(laserData);
    if (index > -1) {
      this.lasers.splice(index, 1);
      this.engine.removeEntity(laserData.entity.id);
    }
  }

  private removeAsteroid(asteroidData: AsteroidData): void {
    if (!this.engine) return;

    const index = this.asteroids.indexOf(asteroidData);
    if (index > -1) {
      this.asteroids.splice(index, 1);
      this.engine.removeEntity(asteroidData.entity.id);
    }
  }

  public update(deltaTime: number): void {
    if (!this.isInitialized || !this.engine || this.gameOver) return;

    this.handleInput(deltaTime);
    this.updatePlayer(deltaTime);
    this.updateLasers(deltaTime);
    this.wrapScreenPositions();

    // Spawn new asteroids if none left
    if (this.asteroids.length === 0) {
      this.spawnAsteroidWave();
    }
  }

  private handleInput(deltaTime: number): void {
    // Rotation
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.playerRotation -= this.PLAYER_ROTATION_SPEED * deltaTime;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.playerRotation += this.PLAYER_ROTATION_SPEED * deltaTime;
    }

    // Thrust
    this.playerThrust = this.keys.has('w') || this.keys.has('arrowup');

    // Shooting
    if (this.keys.has(' ') || this.keys.has('spacebar')) {
      this.fireLaser();
    }
  }

  private updatePlayer(deltaTime: number): void {
    if (!this.playerShip || !this.engine) return;

    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const playerBody = allBodies.find(
      body => body.id === this.playerShip!.physicsBodyId
    );

    if (!playerBody) return;

    // Apply thrust
    if (this.playerThrust) {
      const forceX = Math.cos(this.playerRotation) * this.THRUST_FORCE;
      const forceY = Math.sin(this.playerRotation) * this.THRUST_FORCE;
      physicsSystem.applyForce(playerBody, { x: forceX, y: forceY });
    }

    // Apply rotation
    physicsSystem.setRotation(playerBody, this.playerRotation);
  }

  private fireLaser(): void {
    if (!this.playerShip || !this.engine) return;

    const now = performance.now();
    if (now - this.lastLaserTime < this.LASER_COOLDOWN) return;

    const laserX =
      this.playerShip.position.x + Math.cos(this.playerRotation) * 25;
    const laserY =
      this.playerShip.position.y + Math.sin(this.playerRotation) * 25;

    const entity = this.engine.createCircle({
      x: laserX,
      y: laserY,
      radius: 2,
      options: {
        color: 0xffff00,
        isStatic: false,
        frictionAir: 0,
        density: 0.001,
        isSensor: true, // Lasers are sensors - they detect collisions but don't physically collide
      },
    });

    // Apply velocity to laser
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const laserBody = allBodies.find(body => body.id === entity.physicsBodyId);

    if (laserBody) {
      const forceX = Math.cos(this.playerRotation) * this.LASER_SPEED * 0.001;
      const forceY = Math.sin(this.playerRotation) * this.LASER_SPEED * 0.001;
      physicsSystem.applyForce(laserBody, { x: forceX, y: forceY });
    }

    this.lasers.push({
      entity,
      createdAt: now,
    });

    this.lastLaserTime = now;
  }

  private updateLasers(deltaTime: number): void {
    const now = performance.now();
    const expiredLasers: LaserData[] = [];

    this.lasers.forEach(laserData => {
      if (now - laserData.createdAt > this.LASER_LIFETIME) {
        expiredLasers.push(laserData);
      }
    });

    // Remove expired lasers
    expiredLasers.forEach(laserData => {
      this.removeLaser(laserData);
    });
  }

  private spawnAsteroidWave(): void {
    const numAsteroids = Math.min(3 + Math.floor(this.score / 1000), 8);
    for (let i = 0; i < numAsteroids; i++) {
      this.createRandomAsteroid('large');
    }
  }

  private respawnPlayer(): void {
    if (!this.engine || !this.playerShip) return;

    const rendererSystem = this.engine.getRendererSystem();
    const centerX = rendererSystem.getWidth() / 2;
    const centerY = rendererSystem.getHeight() / 2;

    // Reset player position and state
    this.playerRotation = 0;

    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const playerBody = allBodies.find(
      body => body.id === this.playerShip!.physicsBodyId
    );

    if (playerBody) {
      physicsSystem.setPosition(playerBody, { x: centerX, y: centerY });
      physicsSystem.setRotation(playerBody, this.playerRotation);
      // Stop any movement
      physicsSystem.applyForce(playerBody, {
        x: -playerBody.velocity.x * 0.1,
        y: -playerBody.velocity.y * 0.1,
      });
    }
  }

  private wrapScreenPositions(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const width = rendererSystem.getWidth();
    const height = rendererSystem.getHeight();
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();

    // Wrap all our entities
    const allEntities = [
      this.playerShip,
      ...this.lasers.map(l => l.entity),
      ...this.asteroids.map(a => a.entity),
    ].filter(entity => entity !== null);

    allEntities.forEach(entity => {
      const body = allBodies.find(b => b.id === entity!.physicsBodyId);
      if (body) {
        this.wrapPhysicsBody(body, width, height, physicsSystem);
      }
    });
  }

  private wrapPhysicsBody(
    body: any,
    width: number,
    height: number,
    physicsSystem: any
  ): void {
    let newX = body.position.x;
    let newY = body.position.y;
    let wrapped = false;

    if (body.position.x < 0) {
      newX = width;
      wrapped = true;
    } else if (body.position.x > width) {
      newX = 0;
      wrapped = true;
    }

    if (body.position.y < 0) {
      newY = height;
      wrapped = true;
    } else if (body.position.y > height) {
      newY = 0;
      wrapped = true;
    }

    if (wrapped) {
      physicsSystem.setPosition(body, { x: newX, y: newY });
    }
  }

  // Public API methods
  public getScore(): number {
    return this.score;
  }

  public getLives(): number {
    return this.lives;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public restart(): void {
    if (!this.engine) return;

    // Remove all game entities
    [...this.lasers, ...this.asteroids].forEach(item => {
      this.engine!.removeEntity(item.entity.id);
    });

    if (this.playerShip) {
      this.engine.removeEntity(this.playerShip.id);
    }

    // Reset state
    this.lasers = [];
    this.asteroids = [];
    this.playerShip = null;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.playerRotation = 0;

    // Reinitialize
    this.setupGame();
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public destroy(): void {
    if (this.isDestroyed) return;

    if (this.engine) {
      // Clean up all entities
      [...this.lasers, ...this.asteroids].forEach(item => {
        this.engine!.removeEntity(item.entity.id);
      });

      if (this.playerShip) {
        this.engine.removeEntity(this.playerShip.id);
      }
    }

    // Clear state
    this.lasers = [];
    this.asteroids = [];
    this.playerShip = null;
    this.engine = null;
    this.isInitialized = false;
    this.isDestroyed = true;
    this.keys.clear();
  }
}
