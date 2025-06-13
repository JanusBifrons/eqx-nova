import type { Engine } from '../../engine';
import type { Entity } from '../../engine/entity';
import type {
  Vector2D,
  CollisionEvent,
} from '../../engine/interfaces/IPhysicsSystem';
import type { KeyboardInputEvent } from '../../engine/input';
import type { IGameEngine, PhysicsConfig } from '../interfaces/IGameEngine';
import type { ICameraSystem } from '../../engine/interfaces/ICamera';
import { ShapeUtils } from '../utils/ShapeUtils';
import { ModularShipFactory } from '../entities/v2/ModularShipFactory';
import type { IModularShip } from '../entities/v2/interfaces/IModularShip';

/**
 * GameEngineAdapter - Adapts the core Engine to the game-specific interface
 * Following Dependency Inversion Principle - abstracts engine complexity from game logic
 */
export class GameEngineAdapter implements IGameEngine {
  private engine: Engine;
  private modularShipFactory: ModularShipFactory;

  constructor(engine: Engine) {
    this.engine = engine;
    this.modularShipFactory = new ModularShipFactory(
      engine.getPhysicsSystem(),
      engine.getRendererSystem(),
      engine.getEntityManager()
    );
  }

  public createTriangularShip(position: Vector2D, size: number): Entity {
    const triangleVertices = ShapeUtils.createTriangle(size);

    return this.engine.createPolygon({
      x: position.x,
      y: position.y,
      vertices: triangleVertices,
      options: {
        color: 0x00ff00,
        isStatic: false,
        frictionAir: 0.02,
        density: 0.001,
      },
    });
  }

  public createModularShip(
    position: Vector2D,
    shipType?: string
  ): IModularShip {
    // Support different ship types for variety
    switch (shipType) {
      case 'linear':
        return this.modularShipFactory.createLinearTestShip(position);
      case 'cross':
        return this.modularShipFactory.createCrossTestShip(position);
      case 'compact':
        return this.modularShipFactory.createCompactTestShip(position);
      case 'flagship':
      default:
        return this.modularShipFactory.createPlayerFlagship(position);
    }
  }

  public createAsteroid(
    position: Vector2D,
    _size: number,
    vertices: Vector2D[],
    isStatic: boolean = false
  ): Entity {
    return this.engine.createPolygon({
      x: position.x,
      y: position.y,
      vertices,
      options: {
        color: 0x888888,
        isStatic: isStatic,
        frictionAir: 0,
        density: 0.001,
      },
    });
  }

  public createLaser(
    position: Vector2D,
    width: number,
    height: number
  ): Entity {
    return this.engine.createRectangle({
      x: position.x,
      y: position.y,
      width,
      height,
      options: {
        color: 0xffff00,
        isStatic: false,
        frictionAir: 0,
        density: 0.0001,
        isSensor: true, // Lasers MUST be sensors
      },
    });
  }

  public createDebugMarker(
    position: Vector2D,
    color: number = 0xff0000
  ): Entity {
    // Create a small cross-shaped marker for visual debugging
    return this.engine.createCircle({
      x: position.x,
      y: position.y,
      radius: 8, // Increased size for better visibility
      options: {
        color,
        isStatic: true,
        isSensor: true, // Don't interact with other objects
      },
    });
  }

  public removeEntity(entityId: string): void {
    this.engine.removeEntity(entityId);
  }

  public applyForceToEntity(entity: Entity, force: Vector2D): void {
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const body = allBodies.find(b => b.id === entity.physicsBodyId);

    if (body) {
      physicsSystem.applyForce(body, force);
    }
  }

  public setEntityRotation(entity: Entity, rotation: number): void {
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const body = allBodies.find(b => b.id === entity.physicsBodyId);

    if (body) {
      physicsSystem.setRotation(body, rotation);
    }
  }

  public setEntityPosition(entity: Entity, position: Vector2D): void {
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const body = allBodies.find(b => b.id === entity.physicsBodyId);

    if (body) {
      physicsSystem.setPosition(body, position);
    }
  }

  public setEntityVelocity(entity: Entity, velocity: Vector2D): void {
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const body = allBodies.find(b => b.id === entity.physicsBodyId);

    if (body) {
      physicsSystem.setVelocity(body, velocity);
    }
  }

  public getEntityVelocity(entity: Entity): Vector2D | null {
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const body = allBodies.find(b => b.id === entity.physicsBodyId);

    if (body) {
      return body.velocity;
    }
    return null;
  }

  public setEntityAngularVelocity(
    entity: Entity,
    angularVelocity: number
  ): void {
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const body = allBodies.find(b => b.id === entity.physicsBodyId);

    if (body) {
      physicsSystem.setAngularVelocity(body, angularVelocity);
    }
  }

  public wrapEntityPosition(
    _entity: Entity,
    _bounds: { width: number; height: number }
  ): void {
    // World wrapping is now disabled for uncapped world space
    // Entities can move freely in infinite space
    return;
  }

  public getWorldDimensions(): { width: number; height: number } {
    // Return very large dimensions to simulate infinite space
    // This affects asteroid spawning areas and other world-relative calculations
    return {
      width: 50000, // Much larger than before (was 4x viewport)
      height: 50000, // Large enough to feel infinite but not cause precision issues
    };
  }

  public onInput(callback: (event: KeyboardInputEvent) => void): void {
    const inputSystem = this.engine.getInputSystem();
    inputSystem.addEventListener('keyboard', callback);
  }

  public onCollision(callback: (event: CollisionEvent) => void): void {
    const physicsSystem = this.engine.getPhysicsSystem();
    physicsSystem.onCollisionStart(callback);
  }

  public configurePhysics(config: PhysicsConfig): void {
    const physicsSystem = this.engine.getPhysicsSystem() as any; // Cast to access extended methods

    // Basic gravity configuration (backwards compatibility)
    if (config.gravity) {
      physicsSystem.setGravity(config.gravity.x, config.gravity.y);
    }
    // Legacy air resistance support (backwards compatibility)
    if (typeof config.airResistance === 'number') {
      physicsSystem.setDefaultBodyProperties({
        frictionAir: config.airResistance,
      });
      physicsSystem.updateExistingBodies({
        frictionAir: config.airResistance,
      });
    }
    // Advanced world configuration
    if (config.world) {
      physicsSystem.configureWorld(config.world);
    }
    // Engine configuration
    if (config.engine) {
      physicsSystem.configureEngine(config.engine);
    }
    // Default body properties
    if (config.defaultBodyProperties) {
      physicsSystem.setDefaultBodyProperties(config.defaultBodyProperties);
      // Optionally apply to existing bodies      physicsSystem.updateExistingBodies(config.defaultBodyProperties);
    }
  }

  public getCameraSystem(): ICameraSystem {
    return this.engine.getCameraSystem();
  }

  public lookAt(target: Vector2D | Entity): void {
    const cameraSystem = this.engine.getCameraSystem();
    const camera = cameraSystem.getCamera();
    camera.lookAt(target);
  }

  public getMousePosition(): Vector2D | null {
    const inputSystem = this.engine.getInputSystem();

    return inputSystem.getMousePosition();
  }
}
