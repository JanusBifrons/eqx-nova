import type {
  IPhysicsSystem,
  IPhysicsBody,
} from '../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../engine/interfaces/IRendererSystem';

interface DebrisPiece {
  physicsBody: IPhysicsBody;
  renderObjectId: string;
}

/**
 * DebrisManager - Handles autonomous debris pieces that persist in the world
 * These are broken ship parts that continue to exist and render independently
 */
export class DebrisManager {
  private debrisPieces: DebrisPiece[] = [];
  private physicsSystem: IPhysicsSystem;
  private rendererSystem: IRendererSystem;
  private updateInterval: number | null = null;

  constructor(physicsSystem: IPhysicsSystem, rendererSystem: IRendererSystem) {
    this.physicsSystem = physicsSystem;
    this.rendererSystem = rendererSystem;

    // Start the update loop for debris rendering
    this.startUpdateLoop();
  }

  /**
   * Add debris pieces to be managed autonomously
   */
  public addDebris(physicsBody: IPhysicsBody, renderObjectId: string): void {
    console.log(`🗑️ Adding debris piece to manager: ${renderObjectId}`);
    this.debrisPieces.push({
      physicsBody,
      renderObjectId,
    });
  }

  /**
   * Start the update loop to keep debris render objects in sync with physics
   */
  private startUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateDebris();
    }, 16) as unknown as number; // ~60 FPS
  }

  /**
   * Update all debris render positions to match their physics bodies
   */
  private updateDebris(): void {
    // Update in reverse order so we can safely remove pieces if needed
    for (let i = this.debrisPieces.length - 1; i >= 0; i--) {
      const debris = this.debrisPieces[i];

      try {
        // Update render object position to match physics body
        this.rendererSystem.updateRenderObject(
          debris.renderObjectId,
          debris.physicsBody.position,
          debris.physicsBody.angle
        );
      } catch (error) {
        // If render object is gone, remove this debris piece from management
        console.log(
          `🗑️ Render object ${debris.renderObjectId} no longer exists, removing from management`
        );
        this.debrisPieces.splice(i, 1);
      }
    }
  }

  /**
   * Get the number of debris pieces being managed
   */
  public getDebrisCount(): number {
    return this.debrisPieces.length;
  }

  /**
   * Clear all debris from the world (both physics and render)
   */
  public clearAllDebris(): void {
    console.log(`🗑️ Clearing ${this.debrisPieces.length} debris pieces`);

    for (const debris of this.debrisPieces) {
      // Remove physics body
      this.physicsSystem.removeBody(debris.physicsBody);

      // Remove render object
      try {
        this.rendererSystem.removeRenderObject(debris.renderObjectId);
      } catch (error) {
        console.log(
          `🗑️ Could not remove render object ${debris.renderObjectId}:`,
          error
        );
      }
    }

    this.debrisPieces = [];
  }

  /**
   * Destroy the debris manager and clean up
   */
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Don't remove debris when destroying manager - they should persist
    // Just stop managing them
    this.debrisPieces = [];
    console.log('🗑️ DebrisManager destroyed');
  }
}
