import type { Entity } from '../../engine/entity';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IGameEngine } from '../interfaces/IGameEngine';
import type {
  IShip,
  IShipController,
  IShipConfiguration,
} from '../entities/v2/interfaces/IShip';
import { UniversalShipFactory } from '../entities/v2/UniversalShipFactory';
import { PlayerShipController } from '../entities/v2/PlayerShipController';
import type { DebrisManager } from './DebrisManager';

/**
 * PlayerManager - Handles player-specific logic with unified ship system
 * Following Single Responsibility Principle
 */
export class PlayerManager {
  private player: Entity | null = null;
  private playerShip: IShip | null = null;
  private playerController: IShipController | null = null;
  private universalShipFactory: UniversalShipFactory;
  private debrisManager: DebrisManager | null = null;

  private gameEngine: IGameEngine;

  constructor(gameEngine: IGameEngine) {
    this.gameEngine = gameEngine;

    // Access the underlying engine systems through the adapter
    const engineAdapter = gameEngine as any;
    const engine = engineAdapter.engine;

    // Create universal factory for all ships
    this.universalShipFactory = new UniversalShipFactory(
      engine.getPhysicsSystem(),
      engine.getRendererSystem(),
      engine.getEntityManager()
    );

    // Set up registration callbacks for split ships/debris
    this.universalShipFactory.setRegistrationCallbacks(
      (ship: IShip) => {
        console.log(
          `🚀 New ship created from splitting (ID: ${ship.id}) - needs proper registration`
        );
        // TODO: This should be connected to the actual game managers when available
      },
      (debrisData: any) => {
        console.log(
          `🗑️ New debris created from splitting (${debrisData.blocks?.length || 0} blocks) - needs proper registration`
        );
        // TODO: This should be connected to the debris manager when available
      }
    );
  }

  public createPlayer(): void {
    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Create player ship using unified factory
    console.log('🚀 Creating player flagship using unified ship system');

    const shipConfig: IShipConfiguration = {
      position: { x: centerX, y: centerY },
      shipType: 'player_flagship',
    };

    this.playerShip = this.universalShipFactory.createShip(
      shipConfig,
      this.debrisManager
    );

    // Create player controller
    this.playerController = new PlayerShipController(this.playerShip);

    this.player = null; // We use modular ship instead of traditional player
    console.log(
      '🚀 Player ship and controller created at center:',
      centerX,
      centerY
    );
  }

  public hasPlayer(): boolean {
    return this.playerShip !== null && this.playerShip.isAlive;
  }

  public getPlayer(): Entity | null {
    return this.player;
  }

  public getPlayerShip(): IShip | null {
    return this.playerShip;
  }

  public getPlayerController(): IShipController | null {
    return this.playerController;
  }

  public getPlayerPosition(): Vector2D | null {
    if (this.playerShip) {
      return this.playerShip.position;
    }

    if (this.player) {
      return this.player.position;
    }

    return null;
  }

  public getRotation(): number {
    if (this.playerController && 'rotation' in this.playerController) {
      return (this.playerController as any).rotation;
    }
    return 0;
  }

  public setRotation(rotation: number): void {
    if (this.playerController && 'setRotation' in this.playerController) {
      (this.playerController as any).setRotation(rotation);
    }
  }

  public setThrust(thrust: boolean): void {
    if (this.playerController && 'setThrust' in this.playerController) {
      (this.playerController as any).setThrust(thrust);
    }
  }

  public setDebrisManager(debrisManager: DebrisManager): void {
    this.debrisManager = debrisManager;
  }

  /**
   * Set up proper registration callbacks for ship splitting
   * This should be called after all game managers are initialized
   */
  public setupSplitCallbacks(
    shipRegistrationCallback: (ship: IShip) => void,
    debrisRegistrationCallback?: (debrisData: any) => void
  ): void {
    this.universalShipFactory.setRegistrationCallbacks(
      shipRegistrationCallback,
      debrisRegistrationCallback
    );
    console.log('🔧 Split callbacks configured for PlayerManager');
  }

  public update(deltaTime: number): void {
    if (this.playerController) {
      this.playerController.update(deltaTime);
    }

    // Update traditional player if present (legacy support)
    if (this.player) {
      this.updateTraditionalPlayer();
    }
  }

  private updateTraditionalPlayer(): void {
    if (!this.player) return;

    // Legacy player support (if needed)
    const THRUST_FORCE = 0.004;

    const rotation = this.getRotation();

    // Apply thrust (if needed)
    if (this.playerController && 'isThrusting' in this.playerController) {
      const isThrusting = (this.playerController as any).isThrusting;
      if (isThrusting) {
        const forceX = Math.cos(rotation) * THRUST_FORCE;
        const forceY = Math.sin(rotation) * THRUST_FORCE;
        this.gameEngine.applyForceToEntity(this.player, {
          x: forceX,
          y: forceY,
        });
      }
    }

    // Apply rotation
    this.gameEngine.setEntityRotation(this.player, rotation);
  }

  public handleInput(key: string, pressed: boolean): void {
    if (this.playerController && 'handleInput' in this.playerController) {
      (this.playerController as any).handleInput(key, pressed);
    }
  }

  public respawn(): void {
    if (!this.playerShip || this.playerShip.isAlive) return;

    const dimensions = this.gameEngine.getWorldDimensions();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Destroy old ship and controller
    if (this.playerShip) {
      this.playerShip.destroy();
    }
    if (this.playerController) {
      this.playerController.destroy();
    }

    // Create new ship and controller
    const shipConfig: IShipConfiguration = {
      position: { x: centerX, y: centerY },
      shipType: 'player_flagship',
    };

    this.playerShip = this.universalShipFactory.createShip(
      shipConfig,
      this.debrisManager
    );
    this.playerController = new PlayerShipController(this.playerShip);

    console.log('🔄 Player respawned at center');
  }

  public destroy(): void {
    if (this.playerShip) {
      this.playerShip.destroy();
      this.playerShip = null;
    }

    if (this.playerController) {
      this.playerController.destroy();
      this.playerController = null;
    }

    if (this.player) {
      this.gameEngine.removeEntity(this.player.id);
      this.player = null;
    }
  }
}
