import type { CollisionEvent } from '../../engine/interfaces/IPhysicsSystem';

/**
 * Extracted collision information for easy processing
 */
export interface CollisionInfo {
    sourceEntityId: string;
    targetEntityId: string;
    sourcePhysicsBodyId: string;
    targetPhysicsBodyId: string;
    targetPartInfo: {
        partIndex: number;
        componentId?: string;
    } | null;
    contactPoint: { x: number; y: number };
}

/**
 * Service responsible for extracting collision information from physics events
 * Follows Single Responsibility Principle
 */
export class CollisionInfoExtractor {
    /**
     * Extract structured collision information from a physics collision event
     */
    extractCollisionInfo(
        event: CollisionEvent,
        sourceEntity: { id: string; physicsBodyId: string },
        targetEntity: { id: string; physicsBodyId: string }
    ): CollisionInfo {
        const { bodyA, bodyB, partInfoA, partInfoB, contactPoint } = event;

        // Determine which body belongs to source vs target
        let targetPartInfo = null;

        if (sourceEntity.physicsBodyId === bodyA.id && partInfoB) {
            // Source is bodyA, target is bodyB
            targetPartInfo = {
                partIndex: partInfoB.partIndex,
                componentId: partInfoB.componentId || undefined
            };
        } else if (sourceEntity.physicsBodyId === bodyB.id && partInfoA) {
            // Source is bodyB, target is bodyA
            targetPartInfo = {
                partIndex: partInfoA.partIndex,
                componentId: partInfoA.componentId || undefined
            };
        }

        return {
            sourceEntityId: sourceEntity.id,
            targetEntityId: targetEntity.id,
            sourcePhysicsBodyId: sourceEntity.physicsBodyId,
            targetPhysicsBodyId: targetEntity.physicsBodyId,
            targetPartInfo,
            contactPoint
        };
    }
}
