import type { Vector2D } from '../../../engine/interfaces/IPhysicsSystem';

/**
 * Interface for entities that can be targets of collisions
 */
export interface ICollisionTarget {
    readonly id: string;
    readonly physicsBodyId: string;
    readonly position: Vector2D;

    /**
     * Take damage at a specific component/part
     * @param componentId - Unique identifier for the component (preferred)
     * @param partIndex - Fallback index-based targeting
     * @param damage - Amount of damage to apply
     * @param damageSource - What caused the damage (for different damage types)
     * @returns true if the entire entity was destroyed
     */
    takeDamage(
        componentId: string | null,
        partIndex: number | null,
        damage: number,
        damageSource: string
    ): boolean;

    /**
     * Take damage at a world position (fallback when no specific part is identified)
     */
    takeDamageAtPosition(position: Vector2D, damage: number, damageSource: string): boolean;

    /**
     * Whether this entity should take damage from the given source
     * (e.g., friendly fire protection)
     */
    shouldTakeDamageFrom(sourceId: string, sourceType: string): boolean;

    /**
     * Whether this entity is destroyed/should be removed
     */
    isDestroyed(): boolean;
}
