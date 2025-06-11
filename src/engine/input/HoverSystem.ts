import type { Vector2D, IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import type { ICameraSystem } from '../interfaces/ICamera';
import type { Entity } from '../entity/Entity';

/**
 * HoverSystem - Detects and manages entity hovering
 * Following Single Responsibility Principle by focusing only on hover detection
 */
export class HoverSystem {
  private physicsSystem: IPhysicsSystem | null = null;

  private cameraSystem: ICameraSystem | null = null;

  private entityManager: any = null; // Will be properly typed when we have access to EntityManager

  private hoveredEntity: Entity | null = null;

  private isInitialized = false;

  public initialize(
    physicsSystem: IPhysicsSystem,
    cameraSystem: ICameraSystem,
    entityManager: any
  ): void {
    this.physicsSystem = physicsSystem;
    this.cameraSystem = cameraSystem;
    this.entityManager = entityManager;
    this.isInitialized = true;
  }

  public destroy(): void {
    this.physicsSystem = null;
    this.cameraSystem = null;
    this.entityManager = null;
    this.hoveredEntity = null;
    this.isInitialized = false;
  } /**
   * Update hover detection based on current mouse position
   * @param screenMousePosition Mouse position in screen coordinates
   * @returns The entity currently being hovered, or null if none
   */

  public updateHover(screenMousePosition: Vector2D | null): Entity | null {
    if (
      !this.isInitialized ||
      !this.physicsSystem ||
      !this.cameraSystem ||
      !screenMousePosition
    ) {
      this.hoveredEntity = null;

      return null;
    }
    // Convert screen position to world position
    const worldPosition = this.cameraSystem.screenToWorld(screenMousePosition);

    // Debug logging (can be removed later)
    if (Math.random() < 0.01) {
      // Log occasionally to avoid spam
      console.log(
        '🔍 Hover system: mouse at screen',
        screenMousePosition,
        'world',
        worldPosition
      );
    }
    // Find the entity at this world position
    const newHoveredEntity = this.findEntityAtPosition(worldPosition);

    // Update hovered entity
    this.hoveredEntity = newHoveredEntity;

    return this.hoveredEntity;
  }

  /**
   * Get the currently hovered entity
   */
  public getHoveredEntity(): Entity | null {
    return this.hoveredEntity;
  } /**
   * Find an entity at the given world position
   * Uses physics body bounds for efficient detection
   */

  private findEntityAtPosition(worldPosition: Vector2D): Entity | null {
    if (!this.physicsSystem || !this.entityManager) return null;

    // Get all physics bodies
    const allBodies = this.physicsSystem.getAllBodies();

    // Debug: log body count occasionally
    if (Math.random() < 0.01) {
      console.log('🔍 Checking', allBodies.length, 'physics bodies for hover');
    }
    // Check each body to see if the mouse position is within its bounds
    for (const body of allBodies) {
      // Skip static bodies (like boundaries)
      if (this.isStaticBody(body)) continue;

      // Check if point is within body bounds using a simple bounding box check
      if (this.isPointInBodyBounds(worldPosition, body)) {
        // Find the corresponding entity
        const entity = this.entityManager.getEntityByPhysicsBodyId(body.id);

        if (entity) {
          console.log(
            '🎯 Found hoverable entity:',
            entity.id,
            'type:',
            entity.type
          );

          return entity;
        }
      }
    }
    return null;
  }

  /**
   * Check if a physics body is static (like world boundaries)
   * We can extend this logic based on how static bodies are identified in the physics system
   */
  private isStaticBody(_body: any): boolean {
    // This is a simplified check - we might need to access body properties differently
    // depending on the physics system implementation
    return false; // For now, check all bodies
  }

  /**
   * Check if a point is within a physics body's bounds
   * Uses a simple radius-based approach for performance
   */
  private isPointInBodyBounds(point: Vector2D, body: any): boolean {
    const position = body.position;

    // Use a more generous hover radius for better UX
    const hoverRadius = 60; // Increased for easier hovering, especially on asteroids

    const distance = Math.sqrt(
      Math.pow(point.x - position.x, 2) + Math.pow(point.y - position.y, 2)
    );

    return distance <= hoverRadius;
  }
}
