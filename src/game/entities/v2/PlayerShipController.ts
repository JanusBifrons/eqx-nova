import type { IShip, IShipController } from './interfaces/IShip';

/**
 * Player Ship Controller - Handles player input for ship control
 * This controller receives input from InputManager and translates it to ship actions
 */
export class PlayerShipController implements IShipController {
  private _ship: IShip;
  private _id: string;
  private _isActive: boolean = true;

  // Player control state
  private _rotation = 0;
  private _isThrusting = false;

  // Player control parameters
  private readonly ROTATION_SPEED = 0.003;
  private readonly THRUST_FORCE = 0.004;

  constructor(ship: IShip) {
    this._ship = ship;
    this._id = `player_controller_${ship.id}`;
  }

  public get id(): string {
    return this._id;
  }

  public get ship(): IShip {
    return this._ship;
  }

  public get isActive(): boolean {
    return this._isActive && this._ship.isAlive;
  }

  public get rotation(): number {
    return this._rotation;
  }

  public setRotation(rotation: number): void {
    this._rotation = rotation;
  }

  public get isThrusting(): boolean {
    return this._isThrusting;
  }

  public setThrust(thrusting: boolean): void {
    this._isThrusting = thrusting;
  }

  /**
   * Get the controlled ship
   */
  public getShip(): IShip {
    return this._ship;
  }

  // IShipController interface implementation
  public turnLeft(): void {
    this._rotation -= this.ROTATION_SPEED;
  }

  public turnRight(): void {
    this._rotation += this.ROTATION_SPEED;
  }

  public thrust(): void {
    this._isThrusting = true;
  }

  public stopThrust(): void {
    this._isThrusting = false;
  }

  public fire(): boolean {
    if (!this.isActive || !this._ship.canFireWeapons()) {
      return false;
    }

    this._ship.recordWeaponsFired();
    return true;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Apply movement controls to ship
    this.applyMovementToShip();

    // Update the ship itself
    this._ship.update(deltaTime);
  }

  /**
   * Apply current control state to the ship
   */
  private applyMovementToShip(): void {
    // Apply angular velocity for rotation (physics-based)
    this._ship.setAngularVelocity(this._rotation);

    // Apply thrust
    if (this._isThrusting) {
      // Get current ship rotation for thrust direction
      const currentAngle = this._ship.rotation;
      const thrustVector = {
        x: Math.cos(currentAngle) * this.THRUST_FORCE,
        y: Math.sin(currentAngle) * this.THRUST_FORCE,
      };
      this._ship.applyForce(thrustVector);
    }
  }

  /**
   * Handle input events (called from InputManager)
   */
  public handleInput(key: string, pressed: boolean): void {
    if (!this.isActive) return;

    if (pressed) {
      switch (key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
          this.turnLeft();
          break;
        case 'd':
        case 'arrowright':
          this.turnRight();
          break;
        case 'w':
        case 'arrowup':
          this.thrust();
          break;
      }
    } else {
      switch (key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.stopThrust();
          break;
      }
    }
  }

  public destroy(): void {
    this._isActive = false;
  }
}
