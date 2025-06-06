import type { IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import type { IRendererSystem, RenderableObject } from '../interfaces/IRendererSystem';
import { Entity } from './Entity';
import type { EntityOptions } from './Entity';

export interface RectangleConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    options?: EntityOptions;
}

export interface CircleConfig {
    x: number;
    y: number;
    radius: number;
    options?: EntityOptions;
}

export class EntityFactory {
    private entityIdCounter = 0;
    private physicsSystem: IPhysicsSystem;
    private rendererSystem: IRendererSystem;

    constructor(
        physicsSystem: IPhysicsSystem,
        rendererSystem: IRendererSystem
    ) {
        this.physicsSystem = physicsSystem;
        this.rendererSystem = rendererSystem;
    }

    public createRectangle(config: RectangleConfig): Entity {
        const entityId = `entity_${this.entityIdCounter++}`;

        // Create physics body
        const physicsBody = this.physicsSystem.createRectangle(
            config.x,
            config.y,
            config.width,
            config.height,
            {
                isStatic: config.options?.isStatic,
                restitution: config.options?.restitution,
                friction: config.options?.friction,
            }
        );

        // Create render object
        const renderObject: RenderableObject = {
            id: `render_${entityId}`,
            position: physicsBody.position,
            angle: physicsBody.angle,
            width: config.width,
            height: config.height,
            color: config.options?.color ?? 0x16213e,
            type: 'rectangle',
        };

        this.rendererSystem.createRenderObject(renderObject);

        // Create and return entity
        const entity = new Entity(entityId, 'rectangle', physicsBody.id, renderObject.id);
        entity.position = physicsBody.position;
        entity.angle = physicsBody.angle;

        return entity;
    }

    public createCircle(config: CircleConfig): Entity {
        const entityId = `entity_${this.entityIdCounter++}`;

        // Create physics body
        const physicsBody = this.physicsSystem.createCircle(
            config.x,
            config.y,
            config.radius,
            {
                isStatic: config.options?.isStatic,
                restitution: config.options?.restitution,
                friction: config.options?.friction,
            }
        );

        // Create render object
        const renderObject: RenderableObject = {
            id: `render_${entityId}`,
            position: physicsBody.position,
            angle: physicsBody.angle,
            radius: config.radius,
            color: config.options?.color ?? 0xaa4465,
            type: 'circle',
        };

        this.rendererSystem.createRenderObject(renderObject);

        // Create and return entity
        const entity = new Entity(entityId, 'circle', physicsBody.id, renderObject.id);
        entity.position = physicsBody.position;
        entity.angle = physicsBody.angle;

        return entity;
    }
}
