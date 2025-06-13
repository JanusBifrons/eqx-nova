import type { EntityManager } from '../../../engine/entity/EntityManager';
import type {
  IPhysicsSystem,
  Vector2D,
  CompoundBodyPart,
  IPhysicsBody,
} from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { IModularShip } from './interfaces/IModularShip';
import type { IShipStructure } from './interfaces/IShipStructure';
import type { IShipComponent, GridPosition } from './interfaces/IShipComponent';
import { ShipComponent } from './ShipComponent';
import { v4 as uuidv4 } from 'uuid';

/**
 * Modular ship implementation that maximally leverages existing systems
 * Following SOLID principles with clear separation of concerns
 *
 * Architecture:
 * - Uses EntityManager for individual component entities
 * - Uses Physics system's compound body for unified ship physics
 * - Uses Renderer system for visual updates
 * - Maintains grid-based structure for modular damage
 */
export class ModularShip implements IModularShip {
  private readonly _id: string;
  private readonly _entityManager: EntityManager;
  private readonly _physicsSystem: IPhysicsSystem;
  private readonly _rendererSystem: IRendererSystem;

  // Ship structure
  private readonly _components: Map<string, IShipComponent> = new Map();
  private readonly _componentGrid: Map<string, IShipComponent> = new Map();
  private _cockpitComponent: IShipComponent | null = null;
  // Physics
  private _unifiedPhysicsBody: IPhysicsBody | null = null;
  private readonly _componentSize: number;

  // State
  private _isDestroyed: boolean = false;
  private _needsStructuralCheck: boolean = false;

  constructor(
    entityManager: EntityManager,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    componentSize: number = 20,
    id?: string
  ) {
    this._id = id || uuidv4();
    this._entityManager = entityManager;
    this._physicsSystem = physicsSystem;
    this._rendererSystem = rendererSystem;
    this._componentSize = componentSize;
  }

  public get id(): string {
    return this._id;
  }
  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  public get position(): Vector2D {
    return this._unifiedPhysicsBody?.position || { x: 0, y: 0 };
  }

  public get angle(): number {
    return this._unifiedPhysicsBody?.angle || 0;
  }
  public get structure(): IShipStructure {
    return {
      components: Array.from(this._components.values()),
      cockpitComponent: this._cockpitComponent,
      gridSize: this._componentSize,
      addComponent: (component: IShipComponent) => {
        this._components.set(component.id, component);
      },
      removeComponent: (componentId: string) => {
        this._components.delete(componentId);
      },
      getComponent: (componentId: string) => {
        return this._components.get(componentId) || null;
      },
      checkConnectivity: () => {
        return this.checkStructuralIntegrity();
      },
      getConnectedComponents: () => {
        return Array.from(this._components.values()).filter(
          c => !c.isDestroyed
        );
      },
      getDisconnectedComponents: () => {
        return [];
      },
      getComponentAt: (gridPosition: GridPosition) => {
        return this._componentGrid.get(this.getGridKey(gridPosition)) || null;
      },
      getAdjacentComponents: (component: IShipComponent) => {
        return this.getAdjacentPositions(component.gridPosition)
          .map(pos => this._componentGrid.get(this.getGridKey(pos)))
          .filter(c => c !== undefined) as IShipComponent[];
      },
      gridToWorld: (gridPosition: GridPosition, shipPosition: Vector2D) => {
        const localPos = this.gridToWorldPosition(gridPosition);
        return {
          x: shipPosition.x + localPos.x,
          y: shipPosition.y + localPos.y,
        };
      },
    };
  }

  public get rotation(): number {
    return this.angle;
  }

  public get isAlive(): boolean {
    return !this._isDestroyed && this._cockpitComponent !== null;
  }

  public get velocity(): Vector2D {
    return this._unifiedPhysicsBody?.velocity || { x: 0, y: 0 };
  }

  public setPosition(position: Vector2D): void {
    if (this._unifiedPhysicsBody) {
      this._physicsSystem.setPosition(this._unifiedPhysicsBody, position);
    }
  }

  public setRotation(rotation: number): void {
    if (this._unifiedPhysicsBody) {
      this._physicsSystem.setRotation(this._unifiedPhysicsBody, rotation);
    }
  }

  public setAngularVelocity(angularVelocity: number): void {
    if (this._unifiedPhysicsBody) {
      this._physicsSystem.setAngularVelocity(
        this._unifiedPhysicsBody,
        angularVelocity
      );
    }
  }

