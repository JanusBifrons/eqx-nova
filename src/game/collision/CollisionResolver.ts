import type { ICollisionTarget } from './interfaces/ICollisionTarget';
import type { ICollisionSource } from './interfaces/ICollisionSource';
import type { CollisionInfo } from './CollisionInfoExtractor';

/**
 * Handles the actual collision resolution between source and target
 * Follows Single Responsibility Principle
 */
export class CollisionResolver {
  /**
   * Resolve a collision between a source and target entity
   * @param source - The entity causing damage
   * @param target - The entity receiving damage
   * @param collisionInfo - Extracted collision information
   * @returns Object indicating what happened in the collision
   */
  resolveCollision(
    source: ICollisionSource,
    target: ICollisionTarget,
    collisionInfo: CollisionInfo
  ): CollisionResult {
    console.log(
      `🎯 Resolving collision: ${source.sourceType} ${source.id} -> ${target.id}`
    );

    // Check for friendly fire
    if (!target.shouldTakeDamageFrom(source.sourceId, source.sourceType)) {
      console.log(
        `🚫 Friendly fire prevented: ${source.sourceType} from ${source.sourceId}`
      );
      return {
        targetDestroyed: false,
        sourceConsumed: false,
        friendlyFire: true,
      };
    }

    // Apply damage to target
    let targetDestroyed = false;
    const { targetPartInfo } = collisionInfo;

    if (targetPartInfo) {
      // Precise part-based damage
      console.log(
        `🎯 Precise damage: componentId=${targetPartInfo.componentId}, partIndex=${targetPartInfo.partIndex}`
      );
      targetDestroyed = target.takeDamage(
        targetPartInfo.componentId || null,
        targetPartInfo.partIndex,
        source.damage,
        source.sourceType
      );
    } else {
      // Fallback to position-based damage
      console.log(
        `🎯 Position-based damage at (${collisionInfo.contactPoint.x}, ${collisionInfo.contactPoint.y})`
      );
      targetDestroyed = target.takeDamageAtPosition(
        collisionInfo.contactPoint,
        source.damage,
        source.sourceType
      );
    }

    // Notify source of collision
    const sourceConsumed = source.onCollisionWith(target.id);

    console.log(
      `💥 Collision resolved: target ${targetDestroyed ? 'DESTROYED' : 'damaged'}, ` +
        `source ${sourceConsumed ? 'consumed' : 'continues'}`
    );

    return {
      targetDestroyed,
      sourceConsumed,
      friendlyFire: false,
    };
  }
}

export interface CollisionResult {
  targetDestroyed: boolean;
  sourceConsumed: boolean;
  friendlyFire: boolean;
}
