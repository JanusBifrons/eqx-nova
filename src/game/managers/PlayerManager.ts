import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IGameEngine } from '../interfaces/IGameEngine';
import type { IModularShip } from '../entities/v2/interfaces/IModularShip';
import { ModularShipFactory } from '../entities/v2/ModularShipFactory';

/**
 * PlayerManager - Handles player-specific logic with new ModularShip system
 * Following Single Responsibility Principle
 */
export class PlayerManager {
  private player: Entity | null = null;
  private modularShip: IModularShip | null = null;
  private modularShipFactory: ModularShipFactory;

  private rotation = 0;
  private thrust = false;
  private gameEngine: IGameEngine;

  private readonly ROTATION_SPEED = 0.003;
  private readonly THRUST_FORCE = 0.004; // Reduced from 0.008 for slower ship movement

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;

    // Access the underlying engine systems through the adapter
    const engineAdapter = gameEngine as any;
    const engine = engineAdapter.engine;

    // Create factory for modular ships
    this.modularShipFactory = new ModularShipFactory(
      engine.getPhysicsSystem(),
      engine.getRendererSystem(),
      engine.getEntityManager()
    );
  }

  public createPlayer(): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Create modular ship player
    this.modularShip = this.modularShipFactory.createPlayerFlagship({
      x: centerX,
      y: centerY,
    });

    this.player = null; // We use modular ship instead of traditional player
    console.log('🚀 Modular player ship created at center:', centerX, centerY);
  }

  public hasPlayer(): boolean {
    return this.modularShip !== null && this.modularShip.isAlive;
  }

  public getPlayer(): Entity | null {
    return this.player;
  }

  public getModularShip(): IModularShip | null {
    return this.modularShip;
  }

  public getPlayerPosition(): Vector2D | null {
    if (this.modularShip) {
      return this.modularShip.position;
    }

    if (this.player) {
      return this.player.position;
    }

    return null;
  }

  public getRotation(): number {
    return this.rotation;
  }

  public setRotation(rotation: number): void {
    this.rotation = rotation;
  }

  public setThrust(thrust: boolean): void {
    this.thrust = thrust;
  }

  public update(deltaTime: number): void {
    if (this.modularShip) {
      this.modularShip.update(deltaTime);
      this.applyPlayerInput();
    }

    // Update traditional player if present
    if (this.player) {
      this.updateTraditionalPlayer();
    }
  }

  private applyPlayerInput(): void {
    if (!this.modularShip) return;

    // Apply angular velocity for rotation (physics-based)
    // The rotation variable is now used as angular velocity
    this.modularShip.setAngularVelocity(this.rotation);

    // Apply thrust
    if (this.thrust) {
      // Get current ship rotation for thrust direction
      const currentAngle = this.modularShip.rotation;
      const thrustVector = {
        x: Math.cos(currentAngle) * this.THRUST_FORCE,
        y: Math.sin(currentAngle) * this.THRUST_FORCE,
      };
      this.modularShip.applyForce(thrustVector);
    }
  }

  private updateTraditionalPlayer(): void {
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
  }

  public respawn(): void {
    if (!this.modularShip || this.modularShip.isAlive) return;

    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Destroy old ship
    this.modularShip.destroy();

    // Create new ship
    this.modularShip = this.modularShipFactory.createPlayerFlagship({
      x: centerX,
      y: centerY,
    });

    this.rotation = 0;
    this.thrust = false;

    console.log('🔄 Player respawned at center');
  }

  public destroy(): void {
    if (this.modularShip) {
      this.modularShip.destroy();
      this.modularShip = null;
    }

    if (this.player) {
      this.gameEngine.removeEntity(this.player.id);
      this.player = null;
    }
  }
}
