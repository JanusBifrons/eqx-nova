import type { CollisionEvent } from '../../engine/interfaces/IPhysicsSystem';
import { CollisionEntityRegistry } from './CollisionEntityRegistry';
import { CollisionInfoExtractor } from './CollisionInfoExtractor';
import { CollisionResolver } from './CollisionResolver';
import type { ICollisionTarget } from './interfaces/ICollisionTarget';
import type { ICollisionSource } from './interfaces/ICollisionSource';

/**
 * Generic collision system that follows SOLID principles
 * 
 * Single Responsibility: Orchestrates collision handling
 * Open/Closed: Extensible through ICollisionTarget/ICollisionSource interfaces
 * Liskov Substitution: Any implementation of the interfaces works
 * Interface Segregation: Separate interfaces for sources and targets
 * Dependency Inversion: Depends on abstractions, not concrete classes
 */
export class GenericCollisionSystem {
    private readonly registry = new CollisionEntityRegistry();
    private readonly infoExtractor = new CollisionInfoExtractor();
    private readonly resolver = new CollisionResolver();

    /**
     * Register an entity that can receive damage
     */
    registerTarget(target: ICollisionTarget): void {
        this.registry.registerTarget(target);
    }

    /**
     * Register an entity that can cause damage
     */
    registerSource(source: ICollisionSource): void {
        this.registry.registerSource(source);
    }

    /**
     * Handle a physics collision event
     */
    handleCollision(event: CollisionEvent): void {
        const { bodyA, bodyB } = event;

        // Check for self-collision (same modular ship)
        if (this.isSelfCollision(bodyA.id, bodyB.id)) {
            console.log(`🛡️ Ignored self-collision within same entity`);
            return;
        }

        // Find entities involved in collision
        const entityA = this.registry.findEntityByPhysicsBodyId(bodyA.id);
        const entityB = this.registry.findEntityByPhysicsBodyId(bodyB.id);

        if (!entityA || !entityB) {
            console.log(`❌ Could not find entities for collision bodies: ${bodyA.id}, ${bodyB.id}`);
            return;
        }

        // Determine source and target
        const collision = this.identifyCollisionPair(entityA.id, entityB.id);
        if (!collision) {
            console.log(`ℹ️ No damage relationship between ${entityA.id} and ${entityB.id}`);
            return;
        }

        // Extract collision info
        const collisionInfo = this.infoExtractor.extractCollisionInfo(
            event,
            { id: collision.source.id, physicsBodyId: collision.source.physicsBodyId },
            { id: collision.target.id, physicsBodyId: collision.target.physicsBodyId }
        );

        // Resolve collision
        const result = this.resolver.resolveCollision(collision.source, collision.target, collisionInfo);

        // Handle post-collision cleanup
        if (result.sourceConsumed) {
            this.registry.unregisterSource(collision.source.id);
        }
        if (result.targetDestroyed) {
            this.registry.unregisterTarget(collision.target.id);
        }
    }

    /**
     * Check if this is a self-collision within the same compound body
     */
    private isSelfCollision(bodyIdA: string, bodyIdB: string): boolean {
        // Look for entities with the same modular ship ID
        const entityA = this.registry.findEntityByPhysicsBodyId(bodyIdA);
        const entityB = this.registry.findEntityByPhysicsBodyId(bodyIdB);

        if (!entityA || !entityB) return false;

        // Check if both bodies belong to the same modular ship
        const shipIdA = (entityA as any).modularShipId;
        const shipIdB = (entityB as any).modularShipId;

        return shipIdA && shipIdB && shipIdA === shipIdB;
    }

    /**
     * Identify which entity is the source (damage dealer) and which is the target
     */
    private identifyCollisionPair(entityIdA: string, entityIdB: string): {
        source: ICollisionSource;
        target: ICollisionTarget;
    } | null {
        const sourceA = this.registry.findSourceById(entityIdA);
        const targetA = this.registry.findTargetById(entityIdA);
        const sourceB = this.registry.findSourceById(entityIdB);
        const targetB = this.registry.findTargetById(entityIdB);

        // Case 1: A is source, B is target
        if (sourceA && targetB) {
            return { source: sourceA, target: targetB };
        }

        // Case 2: B is source, A is target  
        if (sourceB && targetA) {
            return { source: sourceB, target: targetA };
        }

        // Case 3: Both can be sources and targets (ship vs ship)
        // Prioritize the one with higher damage or different logic
        if (sourceA && targetB && sourceB && targetA) {
            // For ship-to-ship collisions, both take damage
            // Handle this as two separate collisions
            // For now, just pick one arbitrarily
            return { source: sourceA, target: targetB };
        }

        return null;
    }

    /**
     * Clean up destroyed entities
     */
    cleanup(): void {
        // This would be called periodically to clean up destroyed entities
        // Implementation depends on how entities report their destruction
    }
}
