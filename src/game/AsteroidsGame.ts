import type { Engine } from '../engine';
import type { IGameEngine } from './interfaces/IGameEngine';
import { GameEngineAdapter } from './adapters/GameEngineAdapter';
import {
  PlayerManager,
  LaserManager,
  AsteroidManager,
  CollisionManager,
  InputManager,
} from './managers';

/**
 * AsteroidsGame - Uses SOLID principles with separated concerns
 *
 * Single Responsibility: Only orchestrates game flow
 * Open/Closed: Open for extension through manager composition
 * Liskov Substitution: Uses interfaces for substitutability
 * Interface Segregation: Depends only on IGameEngine interface
 * Dependency Inversion: Depends on abstractions, not concretions
 */
export class AsteroidsGame {
  private static instance: AsteroidsGame | null = null;
  private isInitialized = false;
  private isDestroyed = false;

  // Managers - each handles a specific concern
  private gameEngine: IGameEngine | null = null;
  private playerManager: PlayerManager | null = null;
  private laserManager: LaserManager | null = null;
  private asteroidManager: AsteroidManager | null = null; private collisionManager: CollisionManager | null = null;
  private inputManager: InputManager | null = null;

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

    this.setupManagers(engine);
    this.setupGame();
    this.setupEventHandlers();
    this.isInitialized = true;

