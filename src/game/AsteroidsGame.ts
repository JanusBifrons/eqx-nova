import type { Engine } from '../engine';
import type { Entity } from '../engine/entity';
import type { KeyboardInputEvent } from '../engine/input';

interface Vector2 {
  x: number;
  y: number;
}

interface Asteroid {
  entity: Entity;
  size: 'large' | 'medium' | 'small';
  velocity: Vector2;
}

interface Bullet {
  entity: Entity;
  velocity: Vector2;
  lifeTime: number;
}

/**
 * AsteroidsGame - Classic asteroids game implementation
 */
export class AsteroidsGame {
  private isInitialized = false;
  private engine: Engine | null = null;

  // Game entities
  private playerShip: Entity | null = null;
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];

  // Player state
  private playerVelocity: Vector2 = { x: 0, y: 0 };
  private playerRotation = 0;
  private playerThrust = false;

  // Input state
  private keys: Set<string> = new Set();

  // Game constants
  private readonly PLAYER_THRUST = 0.0003;
  private readonly PLAYER_ROTATION_SPEED = 0.003;
  private readonly PLAYER_MAX_SPEED = 0.4;
  private readonly PLAYER_FRICTION = 0.98;
  private readonly BULLET_SPEED = 0.6;
  private readonly BULLET_LIFETIME = 2000; // milliseconds
  private readonly ASTEROID_MIN_SPEED = 0.05;
  private readonly ASTEROID_MAX_SPEED = 0.15;

  // Game state
  private score = 0;
  private lives = 3;
  private gameOver = false;
  private lastBulletTime: number = 0;

  public initialize(engine: Engine): void {
    this.engine = engine;
    this.setupGame();
    this.setupInputHandlers();
    this.isInitialized = true;
    console.log('Asteroids game initialized!');
  }

  public update(deltaTime: number): void {
    if (!this.isInitialized || !this.engine || this.gameOver) return;

    this.handleInput(deltaTime);
    this.updatePlayer(deltaTime);
    this.updateBullets(deltaTime);
    this.updateAsteroids(deltaTime);
    this.checkCollisions();
    this.wrapScreenPositions();

    // Spawn new asteroids if none left
    if (this.asteroids.length === 0) {
      this.spawnAsteroidWave();
    }
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
    const centerY = rendererSystem.getHeight() / 2; // Create a triangular ship
    this.playerShip = this.engine.createRectangle({
      x: centerX,
      y: centerY,
      width: 20,
      height: 20,
      options: {
        color: 0x00ff00,
        isStatic: false,
      },
    });

    console.log('Player ship created at:', centerX, centerY);
  }

  private spawnInitialAsteroids(): void {
    // Start with 3 large asteroids
    for (let i = 0; i < 3; i++) {
      this.createRandomAsteroid('large');
    }
  }

  private spawnAsteroidWave(): void {
    // Increase difficulty by adding more asteroids
    const numAsteroids = Math.min(5 + Math.floor(this.score / 1000), 8);
    for (let i = 0; i < numAsteroids; i++) {
      this.createRandomAsteroid('large');
    }
  }

  private createRandomAsteroid(size: 'large' | 'medium' | 'small'): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const width = rendererSystem.getWidth();
    const height = rendererSystem.getHeight();

    // Spawn at random edge of screen
    let x, y;
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
    this.createAsteroid(size, x, y);
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

    const asteroidSize = sizeMap[size];
    const entity = this.engine.createCircle({
      x,
      y,
      radius: asteroidSize / 2,
      options: {
        color: 0x888888,
        isStatic: false,
      },
    });

    // Random velocity
    const speed =
      this.ASTEROID_MIN_SPEED +
      Math.random() * (this.ASTEROID_MAX_SPEED - this.ASTEROID_MIN_SPEED);
    const angle = Math.random() * Math.PI * 2;
    const velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };

    this.asteroids.push({
      entity,
      size,
      velocity,
    });
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
      this.fireBullet();
    }
  }

  private updatePlayer(deltaTime: number): void {
    if (!this.playerShip || !this.engine) return;

    // Apply thrust
    if (this.playerThrust) {
      const thrustX =
        Math.cos(this.playerRotation) * this.PLAYER_THRUST * deltaTime;
      const thrustY =
        Math.sin(this.playerRotation) * this.PLAYER_THRUST * deltaTime;

      this.playerVelocity.x += thrustX;
      this.playerVelocity.y += thrustY;
    }
    // Apply friction
    this.playerVelocity.x *= this.PLAYER_FRICTION;
    this.playerVelocity.y *= this.PLAYER_FRICTION;

    // Limit max speed
    const speed = Math.sqrt(
      this.playerVelocity.x ** 2 + this.playerVelocity.y ** 2
    );
    if (speed > this.PLAYER_MAX_SPEED) {
      this.playerVelocity.x =
        (this.playerVelocity.x / speed) * this.PLAYER_MAX_SPEED;
      this.playerVelocity.y =
        (this.playerVelocity.y / speed) * this.PLAYER_MAX_SPEED;
    }
    // Update position
    this.playerShip.position.x += this.playerVelocity.x * deltaTime;
    this.playerShip.position.y += this.playerVelocity.y * deltaTime;

    // Update physics body
    if (this.engine) {
      const physicsSystem = this.engine.getPhysicsSystem();
      const allBodies = physicsSystem.getAllBodies();
      const playerBody = allBodies.find(
        body => body.id === this.playerShip!.physicsBodyId
      );
      if (playerBody) {
        physicsSystem.setPosition(playerBody, this.playerShip.position);
        physicsSystem.setRotation(playerBody, this.playerRotation);
      }
    }
  }

  private fireBullet(): void {
    if (!this.playerShip || !this.engine) return;

    const now = performance.now();
    if (!this.lastBulletTime || now - this.lastBulletTime > 150) {
      const bulletX =
        this.playerShip.position.x + Math.cos(this.playerRotation) * 25;
      const bulletY =
        this.playerShip.position.y + Math.sin(this.playerRotation) * 25;
      const entity = this.engine.createCircle({
        x: bulletX,
        y: bulletY,
        radius: 2,
        options: {
          color: 0xffff00,
          isStatic: false,
        },
      });

      const bullet: Bullet = {
        entity,
        velocity: {
          x: Math.cos(this.playerRotation) * this.BULLET_SPEED,
          y: Math.sin(this.playerRotation) * this.BULLET_SPEED,
        },
        lifeTime: this.BULLET_LIFETIME,
      };

      this.bullets.push(bullet);
      this.lastBulletTime = now;
    }
  }

  private updateBullets(deltaTime: number): void {
    if (!this.engine) return;

    const bulletsToRemove: number[] = [];

    this.bullets.forEach((bullet, index) => {
      // Update position
      bullet.entity.position.x += bullet.velocity.x * deltaTime;
      bullet.entity.position.y += bullet.velocity.y * deltaTime;

      // Update physics body
      if (this.engine) {
        const physicsSystem = this.engine.getPhysicsSystem();
        const allBodies = physicsSystem.getAllBodies();
        const bulletBody = allBodies.find(
          body => body.id === bullet.entity.physicsBodyId
        );
        if (bulletBody) {
          physicsSystem.setPosition(bulletBody, bullet.entity.position);
        }
      }
      // Update lifetime
      bullet.lifeTime -= deltaTime;

      if (bullet.lifeTime <= 0) {
        bulletsToRemove.push(index);
      }
    });

    // Remove expired bullets
    bulletsToRemove.reverse().forEach(index => {
      const bullet = this.bullets[index];
      this.engine!.removeEntity(bullet.entity.id);
      this.bullets.splice(index, 1);
    });
  }

  private updateAsteroids(deltaTime: number): void {
    if (!this.engine) return;

    this.asteroids.forEach(asteroid => {
      // Update position
      asteroid.entity.position.x += asteroid.velocity.x * deltaTime;
      asteroid.entity.position.y += asteroid.velocity.y * deltaTime;

      // Update physics body
      if (this.engine) {
        const physicsSystem = this.engine.getPhysicsSystem();
        const allBodies = physicsSystem.getAllBodies();
        const asteroidBody = allBodies.find(
          body => body.id === asteroid.entity.physicsBodyId
        );
        if (asteroidBody) {
          physicsSystem.setPosition(asteroidBody, asteroid.entity.position);
        }
      }
    });
  }

  private checkCollisions(): void {
    if (!this.playerShip || !this.engine) return;

    const bulletsToRemove: number[] = [];
    const asteroidsToRemove: number[] = [];

    // Check bullet-asteroid collisions
    this.bullets.forEach((bullet, bulletIndex) => {
      this.asteroids.forEach((asteroid, asteroidIndex) => {
        const dx = bullet.entity.position.x - asteroid.entity.position.x;
        const dy = bullet.entity.position.y - asteroid.entity.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const bulletRadius = 2;
        const asteroidRadius =
          asteroid.size === 'large'
            ? 20
            : asteroid.size === 'medium'
              ? 12.5
              : 7.5;

        if (distance < bulletRadius + asteroidRadius) {
          bulletsToRemove.push(bulletIndex);
          asteroidsToRemove.push(asteroidIndex);

          // Add score based on asteroid size
          const points =
            asteroid.size === 'large'
              ? 20
              : asteroid.size === 'medium'
                ? 50
                : 100;
          this.score += points;

          this.breakAsteroid(asteroid);
        }
      });
    });

    // Check player-asteroid collisions
    this.asteroids.forEach(asteroid => {
      const dx = this.playerShip!.position.x - asteroid.entity.position.x;
      const dy = this.playerShip!.position.y - asteroid.entity.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const playerRadius = 10;
      const asteroidRadius =
        asteroid.size === 'large'
          ? 20
          : asteroid.size === 'medium'
            ? 12.5
            : 7.5;

      if (distance < playerRadius + asteroidRadius) {
        this.handlePlayerDeath();
      }
    });

    // Remove collided objects
    const uniqueBullets = [...new Set(bulletsToRemove)].sort((a, b) => b - a);
    const uniqueAsteroids = [...new Set(asteroidsToRemove)].sort(
      (a, b) => b - a
    );

    uniqueBullets.forEach(index => {
      if (index < this.bullets.length) {
        const bullet = this.bullets[index];
        this.engine!.removeEntity(bullet.entity.id);
        this.bullets.splice(index, 1);
      }
    });

    uniqueAsteroids.forEach(index => {
      if (index < this.asteroids.length) {
        const asteroid = this.asteroids[index];
        this.engine!.removeEntity(asteroid.entity.id);
        this.asteroids.splice(index, 1);
      }
    });
  }

  private breakAsteroid(asteroid: Asteroid): void {
    if (asteroid.size === 'large') {
      // Create 2 medium asteroids
      for (let i = 0; i < 2; i++) {
        this.createAsteroid(
          'medium',
          asteroid.entity.position.x,
          asteroid.entity.position.y
        );
      }
    } else if (asteroid.size === 'medium') {
      // Create 2 small asteroids
      for (let i = 0; i < 2; i++) {
        this.createAsteroid(
          'small',
          asteroid.entity.position.x,
          asteroid.entity.position.y
        );
      }
    }
    // Small asteroids just disappear
  }

  private handlePlayerDeath(): void {
    this.lives--;

    if (this.lives <= 0) {
      this.gameOver = true;
      console.log('Game Over! Final Score:', this.score);
    } else {
      this.respawnPlayer();
    }
  }

  private respawnPlayer(): void {
    if (!this.engine || !this.playerShip) return;

    const rendererSystem = this.engine.getRendererSystem();
    const centerX = rendererSystem.getWidth() / 2;
    const centerY = rendererSystem.getHeight() / 2;

    this.playerShip.position.x = centerX;
    this.playerShip.position.y = centerY;
    this.playerVelocity.x = 0;
    this.playerVelocity.y = 0;
    this.playerRotation = 0;

    // Update physics body
    if (this.engine) {
      const physicsSystem = this.engine.getPhysicsSystem();
      const allBodies = physicsSystem.getAllBodies();
      const playerBody = allBodies.find(
        body => body.id === this.playerShip!.physicsBodyId
      );
      if (playerBody) {
        physicsSystem.setPosition(playerBody, this.playerShip.position);
        physicsSystem.setRotation(playerBody, this.playerRotation);
      }
    }
  }

  private wrapScreenPositions(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const width = rendererSystem.getWidth();
    const height = rendererSystem.getHeight();

    // Wrap player
    if (this.playerShip) {
      this.wrapPosition(this.playerShip, width, height);
    }
    // Wrap bullets
    this.bullets.forEach(bullet => {
      this.wrapPosition(bullet.entity, width, height);
    });

    // Wrap asteroids
    this.asteroids.forEach(asteroid => {
      this.wrapPosition(asteroid.entity, width, height);
    });
  }

  private wrapPosition(entity: Entity, width: number, height: number): void {
    if (entity.position.x < 0) entity.position.x = width;

    if (entity.position.x > width) entity.position.x = 0;

    if (entity.position.y < 0) entity.position.y = height;

    if (entity.position.y > height) entity.position.y = 0;
  }

  // Public methods for UI
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
    if (this.engine) {
      // Clean up existing entities
      [...this.bullets, ...this.asteroids].forEach(item => {
        this.engine!.removeEntity(item.entity.id);
      });

      if (this.playerShip) {
        this.engine.removeEntity(this.playerShip.id);
      }
    }
    // Reset game state
    this.bullets = [];
    this.asteroids = [];
    this.playerShip = null;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.playerVelocity = { x: 0, y: 0 };
    this.playerRotation = 0;

    // Reinitialize
    this.setupGame();
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public destroy(): void {
    if (this.engine) {
      // Clean up all entities
      [...this.bullets, ...this.asteroids].forEach(item => {
        this.engine!.removeEntity(item.entity.id);
      });

      if (this.playerShip) {
        this.engine.removeEntity(this.playerShip.id);
      }
    }
    // Clear state
    this.bullets = [];
    this.asteroids = [];
    this.playerShip = null;
    this.engine = null;
    this.isInitialized = false;
    this.keys.clear();
  }
}
