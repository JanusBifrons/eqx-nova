import type { Engine } from '../engine';
import type { Entity } from '../engine/entity';
import type { MouseInputEvent } from '../engine/input';

/**
 * Game class - Physics demonstration with interactive entities
 * Demonstrates the separation between engine and game logic
 */
export class Game {
  private isInitialized = false;
  private engine: Engine | null = null;
  private dynamicEntities: Entity[] = [];
  private spawnTimer = 0;
  private readonly SPAWN_INTERVAL = 2000; // milliseconds
  public initialize(engine: Engine): void {
    this.engine = engine;
    this.setupPhysicsDemo();
    this.setupInputHandlers();
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
    }    // Clean up objects that have fallen too far
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
    this.engine.createRectangle({
      x: width * 0.3,
      y: height * 0.4,
      width: 150,
      height: 20,
      options: { isStatic: true, color: 0x4a9eff }
    });

    this.engine.createRectangle({
      x: width * 0.7,
      y: height * 0.6,
      width: 150,
      height: 20,
      options: { isStatic: true, color: 0x4a9eff }
    });

    this.engine.createRectangle({
      x: width * 0.5,
      y: height * 0.8,
      width: 200,
      height: 20,
      options: { isStatic: true, color: 0x4a9eff }
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
      const box = this.engine.createRectangle({
        x: x,
        y: 50,
        width: 40,
        height: 40,
        options: { color: 0x16213e }
      });
      this.dynamicEntities.push(box);

      // Circle
      const circle = this.engine.createCircle({
        x: x,
        y: 100,
        radius: 20,
        options: { color: 0xaa4465 }
      });
      this.dynamicEntities.push(circle);
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
    let entity: Entity;

    if (Math.random() > 0.5) {
      // Create box
      const size = 20 + Math.random() * 30;
      const color = Math.random() * 0xffffff;
      entity = this.engine.createRectangle({
        x: x,
        y: y,
        width: size,
        height: size,
        options: { color }
      });
    } else {
      // Create circle
      const radius = 10 + Math.random() * 20;
      const color = Math.random() * 0xffffff;
      entity = this.engine.createCircle({
        x: x,
        y: y,
        radius: radius,
        options: { color }
      });
    }    this.dynamicEntities.push(entity);
  }

  private cleanupFallenObjects(): void {
    if (!this.engine) return;

    const rendererSystem = this.engine.getRendererSystem();
    const height = rendererSystem.getHeight();

    const entitiesToRemove: number[] = [];

    this.dynamicEntities.forEach((entity, index) => {
      // Remove objects that have fallen below the screen
      if (entity.position.y > height + 100) {
        entitiesToRemove.push(index);
      }
    });

    // Remove fallen objects (in reverse order to maintain indices)
    entitiesToRemove.reverse().forEach((index) => {
      const entity = this.dynamicEntities[index];
      this.engine!.removeEntity(entity.id);
      this.dynamicEntities.splice(index, 1);
    });
  }

  private setupInputHandlers(): void {
    if (!this.engine) return;

    const inputSystem = this.engine.getInputSystem();

    // Handle mouse clicks for explosion effects and object spawning
    inputSystem.addEventListener('mouse', (event: MouseInputEvent) => {
      if (event.action === 'down' && event.button === 'left') {
        this.handleMouseClick(event.position.x, event.position.y);
      }
    });
  }

  private handleMouseClick(x: number, y: number): void {
    if (!this.engine) return;

    // Create an explosion effect - apply upward forces to nearby objects
    const explosionForce = 0.01;
    const explosionRadius = 100;

    this.dynamicEntities.forEach((entity) => {
      const dx = entity.position.x - x;
      const dy = entity.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < explosionRadius && distance > 0) {
        const force = explosionForce * (explosionRadius - distance) / explosionRadius;
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force - 0.02; // Add upward bias        // Get the physics body for this entity and apply force
        if (this.engine) {
          const allBodies = this.engine.getPhysicsSystem().getAllBodies();
          const physicsBody = allBodies.find(body => body.id === entity.physicsBodyId);
          if (physicsBody) {
            this.engine.getPhysicsSystem().applyForce(physicsBody, { x: forceX, y: forceY });
          }
        }
      }
    });

    // Also spawn a new object at click location
    let newEntity: Entity;
    if (Math.random() > 0.5) {
      newEntity = this.engine.createCircle({
        x: x,
        y: y,
        radius: 15,
        options: { color: 0xff6b6b }
      });
    } else {
      newEntity = this.engine.createRectangle({
        x: x,
        y: y,
        width: 30,
        height: 30,
        options: { color: 0x4ecdc4 }
      });
    }
    this.dynamicEntities.push(newEntity);
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public destroy(): void {
    this.dynamicEntities = [];
    this.engine = null;
    this.isInitialized = false;
    this.spawnTimer = 0;
    console.log('Physics demonstration destroyed');
  }
}
