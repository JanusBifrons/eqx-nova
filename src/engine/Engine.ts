import type { IPhysicsSystem, IPhysicsBody } from './interfaces/IPhysicsSystem';
import type { IRendererSystem, RenderableObject } from './interfaces/IRendererSystem';
import { MatterPhysicsSystem } from './physics/MatterPhysicsSystem';
import { PixiRendererSystem } from './renderer/PixiRendererSystem';

export class Engine {
  private physicsSystem: IPhysicsSystem;
  private rendererSystem: IRendererSystem;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private physicsBodyToRenderMap: Map<string, string> = new Map();

  constructor(
    physicsSystem?: IPhysicsSystem,
    rendererSystem?: IRendererSystem
  ) {
    // Use dependency injection with defaults (follows DIP)
    this.physicsSystem = physicsSystem ?? new MatterPhysicsSystem();
    this.rendererSystem = rendererSystem ?? new PixiRendererSystem();
  }

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // Initialize renderer first to get dimensions
    await this.rendererSystem.initialize(canvas);

    // Initialize physics with canvas dimensions
    const width = this.rendererSystem.getWidth();
    const height = this.rendererSystem.getHeight();
    this.physicsSystem.initialize(width, height);
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

  public createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: { isStatic?: boolean; color?: number }
  ): IPhysicsBody {
    // Create physics body
    const physicsBody = this.physicsSystem.createRectangle(x, y, width, height, {
      isStatic: options?.isStatic,
    });

    // Create corresponding render object
    const renderObject: RenderableObject = {
      id: `render_${physicsBody.id}`,
      position: physicsBody.position,
      angle: physicsBody.angle,
      width,
      height,
      color: options?.color ?? 0x16213e,
      type: 'rectangle',
    };

    this.rendererSystem.createRenderObject(renderObject);
    this.physicsBodyToRenderMap.set(physicsBody.id, renderObject.id);

    return physicsBody;
  }

  public createCircle(
    x: number,
    y: number,
    radius: number,
    options?: { isStatic?: boolean; color?: number }
  ): IPhysicsBody {
    // Create physics body
    const physicsBody = this.physicsSystem.createCircle(x, y, radius, {
      isStatic: options?.isStatic,
    });

    // Create corresponding render object
    const renderObject: RenderableObject = {
      id: `render_${physicsBody.id}`,
      position: physicsBody.position,
      angle: physicsBody.angle,
      radius,
      color: options?.color ?? 0xaa4465,
      type: 'circle',
    };

    this.rendererSystem.createRenderObject(renderObject);
    this.physicsBodyToRenderMap.set(physicsBody.id, renderObject.id);

    return physicsBody;
  }

  public removeBody(body: IPhysicsBody): void {
    const renderId = this.physicsBodyToRenderMap.get(body.id);
    if (renderId) {
      this.rendererSystem.removeRenderObject(renderId);
      this.physicsBodyToRenderMap.delete(body.id);
    }
    this.physicsSystem.removeBody(body);
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update physics
    this.physicsSystem.update(deltaTime);

    // Sync render objects with physics bodies
    this.syncRenderWithPhysics();

    // Render the frame
    this.rendererSystem.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private syncRenderWithPhysics(): void {
    const bodies = this.physicsSystem.getAllBodies();

    bodies.forEach((body) => {
      const renderId = this.physicsBodyToRenderMap.get(body.id);
      if (renderId) {
        this.rendererSystem.updateRenderObject(renderId, body.position, body.angle);
      }
    });
  }

  public destroy(): void {
    this.stop();
    this.physicsSystem.destroy();
    this.rendererSystem.destroy();
    this.physicsBodyToRenderMap.clear();
  }

  // Getters for access to systems (if needed)
  public getPhysicsSystem(): IPhysicsSystem {
    return this.physicsSystem;
  }

  public getRendererSystem(): IRendererSystem {
    return this.rendererSystem;
  }
}
