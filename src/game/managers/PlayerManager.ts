import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IGameEngine } from '../interfaces/IGameEngine';
import type { CompositeShip } from '../entities/CompositeShip';

/**
 * PlayerManager - Handles player-specific logic
 * Following Single Responsibility Principle
 */
export class PlayerManager {
  private player: Entity | null = null;
  private compositeShip: CompositeShip | null = null;
  private useCompositeShip: boolean = true; // Flag to switch between ship types
  private rotation = 0;
  private thrust = false;
  private gameEngine: IGameEngine;

  private readonly ROTATION_SPEED = 0.003;
  private readonly THRUST_FORCE = 0.0005;

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;
  } public createPlayer(): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    if (this.useCompositeShip) {
      // Create composite ship (2 parts by default)
      this.compositeShip = this.gameEngine.createCompositeShip(
        { x: centerX, y: centerY },
        16, // Part size
        2   // Number of parts
      );
      this.player = null; // Clear traditional player
      console.log('Composite ship created at center:', centerX, centerY);
    } else {
      // Create traditional triangular ship
      this.player = this.gameEngine.createTriangularShip(
        { x: centerX, y: centerY },
        20
      );
      this.compositeShip = null; // Clear composite ship
      console.log('Traditional player created at center:', centerX, centerY);
    }    this.rotation = 0;
    this.thrust = false;

    console.log('World dimensions:', dimensions.width, 'x', dimensions.height);
  } public getPlayer(): Entity | null {
    if (this.useCompositeShip && this.compositeShip) {
      // For composite ships, return the first part's entity for compatibility
      const parts = this.compositeShip.parts;
      return parts.length > 0 ? parts[0].entity : null;
    }
    return this.player;
  }

  public getCompositeShip(): CompositeShip | null {
    return this.compositeShip;
  }

  public getRotation(): number {
    return this.rotation;
  }

  public setRotation(rotation: number): void {
    this.rotation = rotation;
  }
  public setThrust(thrust: boolean): void {
    this.thrust = thrust;
  } public update(deltaTime: number): void {
    if (this.useCompositeShip && this.compositeShip) {
      // Update composite ship internal state first
      this.compositeShip.update(deltaTime);
      // Then apply movement inputs
      this.updateCompositeMovement();
    } else if (this.player) {
      // Update traditional player
      this.updateMovement();
    }
  }

  private updateMovement(): void {
    if (!this.player) return;

    // Apply thrust
    if (this.thrust) {
      const forceX = Math.cos(this.rotation) * this.THRUST_FORCE;
      const forceY = Math.sin(this.rotation) * this.THRUST_FORCE;
      this.gameEngine.applyForceToEntity(this.player, { x: forceX, y: forceY });
    }
    // Apply rotation
    this.gameEngine.setEntityRotation(this.player, this.rotation);
  }

  private updateCompositeMovement(): void {
    if (!this.compositeShip) return;

    // Apply rotation to the composite ship
    this.compositeShip.setRotation(this.rotation);

    // Apply thrust to the composite ship
    this.compositeShip.setThrust(this.thrust);
  }

  public handleInput(key: string, pressed: boolean): void {
    if (pressed) {
      switch (key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
          this.rotation -= this.ROTATION_SPEED;
          break;
        case 'd':
        case 'arrowright':
          this.rotation += this.ROTATION_SPEED;
          break;
        case 'w':
        case 'arrowup':
          this.thrust = true;
          break;
      }
    } else {
      switch (key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.thrust = false;
          break;
      }
    }
  } public respawn(): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    this.rotation = 0;

    if (this.useCompositeShip && this.compositeShip) {
      // Respawn composite ship
      this.compositeShip.respawn({ x: centerX, y: centerY });
    } else if (this.player) {
      // Respawn traditional player
      this.gameEngine.setEntityPosition(this.player, { x: centerX, y: centerY });
      this.gameEngine.setEntityRotation(this.player, this.rotation);
      // Stop any movement
      this.gameEngine.applyForceToEntity(this.player, { x: 0, y: 0 });
    }
  }
  public destroy(): void {
    if (this.useCompositeShip && this.compositeShip) {
      // Destroy composite ship
      this.compositeShip.destroy();
      this.compositeShip = null;
    } else if (this.player) {
      // Destroy traditional player
      this.gameEngine.removeEntity(this.player.id);
      this.player = null;
    }
  }

  public getPlayerPosition(): Vector2D | null {
    if (this.useCompositeShip && this.compositeShip) {
      return this.compositeShip.centerPosition;
    } else if (this.player) {
      return this.player.position;
    }
    return null;
  }
}
