import type { Engine } from '../../engine';
import type {
  Vector2D,
  IConstraint,
  IPhysicsBody,
  CompoundBodyPart,
} from '../../engine/interfaces/IPhysicsSystem';
import type { ICompositeShip, IShipPart } from '../interfaces/ICompositeShip';
import { ShipPart } from './ShipPart';

/**
 * CompositeShip - Manages a collection of ship parts as a single unit
 * Follows Open/Closed Principle: extensible through configuration
 * Follows Liskov Substitution Principle: can replace Player in game systems
 */
export class CompositeShip implements ICompositeShip {
  private readonly _id: string;

  private readonly _parts: ShipPart[];

  private readonly _engine: Engine;

  private readonly _constraints: IConstraint[] = [];

  private _compoundBody: IPhysicsBody | null = null; // Single rigid body for all parts

  private _centerPosition: Vector2D;

  private _rotation: number = 0;

  private _thrust: boolean = false;

  private _lives: number;

  private _isInvulnerable: boolean = false;

  private _invulnerabilityTimer: number = 0;

  private _collisionRadius: number;

  private _onDestroy?: (ship: CompositeShip) => void;

  constructor(
    id: string,
    parts: ShipPart[],
    engine: Engine,
    centerPosition: Vector2D,
    lives: number = 3,
    onDestroy?: (ship: CompositeShip) => void
  ) {
    this._id = id;
    this._parts = [...parts];
    this._engine = engine;
    this._lives = lives;
    this._centerPosition = { ...centerPosition }; // Use the provided center position
    this._collisionRadius = this.calculateCollisionRadius();
    this._onDestroy = onDestroy;

    // Set engine reference for all parts so they can access renderer for visual effects
    this._parts.forEach(part => {
      (part as ShipPart).setEngine(engine);
    });

    // Create a single compound body instead of using constraints
    this.createCompoundBody();
  }

  public get id(): string {
    return this._id;
  }

  public get parts(): ReadonlyArray<IShipPart> {
    return this._parts;
  }

  public get isDestroyed(): boolean {
    return this._parts.every(part => part.isDestroyed);
  }

  public get centerPosition(): Vector2D {
    return { ...this._centerPosition };
  }

  public get rotation(): number {
    return this._rotation;
  }

  public get thrust(): boolean {
    return this._thrust;
  }

  public get lives(): number {
    return this._lives;
  }

  public get isInvulnerable(): boolean {
    return this._isInvulnerable;
  }

  public get isAlive(): boolean {
    return this._lives > 0 && !this.isDestroyed;
  }

  public get collisionRadius(): number {
    return this._collisionRadius;
  }

  public get forwardDirection(): Vector2D {
    return {
      x: Math.cos(this._rotation),
      y: Math.sin(this._rotation),
    };
  }

  public get velocity(): Vector2D {
    if (this._compoundBody) {
      return this._compoundBody.velocity;
    }
    return { x: 0, y: 0 };
  }

  public setRotation(angle: number): void {
    this._rotation = angle;

    // Apply rotation to the compound body
    if (this._compoundBody) {
      const physicsSystem = this._engine.getPhysicsSystem();
      physicsSystem.setRotation(this._compoundBody, angle);
    }
  }

  public setThrust(thrusting: boolean): void {
    this._thrust = thrusting;

    if (thrusting) {
      this.applyThrustForce();
    }
  }

  public takeDamage(): boolean {
    if (this._isInvulnerable) return false;

    // For now, taking damage destroys a random active part
    const activeParts = this.getActiveParts();

    if (activeParts.length === 0) return false;

    const randomIndex = Math.floor(Math.random() * activeParts.length);
    const partToDestroy = activeParts[randomIndex] as ShipPart;

    this.destroyPart(partToDestroy.partId);

    // If all parts are destroyed, lose a life
    if (this.getActiveParts().length === 0) {
      this._lives--;

      if (this._lives <= 0) {
        this.destroy();

        return true; // Ship is completely destroyed
      } else {
        // Respawn with fewer parts
        this.respawnWithRemainingParts();
      }
    }
    // Make invulnerable briefly after taking damage
    this._isInvulnerable = true;
    this._invulnerabilityTimer = 2000; // 2 seconds

    return false; // Ship damaged but not destroyed
  }

  public takeDamageAtPart(partId: string, amount: number): boolean {
    if (this._isInvulnerable) return false;

    const part = this._parts.find(p => p.partId === partId);
    if (!part || part.isDestroyed) return false;

    const partWasDestroyed = (part as ShipPart).takeDamage(amount);

    if (partWasDestroyed) {
      // Part was destroyed by the damage
      this.destroyPart(partId);

      // Check if ship should break apart
      this.checkForBreakage();

      // If all parts are destroyed, lose a life
      if (this.getActiveParts().length === 0) {
        this._lives--;

        if (this._lives <= 0) {
          this.destroy();
          return true; // Ship is completely destroyed
        } else {
          // Respawn with fewer parts
          this.respawnWithRemainingParts();
        }
      }

      // Make invulnerable briefly after taking damage
      this._isInvulnerable = true;
      this._invulnerabilityTimer = 2000; // 2 seconds
    }

    return false; // Ship damaged but not completely destroyed
  }

