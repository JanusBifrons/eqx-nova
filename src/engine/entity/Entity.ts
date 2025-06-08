import type { Vector2D } from '../interfaces/IPhysicsSystem';

export interface EntityOptions {
  color?: number;
  isStatic?: boolean;
  restitution?: number;
  friction?: number;
  frictionAir?: number;
  density?: number;
  isSensor?: boolean;
}

export class Entity {
  public readonly id: string;

  public readonly type: 'rectangle' | 'circle' | 'polygon';

  public readonly physicsBodyId: string;

  public readonly renderObjectId: string;

  private _position: Vector2D = { x: 0, y: 0 };

  private _angle: number = 0;

  private _isActive: boolean = true;

  constructor(
    id: string,
    type: 'rectangle' | 'circle' | 'polygon',
    physicsBodyId: string,
    renderObjectId: string
  ) {
    this.id = id;
    this.type = type;
    this.physicsBodyId = physicsBodyId;
    this.renderObjectId = renderObjectId;
  }

  public get position(): Vector2D {
    return { ...this._position };
  }

  public set position(pos: Vector2D) {
    this._position = pos;
  }

  public get angle(): number {
    return this._angle;
  }

  public set angle(angle: number) {
    this._angle = angle;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public setActive(active: boolean): void {
    this._isActive = active;
  }

  public destroy(): void {
    this._isActive = false;
  }
}
