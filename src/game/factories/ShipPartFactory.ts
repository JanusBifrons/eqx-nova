import type { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import { ShipPart } from '../entities/ShipPart';

/**
 * ShipPartFactory - Creates individual ship parts
 * Follows Single Responsibility Principle: only creates ship parts
 * Follows Factory Pattern for consistent object creation
 */
export class ShipPartFactory {
  /**
   * Create a square ship part at the specified position
   */
  public static create(
    engine: Engine,
    position: Vector2D,
    relativePosition: Vector2D,
    size: number,
    partId: string,
    options: {
      color?: number;
      density?: number;
      friction?: number;
      frictionAir?: number;
    } = {},
    onDestroy?: (part: ShipPart) => void
  ): ShipPart {
    // Create square entity for the ship part
    const entity = engine.createRectangle({
      x: position.x,
      y: position.y,
      width: size,
      height: size,
      options: {
        color: options.color ?? 0x00ff00, // Default green
        isStatic: false,
        density: options.density ?? 0.001,
        friction: options.friction ?? 0.3,
        frictionAir: options.frictionAir ?? 0.01,
        restitution: 0.2,
      },
    });

    return new ShipPart(
      entity,
      partId,
      relativePosition,
      size,
      options.color ?? 0x00ff00,
      onDestroy
    );
  }

  /**
   * Create multiple ship parts based on relative positions
   */
  public static createMultiple(
    engine: Engine,
    centerPosition: Vector2D,
    relativePositions: Vector2D[],
    size: number,
    basePartId: string,
    options: {
      color?: number;
      density?: number;
      friction?: number;
      frictionAir?: number;
    } = {},
    onDestroy?: (part: ShipPart) => void
  ): ShipPart[] {
    return relativePositions.map((relativePos, index) => {
      const worldPos = {
        x: centerPosition.x + relativePos.x,
        y: centerPosition.y + relativePos.y,
      };

      const partId = `${basePartId}_${index}`;

      return this.create(
        engine,
        worldPos,
        relativePos,
        size,
        partId,
        options,
        onDestroy
      );
    });
  }
}
