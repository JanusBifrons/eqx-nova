import { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { ShipPartType } from '../interfaces/ICompositeShip';
import { ShipPart } from '../entities/ShipPart';

/**
 * ShipPartFactory - Creates individual ship parts
 * Follows Single Responsibility Principle: only creates ship parts
 * Follows Factory Pattern for consistent object creation
 */
export class ShipPartFactory {
  /**
   * Get color for a specific part type
   */
  private static getPartTypeColor(partType: ShipPartType): number {
    switch (partType) {
      case 'cockpit':
        return 0x00ffff; // Cyan
      case 'engine':
        return 0xff8000; // Orange
      case 'weapon':
        return 0xffd700; // Gold
      case 'armor':
        return 0x888888; // Gray
      case 'shield':
        return 0x0080ff; // Blue
      case 'cargo':
        return 0x8b4513; // Brown
      default:
        return 0x888888; // Default gray
    }
  }

  /**
   * Create a square ship part at the specified position
   */
  public static create(
    engine: Engine,
    position: Vector2D,
    relativePosition: Vector2D,
    size: number,
    partId: string,
    partType: ShipPartType = 'armor',
    options: {
      color?: number;
      density?: number;
      friction?: number;
      frictionAir?: number;
    } = {},
    onDestroy?: (part: ShipPart) => void
  ): ShipPart {
    // Get color based on part type if not specified
    const partColor =
      options.color ?? ShipPartFactory.getPartTypeColor(partType);

    // Create square entity for the ship part
    const entity = engine.createRectangle({
      x: position.x,
      y: position.y,
      width: size,
      height: size,
      options: {
        color: partColor,
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
      partType,
      relativePosition,
      size,
      partColor,
      onDestroy
    );
  }

  /**
   * Create multiple ship parts based on relative positions and part types
   */
  public static createMultiple(
    engine: Engine,
    centerPosition: Vector2D,
    relativePositions: Vector2D[],
    partTypes: ShipPartType[],
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
      const partType = partTypes[index] || 'armor';

      return this.create(
        engine,
        worldPos,
        relativePos,
        size,
        partId,
        partType,
        options,
        onDestroy
      );
    });
  }
}