    console.log('Asteroids game initialized with SOLID architecture!');
  }

  private setupManagers(engine: Engine): void {
    // Create game engine adapter (Dependency Inversion Principle)
    this.gameEngine = new GameEngineAdapter(engine);    // Initialize managers with their single responsibilities
    this.playerManager = new PlayerManager(this.gameEngine);
    this.laserManager = new LaserManager(this.gameEngine);
    this.asteroidManager = new AsteroidManager(this.gameEngine);
    this.inputManager = new InputManager();// Collision manager orchestrates interactions between other managers
    this.collisionManager = new CollisionManager(
      this.playerManager,
      this.laserManager,
      this.asteroidManager
    );
  }
  private setupGame(): void {
    if (!this.gameEngine) return;

    // Configure physics for realistic space environment
    this.gameEngine.configurePhysics({
      // No gravity in space
      gravity: { x: 0, y: 0 },

      // World-level configuration for space physics
      world: {
        gravity: { x: 0, y: 0 },
        gravityScale: 0,
        enableSleeping: false, // Objects in space don't sleep
        constraintIterations: 2,
        positionIterations: 6,
        velocityIterations: 4,
        timing: {
          timeScale: 1.0, // Normal time flow
        }
      },

      // Default body properties for space objects
      defaultBodyProperties: {
        friction: 0, // No friction in space
        frictionStatic: 0, // No static friction
        frictionAir: 0, // No air resistance in space
        restitution: 1, // Perfect elastic collisions (conservation of energy)
        density: 0.001, // Low density for space objects
        sleepThreshold: Infinity, // Never sleep - objects keep moving in space
      },

      // Engine configuration for smooth space physics
      engine: {
        enableSleeping: false, // Disable sleeping for continuous motion
        positionIterations: 6, // Higher precision for collision detection
        velocityIterations: 4, // Good velocity resolution
        constraintIterations: 2, // Minimal constraints in space
        timing: {
          timeScale: 1.0,
        }
      }
    });    // Create initial game objects
    this.playerManager!.createPlayer();
    this.asteroidManager!.spawnInitialAsteroids();

    // Log initial camera setup
    const cameraSystem = this.gameEngine.getCameraSystem();
    const viewport = cameraSystem.getCamera().getViewport();
    console.log('Camera system initialized with viewport:', viewport.width, 'x', viewport.height);
  }
  private setupEventHandlers(): void {
    if (!this.gameEngine || !this.inputManager || !this.collisionManager)
      return;

    // Setup input handling
    this.gameEngine.onInput(event => {
      this.inputManager!.handleInputEvent(event);
    });

    // Setup collision handling
    this.gameEngine.onCollision(event => {
      this.collisionManager!.handleCollision(event);
    });

    // Note: Continuous firing is now handled in the game loop (handleInput method)
    // rather than using one-time action callbacks to avoid delay and interruption issues
  }
  private handleFireLaser(): void {
    if (!this.playerManager || !this.laserManager) return;

    const player = this.playerManager.getPlayer();
    if (!player) return;

    this.laserManager.fireLaser(
      player.position,
      this.playerManager.getRotation()
    );
  } public update(deltaTime: number): void {
    if (!this.isInitialized) return;

    this.handleInput(deltaTime);
    this.updateManagers(deltaTime);
    this.updateCamera();
    this.wrapScreenPositions();
    this.checkForNewWave();
  }
  private handleInput(deltaTime: number): void {
    if (!this.inputManager || !this.playerManager) return;

    // Handle rotation
    if (this.inputManager.isLeftPressed()) {
      const currentRotation = this.playerManager.getRotation();
      this.playerManager.setRotation(currentRotation - 0.003 * deltaTime);
    }
    if (this.inputManager.isRightPressed()) {
      const currentRotation = this.playerManager.getRotation();
      this.playerManager.setRotation(currentRotation + 0.003 * deltaTime);
    }

    // Handle thrust
    this.playerManager.setThrust(this.inputManager.isThrustPressed());

    // Handle continuous firing - check every frame if spacebar is held down
    if (this.inputManager.isFirePressed()) {
      this.handleFireLaser();
    }
  }
  private updateManagers(deltaTime: number): void {
    this.playerManager!.update(deltaTime);
    this.laserManager!.update(deltaTime);
  }
  private updateCamera(): void {
    if (!this.gameEngine || !this.playerManager) return;

    const player = this.playerManager.getPlayer();
    if (player) {
      // Make camera follow the player
      this.gameEngine.lookAt(player);

      // Log camera position for debugging
      const cameraSystem = this.gameEngine.getCameraSystem();
      const cameraPos = cameraSystem.getCamera().getPosition();
      if (Math.random() < 0.01) { // Log only occasionally to avoid spam
        console.log(`Camera following player at (${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)})`);
      }
    }
  }

  private wrapScreenPositions(): void {
    if (!this.gameEngine) return;

    const dimensions = this.gameEngine.getWorldDimensions();

    // Wrap player
    const player = this.playerManager!.getPlayer();
    if (player) {
      this.gameEngine.wrapEntityPosition(player, dimensions);
    }

    // Wrap lasers
    this.laserManager!.getAllLasers().forEach(laserData => {
      this.gameEngine!.wrapEntityPosition(laserData.entity, dimensions);
    });

    // Wrap asteroids
    this.asteroidManager!.getAllAsteroids().forEach(asteroidData => {
      this.gameEngine!.wrapEntityPosition(asteroidData.entity, dimensions);
    });
  }
  private checkForNewWave(): void {
    if (this.asteroidManager!.getAsteroidCount() === 0) {
      this.asteroidManager!.spawnAsteroidWave(0); // No score, just spawn next wave
    }
  }
  // Public API methods
  public getScore(): number {
    return 0; // No scoring system
  }
  public getLives(): number {
    return 1; // Player always has 1 life (no death)
  }

  public isGameOver(): boolean {
    return false; // No game over
  }
  public restart(): void {
    if (!this.isInitialized) return;

    // Reset all managers
    this.playerManager!.destroy();
    this.laserManager!.destroy();
    this.asteroidManager!.destroy();

    // Recreate initial state
    this.playerManager!.createPlayer();
    this.asteroidManager!.spawnInitialAsteroids();
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
  public destroy(): void {
    if (this.isDestroyed) return;

    // Clean up all managers
    this.playerManager?.destroy();
    this.laserManager?.destroy();
    this.asteroidManager?.destroy();
    this.inputManager?.destroy();

    // Clear references
    this.gameEngine = null;
    this.playerManager = null;
    this.laserManager = null;
    this.asteroidManager = null;
    this.collisionManager = null;
    this.inputManager = null;

    this.isInitialized = false;
    this.isDestroyed = true;
  }
}
