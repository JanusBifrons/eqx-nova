import type { Engine } from '../engine';
import type { IGameEngine } from './interfaces/IGameEngine';
import type { MouseInputEvent, WheelInputEvent } from '../engine/input';
import { GameEngineAdapter } from './adapters/GameEngineAdapter';
import {
  PlayerManager,
  LaserManager,
  AsteroidManager,
  CollisionManager,
  InputManager,
  AIManager,
  DebrisManager,
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

  private debrisManager: DebrisManager | null = null;

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
    console.log('🔧 Debug mode is DISABLED by default due to Matter.js issues');
    console.log('🔧 Debug controls available:');
    console.log('   P - Toggle physics debug mode (may cause stack overflow)');
    console.log('   X - Damage player ship');
    console.log('   Z - Damage AI ship');
    console.log('   T - Test ship connectivity');
    console.log('   B - Break AI ship');
    console.log('   F - Flash random block on player ship');
    console.log('   G - Flash all blocks on player ship');
    console.log('   C - Test manual connectivity');

    // Debug mode disabled by default due to Matter.js stack overflow issue
    // this.initializeDebugMode();
  }

  private setupManagers(engine: Engine): void {
    // Create game engine adapter (Dependency Inversion Principle)
    this.gameEngine = new GameEngineAdapter(engine); // Initialize managers with their single responsibilities
    this.playerManager = new PlayerManager(this.gameEngine);
    this.laserManager = new LaserManager(this.gameEngine);
    this.asteroidManager = new AsteroidManager(this.gameEngine);
    this.inputManager = new InputManager();
    this.aiManager = new AIManager(this.gameEngine);

    // Initialize debris manager
    this.debrisManager = new DebrisManager(
      this.gameEngine.getPhysicsSystem(),
      this.gameEngine.getRendererSystem()
    );

    // Connect debris manager to player manager
    this.playerManager.setDebrisManager(this.debrisManager);

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

      // Handle flash effects for individual ship components and debris
      this.handleFlashEffects(event);
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

      // Handle mouse wheel for camera zoom
      inputSystem.addEventListener('wheel', (event: WheelInputEvent) => {
        this.handleWheelZoom(event);
      });
    }

    // Note: Continuous firing is now handled in the game loop (handleInput method)
    // rather than using one-time action callbacks to avoid delay and interruption issues
  }

  private handleFireLaser(): void {
    if (!this.playerManager || !this.laserManager) return;

    const modularShip = this.playerManager.getModularShip();
    const player = this.playerManager.getPlayer();

    if (modularShip) {
      // Handle modular ship firing using weapon system
      const shipVelocity = modularShip.velocity;

      // Check if ship can fire weapons (not broken apart and cooldown ready)
      if (modularShip.canFireWeapons && modularShip.canFireWeapons()) {
        // Get firing positions for all weapon blocks
        const firingPositions = modularShip.getWeaponFiringPositions
          ? modularShip.getWeaponFiringPositions()
          : [];

        let firedCount = 0;
        // Fire from each weapon block
        console.log(
          `🔫 Attempting to fire from ${firingPositions.length} weapon positions`
        );
        for (const weaponData of firingPositions) {
          console.log(
            `🔫 Firing laser at position (${weaponData.position.x.toFixed(1)}, ${weaponData.position.y.toFixed(1)}) with rotation ${weaponData.rotation.toFixed(3)}`
          );
          const success = this.laserManager!.fireLaser(
            weaponData.position,
            weaponData.rotation,
            shipVelocity,
            'player',
            `modular_ship_${modularShip.id}` // Provide sourceId to bypass global cooldown
          );
          console.log(
            `🔫 Laser fire result: ${success ? 'SUCCESS' : 'FAILED'}`
          );
          if (success) {
            firedCount++;
          }
        }
        console.log(
          `🔫 Total successful fires: ${firedCount} out of ${firingPositions.length} attempts`
        );

        // Record that weapons have fired (set cooldown)
        if (firedCount > 0 && modularShip.recordWeaponsFired) {
          modularShip.recordWeaponsFired();

          if (Math.random() < 0.2) {
            // 20% chance to log
            console.log(`🔫 Fired ${firedCount} lasers from weapon blocks`);
          }
        }
      }
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

  private handleInput(_deltaTime: number): void {
    if (!this.inputManager || !this.playerManager) return;

    // Handle rotation using angular velocity (physics-based)
    let angularVelocity = 0;
    if (this.inputManager.isLeftPressed()) {
      angularVelocity = -0.05; // Rotate counter-clockwise (increased for visibility)
    }
    if (this.inputManager.isRightPressed()) {
      angularVelocity = 0.05; // Rotate clockwise (increased for visibility)
    }
    this.playerManager.setRotation(angularVelocity);

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

    // Debug controls for flash effects
    if (this.inputManager.isKeyPressed('f')) {
      console.log('🔧 F key pressed - triggering random block flash');
      this.debugTriggerRandomFlash();
    }

    if (this.inputManager.isKeyPressed('g')) {
      console.log('🔧 G key pressed - triggering all blocks flash');
      this.debugTriggerAllBlocksFlash();
    }

    // Debug controls for physics visualization
    if (
      this.inputManager.isKeyPressed('p') ||
      this.inputManager.isKeyPressed('P')
    ) {
      console.log('🔧 P key detected - toggling physics debug mode');
      this.togglePhysicsDebugMode();
    }
  }

  private updateManagers(deltaTime: number): void {
    this.playerManager!.update(deltaTime);
    this.laserManager!.update(deltaTime);

    // Update AI ships
    this.aiManager!.update(deltaTime);

    // Set player as target for AI ships
    const playerShip = this.playerManager!.getModularShip();

    if (playerShip) {
      this.aiManager!.setPlayerTarget(playerShip);
    }
    // Maintain asteroid density in the expanded game world
    this.asteroidManager!.maintainAsteroidDensity(40);
  }

  private updateCamera(): void {
    if (!this.gameEngine || !this.playerManager) return;

    const modularShip = this.playerManager.getModularShip();

    if (modularShip) {
      // For modular ships, track the center position
      const centerPos = modularShip.position;
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

    // Wrap player (traditional or modular)
    const modularShip = this.playerManager!.getModularShip();

    if (modularShip) {
      // For modular ships, wrap all components
      const components = modularShip.structure.components;
      components.forEach((component: any) => {
        this.gameEngine!.wrapEntityPosition(component.entity, dimensions);
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
        // Handle both old ship format (parts) and new modular ship format (structure.components)
        if (aiShip.ship.parts) {
          // Old ship format
          aiShip.ship.parts.forEach((part: any) => {
            this.gameEngine!.wrapEntityPosition(part.entity, dimensions);
          });
        } else if (aiShip.ship.structure?.components) {
          // New modular ship format
          aiShip.ship.structure.components.forEach((component: any) => {
            this.gameEngine!.wrapEntityPosition(component.entity, dimensions);
          });
        }
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

  public getDebrisManager(): DebrisManager | null {
    return this.debrisManager;
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
    this.debrisManager?.destroy();

    // Clear references
    this.gameEngine = null;
    this.playerManager = null;
    this.laserManager = null;
    this.asteroidManager = null;
    this.collisionManager = null;
    this.inputManager = null;
    this.aiManager = null;
    this.debrisManager = null;

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

  private handleWheelZoom(event: WheelInputEvent): void {
    if (!this.gameEngine) return;

    const cameraSystem = this.gameEngine.getCameraSystem();
    const camera = cameraSystem.getCamera();
    const currentZoom = camera.getZoom();

    // Calculate zoom change - normalize deltaY and apply sensitivity
    // Typical deltaY values range from -100 to 100, we want smaller changes
    const zoomSensitivity = 0.001; // Reduced sensitivity for smoother zoom
    const zoomDelta = -event.deltaY * zoomSensitivity; // Negative for natural feel (scroll up = zoom in)

    // Calculate new zoom with limits
    const minZoom = 0.1;
    const maxZoom = 5.0;
    const newZoom = Math.max(
      minZoom,
      Math.min(maxZoom, currentZoom + zoomDelta)
    );

    // Apply the new zoom
    camera.setZoom(newZoom);
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

    const modularShip = this.playerManager.getModularShip();

    if (modularShip) {
      // Find the first active component and damage it
      const activeComponents = modularShip.structure.components.filter(
        c => !c.isDestroyed
      );

      if (activeComponents.length > 0) {
        const targetComponent = activeComponents[0];
        const damageAmount = 15; // Test damage amount (reduced from 25)
        console.log(
          '🔧 DEBUG: Manually damaging player ship component:',
          targetComponent.id
        );
        const wasDestroyed = modularShip.takeDamageAtComponent(
          targetComponent.id,
          damageAmount
        );
        console.log(
          '🔧 DEBUG: Component destroyed:',
          wasDestroyed,
          'Active components remaining:',
          activeComponents.length - (wasDestroyed ? 1 : 0)
        );
      } else {
        console.log('🔧 DEBUG: No active components to damage');
      }
    } else {
      console.log('🔧 DEBUG: No modular ship to damage');
    }
  }

  private debugDamageAIShip(): void {
    if (!this.aiManager) return;

    const aiShips = this.aiManager.getAllAIShips();

    if (aiShips.length > 0) {
      // Try to damage modular AI ships first
      const modularShips = this.aiManager.getAllModularAIShips();
      if (modularShips.length > 0) {
        const modularShip = modularShips[0];
        const damageAmount = 30;

        console.log('🔧 DEBUG: Manually damaging modular AI ship');

        // Try damaging by part index (first block)
        const wasDestroyed = modularShip.takeDamageAtPartIndex(0, damageAmount);

        console.log(
          '🔧 DEBUG: Modular AI ship first component damaged:',
          wasDestroyed ? 'destroyed' : 'damaged'
        );
        return;
      }

      // Fallback to old ship format
      const targetShip = aiShips.find(ship => ship.isActive);

      if (targetShip) {
        const activeParts = targetShip.ship.getActiveParts?.();

        if (activeParts && activeParts.length > 0) {
          const targetPart = activeParts[0];
          const damageAmount = 20; // Test damage amount (reduced from 30)
          console.log(
            '🔧 DEBUG: Manually damaging AI ship part:',
            targetPart.partId,
            'from ship:',
            targetShip.id
          );
          const wasDestroyed = targetShip.ship.takeDamageAtPart?.(
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
      activeParts.forEach((part: any) => {
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
      activeParts.forEach((part: any) => {
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

  // Debug function removed - was using old CompositeShipFactory
  private debugTestManualConnectivity(): void {
    console.log(
      '🔧 Manual connectivity test disabled - old CompositeShip system removed'
    );
  }

  // DISABLED - Debug mode causes stack overflow in Matter.js
  /*
  private initializeDebugMode(): void {
    console.log('🔧 Initializing debug mode by default...');

    // Wait a bit for the renderer to be fully initialized
    setTimeout(() => {
      if (!this.gameEngine) {
        console.log('❌ gameEngine not available for debug initialization');
        return;
      }

      const physicsSystem = this.gameEngine.getPhysicsSystem();
      const rendererSystem = this.gameEngine.getRendererSystem();

      if (!physicsSystem || !rendererSystem) {
        console.log(
          '❌ Physics or renderer system not available for debug initialization'
        );
        return;
      }

      // Enable debug mode
      this.setPixiVisibility(false);

      const mainCanvas = rendererSystem.getCanvas();
      if (mainCanvas) {
        this.createDebugCanvasOverlay(mainCanvas, physicsSystem);
        console.log('🔧 Physics debug visualization enabled by default');
        console.log('🔧 GREEN BORDER indicates debug mode is active');
        console.log('🔧 Press P to toggle debug mode on/off');
      }
    }, 500); // Give the renderer time to initialize
  }
  */

  private togglePhysicsDebugMode(): void {
    console.log('🔧 togglePhysicsDebugMode called');
    console.log(
      '⚠️ Debug mode temporarily disabled due to Matter.js stack overflow issue'
    );
    console.log('🔧 Skipping debug mode toggle to prevent crash');
    return;

    // DISABLED CODE BELOW - CAUSES STACK OVERFLOW
    /*
    if (!this.gameEngine) {
      console.log('❌ gameEngine is null');
      return;
    }

    const physicsSystem = this.gameEngine.getPhysicsSystem();
    const rendererSystem = this.gameEngine.getRendererSystem();

    console.log('🔧 physicsSystem:', physicsSystem ? 'found' : 'null');
    console.log('🔧 rendererSystem:', rendererSystem ? 'found' : 'null');

    if (!physicsSystem || !rendererSystem) {
      console.log('❌ Physics or renderer system not available');
      return;
    }

    const currentDebugMode = physicsSystem.getDebugMode();
    const newDebugMode = !currentDebugMode;

    console.log(
      `🔧 Current debug mode: ${currentDebugMode}, switching to: ${newDebugMode}`
    );

    physicsSystem.setDebugMode(newDebugMode);
    */

    // ALL DEBUG FUNCTIONALITY DISABLED TO PREVENT STACK OVERFLOW
    /*
    if (newDebugMode) {
      // Hide or make PixiJS rendering semi-transparent to see debug overlay
      this.setPixiVisibility(false);

      // Get the main canvas and create a debug overlay
      const mainCanvas = rendererSystem.getCanvas();
      if (mainCanvas) {
        this.createDebugCanvasOverlay(mainCanvas, physicsSystem);
        console.log(
          '🔧 Physics debug visualization enabled - MatterJS bodies are now visible'
        );
        console.log(
          '🔧 PixiJS rendering dimmed to show physics wireframes clearly'
        );
        console.log('🔧 GREEN BORDER indicates debug mode is active');
        console.log('🔧 White wireframes = actual collision boundaries');
        console.log('🔧 Green lines = velocity vectors');
        console.log('🔧 Red dots = collision points');
        console.log('🔧 Press P again to disable debug mode');
      }
    } else {
      // Restore PixiJS rendering
      this.setPixiVisibility(true);
      this.removeDebugCanvasOverlay();
      console.log('🔧 Physics debug visualization disabled');
      console.log('🔧 PixiJS rendering restored');
    }
    */
  }

  // DISABLED - Debug functionality not working
  // private debugCanvasOverlay: HTMLCanvasElement | null = null;

  // DISABLED - Debug functionality not working
  /*
  private createDebugCanvasOverlay(
    mainCanvas: HTMLCanvasElement,
    physicsSystem: any
  ): void {
    // Remove existing overlay if any
    this.removeDebugCanvasOverlay();

    // Create a new canvas for debug rendering
    this.debugCanvasOverlay = document.createElement('canvas');
    this.debugCanvasOverlay.width = mainCanvas.width;
    this.debugCanvasOverlay.height = mainCanvas.height;

    // Copy all positioning styles from the main canvas
    const mainCanvasStyle = window.getComputedStyle(mainCanvas);
    this.debugCanvasOverlay.style.position = 'absolute';
    this.debugCanvasOverlay.style.top = mainCanvas.offsetTop + 'px';
    this.debugCanvasOverlay.style.left = mainCanvas.offsetLeft + 'px';
    this.debugCanvasOverlay.style.width = mainCanvasStyle.width;
    this.debugCanvasOverlay.style.height = mainCanvasStyle.height;

    this.debugCanvasOverlay.style.pointerEvents = 'none'; // Don't intercept mouse events
    this.debugCanvasOverlay.style.zIndex = '1000'; // Above main canvas
    this.debugCanvasOverlay.style.border = '3px solid #00ff00'; // Green border to indicate debug mode
    this.debugCanvasOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; // Dark background for contrast
    this.debugCanvasOverlay.id = 'physics-debug-overlay'; // For easy identification

    console.log(
      '🔧 Main canvas position:',
      mainCanvas.offsetTop,
      mainCanvas.offsetLeft
    );
    console.log(
      '🔧 Main canvas size:',
      mainCanvas.width,
      'x',
      mainCanvas.height
    );
    console.log(
      '🔧 Main canvas computed style:',
      mainCanvasStyle.position,
      mainCanvasStyle.top,
      mainCanvasStyle.left
    );

    // Add to the same parent as the main canvas for better positioning
    if (mainCanvas.parentElement) {
      mainCanvas.parentElement.appendChild(this.debugCanvasOverlay);
      console.log('🔧 Debug canvas added to main canvas parent');
    } else {
      // Fallback to document body
      document.body.appendChild(this.debugCanvasOverlay);
      console.log('🔧 Debug canvas added to document body (fallback)');
    }

    // Initialize debug rendering on the overlay canvas
    physicsSystem.renderDebugBodies(this.debugCanvasOverlay);
  }

  private removeDebugCanvasOverlay(): void {
    if (this.debugCanvasOverlay && this.debugCanvasOverlay.parentElement) {
      this.debugCanvasOverlay.parentElement.removeChild(
        this.debugCanvasOverlay
      );
      this.debugCanvasOverlay = null;
    }
  }

  private setPixiVisibility(visible: boolean): void {
    if (!this.gameEngine) return;

    const rendererSystem = this.gameEngine.getRendererSystem();
    if (!rendererSystem) return;

    const canvas = rendererSystem.getCanvas();
    if (!canvas) return;

    if (visible) {
      // Restore normal PixiJS rendering
      canvas.style.opacity = '1';
      canvas.style.display = 'block';
    } else {
      // Hide PixiJS rendering to show debug overlay clearly
      canvas.style.opacity = '0.1'; // Very faint so we can still see the layout
      // Alternatively, completely hide: canvas.style.display = 'none';
    }
  }
  */

  /**
   * Handle flash effects when objects collide
   */
  private handleFlashEffects(event: any): void {
    // Check if the collision involves the player ship
    if (this.playerManager && this.playerManager.getModularShip()) {
      const playerShip = this.playerManager.getModularShip();

      // Check if either body in the collision belongs to the player ship
      const playerBodyId = playerShip?.physicsBodyId;

      let hitPartIndex = -1;
      let isPlayerShipHit = false;

      if (playerBodyId && event.bodyA?.id === playerBodyId) {
        // Player ship is bodyA
        isPlayerShipHit = true;
        hitPartIndex = event.partInfoA?.partIndex ?? -1;
        const componentId = event.partInfoA?.componentId;
        console.log(
          `⚡ Player ship (bodyA) collision - part index: ${hitPartIndex}, componentId: ${componentId}`
        );
      } else if (playerBodyId && event.bodyB?.id === playerBodyId) {
        // Player ship is bodyB
        isPlayerShipHit = true;
        hitPartIndex = event.partInfoB?.partIndex ?? -1;
        const componentId = event.partInfoB?.componentId;
        console.log(
          `⚡ Player ship (bodyB) collision - part index: ${hitPartIndex}, componentId: ${componentId}`
        );
      }

      if (isPlayerShipHit) {
        // Cast to SimpleDebugShip to access flash methods
        const simpleShip = playerShip as any;

        if (hitPartIndex >= 0 && simpleShip.triggerBlockFlash) {
          // Matter.js compound bodies have the main body as parts[0], so actual parts start at index 1
          // We need to subtract 1 to get the correct visual block index
          const visualBlockIndex = hitPartIndex - 1;

          if (visualBlockIndex >= 0) {
            console.log(
              `⚡ Physics part ${hitPartIndex} -> Visual block ${visualBlockIndex} - Flashing correct block!`
            );
            simpleShip.triggerBlockFlash(visualBlockIndex);
          } else {
            console.log(
              `⚡ Hit main compound body (partIndex: ${hitPartIndex}), flashing random block`
            );
            simpleShip.triggerRandomBlockFlash();
          }
        } else if (simpleShip.triggerRandomBlockFlash) {
          // Fallback to random block if we can't determine the specific part
          console.log('⚡ Could not determine hit part, flashing random block');
          simpleShip.triggerRandomBlockFlash();
        }
      }
    }

    // Check if the debris manager has any debris that should flash
    if (this.debrisManager) {
      // For debris pieces, we could implement flash effects here
      // This would require extending the debris system to support individual piece flashing
      console.log(
        '💥 Collision detected - debris flash effects could be implemented here'
      );
    }
  }

  private debugTriggerRandomFlash(): void {
    console.log('🔧 Triggering random block flash on player ship');

    if (!this.playerManager) {
      console.log('❌ No player manager found');
      return;
    }

    const playerShip = this.playerManager.getModularShip();
    if (!playerShip) {
      console.log('❌ No player ship found');
      return;
    }

    // Cast to SimpleDebugShip to access flash methods
    const simpleShip = playerShip as any;
    if (simpleShip.triggerRandomBlockFlash) {
      simpleShip.triggerRandomBlockFlash();
      console.log('⚡ Random block flash triggered!');
    } else {
      console.log('❌ Flash method not available on this ship type');
    }
  }

  private debugTriggerAllBlocksFlash(): void {
    console.log('🔧 Triggering flash on all blocks of player ship');

    if (!this.playerManager) {
      console.log('❌ No player manager found');
      return;
    }

    const playerShip = this.playerManager.getModularShip();
    if (!playerShip) {
      console.log('❌ No player ship found');
      return;
    }

    // Cast to SimpleDebugShip to access flash methods
    const simpleShip = playerShip as any;
    if (simpleShip.triggerAllBlocksFlash) {
      simpleShip.triggerAllBlocksFlash();
      console.log('⚡ All blocks flash triggered!');
    } else {
      console.log('❌ Flash method not available on this ship type');
    }
  }
}
