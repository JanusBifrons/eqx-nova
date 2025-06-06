import type { Engine } from '../engine';
import type { IPhysicsBody } from '../engine/interfaces';

/**
 * Game class - Physics demonstration with interactive elements
 * Demonstrates the separation between engine and game logic
 */
export class Game {
  private isInitialized = false;
  private engine: Engine | null = null;
  private dynamicBodies: IPhysicsBody[] = [];
  private spawnTimer = 0;
  private readonly SPAWN_INTERVAL = 2000; // milliseconds

  public initialize(engine: Engine): void {
    this.engine = engine;
    this.setupPhysicsDemo();
    this.isInitialized = true;
    console.log('Physics demonstration initialized!');
  }

  public update(deltaTime: number): void {
    if (!this.isInitialized || !this.engine) return;

    // Spawn new objects periodically
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnRandomObject();
      this.spawnTimer = 0;
    }

    // Clean up objects that have fallen too far
    this.cleanupFallenObjects();
  }

  private setupPhysicsDemo(): void {
    if (!this.engine) return;

    // Create some static platforms
    this.createPlatforms();

    // Create initial falling objects
    this.createInitialObjects();
  }

  private createPlatforms(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const width = rendererSystem.getWidth();
    const height = rendererSystem.getHeight();

    // Create diagonal platforms
    this.engine.createRectangle(width * 0.3, height * 0.4, 150, 20, {
      isStatic: true,
      color: 0x4a9eff
    });

    this.engine.createRectangle(width * 0.7, height * 0.6, 150, 20, {
      isStatic: true,
      color: 0x4a9eff
    });

    this.engine.createRectangle(width * 0.5, height * 0.8, 200, 20, {
      isStatic: true,
      color: 0x4a9eff
    });
  }

  private createInitialObjects(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const width = rendererSystem.getWidth();

    // Create some initial boxes and circles
    for (let i = 0; i < 3; i++) {
      const x = width * 0.2 + (i * width * 0.3);

      // Box
      const box = this.engine.createRectangle(x, 50, 40, 40, {
        color: 0x16213e
      });
      this.dynamicBodies.push(box);

      // Circle
      const circle = this.engine.createCircle(x, 100, 20, {
        color: 0xaa4465
      });
      this.dynamicBodies.push(circle);
    }
  }

  private spawnRandomObject(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const width = rendererSystem.getWidth();

    // Random position across the top
    const x = Math.random() * (width - 100) + 50;
    const y = -50; // Start above the screen

    // Random choice between box and circle
    let body: IPhysicsBody;

    if (Math.random() > 0.5) {
      // Create box
      const size = 20 + Math.random() * 30;
      const color = Math.random() * 0xffffff;
      body = this.engine.createRectangle(x, y, size, size, { color });
    } else {
      // Create circle
      const radius = 10 + Math.random() * 20;
      const color = Math.random() * 0xffffff;
      body = this.engine.createCircle(x, y, radius, { color });
    }

    this.dynamicBodies.push(body);
  }

  private cleanupFallenObjects(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const height = rendererSystem.getHeight();

    const bodiesToRemove: number[] = [];

    this.dynamicBodies.forEach((body, index) => {
      // Remove objects that have fallen below the screen
      if (body.position.y > height + 100) {
        bodiesToRemove.push(index);
      }
    });

    // Remove fallen objects (in reverse order to maintain indices)
    bodiesToRemove.reverse().forEach((index) => {
      const body = this.dynamicBodies[index];
      this.engine!.removeBody(body);
      this.dynamicBodies.splice(index, 1);
    });
  }

  public handleMouseClick(x: number, y: number): void {
    if (!this.engine) return;

    // Create an explosion effect - apply upward forces to nearby objects
    const explosionForce = 0.01;
    const explosionRadius = 100;

    this.dynamicBodies.forEach((body) => {
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < explosionRadius && distance > 0) {
        const force = explosionForce * (explosionRadius - distance) / explosionRadius; const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force - 0.02; // Add upward bias

        if (this.engine) {
          this.engine.getPhysicsSystem().applyForce(body, { x: forceX, y: forceY });
        }
      }
    });

    // Also spawn a new object at click location
    if (Math.random() > 0.5) {
      const body = this.engine.createCircle(x, y, 15, { color: 0xff6b6b });
      this.dynamicBodies.push(body);
    } else {
      const body = this.engine.createRectangle(x, y, 30, 30, { color: 0x4ecdc4 });
      this.dynamicBodies.push(body);
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public destroy(): void {
    this.dynamicBodies = [];
    this.engine = null;
    this.isInitialized = false;
    this.spawnTimer = 0;
    console.log('Physics demonstration destroyed');
  }
}
