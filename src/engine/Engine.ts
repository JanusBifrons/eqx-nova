import type { IPhysicsSystem } from './interfaces/IPhysicsSystem';
import type { IRendererSystem } from './interfaces/IRendererSystem';
import { MatterPhysicsSystem } from './physics/MatterPhysicsSystem';
import { PixiRendererSystem } from './renderer/PixiRendererSystem';
import { EntityManager } from './entity/EntityManager';
import type { Entity, RectangleConfig, CircleConfig } from './entity';
import { InputSystem, type IInputSystem } from './input';

export class Engine {
  private physicsSystem: IPhysicsSystem;
  private rendererSystem: IRendererSystem;
  private inputSystem: IInputSystem;
  private entityManager: EntityManager;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  constructor(
    physicsSystem?: IPhysicsSystem,
    rendererSystem?: IRendererSystem,
    inputSystem?: IInputSystem
  ) {
    // Use dependency injection with defaults (follows DIP)
    this.physicsSystem = physicsSystem ?? new MatterPhysicsSystem();
    this.rendererSystem = rendererSystem ?? new PixiRendererSystem();
    this.inputSystem = inputSystem ?? new InputSystem();
    this.entityManager = new EntityManager(this.physicsSystem, this.rendererSystem);
  } public async initialize(canvas: HTMLCanvasElement, createBoundaries: boolean = true): Promise<void> {
    // Initialize renderer first to get dimensions
    await this.rendererSystem.initialize(canvas);

    // Initialize physics with canvas dimensions
    const width = this.rendererSystem.getWidth();
    const height = this.rendererSystem.getHeight();
    this.physicsSystem.initialize(width, height, createBoundaries);

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

  public removeEntity(entityId: string): void {
    this.entityManager.removeEntity(entityId);
  }

  public getEntity(id: string): Entity | undefined {
    return this.entityManager.getEntity(id);
  }

  public getAllEntities(): Entity[] {
    return this.entityManager.getAllEntities();
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update physics
    this.physicsSystem.update(deltaTime);

    // Update entities (sync physics with render objects)
    this.entityManager.updateEntities();

    // Render the frame
    this.rendererSystem.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
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
}
