import type { Engine } from '../../engine';
import type {
  Vector2D,
  IConstraint,
  IPhysicsBody,
  CompoundBodyPart,
} from '../../engine/interfaces/IPhysicsSystem';
import type { ICompositeShip, IShipPart } from '../interfaces/ICompositeShip';
import { ShipPart } from './ShipPart';
import { v4 as uuidv4 } from 'uuid';

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

  private _cockpitPartId: string; // The main part everything must connect to

  constructor(
    id: string = uuidv4(), // Use UUID by default
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

    // Set the center part as the cockpit (command center) for better connectivity
    // Find the part closest to center (0,0) in relative coordinates
    let cockpitIndex = 0;
    let minDistanceToCenter = Infinity;

    parts.forEach((part, index) => {
      const distance = Math.sqrt(
        part.relativePosition.x ** 2 + part.relativePosition.y ** 2
      );

      if (distance < minDistanceToCenter) {
        minDistanceToCenter = distance;
        cockpitIndex = index;
      }
    });

    this._cockpitPartId = parts.length > 0 ? parts[cockpitIndex].partId : '';
    console.log(
      `🛸 Selected cockpit: Part ${cockpitIndex} at distance ${minDistanceToCenter.toFixed(1)} from center`
    );

    // Set engine reference for all parts so they can access renderer for visual effects
    this._parts.forEach(part => {
      (part as ShipPart).setEngine(engine);

      // Make the cockpit visually distinct
      if (part.partId === this._cockpitPartId) {
        // This part is the cockpit - make it visually distinct
        (part as ShipPart).setCockpitVisuals();
      }
    });

    // Create a single compound body instead of using constraints
    this.createCompoundBody();

    // IMPORTANT: Set up part connections after creating the compound body
    this.updatePartConnections();

    console.log(
      `🚢 Created CompositeShip ${id} with ${parts.length} parts, cockpit: ${this._cockpitPartId}`
    );
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
    // Apply coordinate system correction: ship front points up, physics assumes right
    const forwardAngle = this._rotation - Math.PI / 2;
    return {
      x: Math.cos(forwardAngle),
      y: Math.sin(forwardAngle),
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
    // Collect parts to remove to avoid modifying array during iteration
    const partsToRemove: number[] = [];

    this._parts.forEach((part, index) => {
      (part as ShipPart).update(deltaTime);

      // Apply floating physics to disconnected parts
      if (!part.isConnected && !part.isDestroyed) {
        (part as ShipPart).applyFloatingPhysics(this._engine);

        // Track floating time and cleanup parts that have been floating too long
        const shipPart = part as ShipPart;

        if (!shipPart.floatingStartTime) {
          shipPart.floatingStartTime = Date.now();
        } else {
          const floatingTime = Date.now() - shipPart.floatingStartTime;

          // Remove floating parts after 10 seconds to prevent accumulation
          if (floatingTime > 10000) {
            console.log(
              `🧹 Removing floating part ${shipPart.partId} after ${floatingTime}ms`
            );
            partsToRemove.push(index);
          }
        }
      }
    });

    // Remove parts in reverse order to maintain indices
    partsToRemove.reverse().forEach(index => {
      const part = this._parts[index];
      (part as ShipPart).destroy();
      this._parts.splice(index, 1);
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

  /**
   * Get all active weapon parts that can fire lasers
   */
  public getWeaponParts(): ReadonlyArray<IShipPart> {
    return this.getActiveParts().filter(part => part.partType === 'weapon');
  }

  /**
   * Get all active engine parts that provide thrust
   */
  public getEngineParts(): ReadonlyArray<IShipPart> {
    return this.getActiveParts().filter(part => part.partType === 'engine');
  }

  /**
   * Get firing positions from all weapon parts
   */
  public getWeaponFiringPositions(): Vector2D[] {
    const weaponParts = this.getWeaponParts();

    return weaponParts.map(part => {
      // Calculate world position of weapon part
      const cos = Math.cos(this._rotation);
      const sin = Math.sin(this._rotation);

      const rotatedX =
        part.relativePosition.x * cos - part.relativePosition.y * sin;
      const rotatedY =
        part.relativePosition.x * sin + part.relativePosition.y * cos;

      // Add small offset in front of weapon part for laser spawn
      // Use same coordinate system fix: ship front points up, physics assumes right
      const firingAngle = this._rotation - Math.PI / 2;
      const offsetDistance = 15;
      const offsetX = Math.cos(firingAngle) * offsetDistance;
      const offsetY = Math.sin(firingAngle) * offsetDistance;

      return {
        x: this._centerPosition.x + rotatedX + offsetX,
        y: this._centerPosition.y + rotatedY + offsetY,
      };
    });
  }

  /**
   * Get the engine effectiveness (0.0 to 1.0) based on remaining engine parts
   */
  public getEngineEffectiveness(): number {
    const allParts = this._parts;
    const totalEngines = allParts.filter(
      part => part.partType === 'engine'
    ).length;

    if (totalEngines === 0) return 1.0; // If ship has no engines, assume full effectiveness

    const workingEngines = this.getEngineParts().length;

    return workingEngines / totalEngines;
  }

  /**
   * Get the weapon effectiveness (0.0 to 1.0) based on remaining weapon parts
   */
  public getWeaponEffectiveness(): number {
    const allParts = this._parts;
    const totalWeapons = allParts.filter(
      part => part.partType === 'weapon'
    ).length;

    if (totalWeapons === 0) return 0.0; // If ship has no weapons, no effectiveness

    const workingWeapons = this.getWeaponParts().length;

    return workingWeapons / totalWeapons;
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

    // Calculate thrust based on active engine parts only
    const engineParts = this.getEngineParts();
    const engineCount = engineParts.length;

    // No engines = no thrust!
    if (engineCount === 0) {
      console.log('⚠️ No engine parts available - cannot apply thrust');

      return;
    }
    // Base thrust per engine part
    const baseThrust = 0.003; // Slightly higher per engine to maintain good feel
    const thrustMagnitude = baseThrust * engineCount;

    // Get engine effectiveness for feedback
    const effectiveness = this.getEngineEffectiveness();

    // Apply thrust force to the compound body
    // IMPORTANT: Ship construction has forward pointing up (negative Y), but physics assumes forward is right (positive X)
    // Add 90-degree offset to align coordinate systems: -π/2 rotates from pointing up to pointing right
    const thrustAngle = this._rotation - Math.PI / 2;
    const physicsSystem = this._engine.getPhysicsSystem();
    const forceX = Math.cos(thrustAngle) * thrustMagnitude;
    const forceY = Math.sin(thrustAngle) * thrustMagnitude;
    physicsSystem.applyForce(this._compoundBody, { x: forceX, y: forceY });

    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) {
      // 1% chance to log
      console.log(
        `🚀 Thrust: ${engineCount} engines (${(effectiveness * 100).toFixed(0)}% effective), force: ${thrustMagnitude.toFixed(4)}`
      );
    }
  }

  private updatePartConnections(): void {
    // Cockpit-based connectivity system
    // All parts must be connected to the cockpit to remain part of the ship

    const activeParts = this.getActiveParts();

    if (activeParts.length === 0) return;

    // Get the actual part size - use the first part's size as reference
    const GRID_SIZE = activeParts[0].size;

    console.log(
      `🔧 Updating connections for ${activeParts.length} parts with grid size ${GRID_SIZE}, cockpit: ${this._cockpitPartId}`
    );

    // Clear all connections first
    this._parts.forEach(part => {
      if (!part.isDestroyed) {
        (part as ShipPart).disconnectFromAllParts();
      }
    });

    let connectionsCreated = 0;

    // Rebuild connections based on grid adjacency
    for (let i = 0; i < activeParts.length; i++) {
      const partA = activeParts[i];
      const posA = partA.relativePosition;

      for (let j = i + 1; j < activeParts.length; j++) {
        const partB = activeParts[j];
        const posB = partB.relativePosition;

        // Check if parts are adjacent in grid (within one grid cell distance)
        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);

        // Add tolerance for floating point precision issues
        const tolerance = 0.1;

        // Parts are connected if they are exactly one grid cell apart horizontally or vertically
        const isHorizontallyAdjacent =
          Math.abs(dx - GRID_SIZE) < tolerance && dy < tolerance;
        const isVerticallyAdjacent =
          dx < tolerance && Math.abs(dy - GRID_SIZE) < tolerance;

        if (isHorizontallyAdjacent || isVerticallyAdjacent) {
          (partA as ShipPart).connectToPart(partB.partId);
          (partB as ShipPart).connectToPart(partA.partId);
          connectionsCreated++;
          console.log(
            `🔗 Connected parts at (${posA.x},${posA.y}) and (${posB.x},${posB.y}): dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`
          );
        }
      }
    }
    console.log(
      `🔧 Created ${connectionsCreated} connections for ship with ${activeParts.length} parts`
    );

    // Now check cockpit connectivity - disconnect parts not connected to cockpit
    if (activeParts.length > 1) {
      this.validateCockpitConnectivity();
    }
  }

  /**
   * Validate cockpit connectivity - parts not connected to cockpit become debris
   */
  private validateCockpitConnectivity(): void {
    const activeParts = this.getActiveParts();

    if (activeParts.length <= 1) return;

    // Find the cockpit part
    const cockpitPart = activeParts.find(p => p.partId === this._cockpitPartId);

    if (!cockpitPart) {
      console.log('⚠️ Cockpit part not found! Ship becomes debris');
      // If cockpit is destroyed, all parts become debris
      activeParts.forEach(part => {
        if (!part.isDestroyed) {
          console.log(
            `🗑️ Converting part ${part.partId} to debris (no cockpit)`
          );
          this.convertPartToDebris(part as ShipPart);
        }
      });

      return;
    }
    // Flood fill from cockpit to find all connected parts
    const visited = new Set<string>();
    const queue: IShipPart[] = [cockpitPart];
    visited.add(cockpitPart.partId);

    while (queue.length > 0) {
      const currentPart = queue.shift()!;

      // Check all connected parts
      Array.from(currentPart.connectedParts).forEach(connectedPartId => {
        if (!visited.has(connectedPartId)) {
          const connectedPart = activeParts.find(
            p => p.partId === connectedPartId
          );

          if (connectedPart) {
            visited.add(connectedPartId);
            queue.push(connectedPart);
          }
        }
      });
    }
    // Convert any parts not connected to cockpit into debris
    activeParts.forEach(part => {
      if (!visited.has(part.partId)) {
        console.log(
          `🗑️ Converting part ${part.partId} to debris (not connected to cockpit)`
        );
        this.convertPartToDebris(part as ShipPart);
      }
    });

    const connectedCount = visited.size;
    const debrisCount = activeParts.length - connectedCount;

    if (debrisCount > 0) {
      console.log(
        `🛸 Ship connectivity: ${connectedCount} connected to cockpit, ${debrisCount} became debris`
      );
    }
  }

  /**
   * Convert a part to floating debris (no longer part of the ship)
   */
  private convertPartToDebris(part: ShipPart): void {
    // Create individual physics body for this part
    this.createIndividualBodyForPart(part);

    // Apply small drift force for realistic debris motion
    this.applyDebrisForce(part);

    // Mark as disconnected debris
    part.disconnect();

    // Remove from ship's parts array
    const partIndex = this._parts.indexOf(part);

    if (partIndex >= 0) {
      this._parts.splice(partIndex, 1);
    }
    console.log(
      `🗑️ Part ${part.partId} converted to debris and removed from ship`
    );
  }

  /**
   * Apply gentle drift force to debris (less dramatic than explosion)
   */
  private applyDebrisForce(part: ShipPart): void {
    const physicsSystem = this._engine.getPhysicsSystem();
    const allBodies = physicsSystem.getAllBodies();
    const physicsBody = allBodies.find(
      body => body.id === part.entity.physicsBodyId
    );

    if (physicsBody) {
      // Apply gentle drift force
      const driftForce = 0.02; // Much gentler than explosive force
      const randomAngle = Math.random() * Math.PI * 2;
      const forceX = Math.cos(randomAngle) * driftForce;
      const forceY = Math.sin(randomAngle) * driftForce;

      physicsSystem.applyForce(physicsBody, { x: forceX, y: forceY });

      // Add gentle spin
      const randomSpin = (Math.random() - 0.5) * 0.05;
      physicsSystem.setAngularVelocity(physicsBody, randomSpin);

      console.log(
        `🌌 Applied debris drift to part ${part.partId}: (${forceX.toFixed(3)}, ${forceY.toFixed(3)})`
      );
    }
  }

  /**
   * Recreate the compound body for the remaining parts
   */
  private recreateCompoundBody(): void {
    // Remove the old compound body
    if (this._compoundBody) {
      const physicsSystem = this._engine.getPhysicsSystem();
      physicsSystem.removeBody(this._compoundBody);
      this._compoundBody = null;
    }
    // Recalculate center position based on remaining parts
    this._centerPosition = this.calculateCenterPosition();
    this._collisionRadius = this.calculateCollisionRadius();

    // Create new compound body
    this.createCompoundBody();

    console.log(
      `🔧 Recreated compound body with ${this.getActiveParts().length} remaining parts`
    );
  }

  private respawnWithRemainingParts(): void {
    // Reset position but keep destroyed parts destroyed
    // This creates a smaller ship for the next life
    this._centerPosition = this.calculateCenterPosition();
    this._collisionRadius = this.calculateCollisionRadius();
    // Let physics constraints handle positioning naturally
  }

  private checkForBreakage(): void {
    // Check if cockpit is destroyed
    const cockpitPart = this._parts.find(p => p.partId === this._cockpitPartId);

    if (!cockpitPart || cockpitPart.isDestroyed) {
      console.log(`💀 Cockpit destroyed! Ship becomes debris`);

      // Convert all remaining parts to debris
      const activeParts = this.getActiveParts();
      activeParts.forEach(part => {
        console.log(
          `🗑️ Converting part ${part.partId} to debris (cockpit destroyed)`
        );
        this.convertPartToDebris(part as ShipPart);
      });

      // Ship is effectively destroyed when cockpit is gone
      this._lives--;

      if (this._lives <= 0) {
        this.destroy();
      } else {
        this.respawnWithRemainingParts();
      }

      return;
    }
    // Update connections to check what's still connected to cockpit
    this.updatePartConnections();

    // Recreate compound body for remaining connected parts
    const connectedParts = this.getActiveParts();

    if (connectedParts.length > 0) {
      this.recreateCompoundBody();
      console.log(
        `🛸 Ship has ${connectedParts.length} parts still connected to cockpit`
      );
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

  private createIndividualBodyForPart(part: ShipPart): void {
    const rendererSystem = this._engine.getRendererSystem();
    const entityManager = this._engine.getEntityManager();

    // Calculate world position for this part
    const worldPos = this.calculatePartWorldPosition(part);

    // IMPORTANT: Clean up the old render object before creating new one
    const oldRenderObjectId = part.entity.renderObjectId;

    if (oldRenderObjectId) {
      console.log(`🧹 Cleaning up old render object: ${oldRenderObjectId}`);
      rendererSystem.removeRenderObject(oldRenderObjectId);
    }
    // Properly destroy the old entity
    part.entity.destroy();

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
      },
    });

    // Set the initial angle for the new entity
    newEntity.angle = this._rotation;

    // Replace the part's entity with the new independent one
    // Since _entity is readonly, we need to use a workaround
    (part as any)._entity = newEntity;

    // Make sure part knows it's disconnected and floating
    part.disconnect();

    // Set the engine reference so the part can update its visual state
    part.setEngine(this._engine);

    console.log(
      `🔧 Created individual body for part ${part.partId} at (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`
    );
  }

  private calculatePartWorldPosition(part: ShipPart): Vector2D {
    // Calculate world position based on ship center and part's relative position
    const cos = Math.cos(this._rotation);
    const sin = Math.sin(this._rotation);

    const relX = part.relativePosition.x;
    const relY = part.relativePosition.y;

    return {
      x: this._centerPosition.x + (relX * cos - relY * sin),
      y: this._centerPosition.y + (relX * sin + relY * cos),
    };
  }
}
