import type { Engine } from '../../engine';
import type { Entity } from '../../engine/entity';
import type {
  Vector2D,
  CollisionEvent,
} from '../../engine/interfaces/IPhysicsSystem';
import type { KeyboardInputEvent } from '../../engine/input';
import type { IGameEngine, PhysicsConfig } from '../interfaces/IGameEngine';
import { ShapeUtils } from '../utils/ShapeUtils';

/**
 * GameEngineAdapter - Adapts the core Engine to the game-specific interface
 * Following Dependency Inversion Principle - abstracts engine complexity from game logic
 */
export class GameEngineAdapter implements IGameEngine {
  private engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
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

  public createAsteroid(
    position: Vector2D,
    _size: number,
    vertices: Vector2D[]
  ): Entity {
    return this.engine.createPolygon({
      x: position.x,
      y: position.y,
      vertices,
      options: {
        color: 0x888888,
        isStatic: false,
        frictionAir: 0,
        density: 0.001,
      },
    });
  }

  public createLaser(position: Vector2D, radius: number): Entity {
    return this.engine.createCircle({
      x: position.x,
      y: position.y,
      radius,
      options: {
        color: 0xffff00,
        isStatic: false,
        frictionAir: 0,
        density: 0.001,
        isSensor: true,
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

  public wrapEntityPosition(
    entity: Entity,
    bounds: { width: number; height: number }
  ): void {
    const physicsSystem = this.engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const body = allBodies.find(b => b.id === entity.physicsBodyId);

    if (!body) return;

    let newX = body.position.x;
    let newY = body.position.y;
    let wrapped = false;

    if (body.position.x < 0) {
      newX = bounds.width;
      wrapped = true;
    } else if (body.position.x > bounds.width) {
      newX = 0;
      wrapped = true;
    }

    if (body.position.y < 0) {
      newY = bounds.height;
      wrapped = true;
    } else if (body.position.y > bounds.height) {
      newY = 0;
      wrapped = true;
    }

    if (wrapped) {
      physicsSystem.setPosition(body, { x: newX, y: newY });
    }
  }

  public getWorldDimensions(): { width: number; height: number } {
    const rendererSystem = this.engine.getRendererSystem();
    return {
      width: rendererSystem.getWidth(),
      height: rendererSystem.getHeight(),
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
        frictionAir: config.airResistance
      });
      physicsSystem.updateExistingBodies({
        frictionAir: config.airResistance
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
      // Optionally apply to existing bodies
      physicsSystem.updateExistingBodies(config.defaultBodyProperties);
    }
  }
}
