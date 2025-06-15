import type { Vector2D } from '../../../engine/interfaces/IPhysicsSystem';
import type { ICollisionTarget } from '../interfaces/ICollisionTarget';
import type { IModularShip } from '../../entities/v2/interfaces/IModularShip';

/**
 * Adapter to make IModularShip compatible with the generic collision system
 * Follows Adapter Pattern and Single Responsibility Principle
 */
export class ModularShipCollisionAdapter implements ICollisionTarget {
  private readonly ship: IModularShip;

  constructor(ship: IModularShip) {
    this.ship = ship;
  }

  get id(): string {
    return this.ship.id;
  }
  get physicsBodyId(): string {
    return this.ship.physicsBodyId || '';
  }

  get position(): Vector2D {
    return this.ship.position;
  }

  takeDamage(
    componentId: string | null,
    partIndex: number | null,
    damage: number,
    damageSource: string
  ): boolean {
    console.log(
      `🎯 ModularShip ${this.id} taking ${damage} damage from ${damageSource}`
    );

    // Use component ID if available (preferred)
    if (componentId && this.ship.takeDamageAtComponentId) {
      return this.ship.takeDamageAtComponentId(componentId, damage);
    }

    // Fallback to part index
    if (partIndex !== null && this.ship.takeDamageAtPartIndex) {
      return this.ship.takeDamageAtPartIndex(partIndex, damage);
    }

    // Final fallback to general damage
    console.warn(
      `⚠️ No specific damage method available, using general damage`
    );
    return false; // ModularShip doesn't have a general damage method yet
  }

  takeDamageAtPosition(
    position: Vector2D,
    damage: number,
    damageSource: string
  ): boolean {
    console.log(
      `🎯 ModularShip ${this.id} taking ${damage} positional damage from ${damageSource}`
    );

    if (this.ship.takeDamageAtPosition) {
      return this.ship.takeDamageAtPosition(position, damage);
    }

    return false;
  }

  shouldTakeDamageFrom(sourceId: string, _sourceType: string): boolean {
    // Prevent friendly fire - ships don't damage themselves
    if (sourceId === this.id) {
      return false;
    }

    // Add other friendly fire logic here (same faction, etc.)
    return true;
  }

  isDestroyed(): boolean {
    return this.ship.isDestroyed;
  }
}
