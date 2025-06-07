import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';

/**
 * Utility functions for generating various game shapes
 * Following Single Responsibility Principle - each function has one purpose
 */
export class ShapeUtils {
  /**
   * Generate a triangular ship shape
   * @param size The size of the ship
   * @returns Array of vertices for a triangle pointing upward
   */
  public static generateTriangleShip(size: number = 20): Vector2D[] {
    const halfBase = size * 0.6;
    const height = size;

    return [
      { x: 0, y: -height / 2 }, // Top point
      { x: -halfBase, y: height / 2 }, // Bottom left
      { x: halfBase, y: height / 2 }, // Bottom right
    ];
  }

  /**
   * Generate a random asteroid shape with irregular edges
   * @param baseRadius The base radius of the asteroid
   * @param irregularity How irregular the shape should be (0-1, where 0 is circular)
   * @param vertices Number of vertices to generate
   * @returns Array of vertices for an irregular polygon
   */
  public static generateRandomAsteroid(
    baseRadius: number = 20,
    irregularity: number = 0.3,
    vertices: number = 8
  ): Vector2D[] {
    const points: Vector2D[] = [];
    const angleStep = (Math.PI * 2) / vertices;

    for (let i = 0; i < vertices; i++) {
      const angle = i * angleStep;

      // Add some randomness to the radius and angle
      const radiusVariation = 1 + (Math.random() - 0.5) * irregularity;
      const angleVariation = (Math.random() - 0.5) * irregularity * 0.5;

      const finalAngle = angle + angleVariation;
      const finalRadius = baseRadius * radiusVariation;

      points.push({
        x: Math.cos(finalAngle) * finalRadius,
        y: Math.sin(finalAngle) * finalRadius,
      });
    }

    return points;
  }

  /**
   * Generate a simple bullet/laser shape
   * @param length Length of the bullet
   * @param width Width of the bullet
   * @returns Array of vertices for a bullet shape
   */
  public static generateBulletShape(
    length: number = 8,
    width: number = 2
  ): Vector2D[] {
    const halfLength = length / 2;
    const halfWidth = width / 2;

    return [
      { x: 0, y: -halfLength }, // Point
      { x: halfWidth, y: halfLength }, // Bottom right
      { x: -halfWidth, y: halfLength }, // Bottom left
    ];
  }

  /**
   * Scale a shape by a given factor
   * @param vertices Original vertices
   * @param scale Scale factor
   * @returns Scaled vertices
   */
  public static scaleShape(vertices: Vector2D[], scale: number): Vector2D[] {
    return vertices.map(vertex => ({
      x: vertex.x * scale,
      y: vertex.y * scale,
    }));
  }

  /**
   * Rotate a shape by a given angle
   * @param vertices Original vertices
   * @param angle Rotation angle in radians
   * @returns Rotated vertices
   */
  public static rotateShape(vertices: Vector2D[], angle: number): Vector2D[] {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return vertices.map(vertex => ({
      x: vertex.x * cos - vertex.y * sin,
      y: vertex.x * sin + vertex.y * cos,
    }));
  }
}
