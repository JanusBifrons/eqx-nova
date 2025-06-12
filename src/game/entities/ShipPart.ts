import { Entity } from '../../engine/entity/Entity';
import type { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IShipPart, ShipPartType } from '../interfaces/ICompositeShip';
import { v4 as uuidv4 } from 'uuid';

/**
 * ShipPart - Represents an individual square component of a composite ship
 * Follows Single Responsibility Principle: manages only one ship part
 */
export class ShipPart implements IShipPart {
  private readonly _entity: Entity;

  private readonly _partId: string;

  private readonly _partType: ShipPartType;

  private readonly _relativePosition: Vector2D;

  private readonly _size: number;

  private readonly _baseColor: number;

  private readonly _maxHealth: number = 100;

  private _health: number;

  private _isDestroyed: boolean = false;

  private _isConnected: boolean = true;

  private _connectedParts: Set<string> = new Set();

  private _onDestroy?: (part: ShipPart) => void;

  private _impactEffectTimer: number = 0;

  private _engine?: Engine;

  public floatingStartTime?: number; // Track when part started floating for cleanup

  constructor(
    entity: Entity,
    partId: string = uuidv4(), // Use UUID by default
    partType: ShipPartType,
    relativePosition: Vector2D,
    size: number,
    baseColor: number = 0x00ff00,
    onDestroy?: (part: ShipPart) => void
  ) {
    // Validate that entity is a square rectangle
    if (entity.type !== 'rectangle') {
      throw new Error('ShipPart entity must be a rectangle');
    }
    this._entity = entity;
    this._partId = partId;
    this._partType = partType;
    this._relativePosition = { ...relativePosition };
    this._size = size;
    this._baseColor = baseColor;
    this._health = this._maxHealth;
    this._onDestroy = onDestroy;
  }

  public get entity(): Entity {
    return this._entity;
  }

  public get partId(): string {
    return this._partId;
  }

  public get partType(): ShipPartType {
    return this._partType;
  }

  public get relativePosition(): Vector2D {
    return { ...this._relativePosition };
  }

  public get size(): number {
    return this._size;
  }

  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public get connectedParts(): ReadonlySet<string> {
    return this._connectedParts;
  }

  public get position(): Vector2D {
    return this._entity.position;
  }

  public get angle(): number {
    return this._entity.angle;
  }

  public get health(): number {
    return this._health;
  }

  public get maxHealth(): number {
    return this._maxHealth;
  }

  public get damagePercentage(): number {
    return (this._maxHealth - this._health) / this._maxHealth;
  }

  public get baseColor(): number {
    return this._baseColor;
  }

  public takeDamage(amount: number): boolean {
    if (this._isDestroyed) return false;

    this._health = Math.max(0, this._health - amount);

    // Update visual damage immediately
    this.updateVisualDamage();

    // Show impact effect
    this.showImpactEffect();

    // Check if part should be destroyed
    if (this._health <= 0) {
      this.destroy();

      return true; // Part was destroyed
    }
    return false; // Part survived
  }

  public showImpactEffect(): void {
    // Set impact effect timer for dramatic multi-flash sequence
    this._impactEffectTimer = 1200; // INCREASED: longer duration for better visibility

    // Temporarily show bright flashing white color
    if (this._engine) {
      const rendererSystem = this._engine.getRendererSystem();
      rendererSystem.updateRenderObjectColor(
        this._entity.renderObjectId,
        0xffffff
      );

      // Log impact for debugging
      console.log(
        `💥 IMPACT: Part ${this._partId} flashing white for 1200ms - RenderID: ${this._entity.renderObjectId}`
      );
    } else {
      console.warn(`💥 IMPACT: Part ${this._partId} has no engine reference!`);
    }
  }

