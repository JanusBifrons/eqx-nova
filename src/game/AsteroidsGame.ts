import type { Engine } from '../engine';
import type { IGameEngine } from './interfaces/IGameEngine';
import type { MouseInputEvent } from '../engine/input';
import { GameEngineAdapter } from './adapters/GameEngineAdapter';
import { CompositeShipFactory } from './factories/CompositeShipFactory';
import {
  PlayerManager,
  LaserManager,
  AsteroidManager,
  CollisionManager,
  InputManager,
  AIManager,
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

  private asteroidManager: AsteroidManager | null = null;

  private collisionManager: CollisionManager | null = null;

  private inputManager: InputManager | null = null;

  private aiManager: AIManager | null = null;

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
    this.gameEngine = new GameEngineAdapter(engine); // Initialize managers with their single responsibilities
    this.playerManager = new PlayerManager(this.gameEngine);
    this.laserManager = new LaserManager(this.gameEngine);
    this.asteroidManager = new AsteroidManager(this.gameEngine);
    this.inputManager = new InputManager();
    this.aiManager = new AIManager(this.gameEngine);

    // Set up AI manager's laser firing callback
    this.aiManager.setFireLaserCallback(
      (position, rotation, velocity, sourceId) => {
        return this.laserManager!.fireLaser(
          position,
          rotation,
          velocity,
          'ai',
          sourceId
        );
      }
    );

    // Collision manager orchestrates interactions between other managers
    this.collisionManager = new CollisionManager(
      this.playerManager,
      this.laserManager,
      this.asteroidManager
    );

    // Connect AI manager to collision manager
    this.collisionManager.setAIManager(this.aiManager);
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
        },
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
        },
      },
    }); // Create initial game objects
    this.playerManager!.createPlayer();
    this.asteroidManager!.spawnInitialAsteroids();

    // Spawn AI fleet
    this.aiManager!.spawnAIFleet();

    // Log initial camera setup
    const cameraSystem = this.gameEngine.getCameraSystem();
    const viewport = cameraSystem.getCamera().getViewport();
    console.log(
      'Camera system initialized with viewport:',
      viewport.width,
      'x',
      viewport.height
    );
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
    }); // Setup mouse click handling for asteroid spawning
    // Use right-click for asteroid spawning to avoid conflicts with left-click dragging
    const engine = (this.gameEngine as any).engine; // Access underlying engine

    if (engine) {
      const inputSystem = engine.getInputSystem();
      inputSystem.addEventListener('mouse', (event: MouseInputEvent) => {
        if (event.action === 'down' && event.button === 'right') {
          this.handleMouseClick(event.position);
        }
      });
    }

    // Note: Continuous firing is now handled in the game loop (handleInput method)
    // rather than using one-time action callbacks to avoid delay and interruption issues
  }

  private handleFireLaser(): void {
    if (!this.playerManager || !this.laserManager) return;

    const compositeShip = this.playerManager.getCompositeShip();
    const player = this.playerManager.getPlayer();

    if (compositeShip) {
      // Handle composite ship firing
      const shipPosition = compositeShip.centerPosition;
      const shipRotation = this.playerManager.getRotation();

      // Get ship velocity for inheritance
      const shipVelocity = compositeShip.velocity;

      this.laserManager.fireLaser(
        shipPosition,
        shipRotation,
        shipVelocity,
        'player'
      );
    } else if (player) {
      // Handle traditional player firing
      const shipPosition = player.position;
      const shipRotation = this.playerManager.getRotation();

      // Get ship velocity for inheritance
      const shipVelocity = this.gameEngine?.getEntityVelocity(player) || {
        x: 0,
        y: 0,
      };

      this.laserManager.fireLaser(
        shipPosition,
        shipRotation,
        shipVelocity,
        'player'
      );
    }
  }

  public update(deltaTime: number): void {
    if (!this.isInitialized) return;

    this.handleInput(deltaTime);
    this.updateMouse(); // Handle mouse cursor dot and interactions
    this.updateManagers(deltaTime);
    this.updateCamera();
    this.updateMouseConstraintTransform(); // Update mouse constraint after camera changes
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

    // Debug controls for testing damage system
    if (this.inputManager.isKeyPressed('x')) {
      this.debugDamagePlayerShip();
    }

    // Debug controls for testing AI ship damage system
    if (this.inputManager.isKeyPressed('z')) {
      console.log('🔧 Z key pressed - testing AI ship damage');
      this.debugDamageAIShip();
    }

    // Debug controls for testing ship connectivity
    if (this.inputManager.isKeyPressed('t')) {
      console.log('🔧 T key pressed - testing ship connectivity');
      this.debugTestShipConnectivity();
    }

    // Debug controls for manual ship breakage testing
    if (this.inputManager.isKeyPressed('b')) {
      console.log('🔧 B key pressed - manually breaking first AI ship');
      this.debugManualBreakShip();
    }

    // Debug controls for manual connectivity testing
    if (this.inputManager.isKeyPressed('c')) {
      console.log('🔧 C key pressed - testing manual connectivity');
      this.debugTestManualConnectivity();
    }
  }

  private updateManagers(deltaTime: number): void {
    this.playerManager!.update(deltaTime);
    this.laserManager!.update(deltaTime);

    // Update AI ships
    this.aiManager!.update(deltaTime);

    // Set player as target for AI ships
    const playerShip = this.playerManager!.getCompositeShip();

    if (playerShip) {
      this.aiManager!.setPlayerTarget(playerShip);
    }
    // Maintain asteroid density in the expanded game world
    this.asteroidManager!.maintainAsteroidDensity(40);
  }

  private updateCamera(): void {
    if (!this.gameEngine || !this.playerManager) return;

    const compositeShip = this.playerManager.getCompositeShip();

    if (compositeShip) {
      // For composite ships, track the center position
      const centerPos = compositeShip.centerPosition;
      this.gameEngine.lookAt(centerPos);

      // Log camera position for debugging
      const cameraSystem = this.gameEngine.getCameraSystem();
      const cameraPos = cameraSystem.getCamera().getPosition();

      if (Math.random() < 0.01) {
        // Log only occasionally to avoid spam
        console.log(
          `Camera following composite ship at (${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)})`
        );
      }
    } else {
      // Fall back to traditional player tracking
      const player = this.playerManager.getPlayer();

      if (player) {
        // Make camera follow the player
        this.gameEngine.lookAt(player);

        // Log camera position for debugging
        const cameraSystem = this.gameEngine.getCameraSystem();
        const cameraPos = cameraSystem.getCamera().getPosition();

        if (Math.random() < 0.01) {
          // Log only occasionally to avoid spam
          console.log(
            `Camera following player at (${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)})`
          );
        }
      }
    }
  }

  private wrapScreenPositions(): void {
    if (!this.gameEngine) return;

    const dimensions = this.gameEngine.getWorldDimensions();

    // Wrap player (traditional or composite)
    const compositeShip = this.playerManager!.getCompositeShip();

    if (compositeShip) {
      // For composite ships, wrap all parts
      const parts = compositeShip.parts;
      parts.forEach(part => {
        this.gameEngine!.wrapEntityPosition(part.entity, dimensions);
      });
    } else {
      // Traditional player wrapping
      const player = this.playerManager!.getPlayer();

      if (player) {
        this.gameEngine.wrapEntityPosition(player, dimensions);
      }
    }
    // Wrap AI ships
    this.aiManager!.getAllAIShips().forEach(aiShip => {
      if (aiShip.isActive) {
        const parts = aiShip.ship.parts;
        parts.forEach(part => {
          this.gameEngine!.wrapEntityPosition(part.entity, dimensions);
        });
      }
    });

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
    this.aiManager!.destroy();

    // Recreate initial state
    this.playerManager!.createPlayer();
    this.asteroidManager!.spawnInitialAsteroids();
    this.aiManager!.spawnAIFleet();
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
    this.aiManager?.destroy();

    // Clear references
    this.gameEngine = null;
    this.playerManager = null;
    this.laserManager = null;
    this.asteroidManager = null;
    this.collisionManager = null;
    this.inputManager = null;
    this.aiManager = null;

    this.isInitialized = false;
    this.isDestroyed = true;
  }

  private updateMouse(): void {
    if (!this.gameEngine) return;

    // Get current mouse position in screen space
    const screenMousePos = this.gameEngine.getMousePosition();

    if (!screenMousePos) {
      // No mouse position available
      return;
    }

    // Convert to world space using camera system
    // const cameraSystem = this.gameEngine.getCameraSystem();
    // const worldPosition = cameraSystem.screenToWorld(screenMousePos);

    // Cursor dot removed - hover indicators are sufficient for visual feedback
    // We could add mouse-based interactions here if needed in the future
  }

  private handleMouseClick(screenPosition: { x: number; y: number }): void {
    if (!this.gameEngine || !this.asteroidManager) return;

    // Convert screen position to world position using camera system
    const cameraSystem = this.gameEngine.getCameraSystem();
    const worldPosition = cameraSystem.screenToWorld(screenPosition);

    // Spawn an asteroid at the click location
    this.asteroidManager.createAsteroid(
      'medium',
      worldPosition.x,
      worldPosition.y
    );
  }

  private updateMouseConstraintTransform(): void {
    if (!this.gameEngine) return;

    // Access the underlying engine to get the mouse interaction system
    const engine = (this.gameEngine as any).engine; // Access underlying Engine instance

    if (engine) {
      const mouseInteractionSystem = engine.mouseInteractionSystem;

      if (mouseInteractionSystem) {
        // Notify the mouse interaction system that the camera has been updated
        mouseInteractionSystem.onCameraUpdate();
      }
    }
  }

  private debugDamagePlayerShip(): void {
    if (!this.playerManager) return;

    const compositeShip = this.playerManager.getCompositeShip();
    if (compositeShip) {
      // Find the first active part and damage it
      const activeParts = compositeShip.getActiveParts();
      if (activeParts.length > 0) {
        const targetPart = activeParts[0];
        const damageAmount = 25; // Test damage amount
        console.log(
          '🔧 DEBUG: Manually damaging player ship part:',
          targetPart.partId
        );
        const wasDestroyed = compositeShip.takeDamageAtPart(
          targetPart.partId,
          damageAmount
        );
        console.log(
          '🔧 DEBUG: Part destroyed:',
          wasDestroyed,
          'Active parts remaining:',
          activeParts.length - (wasDestroyed ? 1 : 0)
        );
      } else {
        console.log('🔧 DEBUG: No active parts to damage');
      }
    } else {
      console.log('🔧 DEBUG: No composite ship to damage');
    }
  }

  private debugDamageAIShip(): void {
    if (!this.aiManager) return;

    const aiShips = this.aiManager.getAllAIShips();
    if (aiShips.length > 0) {
      // Find the first active AI ship and damage it
      const targetShip = aiShips.find(ship => ship.isActive);
      if (targetShip) {
        const activeParts = targetShip.ship.getActiveParts();
        if (activeParts.length > 0) {
          const targetPart = activeParts[0];
          const damageAmount = 30; // Test damage amount
          console.log(
            '🔧 DEBUG: Manually damaging AI ship part:',
            targetPart.partId,
            'from ship:',
            targetShip.id
          );
          const wasDestroyed = targetShip.ship.takeDamageAtPart(
            targetPart.partId,
            damageAmount
          );
          console.log(
            '🔧 DEBUG: AI part destroyed:',
            wasDestroyed,
            'Active parts remaining:',
            activeParts.length - (wasDestroyed ? 1 : 0)
          );
        } else {
          console.log('🔧 DEBUG: No active parts to damage on AI ship');
        }
      } else {
        console.log('🔧 DEBUG: No active AI ships to damage');
      }
    } else {
      console.log('🔧 DEBUG: No AI ships available');
    }
  }

  /**
   * Debug function to test grid-based ship connectivity
   */
  private debugTestShipConnectivity(): void {
    if (!this.aiManager) return;

    const aiShips = this.aiManager.getAllAIShips();
    console.log(`🔧 Testing connectivity for ${aiShips.length} AI ships:`);

    aiShips.forEach((aiShip, index) => {
      const ship = aiShip.ship;
      const activeParts = ship.getActiveParts();

      console.log(`\n🛸 Ship ${index + 1} (${aiShip.faction}):`);
      console.log(`  📊 Parts: ${activeParts.length} active`);

      // Test connectivity by checking each part's connections
      let totalConnections = 0;
      activeParts.forEach(part => {
        const connections = part.connectedParts.size;
        totalConnections += connections;
        if (connections === 0 && activeParts.length > 1) {
          console.log(
            `  ⚠️  Part ${part.partId} has no connections (isolated!)`
          );
        }
      });

      console.log(
        `  🔗 Total connections: ${totalConnections / 2} (bidirectional pairs)`
      );

      // Test grid positioning
      let gridAligned = 0;
      const partSize = activeParts.length > 0 ? activeParts[0].size : 20; // Get actual part size
      activeParts.forEach(part => {
        const pos = part.relativePosition;
        const isAligned = pos.x % partSize === 0 && pos.y % partSize === 0;
        if (isAligned) gridAligned++;
      });

      console.log(
        `  📐 Grid alignment: ${gridAligned}/${activeParts.length} parts properly aligned (${partSize}px grid)`
      );

      if (gridAligned !== activeParts.length) {
        console.warn(`  ❌ Ship ${index + 1} has non-grid-aligned parts!`);
      } else {
        console.log(`  ✅ Ship ${index + 1} is properly grid-aligned`);
      }
    });
  }

  private debugManualBreakShip(): void {
    console.log('🔧 Manual ship breakage test');

    const aiShips = this.aiManager?.getAllAIShips() || [];
    if (aiShips.length === 0) {
      console.log('❌ No AI ships found for breakage test');
      return;
    }

    const firstShip = aiShips[0];
    const compositeShip = firstShip.ship;
    const activeParts = compositeShip.getActiveParts();

    if (activeParts.length === 0) {
      console.log('❌ No active parts found in first AI ship');
      return;
    }

    // Destroy a part in the middle to test connectivity breakage
    const middleIndex = Math.floor(activeParts.length / 2);
    const partToDestroy = activeParts[middleIndex];

    console.log(
      `🔧 Manually destroying part ${partToDestroy.partId} from ship with ${activeParts.length} parts`
    );
    compositeShip.destroyPart(partToDestroy.partId);
  }

  private debugTestManualConnectivity(): void {
    console.log('🔧 Manual connectivity test');
    
    // Create a simple 3-part horizontal ship manually
    const engine = (this.gameEngine as any).engine;
    const testPositions = [
      { x: -20, y: 0 }, // Left part
      { x: 0, y: 0 },   // Center part  
      { x: 20, y: 0 },  // Right part
    ];
    
    console.log('🔧 Creating test ship with positions:', testPositions);
    
    const testShip = CompositeShipFactory.createCustomShip(
      engine,
      { x: 100, y: 100 }, // World position
      testPositions,
      20, // Part size
      'test_ship',
      0xff0000, // Red color
      3
    );
    
    const activeParts = testShip.getActiveParts();
    console.log('🔧 Test ship created with parts:');
    activeParts.forEach((part: any, i: number) => {
      console.log(`  Part ${i}: relative pos (${part.relativePosition.x}, ${part.relativePosition.y}), size: ${part.size}`);
      console.log(`  Part ${i}: connections: ${Array.from(part.connectedParts).join(', ') || 'none'}`);
    });
  }
}
