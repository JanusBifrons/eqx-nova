import type { Entity } from '../../engine/entity';
import type { IGameEngine } from '../interfaces/IGameEngine';

/**
 * PlayerManager - Handles player-specific logic
 * Following Single Responsibility Principle
 */
export class PlayerManager {
  private player: Entity | null = null;
  private rotation = 0;
  private thrust = false;
  private gameEngine: IGameEngine;

  private readonly ROTATION_SPEED = 0.003;
  private readonly THRUST_FORCE = 0.0005;

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;
  }

  public createPlayer(): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    this.player = this.gameEngine.createTriangularShip(
      { x: centerX, y: centerY },
      20
    );
    this.rotation = 0;
    this.thrust = false;

    console.log('Player created at center:', centerX, centerY);
  }

  public getPlayer(): Entity | null {
    return this.player;
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
  public update(_deltaTime: number): void {
    if (!this.player) return;

    this.updateMovement();
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
    if (!this.player) return;

    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    this.rotation = 0;
    this.gameEngine.setEntityPosition(this.player, { x: centerX, y: centerY });
    this.gameEngine.setEntityRotation(this.player, this.rotation);

    // Stop any movement
    this.gameEngine.applyForceToEntity(this.player, { x: 0, y: 0 });
  }

  public destroy(): void {
    if (this.player) {
      this.gameEngine.removeEntity(this.player.id);
      this.player = null;
    }
  }
}
