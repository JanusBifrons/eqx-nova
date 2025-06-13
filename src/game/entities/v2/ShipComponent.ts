import type { Entity } from '../../../engine/entity';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { IShipComponent, GridPosition } from './interfaces/IShipComponent';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simple ship component implementation
 * Following Single Responsibility Principle - only manages component state
 * Leverages existing Entity and Renderer systems maximally
 */
export class ShipComponent implements IShipComponent {
  private readonly _id: string;
  private readonly _entity: Entity;
  private readonly _gridPosition: GridPosition;
  private readonly _size: number;
  private readonly _maxHealth: number = 100;
  private _health: number;
  private _isDestroyed: boolean = false;
  private _flashTimer: number = 0;
  private _rendererSystem?: IRendererSystem;
  private readonly _originalColor: number = 0x888888;

  constructor(
    entity: Entity,
    gridPosition: GridPosition,
    size: number,
    id?: string
  ) {
    this._id = id || uuidv4();
    this._entity = entity;
    this._gridPosition = { ...gridPosition };
    this._size = size;
    this._health = this._maxHealth;
  }

  public get id(): string {
    return this._id;
  }

  public get entity(): Entity {
    return this._entity;
  }

  public get gridPosition(): GridPosition {
    return { ...this._gridPosition };
  }

  public get size(): number {
    return this._size;
  }

  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  public get health(): number {
    return this._health;
  }

  public get maxHealth(): number {
    return this._maxHealth;
  }

  public takeDamage(amount: number): boolean {
    if (this._isDestroyed) return false;

    this._health = Math.max(0, this._health - amount);
    this.flashDamage();

    if (this._health <= 0) {
      this._isDestroyed = true;
      this.updateDestroyedVisuals();
      return true; // Component destroyed
    }

    return false; // Component damaged but not destroyed
  }

  public destroy(): void {
    if (this._isDestroyed) return;

    this._isDestroyed = true;
    this._health = 0;
    this.updateDestroyedVisuals();
    // Don't destroy the entity immediately - let the ship handle cleanup
  }

  public flashDamage(): void {
    this._flashTimer = 100; // Flash for 100ms

    if (this._rendererSystem) {
      // Use existing renderer system's updateRenderObjectColor method
      this._rendererSystem.updateRenderObjectColor(
        this._entity.renderObjectId,
        0xffffff
      );
    }
  }

  private updateDestroyedVisuals(): void {
    if (this._rendererSystem) {
      // Use existing renderer system to change color for destroyed state
      this._rendererSystem.updateRenderObjectColor(
        this._entity.renderObjectId,
        0x444444
      );
    }
  }
  public update(deltaTime: number): void {
    // Update renderer with current entity position and rotation
    if (this._rendererSystem && !this._isDestroyed) {
      this._rendererSystem.updateRenderObject(
        this._entity.renderObjectId,
        this._entity.position,
        this._entity.angle
      );
    }

    if (this._flashTimer > 0) {
      this._flashTimer -= deltaTime;

      if (this._flashTimer <= 0 && this._rendererSystem && !this._isDestroyed) {
        // Return to original color using existing renderer system
        this._rendererSystem.updateRenderObjectColor(
          this._entity.renderObjectId,
          this._originalColor
        );
      }
    }
  }

  public setRendererSystem(rendererSystem: IRendererSystem): void {
    this._rendererSystem = rendererSystem;
  }
}
