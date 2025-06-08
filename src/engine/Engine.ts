import type { IPhysicsSystem } from './interfaces/IPhysicsSystem';
import type { IRendererSystem } from './interfaces/IRendererSystem';
import type { ICameraSystem } from './interfaces/ICamera';
import { MatterPhysicsSystem } from './physics/MatterPhysicsSystem';
import { PixiRendererSystem } from './renderer/PixiRendererSystem';
import { CameraSystem } from './camera/CameraSystem';
import { EntityManager } from './entity/EntityManager';
import type {
  Entity,
  RectangleConfig,
  CircleConfig,
  PolygonConfig,
} from './entity';
import { InputSystem, type IInputSystem } from './input';

export class Engine {
  private physicsSystem: IPhysicsSystem;

  private rendererSystem: IRendererSystem;

  private inputSystem: IInputSystem;

  private cameraSystem: ICameraSystem;

  private entityManager: EntityManager;

  private isRunning = false;

  private animationFrameId: number | null = null;

  private lastTime = 0;

  private updateCallbacks: Array<(deltaTime: number) => void> = [];

  // Frame timing smoothing
  private frameTimeSamples: number[] = [];

  private readonly MAX_FRAME_SAMPLES = 10;

  private readonly TARGET_FRAME_TIME = 16.667; // 60 FPS

  constructor(
    physicsSystem?: IPhysicsSystem,
    rendererSystem?: IRendererSystem,
    inputSystem?: IInputSystem,
    cameraSystem?: ICameraSystem
  ) {
    // Use dependency injection with defaults (follows DIP)
    this.physicsSystem = physicsSystem ?? new MatterPhysicsSystem();
    this.rendererSystem = rendererSystem ?? new PixiRendererSystem();
    this.inputSystem = inputSystem ?? new InputSystem();
    this.cameraSystem = cameraSystem ?? new CameraSystem();
    this.entityManager = new EntityManager(
      this.physicsSystem,
      this.rendererSystem
    );
  }

  public async initialize(
    canvas: HTMLCanvasElement,
    createBoundaries: boolean = true
  ): Promise<void> {
    // Initialize renderer first to get dimensions
    await this.rendererSystem.initialize(canvas);

    // Get canvas dimensions for viewport
    const canvasWidth = this.rendererSystem.getWidth();
    const canvasHeight = this.rendererSystem.getHeight();

    // Initialize camera system with viewport dimensions
    this.cameraSystem.initialize(canvasWidth, canvasHeight);

    // Connect camera system to renderer
    this.rendererSystem.setCameraSystem(this.cameraSystem);

    // Initialize physics with expanded world dimensions (4x larger)
    const worldWidth = canvasWidth * 4;
    const worldHeight = canvasHeight * 4;
    this.physicsSystem.initialize(worldWidth, worldHeight, createBoundaries);

    // Initialize input system with canvas element
    this.inputSystem.initialize(canvas);
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  public stop(): void {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // New unified entity creation methods
  public createRectangle(config: RectangleConfig): Entity {
    return this.entityManager.createRectangle(config);
  }

  public createCircle(config: CircleConfig): Entity {
    return this.entityManager.createCircle(config);
  }

  public createPolygon(config: PolygonConfig): Entity {
    return this.entityManager.createPolygon(config);
  }

  public removeEntity(entityId: string): void {
    this.entityManager.removeEntity(entityId);
  }

  public getEntity(id: string): Entity | undefined {
    return this.entityManager.getEntity(id);
  }

  public getAllEntities(): Entity[] {
    return this.entityManager.getAllEntities();
  }

  public registerUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  public unregisterUpdateCallback(callback: (deltaTime: number) => void): void {
    const index = this.updateCallbacks.indexOf(callback);

    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const rawDeltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Use smoothed frame timing to prevent physics instability
    let deltaTime = this.smoothFrameTime(rawDeltaTime);

    // Cap delta time to prevent physics instability (Matter.js recommends <= 16.667ms)
    deltaTime = Math.min(deltaTime, this.TARGET_FRAME_TIME);

    // Call registered update callbacks (for game logic)
    this.updateCallbacks.forEach(callback => callback(deltaTime));

    // Update physics
    this.physicsSystem.update(deltaTime);

    // Update entities (sync physics with render objects)
    this.entityManager.updateEntities();

    // Render the frame
    this.rendererSystem.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private smoothFrameTime(rawDeltaTime: number): number {
    // Add current frame time to samples
    this.frameTimeSamples.push(rawDeltaTime);

    // Keep only recent samples
    if (this.frameTimeSamples.length > this.MAX_FRAME_SAMPLES) {
      this.frameTimeSamples.shift();
    }
    // Return smoothed average, but don't let it get too far from target
    const average =
      this.frameTimeSamples.reduce((sum, time) => sum + time, 0) /
      this.frameTimeSamples.length;

    // If the average is significantly different from target, bias towards target
    if (Math.abs(average - this.TARGET_FRAME_TIME) > 5) {
      return (average + this.TARGET_FRAME_TIME) / 2;
    }
return average;
  }

  public destroy(): void {
    this.stop();
    this.inputSystem.destroy();
    this.entityManager.destroy();
    this.physicsSystem.destroy();
    this.rendererSystem.destroy();
  }

  // Getters for access to systems (if needed)
  public getPhysicsSystem(): IPhysicsSystem {
    return this.physicsSystem;
  }

  public getRendererSystem(): IRendererSystem {
    return this.rendererSystem;
  }

  public getInputSystem(): IInputSystem {
    return this.inputSystem;
  }

  public getEntityManager(): EntityManager {
    return this.entityManager;
  }

  public getCameraSystem(): ICameraSystem {
    return this.cameraSystem;
  }
}