  public respawn(position: Vector2D): void {
    this._centerPosition = { ...position };
    this._rotation = 0;
    this._thrust = false;
    this._isInvulnerable = true;
    this._invulnerabilityTimer = 3000; // 3 seconds of invulnerability

    // Restore some parts (simplified respawn)
    this._parts.forEach(part => {
      if (part.isDestroyed && Math.random() > 0.5) {
        // 50% chance to restore each destroyed part
        this.restorePart(part as ShipPart);
      }
    });

    // Remove old compound body
    if (this._compoundBody) {
      const physicsSystem = this._engine.getPhysicsSystem();
      physicsSystem.removeBody(this._compoundBody);
      this._compoundBody = null;
    }
    // Clean up old constraints
    this.cleanupConstraints();

    // Recreate compound body at new position
    this.createCompoundBody();

    // Reconnect parts logically
    this.connectAllParts();
  }

  public update(deltaTime: number): void {
    // Update invulnerability timer
    if (this._isInvulnerable) {
      this._invulnerabilityTimer -= deltaTime;

      if (this._invulnerabilityTimer <= 0) {
        this._isInvulnerable = false;
      }
    }

    // Update all ship parts (for visual effects like impact flashes)
    this._parts.forEach(part => {
      (part as ShipPart).update(deltaTime);

      // Apply floating physics to disconnected parts
      if (!part.isConnected && !part.isDestroyed) {
        (part as ShipPart).applyFloatingPhysics(this._engine);
      }
    });

    // Update center position based on physics of compound body
    this.updateCenterPosition();
  }

  public destroy(): void {
    // Remove the compound body
    if (this._compoundBody) {
      const physicsSystem = this._engine.getPhysicsSystem();
      physicsSystem.removeBody(this._compoundBody);
      this._compoundBody = null;
    }
    // Clean up all physics constraints (if any remain)
    const physicsSystem = this._engine.getPhysicsSystem();
    this._constraints.forEach(constraint => {
      physicsSystem.removeConstraint(constraint);
    });
    this._constraints.length = 0;

    // Destroy all parts
    this._parts.forEach(part => part.destroy());

    if (this._onDestroy) {
      this._onDestroy(this);
    }
  }

  public destroyPart(partId: string): void {
    const part = this._parts.find(p => p.partId === partId);

    if (part && !part.isDestroyed) {
      // First, remove any constraints connected to this part
      const partPhysicsBodyId = part.entity.physicsBodyId;
      const physicsSystem = this._engine.getPhysicsSystem();
      const allBodies = physicsSystem.getAllBodies();
      const partBody = allBodies.find(body => body.id === partPhysicsBodyId);

      if (partBody) {
        // Find and remove constraints involving this part
        const constraintsToRemove: IConstraint[] = [];
        this._constraints.forEach(constraint => {
          // Note: We can't easily check if a constraint involves a specific body
          // without extending the constraint interface. For now, we'll rebuild all constraints
          constraintsToRemove.push(constraint);
        });

        // Remove all constraints and rebuild them without the destroyed part
        constraintsToRemove.forEach(constraint => {
          physicsSystem.removeConstraint(constraint);
        });
        this._constraints.length = 0;
      }
      // Destroy the part
      part.destroy();

      // Disconnect this part from others logically
      this._parts.forEach(otherPart => {
        if (otherPart.partId !== partId) {
          (otherPart as ShipPart).disconnectFromPart(partId);
        }
      });

      // Rebuild constraints for remaining parts
      this.connectAllParts();

      // Check for isolated parts and disconnect them
      this.updatePartConnections();
    }
  }

  public getActiveParts(): ReadonlyArray<IShipPart> {
    return this._parts.filter(part => part.isActive());
  }

  public getDestroyedParts(): ReadonlyArray<IShipPart> {
    return this._parts.filter(part => part.isDestroyed);
  }

  private calculateCenterPosition(): Vector2D {
    const activeParts = this.getActiveParts();

    if (activeParts.length === 0) {
      return { x: 0, y: 0 };
    }
    // Calculate the actual center of mass based on physics positions
    let totalX = 0;
    let totalY = 0;

    activeParts.forEach(part => {
      totalX += part.position.x;
      totalY += part.position.y;
    });

    return {
      x: totalX / activeParts.length,
      y: totalY / activeParts.length,
    };
  }