  public updateVisualDamage(): void {
    if (this._isDestroyed) return;

    // If we're showing impact effect, don't update color yet
    if (this._impactEffectTimer > 0) return;

    // Make damage effects MUCH more dramatic
    const damagePercent = this.damagePercentage;

    // Create much more obvious color changes
    let red, green, blue;

    if (damagePercent < 0.25) {
      // 0-25% damage: Bright green to yellow (healthy)
      red = Math.floor(255 * damagePercent * 4); // 0 to 255
      green = 255;
      blue = 0;
    } else if (damagePercent < 0.5) {
      // 25-50% damage: Yellow to orange
      red = 255;
      green = Math.floor(255 * (1 - (damagePercent - 0.25) * 4)); // 255 to 0
      blue = 0;
    } else if (damagePercent < 0.75) {
      // 50-75% damage: Orange to red
      red = 255;
      green = Math.floor(128 * (1 - (damagePercent - 0.5) * 4)); // 128 to 0
      blue = 0;
    } else {
      // 75-100% damage: Red to dark red (critical)
      red = Math.floor(255 * (1 - (damagePercent - 0.75) * 2)); // 255 to 127
      green = 0;
      blue = 0;
    }
    // Create color (RGB format)
    const damageColor = (red << 16) | (green << 8) | blue;

    if (this._engine) {
      const rendererSystem = this._engine.getRendererSystem();
      rendererSystem.updateRenderObjectColor(
        this._entity.renderObjectId,
        damageColor
      );

      // Log damage for visibility
      console.log(
        `🎨 Part ${this._partId} damage: ${Math.round(damagePercent * 100)}% - Color: #${damageColor.toString(16).padStart(6, '0')} - RenderID: ${this._entity.renderObjectId}`
      );
    }
  }

  public setEngine(engine: Engine): void {
    this._engine = engine;
  }

  public destroy(): void {
    this._isDestroyed = true;
    this._isConnected = false;
    this._connectedParts.clear();
    this.floatingStartTime = undefined; // Clear floating timer

    // Clean up render object explicitly if we have an engine reference
    if (this._engine && this._entity.renderObjectId) {
      const rendererSystem = this._engine.getRendererSystem();
      console.log(
        `🧹 ShipPart ${this._partId}: Cleaning up render object ${this._entity.renderObjectId}`
      );
      rendererSystem.removeRenderObject(this._entity.renderObjectId);
    }
    this._entity.destroy();

    if (this._onDestroy) {
      this._onDestroy(this);
    }
  }

  public disconnect(): void {
    this._isConnected = false;
    this.floatingStartTime = Date.now(); // Start tracking floating time
    // Keep connected parts info for potential reconnection logic
  }

  public connectToPart(partId: string): void {
    if (!this._isDestroyed) {
      this._connectedParts.add(partId);
      this._isConnected = true;
    }
  }

  public disconnectFromPart(partId: string): void {
    this._connectedParts.delete(partId);

    if (this._connectedParts.size === 0) {
      this._isConnected = false;
    }
  }

  public disconnectFromAllParts(): void {
    this._connectedParts.clear();
    this._isConnected = false;
  }

  public updatePosition(
    shipPosition: Vector2D,
    shipRotation: number,
    engine?: Engine
  ): void {
    if (this._isDestroyed) return;

    // Calculate rotated relative position
    const cos = Math.cos(shipRotation);
    const sin = Math.sin(shipRotation);

    const rotatedX =
      this._relativePosition.x * cos - this._relativePosition.y * sin;
    const rotatedY =
      this._relativePosition.x * sin + this._relativePosition.y * cos;

    const newPosition = {
      x: shipPosition.x + rotatedX,
      y: shipPosition.y + rotatedY,
    };

    // Use physics system to properly update position and rotation
    if (engine) {
      const physicsSystem = engine.getPhysicsSystem();
      const allBodies = physicsSystem.getAllBodies();
      const physicsBody = allBodies.find(
        body => body.id === this._entity.physicsBodyId
      );

      if (physicsBody) {
        physicsSystem.setPosition(physicsBody, newPosition);
        physicsSystem.setRotation(physicsBody, shipRotation);
      }
    } else {
      // Fallback: Direct position/angle setting on entity
      // The physics system will sync these values during its update cycle
      this._entity.position = newPosition;
      this._entity.angle = shipRotation;
    }
  }

  /**
   * Apply physics effects for floating parts in space
   */
  public applyFloatingPhysics(engine: Engine): void {
    if (!this._isConnected && !this._isDestroyed) {
      const physicsSystem = engine.getPhysicsSystem();
      const allBodies = physicsSystem.getAllBodies();
      const physicsBody = allBodies.find(
        body => body.id === this._entity.physicsBodyId
      );

      if (physicsBody) {
        // Add slight rotation for visual effect
        const currentAngularVel = physicsBody.angularVelocity;

        if (Math.abs(currentAngularVel) < 0.02) {
          const randomSpin = (Math.random() - 0.5) * 0.01;
          physicsSystem.setAngularVelocity(physicsBody, randomSpin);
        }
        // Apply light drag to eventually slow down
        const velocity = physicsBody.velocity;
        const drag = 0.999; // Very light drag
        physicsSystem.setVelocity(physicsBody, {
          x: velocity.x * drag,
          y: velocity.y * drag,
        });
      }
    }
  }

