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
import { CompositeShipFactory } from '../factories/CompositeShipFactory';
import type { CompositeShip } from '../entities/CompositeShip';

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

  public createCompositeShip(
    position: Vector2D,
    numParts?: number
  ): CompositeShip {
    const shipId = `composite-ship-${Date.now()}`;

    // Allow customization of part count
    if (numParts === 1) {
      return CompositeShipFactory.createSinglePartShip(
        this.engine,
        position,
        shipId
      );
    } else if (numParts === 3) {
      return CompositeShipFactory.createThreePartShip(
        this.engine,
        position,
        shipId
      );
    } else if (numParts === 4) {
      return CompositeShipFactory.createFourPartShip(
        this.engine,
        position,
        shipId
      );
    } else if (numParts === 8) {
      // Long thin ship for testing damage system
      return CompositeShipFactory.createLongThinShip(
        this.engine,
        position,
        shipId
      );
    } else {
      // Default to 2-part ship
      return CompositeShipFactory.createTwoPartShip(
        this.engine,
        position,
        shipId
      );
    }
  }

  public createPlayerFlagship(position: Vector2D): CompositeShip {
    const shipId = `player-flagship-${Date.now()}`;

    return CompositeShipFactory.createPlayerFlagship(
      this.engine,
      position,
      shipId
    );
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
