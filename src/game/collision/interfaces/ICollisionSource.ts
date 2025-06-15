/**
 * Interface for entities that can cause damage through collisions
 */
export interface ICollisionSource {
  readonly id: string;
  readonly physicsBodyId: string;
  readonly sourceType: string; // 'laser', 'asteroid', 'ship', etc.
  readonly sourceId: string; // ID of the entity that created this (for friendly fire)
  readonly damage: number;

  /**
   * Called when this source collides with a target
   * @param targetId - The ID of the target that was hit
   * @returns true if this source should be removed after collision
   */
  onCollisionWith(targetId: string): boolean;
}
