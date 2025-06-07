import type {
  IPhysicsSystem,
  IPhysicsBody,
} from '../interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../interfaces/IRendererSystem';
import { Entity } from './Entity';
import { EntityFactory } from './EntityFactory';
import type {
  RectangleConfig,
  CircleConfig,
  PolygonConfig,
} from './EntityFactory';

export class EntityManager {
  private entities: Map<string, Entity> = new Map();
  private physicsBodyToEntityMap: Map<string, string> = new Map();
  private entityFactory: EntityFactory;
  private physicsSystem: IPhysicsSystem;
  private rendererSystem: IRendererSystem;

  constructor(physicsSystem: IPhysicsSystem, rendererSystem: IRendererSystem) {
    this.physicsSystem = physicsSystem;
    this.rendererSystem = rendererSystem;
    this.entityFactory = new EntityFactory(physicsSystem, rendererSystem);
  }

  public createRectangle(config: RectangleConfig): Entity {
    const entity = this.entityFactory.createRectangle(config);
    this.entities.set(entity.id, entity);
    this.physicsBodyToEntityMap.set(entity.physicsBodyId, entity.id);
    return entity;
  }

  public createCircle(config: CircleConfig): Entity {
    const entity = this.entityFactory.createCircle(config);
    this.entities.set(entity.id, entity);
    this.physicsBodyToEntityMap.set(entity.physicsBodyId, entity.id);
    return entity;
  }

  public createPolygon(config: PolygonConfig): Entity {
    const entity = this.entityFactory.createPolygon(config);
    this.entities.set(entity.id, entity);
    this.physicsBodyToEntityMap.set(entity.physicsBodyId, entity.id);
    return entity;
  }

  public removeEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Find and remove physics body
    const allBodies = this.physicsSystem.getAllBodies();
    const physicsBody = allBodies.find(
      body => body.id === entity.physicsBodyId
    );
    if (physicsBody) {
      this.physicsSystem.removeBody(physicsBody);
    }
    // Remove render object
    this.rendererSystem.removeRenderObject(entity.renderObjectId);

    // Clean up mappings
    this.physicsBodyToEntityMap.delete(entity.physicsBodyId);
    this.entities.delete(entityId);

    // Mark entity as destroyed
    entity.destroy();
  }

  public getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  public getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  public getActiveEntities(): Entity[] {
    return Array.from(this.entities.values()).filter(entity => entity.isActive);
  }

  public updateEntities(): void {
    // Sync entity positions with physics bodies
    const allBodies = this.physicsSystem.getAllBodies();

    allBodies.forEach((body: IPhysicsBody) => {
      const entityId = this.physicsBodyToEntityMap.get(body.id);
      if (entityId) {
        const entity = this.entities.get(entityId);
        if (entity && entity.isActive) {
          entity.position = body.position;
          entity.angle = body.angle;

          // Update render object
          this.rendererSystem.updateRenderObject(
            entity.renderObjectId,
            body.position,
            body.angle
          );
        }
      }
    });
  }

  public clear(): void {
    // Remove all entities
    const entityIds = Array.from(this.entities.keys());
    entityIds.forEach(id => this.removeEntity(id));
  }

  public destroy(): void {
    this.clear();
    this.entities.clear();
    this.physicsBodyToEntityMap.clear();
  }
}
