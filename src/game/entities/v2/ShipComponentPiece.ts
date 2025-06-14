import type {
  IPhysicsSystem,
  IPhysicsBody,
  Vector2D,
} from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import { v4 as uuidv4 } from 'uuid';

/**
 * ShipComponentPiece - Represents an individual piece of a modular ship
 * Can exist as part of a compound ship or as independent debris
 * Handles its own collision detection and visual flash effects
 */
export class ShipComponentPiece {
  private readonly _id: string;
  private readonly _physicsSystem: IPhysicsSystem;
  private readonly _rendererSystem: IRendererSystem;

  private _physicsBody: IPhysicsBody | null = null;
  private _renderObjectId: string | null = null;

  // Flash effect state
  private _isFlashing: boolean = false;
  private _flashTimer: number = 0;
  private _originalColor: number;
  private _flashDuration: number = 200; // milliseconds
  private _flashColor: number = 0xffffff; // white

  // Component properties
  private _size: number;
  private _color: number;
  private _isAutonomous: boolean = false; // true when it's debris, false when part of ship

  constructor(
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    position: Vector2D,
    size: number,
    color: number,
    id?: string
  ) {
    this._id = id || uuidv4();
    this._physicsSystem = physicsSystem;
    this._rendererSystem = rendererSystem;
    this._size = size;
    this._color = color;
    this._originalColor = color;

    this.createPhysicsBody(position);
    this.createRenderObject(position);

    console.log(`🧩 Created ship component piece: ${this._id}`);
  }
  private createPhysicsBody(position: Vector2D): void {
    this._physicsBody = this._physicsSystem.createRectangle(
      position.x,
      position.y,
      this._size,
      this._size,
      {
        isStatic: false,
        density: 0.001,
        friction: 0.1,
        restitution: 0.3,
        frictionAir: 0.02,
      }
    );

    // Note: Collision detection will be handled at a higher level
    // Individual pieces will be notified when they should flash
  }

  private createRenderObject(position: Vector2D): void {
    const renderObject: any = {
      id: this._id,
      type: 'rectangle',
      position: { x: position.x, y: position.y },
      angle: 0,
      width: this._size,
      height: this._size,
      color: this._color,
    };

    this._rendererSystem.createRenderObject(renderObject);
    this._renderObjectId = this._id;
  }

  /**
   * Trigger a flash effect when this piece is hit or collides
   */
  public triggerFlash(): void {
    if (this._isFlashing) return; // Don't interrupt existing flash

    this._isFlashing = true;
    this._flashTimer = this._flashDuration;

    // Change render object to flash color
    if (this._renderObjectId) {
      this._rendererSystem.updateRenderObjectColor(
        this._renderObjectId,
        this._flashColor
      );
    }

    console.log(`⚡ Component ${this._id} flashing!`);
  }

  /**
   * Update the component (handle flash timing, position sync, etc.)
   */
  public update(deltaTime: number): void {
    // Handle flash effect timing
    if (this._isFlashing) {
      this._flashTimer -= deltaTime;

      if (this._flashTimer <= 0) {
        // Flash finished, restore original color
        this._isFlashing = false;
        if (this._renderObjectId) {
          this._rendererSystem.updateRenderObjectColor(
            this._renderObjectId,
            this._originalColor
          );
        }
      }
    }

    // If autonomous (debris), sync render position with physics
    if (this._isAutonomous && this._physicsBody && this._renderObjectId) {
      this._rendererSystem.updateRenderObject(
        this._renderObjectId,
        this._physicsBody.position,
        this._physicsBody.angle
      );
    }
  }

  /**
   * Make this component autonomous (becomes debris)
   */
  public makeAutonomous(): void {
    this._isAutonomous = true;
    console.log(`🗑️ Component ${this._id} is now autonomous debris`);
  }

  /**
   * Apply force to this component (for thrust, explosions, etc.)
   */
  public applyForce(force: Vector2D): void {
    if (this._physicsBody) {
      this._physicsSystem.applyForce(this._physicsBody, force);
    }
  }

  /**
   * Set velocity for dramatic break-apart effects
   */
  public setVelocity(velocity: Vector2D): void {
    if (this._physicsBody) {
      this._physicsSystem.setVelocity(this._physicsBody, velocity);
    }
  }

  /**
   * Set angular velocity for spinning effects
   */
  public setAngularVelocity(angularVelocity: number): void {
    if (this._physicsBody) {
      this._physicsSystem.setAngularVelocity(
        this._physicsBody,
        angularVelocity
      );
    }
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get physicsBody(): IPhysicsBody | null {
    return this._physicsBody;
  }

  public get renderObjectId(): string | null {
    return this._renderObjectId;
  }

  public get position(): Vector2D {
    return this._physicsBody?.position || { x: 0, y: 0 };
  }

  public get isAutonomous(): boolean {
    return this._isAutonomous;
  }

  public get isFlashing(): boolean {
    return this._isFlashing;
  }

  /**
   * Destroy this component (remove from physics and rendering)
   */
  public destroy(): void {
    if (this._physicsBody) {
      this._physicsSystem.removeBody(this._physicsBody);
      this._physicsBody = null;
    }

    if (this._renderObjectId) {
      this._rendererSystem.removeRenderObject(this._renderObjectId);
      this._renderObjectId = null;
    }

    console.log(`🧩 Destroyed component piece: ${this._id}`);
  }
}
