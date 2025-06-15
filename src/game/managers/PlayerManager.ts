import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IGameEngine } from '../interfaces/IGameEngine';
import type { IModularShip } from '../entities/v2/interfaces/IModularShip';
import { ModularShipFactory } from '../entities/v2/ModularShipFactory';
import type { DebrisManager } from './DebrisManager';

/**
 * PlayerManager - Handles player-specific logic with new ModularShip system
 * Following Single Responsibility Principle
 */
export class PlayerManager {
  private player: Entity | null = null;
  private modularShip: IModularShip | null = null;
  private modularShipFactory: ModularShipFactory;
  private debrisManager: DebrisManager | null = null;

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

    // Set up registration callbacks for split ships/debris
    // Note: These will be properly connected when the game managers are available
    this.modularShipFactory.setRegistrationCallbacks(
      (ship: any) => {
        console.log(`🚀 New ship created from splitting (ID: ${ship.id}) - needs proper registration`);
        // TODO: This should be connected to the actual game managers when available
        // For now, just log that a new ship was created
      },
      (debrisData: any) => {
        console.log(`🗑️ New debris created from splitting (${debrisData.blocks?.length || 0} blocks) - needs proper registration`);
        // TODO: This should be connected to the debris manager when available
        // For now, just log that debris was created
      }
    );
  }

  public createPlayer(): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Create complex modular ship player with advanced weapon systems
    console.log(
      '� Creating COMPLEX MODULAR SHIP for player with advanced weapon systems'
    );
    this.modularShip = this.modularShipFactory.createPlayerFlagship(
      {
        x: centerX,
        y: centerY,
      },
      this.debrisManager
    );

    // Set up respawn callback
    if (this.modularShip && 'setRespawnCallback' in this.modularShip) {
      (this.modularShip as any).setRespawnCallback(() => {
        console.log('🔄 Respawn requested from ship');
        this.handleRespawnRequest();
      });
    }

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

  public setDebrisManager(debrisManager: DebrisManager): void {
    this.debrisManager = debrisManager;
  }

  /**
   * Set up proper registration callbacks for ship splitting
   * This should be called after all game managers are initialized
   */
  public setupSplitCallbacks(
    shipRegistrationCallback: (ship: any) => void,
    debrisRegistrationCallback?: (debrisData: any) => void
  ): void {
    this.modularShipFactory.setRegistrationCallbacks(
      shipRegistrationCallback,
      debrisRegistrationCallback
    );
    console.log('🔧 Split callbacks configured for PlayerManager');
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

    // Create new complex modular ship
    console.log('� Respawning with COMPLEX MODULAR SHIP');
    this.modularShip = this.modularShipFactory.createPlayerFlagship(
      {
        x: centerX,
        y: centerY,
      },
      this.debrisManager
    );

    this.rotation = 0;
    this.thrust = false;

    console.log('🔄 Player respawned at center');
  }

  private handleRespawnRequest(): void {
    console.log('🔄 Handling respawn request');

    // Force respawn even if ship is still "alive" (just broken apart)
    if (this.modularShip) {
      const dimensions = this.gameEngine.getWorldDimensions();
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // Detach debris (keep broken pieces in physics world) instead of destroying everything
      if ('detachDebris' in this.modularShip) {
        (this.modularShip as any).detachDebris();
      } else {
        // Fallback to full destroy if detachDebris not available
        this.modularShip.destroy();
      }

      // Create new complex modular ship
      console.log('� Respawning with new COMPLEX MODULAR SHIP');
      this.modularShip = this.modularShipFactory.createPlayerFlagship(
        {
          x: centerX,
          y: centerY,
        },
        this.debrisManager
      );

      // Set up respawn callback for the new ship
      if (this.modularShip && 'setRespawnCallback' in this.modularShip) {
        (this.modularShip as any).setRespawnCallback(() => {
          console.log('🔄 Respawn requested from new ship');
          this.handleRespawnRequest();
        });
      }

      this.rotation = 0;
      this.thrust = false;

      console.log('🔄 Player respawned at center, old debris left floating');
    }
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
