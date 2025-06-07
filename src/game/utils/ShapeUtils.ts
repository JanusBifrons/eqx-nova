import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

/**
 * ShapeUtils - Utility functions for generating shapes
 * Following Single Responsibility Principle - only handles shape generation
 */
export class ShapeUtils {
  /**
   * Generate vertices for a triangle (for player ship)
   * @param size Base size of the triangle
   * @returns Array of vertices relative to center, pointing right (0 degrees)
   */
  public static createTriangle(size: number = 20): Vector2D[] {
    const height = size * 1.5;
    const width = size;

    return [
      { x: height / 2, y: 0 }, // Right point (nose of ship pointing right)
      { x: -height / 2, y: -width / 2 }, // Left bottom
      { x: -height / 2, y: width / 2 }, // Left top
    ];
  }

  /**
   * Generate vertices for an irregular polygon (for asteroids)
   * @param baseRadius Base radius for the polygon
   * @param vertexCount Number of vertices
   * @param irregularity How irregular the shape should be (0-1)
   * @returns Array of vertices relative to center
   */
  public static createIrregularPolygon(
    baseRadius: number,
    vertexCount: number = 8,
    irregularity: number = 0.4
  ): Vector2D[] {
    const vertices: Vector2D[] = [];
    const angleStep = (Math.PI * 2) / vertexCount;

    for (let i = 0; i < vertexCount; i++) {
      const angle = i * angleStep;
      // Add some randomness to the radius
      const radiusVariation = 1 + (Math.random() - 0.5) * irregularity;
      const radius = baseRadius * radiusVariation;

      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }    return vertices;
  }

  /**
   * Generate a random position at the edge of the screen
   * @param screenWidth Screen width
   * @param screenHeight Screen height
   * @param margin Margin from the edge
   * @returns Position at screen edge
   */
  public static getRandomEdgePosition(
    screenWidth: number,
    screenHeight: number,
    margin: number = 50
  ): Vector2D {
    const edge = Math.floor(Math.random() * 4);

    switch (edge) {
      case 0: // Top
        return {
          x: Math.random() * screenWidth,
          y: -margin,
        };
      case 1: // Right
        return {
          x: screenWidth + margin,
          y: Math.random() * screenHeight,
        };
      case 2: // Bottom
        return {
          x: Math.random() * screenWidth,
          y: screenHeight + margin,
        };
      default: // Left
        return {
          x: -margin,
          y: Math.random() * screenHeight,
        };
    }
  }
}