  private calculateCollisionRadius(): number {
    const activeParts = this.getActiveParts();

    if (activeParts.length === 0) return 0;

    let maxDistance = 0;

    activeParts.forEach(part => {
      const distance = Math.sqrt(
        part.relativePosition.x ** 2 + part.relativePosition.y ** 2
      );
      maxDistance = Math.max(maxDistance, distance + part.size / 2);
    });

    return maxDistance;
  }

  private cleanupConstraints(): void {
    // Remove all existing constraints (if any)
    const physicsSystem = this._engine.getPhysicsSystem();
    this._constraints.forEach(constraint => {
      physicsSystem.removeConstraint(constraint);
    });
    this._constraints.length = 0;
  }

  private connectAllParts(): void {
    // With compound bodies, parts are naturally connected
    // Just maintain logical connections for game logic
    const activeParts = this._parts.filter(part => !part.isDestroyed);

    activeParts.forEach(part => {
      activeParts.forEach(otherPart => {
        if (part.partId !== otherPart.partId) {
          (part as ShipPart).connectToPart(otherPart.partId);
        }
      });
    });
  }

  private updateCenterPosition(): void {
    // Get physics position from the compound body
    if (this._compoundBody) {
      this._centerPosition = {
        x: this._compoundBody.position.x,
        y: this._compoundBody.position.y,
      };
      this._rotation = this._compoundBody.angle;

      // Update individual part render objects based on compound body
      this.updatePartRenderObjects();
    }
  }

  private updatePartRenderObjects(): void {
    if (!this._compoundBody) return;

    const rendererSystem = this._engine.getRendererSystem();
    const activeParts = this.getActiveParts();

    activeParts.forEach(part => {
      // Calculate the world position of this part based on compound body position and rotation
      const cos = Math.cos(this._compoundBody!.angle);
      const sin = Math.sin(this._compoundBody!.angle);

      const rotatedX =
        part.relativePosition.x * cos - part.relativePosition.y * sin;
      const rotatedY =
        part.relativePosition.x * sin + part.relativePosition.y * cos;

      const worldPosition = {
        x: this._compoundBody!.position.x + rotatedX,
        y: this._compoundBody!.position.y + rotatedY,
      };

      // Update the entity position (for consistency)
      part.entity.position = worldPosition;
      part.entity.angle = this._compoundBody!.angle;

      // Update the render object directly
      rendererSystem.updateRenderObject(
        part.entity.renderObjectId,
        worldPosition,
        this._compoundBody!.angle
      );
    });
  }

  private applyThrustForce(): void {
    if (!this._compoundBody) return;

    // Base thrust magnitude - same as traditional player ship
    const baseThrustMagnitude = 0.002;

    // Apply thrust force to the compound body
    const physicsSystem = this._engine.getPhysicsSystem();
    const forceX = Math.cos(this._rotation) * baseThrustMagnitude;
    const forceY = Math.sin(this._rotation) * baseThrustMagnitude;
    physicsSystem.applyForce(this._compoundBody, { x: forceX, y: forceY });
  }

  private updatePartConnections(): void {
    // Simplified connection logic - in a full implementation,
    // this would check spatial adjacency and connectivity graphs

    // For now, just ensure isolated parts become disconnected
    this._parts.forEach(part => {
      if (!part.isDestroyed) {
        const remainingConnections = Array.from(part.connectedParts).filter(
          partId => {
            const connectedPart = this._parts.find(p => p.partId === partId);

            return connectedPart && !connectedPart.isDestroyed;
          }
        );

        if (
          remainingConnections.length === 0 &&
          this.getActiveParts().length > 1
        ) {
          (part as ShipPart).disconnect();
        }
      }
    });
  }

  private respawnWithRemainingParts(): void {
    // Reset position but keep destroyed parts destroyed
    // This creates a smaller ship for the next life
    this._centerPosition = this.calculateCenterPosition();
    this._collisionRadius = this.calculateCollisionRadius();
    // Let physics constraints handle positioning naturally
  }

  private checkForBreakage(): void {
    // For ship breaking, we need to transition from compound body to individual bodies
    // when parts are destroyed and connections are severed
    this.updatePartConnections();

    // Find any disconnected parts and break them away from the ship
    const disconnectedParts = this._parts.filter(part =>
      !part.isDestroyed && !part.isConnected
    );

    if (disconnectedParts.length > 0) {
      console.log('🔧 Breaking ship apart! Disconnected parts:', disconnectedParts.length);

      // Convert ship back to individual physics bodies for dramatic breakage
      this.convertToIndividualBodies();

      // Apply separation forces to make parts fly apart
      disconnectedParts.forEach(part => {
        (part as ShipPart).applyFloatingPhysics(this._engine);
        // Add some explosive force
        this.applyExplosiveForce(part as ShipPart);
      });
    }
  }