  public applyForce(force: Vector2D): void {
    if (this._unifiedPhysicsBody) {
      this._physicsSystem.applyForce(this._unifiedPhysicsBody, force);
    }
  }

  public takeDamageAtPosition(
    worldPosition: Vector2D,
    amount: number
  ): boolean {
    // Find closest component to damage position
    let closestComponent: IShipComponent | null = null;
    let closestDistance = Infinity;

    for (const component of this._components.values()) {
      if (component.isDestroyed) continue;

      const componentWorldPos = this.gridToWorldPosition(
        component.gridPosition
      );
      const distance = Math.sqrt(
        Math.pow(worldPosition.x - componentWorldPos.x, 2) +
          Math.pow(worldPosition.y - componentWorldPos.y, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestComponent = component;
      }
    }

    if (closestComponent && closestDistance <= this._componentSize) {
      return this.takeDamageAtComponent(closestComponent.id, amount);
    }

    return false;
  }

  public takeDamageAtComponent(componentId: string, amount: number): boolean {
    return this.damageComponent(componentId, amount);
  }

  /**
   * Add a component using the existing EntityManager system
   */
  public addComponent(
    gridPosition: GridPosition,
    isCockpit: boolean = false
  ): IShipComponent {
    const gridKey = this.getGridKey(gridPosition);

    if (this._componentGrid.has(gridKey)) {
      throw new Error(
        `Component already exists at grid position (${gridPosition.x}, ${gridPosition.y})`
      );
    }

    // Calculate world position from grid position
    const worldPosition = this.gridToWorldPosition(gridPosition); // Create component entity using existing EntityManager
    // NOTE: This entity will be replaced by the compound body, but we need it temporarily
    const componentEntity = this._entityManager.createRectangle({
      x: worldPosition.x,
      y: worldPosition.y,
      width: this._componentSize,
      height: this._componentSize,
      options: {
        color: isCockpit ? 0x4a90e2 : 0x888888, // Blue for cockpit, gray for others
        isStatic: false,
        density: 0.001,
        friction: 0.1,
        restitution: 0.3,
      },
    });

    // Mark entity as temporary (will be replaced by compound body)
    (componentEntity as any).isTemporaryComponent = true;

    // Create ship component wrapper
    const component = new ShipComponent(
      componentEntity,
      gridPosition,
      this._componentSize
    );
    component.setRendererSystem(this._rendererSystem);

    // Store component
    this._components.set(component.id, component);
    this._componentGrid.set(gridKey, component);

    // Set cockpit if specified
    if (isCockpit) {
      if (this._cockpitComponent) {
        throw new Error('Ship already has a cockpit component');
      }
      this._cockpitComponent = component;
    }

    // Rebuild unified physics body
    this.rebuildUnifiedPhysicsBody();

    return component;
  }

  /**
   * Remove a component and handle structural integrity
   */
  public removeComponent(componentId: string): boolean {
    const component = this._components.get(componentId);
    if (!component) return false;

    // Check if it's the cockpit
    if (component === this._cockpitComponent) {
      this.destroyShip();
      return true;
    }

    // Remove from collections
    const gridKey = this.getGridKey(component.gridPosition);
    this._components.delete(componentId);
    this._componentGrid.delete(gridKey);

    // Remove entity using EntityManager
    this._entityManager.removeEntity(component.entity.id);

    // Mark for structural integrity check
    this._needsStructuralCheck = true;

    // Rebuild physics body
    this.rebuildUnifiedPhysicsBody();

    return true;
  }

  /**
   * Handle damage to a specific component
   */
  public damageComponent(componentId: string, damage: number): boolean {
    const component = this._components.get(componentId);
    if (!component) return false;

    const wasDestroyed = component.takeDamage(damage);

    if (wasDestroyed) {
      return this.removeComponent(componentId);
    }

    return false;
  }

  /**
   * Check structural integrity using flood-fill algorithm
   */
  public checkStructuralIntegrity(): IShipComponent[] {
    if (!this._needsStructuralCheck || !this._cockpitComponent) {
      return [];
    }

    const connected = new Set<string>();
    const toVisit = [this._cockpitComponent];

    // Flood-fill from cockpit to find all connected components
    while (toVisit.length > 0) {
      const current = toVisit.pop()!;
      if (connected.has(current.id)) continue;

      connected.add(current.id);

      // Check adjacent grid positions
      const adjacentPositions = this.getAdjacentPositions(current.gridPosition);

      for (const pos of adjacentPositions) {
        const adjacentComponent = this._componentGrid.get(this.getGridKey(pos));
        if (
          adjacentComponent &&
          !adjacentComponent.isDestroyed &&
          !connected.has(adjacentComponent.id)
        ) {
          toVisit.push(adjacentComponent);
        }
      }
    }

    // Find disconnected components
    const disconnected: IShipComponent[] = [];
    for (const component of this._components.values()) {
      if (!connected.has(component.id) && !component.isDestroyed) {
        disconnected.push(component);
      }
    }

    // Remove disconnected components (they become debris)
    for (const component of disconnected) {
      this.removeComponent(component.id);
    }

    this._needsStructuralCheck = false;
    return disconnected;
  } /**
   * Rebuild the unified physics body using existing physics system
   */
  private rebuildUnifiedPhysicsBody(): void {
    // CRITICAL: Remove old individual component physics bodies first
    // This prevents collision detection between old and new bodies
    const activeComponents = Array.from(this._components.values()).filter(
      c => !c.isDestroyed
    );

    // Clean up old individual component physics bodies
    for (const component of activeComponents) {
      const entity = component.entity;
      if (entity.physicsBodyId) {
        // Find and remove the individual physics body
        const allBodies = this._physicsSystem.getAllBodies();
        const oldBody = allBodies.find(
          body => body.id === entity.physicsBodyId
        );
        if (oldBody) {
          this._physicsSystem.removeBody(oldBody);
        }
      }
    }

    // Remove old unified body if it exists
    if (this._unifiedPhysicsBody) {
      this._physicsSystem.removeBody(this._unifiedPhysicsBody);
      this._unifiedPhysicsBody = null;
    }

    if (this._components.size === 0) return;

    // Calculate center position first (this will be the compound body's world position)
    const centerPos = this.calculateCenterPosition();

    // Create compound body parts from components
    const bodyParts: CompoundBodyPart[] = [];

    for (const component of activeComponents) {
      const worldPos = this.gridToWorldPosition(component.gridPosition);

      // CRITICAL: Use relative positions within the compound body
      // This prevents Matter.js from adjusting center of mass incorrectly
      bodyParts.push({
        type: 'rectangle',
        x: worldPos.x - centerPos.x, // Relative to compound body center
        y: worldPos.y - centerPos.y, // Relative to compound body center
        width: this._componentSize,
        height: this._componentSize,
        options: {
          density: 0.001,
          friction: 0.1,
          restitution: 0.3,
          frictionAir: 0.01,
          // CRITICAL: Disable collision between parts of the same ship
          isSensor: false, // Parts should be solid
        },
      });
    }

    if (bodyParts.length === 0) return; // Create unified physics body using existing physics system
    // The physics system handles compound body creation properly
    this._unifiedPhysicsBody = this._physicsSystem.createCompoundBody(
      centerPos.x,
      centerPos.y,
      bodyParts,
      {
        density: 0.001,
        friction: 0.1,
        restitution: 0.3,
        frictionAir: 0.01,
      }
    );

    // Mark this physics body as belonging to a modular ship to prevent self-collision
    (this._unifiedPhysicsBody as any).isModularShip = true;
    (this._unifiedPhysicsBody as any).modularShipId = this._id;

    // Update component entities to reference the new compound body
    for (const component of activeComponents) {
      // Store reference to the compound body in the component entity
      (component.entity as any).parentPhysicsBodyId =
        this._unifiedPhysicsBody.id;
    }

    console.log(
      `🔧 ModularShip: Rebuilt compound body with ${bodyParts.length} components at (${centerPos.x.toFixed(1)}, ${centerPos.y.toFixed(1)})`
    );
  }

  private calculateCenterPosition(): Vector2D {
    if (this._cockpitComponent) {
      return this.gridToWorldPosition(this._cockpitComponent.gridPosition);
    }

    // Fallback: average position of all components
    let totalX = 0,
      totalY = 0,
      count = 0;

    for (const component of this._components.values()) {
      if (!component.isDestroyed) {
        const pos = this.gridToWorldPosition(component.gridPosition);
        totalX += pos.x;
        totalY += pos.y;
        count++;
      }
    }

    return count > 0
      ? { x: totalX / count, y: totalY / count }
      : { x: 0, y: 0 };
  }

  private gridToWorldPosition(gridPos: GridPosition): Vector2D {
    return {
      x: gridPos.x * this._componentSize,
      y: gridPos.y * this._componentSize,
    };
  }

  private getAdjacentPositions(gridPos: GridPosition): GridPosition[] {
    return [
      { x: gridPos.x + 1, y: gridPos.y },
      { x: gridPos.x - 1, y: gridPos.y },
      { x: gridPos.x, y: gridPos.y + 1 },
      { x: gridPos.x, y: gridPos.y - 1 },
    ];
  }

  private getGridKey(gridPos: GridPosition): string {
    return `${gridPos.x},${gridPos.y}`;
  }
  private destroyShip(): void {
    this._isDestroyed = true;

    // CRITICAL: Clean up all physics bodies first to prevent phantom collisions

    // Remove unified physics body
    if (this._unifiedPhysicsBody) {
      this._physicsSystem.removeBody(this._unifiedPhysicsBody);
      this._unifiedPhysicsBody = null;
    }

    // Remove all component physics bodies that might still exist
    for (const componentId of Array.from(this._components.keys())) {
      const component = this._components.get(componentId);
      if (component) {
        // Remove individual component physics body if it exists
        const entity = component.entity;
        if (entity.physicsBodyId) {
          const allBodies = this._physicsSystem.getAllBodies();
          const physicsBody = allBodies.find(
            body => body.id === entity.physicsBodyId
          );
          if (physicsBody) {
            this._physicsSystem.removeBody(physicsBody);
          }
        }

        // Remove entity from entity manager
        this._entityManager.removeEntity(component.entity.id);
      }
    }

    // Clear collections
    this._components.clear();
    this._componentGrid.clear();
    this._cockpitComponent = null;

    console.log(
      `🗑️ ModularShip ${this._id} completely destroyed and cleaned up`
    );
  }

  public update(deltaTime: number): void {
    if (this._isDestroyed) return;

    // Update all components
    for (const component of this._components.values()) {
      component.update(deltaTime);
    }

    // Check structural integrity if needed
    if (this._needsStructuralCheck) {
      this.checkStructuralIntegrity();
    } // Sync component positions with unified physics body
    if (this._unifiedPhysicsBody) {
      const shipPos = this.position;
      const shipAngle = this.angle;
      const shipCenter = this.calculateCenterPosition();

      // Debug: Log rotation occasionally
      if (Math.random() < 0.01) {
        // 1% chance per frame
        console.log(
          `🔄 Ship angle: ${((shipAngle * 180) / Math.PI).toFixed(1)}°`
        );
      }

      // Update individual component positions based on unified body
      for (const component of this._components.values()) {
        if (!component.isDestroyed) {
          // Get component's world position
          const componentWorldPos = this.gridToWorldPosition(
            component.gridPosition
          );

          // Calculate local position relative to ship center
          const localPos = {
            x: componentWorldPos.x - shipCenter.x,
            y: componentWorldPos.y - shipCenter.y,
          };

          // Apply ship's rotation to the local position
          const rotatedX =
            localPos.x * Math.cos(shipAngle) - localPos.y * Math.sin(shipAngle);
          const rotatedY =
            localPos.x * Math.sin(shipAngle) + localPos.y * Math.cos(shipAngle);

          // Calculate final world position
          const worldPos = {
            x: shipPos.x + rotatedX,
            y: shipPos.y + rotatedY,
          };

          // Update component entity position and rotation
          component.entity.position = worldPos;
          component.entity.angle = shipAngle;
        }
      }
    }
  }

  public destroy(): void {
    this.destroyShip();
  }

  /**
   * Handle damage from collision system using compound body part index
   * This leverages the Matter.js compound body part information from CollisionManager
   */
  public takeDamageAtPartIndex(partIndex: number, amount: number): boolean {
    // Get active components (same order as when compound body was created)
    const activeComponents = Array.from(this._components.values()).filter(
      c => !c.isDestroyed
    );

    if (partIndex < 0 || partIndex >= activeComponents.length) {
      console.warn(
        `Invalid part index ${partIndex} for ship with ${activeComponents.length} parts`
      );
      return false;
    }

    // Get the component that corresponds to this part index
    const targetComponent = activeComponents[partIndex];

    // Apply damage to the specific component
    console.log(
      `💥 Damaging component ${targetComponent.id} at part index ${partIndex}`
    );

    // Flash white for damage feedback (leveraging existing renderer system)
    targetComponent.flashDamage();

    return this.damageComponent(targetComponent.id, amount);
  }

  /**
   * Get the physics body ID for collision detection
   * This allows the collision manager to find this ship via its compound body
   */
  public get physicsBodyId(): string | null {
    return this._unifiedPhysicsBody?.id || null;
  }

  /**
   * Interface for collision manager to check if a physics body belongs to this ship
   */
  public hasPhysicsBody(physicsBodyId: string): boolean {
    return this._unifiedPhysicsBody?.id === physicsBodyId;
  }
}
