import type { Entity } from '../../engine/entity';
import type { ICollisionTarget } from './interfaces/ICollisionTarget';
import type { ICollisionSource } from './interfaces/ICollisionSource';

/**
 * Registry that manages all collision-capable entities
 * Follows Single Responsibility Principle - only handles entity lookup
 */
export class CollisionEntityRegistry {
    private readonly targets = new Map<string, ICollisionTarget>();
    private readonly sources = new Map<string, ICollisionSource>();
    private readonly physicsBodyToEntity = new Map<string, Entity>();

    /**
     * Register an entity that can be a collision target
     */
    registerTarget(target: ICollisionTarget): void {
        this.targets.set(target.id, target);
    }

    /**
     * Register an entity that can cause collisions
     */
    registerSource(source: ICollisionSource): void {
        this.sources.set(source.id, source);
    }

    /**
     * Register the mapping between physics body ID and entity
     */
    registerPhysicsBodyMapping(physicsBodyId: string, entity: Entity): void {
        this.physicsBodyToEntity.set(physicsBodyId, entity);
    }

    /**
     * Find collision target by entity ID
     */
    findTargetById(entityId: string): ICollisionTarget | null {
        return this.targets.get(entityId) || null;
    }

    /**
     * Find collision source by entity ID  
     */
    findSourceById(entityId: string): ICollisionSource | null {
        return this.sources.get(entityId) || null;
    }

    /**
     * Find entity by physics body ID
     */
    findEntityByPhysicsBodyId(physicsBodyId: string): Entity | null {
        return this.physicsBodyToEntity.get(physicsBodyId) || null;
    }

    /**
     * Remove a target from registry
     */
    unregisterTarget(entityId: string): void {
        const target = this.targets.get(entityId);
        if (target) {
            this.targets.delete(entityId);
            this.physicsBodyToEntity.delete(target.physicsBodyId);
        }
    }

    /**
     * Remove a source from registry
     */
    unregisterSource(entityId: string): void {
        const source = this.sources.get(entityId);
        if (source) {
            this.sources.delete(entityId);
            this.physicsBodyToEntity.delete(source.physicsBodyId);
        }
    }

    /**
     * Clear all registrations
     */
    clear(): void {
        this.targets.clear();
        this.sources.clear();
        this.physicsBodyToEntity.clear();
    }
}