  /**
   * Check if this part is active (not destroyed and entity is active)
   */
  public isActive(): boolean {
    return !this._isDestroyed && this._entity.isActive;
  }

  public update(deltaTime: number): void {
    // Handle impact effect timer with dramatic flashing
    if (this._impactEffectTimer > 0) {
      this._impactEffectTimer -= deltaTime;

      // Create dramatic flashing effect during impact
      if (this._engine) {
        const rendererSystem = this._engine.getRendererSystem();

        // IMPROVED: Slower flash for better visibility, longer white periods
        const flashFrequency = 200; // INCREASED: milliseconds per flash (slower)
        const flashCycle = Math.floor(
          (1200 - this._impactEffectTimer) / flashFrequency
        );

        if (flashCycle % 2 === 0) {
          // Show bright white (longer periods)
          rendererSystem.updateRenderObjectColor(
            this._entity.renderObjectId,
            0xffffff
          );
        } else {
          // Show bright red for dramatic contrast
          rendererSystem.updateRenderObjectColor(
            this._entity.renderObjectId,
            0xff0000
          );
        }
      }
      // When impact effect ends, restore damage-based color
      if (this._impactEffectTimer <= 0) {
        this.updateVisualDamage();
        console.log(
          `💥 IMPACT EFFECT ENDED: Part ${this._partId} restoring normal color`
        );
      }
    }
    // Add pulsing effect for heavily damaged parts (50%+ damage) - only when not flashing
    else if (!this._isDestroyed && this.damagePercentage >= 0.5) {
      // Create a pulsing effect based on time
      const pulseSpeed = 3.0; // Hz
      const time = Date.now() / 1000; // Convert to seconds
      const pulse = (Math.sin(time * pulseSpeed * 2 * Math.PI) + 1) / 2; // 0 to 1

      // Intensify the red color for pulsing
      const baseDamagePercent = this.damagePercentage;
      let red, green, blue;

      if (baseDamagePercent < 0.75) {
        // 50-75% damage: Pulsing orange-red
        red = 255;
        green = Math.floor(
          (64 + 64 * pulse) * (1 - (baseDamagePercent - 0.5) * 4)
        );
        blue = 0;
      } else {
        // 75-100% damage: Pulsing red (critical)
        red = Math.floor(127 + 128 * pulse); // Pulse between dark red and bright red
        green = Math.floor(32 * pulse); // Slight green pulse for urgency
        blue = 0;
      }
      const pulseColor = (red << 16) | (green << 8) | blue;

      if (this._engine) {
        const rendererSystem = this._engine.getRendererSystem();
        rendererSystem.updateRenderObjectColor(
          this._entity.renderObjectId,
          pulseColor
        );
      }
    }
  }

  public setCockpitVisuals(): void {
    // Make cockpit part visually distinct with a special color/effect
    this.setPartTypeVisuals('cockpit');
  }

  public setPartTypeVisuals(partType: ShipPartType): void {
    if (this._engine) {
      const rendererSystem = this._engine.getRendererSystem();

      // Get color based on part type
      const partColor = this.getPartTypeColor(partType);

      rendererSystem.updateRenderObjectColor(
        this._entity.renderObjectId,
        partColor
      );

      console.log(
        `🎨 Part ${this._partId} set to ${partType.toUpperCase()} with color 0x${partColor.toString(16)} - RenderID: ${this._entity.renderObjectId}`
      );
    }
  }

  private getPartTypeColor(partType: ShipPartType): number {
    switch (partType) {
      case 'cockpit':
        return 0x00ffff; // Bright cyan
      case 'engine':
        return 0xff4500; // Orange-red
      case 'weapon':
        return 0xffd700; // Gold/yellow
      case 'armor':
        return 0xc0c0c0; // Silver/gray
      case 'shield':
        return 0x4169e1; // Royal blue
      case 'cargo':
        return 0x8b4513; // Saddle brown
      default:
        return 0x00ff00; // Default green
    }
  }
}