  private restorePart(_part: ShipPart): void {
    // This would need to recreate the entity and physics body
    // For now, just mark as not destroyed (simplified)
    // In a full implementation, would need to recreate the Entity
  }

  private createCompoundBody(): void {
    const physicsSystem = this._engine.getPhysicsSystem();
    const activeParts = this.getActiveParts();

    if (activeParts.length === 0) return;

    // Create compound body parts from ship parts
    const compoundParts: CompoundBodyPart[] = activeParts.map(part => {
      // Assuming parts are squares (rectangles)
      return {
        type: 'rectangle' as const,
        x: part.relativePosition.x,
        y: part.relativePosition.y,
        width: part.size,
        height: part.size,
        options: {
          density: 0.01,
          friction: 0.3,
          frictionAir: 0.02,
        },
      };
    });

    // Remove individual physics bodies for parts
    activeParts.forEach(part => {
      const allBodies = physicsSystem.getAllBodies();
      const physicsBody = allBodies.find(
        body => body.id === part.entity.physicsBodyId
      );

      if (physicsBody) {
        physicsSystem.removeBody(physicsBody);
      }
    });

    // Create the compound body
    this._compoundBody = physicsSystem.createCompoundBody(
      this._centerPosition.x,
      this._centerPosition.y,
      compoundParts,
      {
        density: 0.01,
        friction: 0.3,
        frictionAir: 0.02,
      }
    );

    console.log(
      `Created compound body with ${compoundParts.length} parts at position (${this._centerPosition.x}, ${this._centerPosition.y})`
    );
  }

  private convertToIndividualBodies(): void {
    const physicsSystem = this._engine.getPhysicsSystem();

    // Remove the compound body
    if (this._compoundBody) {
      physicsSystem.removeBody(this._compoundBody);
      this._compoundBody = null;
      console.log('🔧 Removed compound body for ship breakage');
    }

    // Create individual physics bodies for each active part
    const activeParts = this.getActiveParts();
    activeParts.forEach(part => {
      this.createIndividualBodyForPart(part as ShipPart);
    });
  }

  private createIndividualBodyForPart(part: ShipPart): void {
    const rendererSystem = this._engine.getRendererSystem();
    const entityManager = this._engine.getEntityManager();

    // Calculate world position for this part
    const worldPos = this.calculatePartWorldPosition(part);

    // Create new entity with individual physics body and render object
    const newEntity = entityManager.createRectangle({
      x: worldPos.x,
      y: worldPos.y,
      width: part.size,
      height: part.size,
      options: {
        color: part.baseColor,
        density: 0.01,
        friction: 0.3,
        frictionAir: 0.02,
        restitution: 0.8, // Make parts bouncy for dramatic effect
      }
    });

    // Set the initial angle for the new entity
    newEntity.angle = this._rotation;

    // Remove the old entity's render object (physics body is part of compound body)
    rendererSystem.removeRenderObject(part.entity.renderObjectId);
    part.entity.destroy();

    // Replace the part's entity with the new independent one
    // Since _entity is readonly, we need to use a workaround
    (part as any)._entity = newEntity;

    // Make sure part knows it's disconnected and floating
    part.disconnect();

    // Set the engine reference so the part can update its visual state
    part.setEngine(this._engine);

    console.log(`🔧 Created individual body for part ${part.partId} at (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`);
  }

  private calculatePartWorldPosition(part: ShipPart): Vector2D {
    // Calculate world position based on ship center and part's relative position
    const cos = Math.cos(this._rotation);
    const sin = Math.sin(this._rotation);

    const relX = part.relativePosition.x;
    const relY = part.relativePosition.y;

    return {
      x: this._centerPosition.x + (relX * cos - relY * sin),
      y: this._centerPosition.y + (relX * sin + relY * cos)
    };
  }

  private applyExplosiveForce(part: ShipPart): void {
    const physicsSystem = this._engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const physicsBody = allBodies.find(body => body.id === part.entity.physicsBodyId);

    if (physicsBody) {
      // Calculate direction from ship center to part
      const partPos = physicsBody.position;
      const dx = partPos.x - this._centerPosition.x;
      const dy = partPos.y - this._centerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        // Apply explosive force away from center
        const explosiveForce = 0.1; // Increased for more dramatic effect
        const forceX = (dx / distance) * explosiveForce;
        const forceY = (dy / distance) * explosiveForce;

        physicsSystem.applyForce(physicsBody, { x: forceX, y: forceY });

        // Add random spin for dramatic effect
        const randomSpin = (Math.random() - 0.5) * 0.2;
        physicsSystem.setAngularVelocity(physicsBody, randomSpin);

        console.log(`💥 Applied explosive force to part ${part.partId}: (${forceX.toFixed(3)}, ${forceY.toFixed(3)})`);
      }
    }
  }
}
