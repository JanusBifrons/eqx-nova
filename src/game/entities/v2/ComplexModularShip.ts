import type { EntityManager } from '../../../engine/entity/EntityManager';
import type {
  IPhysicsSystem,
  Vector2D,
  IPhysicsBody,
  CompoundBodyPart,
} from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { IModularShip } from './interfaces/IModularShip';
import type { IShipStructure } from './interfaces/IShipStructure';
import type { DebrisManager } from '../../managers/DebrisManager';
import { ComplexModularShipSplitIntegration } from '../../utils/ComplexModularShipSplitIntegration';
import { v4 as uuidv4 } from 'uuid';

/**
 * BlockType constants for different ship components
 */
const BlockType = {
  COCKPIT: 'COCKPIT', // Command center (orange)
  WEAPON: 'WEAPON', // Laser weapons (red)
  ENGINE: 'ENGINE', // Thrusters (blue)
  ARMOR: 'ARMOR', // Heavy armor (gray)
  SHIELD: 'SHIELD', // Energy shields (cyan)
  CARGO: 'CARGO', // Storage (yellow)
  SENSOR: 'SENSOR', // Sensors/comms (green)
} as const;

interface BlockConfig {
  id: string;
  offset: Vector2D;
  type: keyof typeof BlockType;
  size: Vector2D;
  health: number;
}

/**
 * Callback interface for ship splitting events
 */
interface ShipSplitCallbacks {
  onNewShipCreated?: (shipData: {
    blocks: BlockConfig[];
    position: Vector2D;
    rotation: number;
  }) => void;
  onDebrisCreated?: (debrisData: {
    blocks: BlockConfig[];
    position: Vector2D;
    rotation: number;
  }) => void;
}

/**
 * COMPLEX MODULAR SHIP - A sophisticated multi-block ship design
 * Features different block types, asymmetric design, and specialized weapon systems
 */
export class ComplexModularShip implements IModularShip {
  private readonly _id: string;
  private readonly _physicsSystem: IPhysicsSystem;
  private readonly _rendererSystem: IRendererSystem;

  // Physics and rendering
  private _physicsBody: IPhysicsBody | null = null;
  private _renderObjectIds: string[] = [];
  private _isBrokenApart: boolean = false;
  private _individualBodies: IPhysicsBody[] = [];

  // Block configuration
  private _blockConfigs: BlockConfig[] = [];
  private _baseBlockSize: number = 16;
  // Flash effect state for each block
  private _blockFlashStates: boolean[] = [];
  private _blockFlashTimers: number[] = [];
  private _originalColors: number[] = [];

  // Weapon system
  private _weaponBlocks: number[] = [];
  private _weaponCooldowns: number[] = [];
  private _weaponCooldownTime: number = 80; // Faster firing for multiple weapons

  // Ship state
  private _isDestroyed: boolean = false;

  // Ship splitting callbacks
  private _splitCallbacks: ShipSplitCallbacks = {};

  constructor(
    _entityManager: EntityManager,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    position: Vector2D,
    _debrisManager: DebrisManager | null = null,
    id?: string,
    splitCallbacks?: ShipSplitCallbacks
  ) {
    this._id = id || uuidv4();
    this._physicsSystem = physicsSystem;
    this._rendererSystem = rendererSystem;
    this._splitCallbacks = splitCallbacks || {};

    console.log(
      '🚀 Creating COMPLEX MODULAR SHIP - Advanced multi-block design'
    );
    this.defineShipLayout();
    this.createPhysicsBody(position);
    this.createRenderObjects(position);
    this.initializeWeaponSystem();

    console.log(
      `🚀 Complex modular ship created with ${this._blockConfigs.length} specialized blocks`
    );
  }

  /**
   * Define the ship's block layout - asymmetric frigate design
   */
  private defineShipLayout(): void {
    const b = this._baseBlockSize;

    // Complex ship layout:
    //     [S]           <- Sensor array (top)
    //   [W][C][W]       <- Weapon-Cockpit-Weapon (main row)
    // [E][A][A][A][E]   <- Engine-Armor-Armor-Armor-Engine (wide row)
    //   [A][H][A]       <- Armor-Shield-Armor (bottom row)
    //     [E]           <- Rear engine (bottom)

    this._blockConfigs = [
      // Row 1: Sensor array
      {
        id: uuidv4(),
        offset: { x: 0, y: -b * 2 },
        type: BlockType.SENSOR,
        size: { x: b, y: b },
        health: 50,
      }, // Row 2: Main weapons and cockpit
      {
        id: uuidv4(),
        offset: { x: -b, y: -b },
        type: BlockType.WEAPON,
        size: { x: b, y: b },
        health: 75,
      },
      {
        id: uuidv4(),
        offset: { x: 0, y: -b },
        type: BlockType.COCKPIT,
        size: { x: b, y: b },
        health: 100,
      },
      {
        id: uuidv4(),
        offset: { x: b, y: -b },
        type: BlockType.WEAPON,
        size: { x: b, y: b },
        health: 75,
      }, // Row 3: Wide engine and armor section
      {
        id: uuidv4(),
        offset: { x: -b * 2, y: 0 },
        type: BlockType.ENGINE,
        size: { x: b, y: b },
        health: 60,
      },
      {
        id: uuidv4(),
        offset: { x: -b, y: 0 },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        id: uuidv4(),
        offset: { x: 0, y: 0 },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        id: uuidv4(),
        offset: { x: b, y: 0 },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        id: uuidv4(),
        offset: { x: b * 2, y: 0 },
        type: BlockType.ENGINE,
        size: { x: b, y: b },
        health: 60,
      },

      // Row 4: Lower defensive section
      {
        id: uuidv4(),
        offset: { x: -b, y: b },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        id: uuidv4(),
        offset: { x: 0, y: b },
        type: BlockType.SHIELD,
        size: { x: b, y: b },
        health: 80,
      },
      {
        id: uuidv4(),
        offset: { x: b, y: b },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },

      // Row 5: Rear engine
      {
        id: uuidv4(),
        offset: { x: 0, y: b * 2 },
        type: BlockType.ENGINE,
        size: { x: b, y: b },
        health: 60,
      },
    ];

    console.log(`🚀 Ship layout defined: ${this._blockConfigs.length} blocks`);
  }

  /**
   * Create the compound physics body
   */
  private createPhysicsBody(position: Vector2D): void {
    const parts: CompoundBodyPart[] = this._blockConfigs.map(config => ({
      type: 'rectangle' as const,
      x: config.offset.x,
      y: config.offset.y,
      width: config.size.x,
      height: config.size.y,
      componentId: config.id, // Use the GUID from block config
    }));
    this._physicsBody = this._physicsSystem.createCompoundBody(
      position.x,
      position.y,
      parts,
      {
        isStatic: false,
        density: 0.001,
        friction: 0.1,
        restitution: 0.3,
        frictionAir: 0.02,
      }
    );

    // COORDINATE SYSTEM FIX: Rotate physics body to point "up" (-Y direction)
    // This aligns physics movement with visual appearance
    this._physicsSystem.setRotation(this._physicsBody, -Math.PI / 2);
    console.log(
      `🚀 Physics body created and rotated to point up (-90°, physics matches visuals)`
    );
  }

  /**
   * Create render objects with different colors for each block type
   */
  private createRenderObjects(position: Vector2D): void {
    const blockTypeColors: Record<keyof typeof BlockType, number> = {
      COCKPIT: 0xff8c00, // Orange - command center
      WEAPON: 0xff4444, // Red - weapons
      ENGINE: 0x4444ff, // Blue - engines
      ARMOR: 0x888888, // Gray - armor
      SHIELD: 0x44ffff, // Energy shields
      CARGO: 0xffff44, // Yellow - cargo
      SENSOR: 0x44ff44, // Green - sensors
    };

    this._originalColors = [];
    this._blockFlashStates = new Array(this._blockConfigs.length).fill(false);
    this._blockFlashTimers = new Array(this._blockConfigs.length).fill(0);

    for (let i = 0; i < this._blockConfigs.length; i++) {
      const config = this._blockConfigs[i];
      const color = blockTypeColors[config.type];
      this._originalColors.push(color);

      const renderObjectId = `complex_ship_${this._id}_block_${i}`;
      this._renderObjectIds.push(renderObjectId);

      // Calculate world position
      const blockWorldX = position.x + config.offset.x;
      const blockWorldY = position.y + config.offset.y;

      this._rendererSystem.createRenderObject({
        id: renderObjectId,
        position: { x: blockWorldX, y: blockWorldY },
        angle: 0,
        width: config.size.x,
        height: config.size.y,
        color: color,
        type: 'rectangle',
      });
    }
  }

  /**
   * Initialize the weapon system - weapons are the red blocks
   */
  private initializeWeaponSystem(): void {
    this._weaponBlocks = [];

    for (let i = 0; i < this._blockConfigs.length; i++) {
      if (this._blockConfigs[i].type === 'WEAPON') {
        this._weaponBlocks.push(i);
      }
    }

    this._weaponCooldowns = new Array(this._blockConfigs.length).fill(0);
    console.log(
      `🔫 Weapon system initialized: ${this._weaponBlocks.length} weapon blocks`
    );
  }

  // IModularShip interface implementation
  public get id(): string {
    return this._id;
  }

  public get position(): Vector2D {
    if (this._physicsBody) {
      return this._physicsBody.position;
    } else if (this._individualBodies.length > 0) {
      return this._individualBodies[0].position;
    }
    return { x: 0, y: 0 };
  }

  public get rotation(): number {
    if (this._physicsBody) {
      return this._physicsBody.angle;
    } else if (this._individualBodies.length > 0) {
      return this._individualBodies[0].angle;
    }
    return 0;
  }

  public get velocity(): Vector2D {
    if (this._physicsBody) {
      return this._physicsBody.velocity;
    } else if (this._individualBodies.length > 0) {
      return this._individualBodies[0].velocity;
    }
    return { x: 0, y: 0 };
  }

  public get structure(): IShipStructure {
    return {
      components: [],
      cockpitComponent: null,
      gridSize: this._baseBlockSize,
    } as unknown as IShipStructure;
  }

  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  public get isAlive(): boolean {
    return !this._isDestroyed;
  }

  public get physicsBodyId(): string | null {
    return this._physicsBody?.id || null;
  }

  public setPosition(position: Vector2D): void {
    if (this._physicsBody && !this._isBrokenApart) {
      this._physicsSystem.setPosition(this._physicsBody, position);
    }
  }

  public setRotation(rotation: number): void {
    if (this._physicsBody && !this._isBrokenApart) {
      this._physicsSystem.setRotation(this._physicsBody, rotation);
    }
  }

  public setAngularVelocity(velocity: number): void {
    if (this._physicsBody && !this._isBrokenApart) {
      this._physicsSystem.setAngularVelocity(this._physicsBody, velocity);
    }
  }

  public applyForce(force: Vector2D): void {
    if (this._physicsBody && !this._isBrokenApart) {
      this._physicsSystem.applyForce(this._physicsBody, force);
    }
  }

  // Weapon system methods
  public getWeaponFiringPositions(): Array<{
    position: Vector2D;
    rotation: number;
  }> {
    if (this._isBrokenApart || !this._physicsBody) {
      return [];
    }
    const firingPositions: Array<{ position: Vector2D; rotation: number }> = [];
    const shipAngle = this._physicsBody.angle;
    const shipPosition = this._physicsBody.position;
    const cos = Math.cos(shipAngle);
    const sin = Math.sin(shipAngle);
    const now = performance.now();

    console.log(
      `🔫 Complex ship getting weapon positions: ${this._weaponBlocks.length} total weapons, ship angle: ${((shipAngle * 180) / Math.PI).toFixed(1)}°`
    );

    for (const weaponBlockIndex of this._weaponBlocks) {
      const canFire = (this._weaponCooldowns[weaponBlockIndex] || 0) < now;

      // Only include weapons that are not on cooldown
      if (canFire && weaponBlockIndex < this._blockConfigs.length) {
        const config = this._blockConfigs[weaponBlockIndex];
        const offset = config.offset;

        // Calculate world position of the weapon block
        const blockWorldX = shipPosition.x + (offset.x * cos - offset.y * sin);
        const blockWorldY = shipPosition.y + (offset.x * sin + offset.y * cos); // Calculate firing position (from the front edge of the weapon block)
        const firingOffset = config.size.y / 2 + 8; // Fire from front edge
        // Physics body is now rotated to point "up", so ship forward is the physics angle direction
        const firingAngle = shipAngle; // Ship forward direction (physics angle)
        const firingX = blockWorldX + Math.cos(firingAngle) * firingOffset;
        const firingY = blockWorldY + Math.sin(firingAngle) * firingOffset;
        console.log(
          `🔫 Weapon ${weaponBlockIndex}: can fire, adding position (${firingX.toFixed(1)}, ${firingY.toFixed(1)})`
        );
        firingPositions.push({
          position: { x: firingX, y: firingY },
          rotation: firingAngle, // Use physics angle directly (now aligned with visuals)
        });
      } else {
        console.log(`🔫 Weapon ${weaponBlockIndex}: on cooldown, skipping`);
      }
    }

    console.log(`🔫 Final: ${firingPositions.length} weapons ready to fire`);
    return firingPositions;
  }

  public canFireWeapons(): boolean {
    if (this._isBrokenApart || !this._physicsBody) {
      return false;
    }

    const now = performance.now();
    return this._weaponBlocks.some(
      weaponIndex => (this._weaponCooldowns[weaponIndex] || 0) < now
    );
  }
  public recordWeaponsFired(): void {
    const now = performance.now();
    let firedCount = 0;

    // Only put weapons on cooldown that can actually fire (not already on cooldown)
    for (const weaponIndex of this._weaponBlocks) {
      if ((this._weaponCooldowns[weaponIndex] || 0) < now) {
        this._weaponCooldowns[weaponIndex] = now + this._weaponCooldownTime;
        firedCount++;
      }
    }

    console.log(
      `🔫 ${firedCount} weapons fired and put on cooldown (${this._weaponCooldownTime}ms)`
    );
  }

  public update(deltaTime: number): void {
    // Update flash effects
    this.updateFlashEffects(deltaTime);

    // Update render objects
    this.updateRenderObjects();
  }

  private updateFlashEffects(deltaTime: number): void {
    for (let i = 0; i < this._blockFlashStates.length; i++) {
      if (this._blockFlashStates[i]) {
        this._blockFlashTimers[i] -= deltaTime;

        if (this._blockFlashTimers[i] <= 0) {
          // End flash effect
          this._blockFlashStates[i] = false;
          this._rendererSystem.updateRenderObjectColor(
            this._renderObjectIds[i],
            this._originalColors[i]
          );
        }
      }
    }
  }

  private updateRenderObjects(): void {
    if (this._isBrokenApart) {
      // Update individual broken pieces
      for (
        let i = 0;
        i < this._individualBodies.length && i < this._renderObjectIds.length;
        i++
      ) {
        const body = this._individualBodies[i];
        if (body) {
          this._rendererSystem.updateRenderObject(
            this._renderObjectIds[i],
            body.position,
            body.angle
          );
        }
      }
    } else {
      // Update compound body parts
      if (this._physicsBody && this._renderObjectIds.length > 0) {
        const angle = this._physicsBody.angle;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for (
          let i = 0;
          i < this._renderObjectIds.length && i < this._blockConfigs.length;
          i++
        ) {
          const config = this._blockConfigs[i];
          const offset = config.offset;

          // Calculate rotated position
          const blockX =
            this._physicsBody.position.x + (offset.x * cos - offset.y * sin);
          const blockY =
            this._physicsBody.position.y + (offset.x * sin + offset.y * cos);

          this._rendererSystem.updateRenderObject(
            this._renderObjectIds[i],
            { x: blockX, y: blockY },
            this._physicsBody.angle
          );
        }
      }
    }
  }

  public destroy(): void {
    console.log('🚀 Destroying complex modular ship');

    // Clean up physics and render objects
    this.cleanupPhysicsAndRender();

    // Clean up individual bodies if they exist
    for (const body of this._individualBodies) {
      this._physicsSystem.removeBody(body);
    }
    this._individualBodies = [];

    // Mark as destroyed
    this._isDestroyed = true;
  }

  // Damage methods for IModularShip interface
  public takeDamageAtPosition(
    position: Vector2D,
    damage: number = 25
  ): boolean {
    console.log(
      `💥 Complex ship taking ${damage} damage at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`
    );
    console.log(
      `🚢 Ship position: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}), rotation: ${this.rotation.toFixed(3)} rad (${((this.rotation * 180) / Math.PI).toFixed(1)}°)`
    );

    // Find the closest block to the damage position
    let closestBlockIndex = 0;
    let closestDistance = Infinity;

    const shipPosition = this.position;
    const shipRotation = this.rotation;

    console.log(
      `🔍 Checking ${this._blockConfigs.length} blocks for closest to damage:`
    );

    for (let i = 0; i < this._blockConfigs.length; i++) {
      const blockOffset = this._blockConfigs[i].offset;

      // Rotate the block offset according to ship's current rotation
      const cos = Math.cos(shipRotation);
      const sin = Math.sin(shipRotation);
      const rotatedOffset = {
        x: blockOffset.x * cos - blockOffset.y * sin,
        y: blockOffset.x * sin + blockOffset.y * cos,
      };

      // Calculate the block's world position
      const blockWorldPos = {
        x: shipPosition.x + rotatedOffset.x,
        y: shipPosition.y + rotatedOffset.y,
      };

      const distance = Math.sqrt(
        Math.pow(blockWorldPos.x - position.x, 2) +
        Math.pow(blockWorldPos.y - position.y, 2)
      );

      console.log(
        `  Block ${i}: ${this._blockConfigs[i].type} at offset (${blockOffset.x}, ${blockOffset.y}) -> world (${blockWorldPos.x.toFixed(1)}, ${blockWorldPos.y.toFixed(1)}) -> distance ${distance.toFixed(1)}`
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestBlockIndex = i;
      }
    }

    console.log(
      `🎯 Closest block to damage position: index ${closestBlockIndex}, type ${this._blockConfigs[closestBlockIndex].type}, distance ${closestDistance.toFixed(1)}`
    );

    return this.damageBlock(closestBlockIndex, damage);
  }
  public takeDamageAtComponentId(
    componentId: string,
    damage: number = 25
  ): boolean {
    console.log(
      `💥 Complex ship taking ${damage} damage at component ${componentId}`
    );

    // Find block by GUID
    const blockIndex = this._blockConfigs.findIndex(
      block => block.id === componentId
    );
    if (blockIndex === -1) {
      console.warn(`⚠️ Component not found with ID: ${componentId}`);
      console.warn(
        `🔍 Available component IDs:`,
        this._blockConfigs.map(b => b.id)
      );
      return false;
    }

    return this.damageBlock(blockIndex, damage);
  }

  public takeDamageAtComponent(
    componentId: string,
    damage: number = 25
  ): boolean {
    return this.takeDamageAtComponentId(componentId, damage);
  }

  public takeDamageAtPartIndex(
    partIndex: number,
    damage: number = 25
  ): boolean {
    console.log(
      `💥 Complex ship taking ${damage} damage at part index ${partIndex}`
    );

    if (partIndex < 0 || partIndex >= this._blockConfigs.length) {
      console.warn(`⚠️ Invalid part index: ${partIndex}`);
      return false;
    }

    return this.damageBlock(partIndex, damage);
  } /**
   * Apply damage to a specific block and trigger flash effect
   */
  private damageBlock(blockIndex: number, damage: number): boolean {
    if (blockIndex < 0 || blockIndex >= this._blockConfigs.length) {
      console.warn(
        `⚠️ Invalid block index ${blockIndex}, valid range: 0-${this._blockConfigs.length - 1}`
      );
      return false;
    }

    const block = this._blockConfigs[blockIndex];
    console.log(
      `🎯 Damaging ${block.type} block "${block.id}" at index ${blockIndex} for ${damage} damage (health: ${block.health}/${block.health + damage})`
    );
    console.log(
      `📋 Current block layout (${this._blockConfigs.length} blocks):`
    );
    this._blockConfigs.forEach((b, i) => {
      console.log(
        `  [${i}] ${b.type} at (${b.offset.x}, ${b.offset.y}) health: ${b.health}`
      );
    });

    // Reduce block health
    block.health -= damage;

    // Trigger flash effect
    this.triggerBlockFlash(blockIndex);

    // Check if block is destroyed
    if (block.health <= 0) {
      console.log(
        `💀 ${block.type} block "${block.id}" at index ${blockIndex} destroyed!`
      );
      console.log(
        `🗑️ Removing block from arrays (current length: ${this._blockConfigs.length})`
      );

      // Remove the destroyed block from configuration
      this._blockConfigs.splice(blockIndex, 1);
      console.log(
        `📦 Block configs after removal: ${this._blockConfigs.length} blocks`
      );

      // Remove corresponding render object
      if (blockIndex < this._renderObjectIds.length) {
        const renderObjectId = this._renderObjectIds[blockIndex];
        this._rendererSystem.removeRenderObject(renderObjectId);
        this._renderObjectIds.splice(blockIndex, 1);
      }

      // Remove corresponding flash states
      if (blockIndex < this._blockFlashStates.length) {
        this._blockFlashStates.splice(blockIndex, 1);
        this._blockFlashTimers.splice(blockIndex, 1);
        this._originalColors.splice(blockIndex, 1);
      } // Update weapon block indices after removal
      this.updateWeaponIndicesAfterRemoval(blockIndex);

      // CRITICAL: Rebuild physics body to remove the destroyed part
      // This ensures physics body parts match the remaining blocks
      this.rebuildPhysicsBody();

      // Check if this was a critical component that destroys the entire ship
      if (block.type === 'COCKPIT') {
        console.log(`💀 CRITICAL: Cockpit destroyed - ship is lost!`);
        this.destroy();
        return true; // Entire ship destroyed
      }

      // Check for ship splitting after block destruction
      const wasSplit = this.checkAndHandleShipSplitting();
      if (wasSplit) {
        console.log(`🔧 Ship was split into multiple parts`);
        return true; // Ship was split, this instance is now invalid
      }

      console.log(`🔧 Ship remains intact after block destruction`);
      return false; // Ship survives with damaged component
    }

    return false;
  }

  /**
   * Update weapon block indices after a block is removed
   */
  private updateWeaponIndicesAfterRemoval(removedIndex: number): void {
    // Update weapon block indices - any weapon index greater than removedIndex needs to be decremented
    for (let i = 0; i < this._weaponBlocks.length; i++) {
      if (this._weaponBlocks[i] > removedIndex) {
        this._weaponBlocks[i]--;
      } else if (this._weaponBlocks[i] === removedIndex) {
        // The weapon block itself was destroyed, remove it
        this._weaponBlocks.splice(i, 1);
        this._weaponCooldowns.splice(i, 1);
        i--; // Adjust index after removal
      }
    }
  }

  /**
   * Check if the ship should split and handle the splitting process
   */
  private checkAndHandleShipSplitting(): boolean {
    if (!this._physicsBody) {
      return false;
    }

    const currentPosition = this.position;
    const currentRotation = this.rotation;

    const wasSplit = ComplexModularShipSplitIntegration.checkAndHandleShipSplitting(
      this._blockConfigs,
      currentPosition,
      currentRotation,
      this._physicsSystem,
      this._rendererSystem,
      this._physicsBody.id,
      this._renderObjectIds,
      shipData => {
        // Handle new ship creation
        if (this._splitCallbacks.onNewShipCreated) {
          this._splitCallbacks.onNewShipCreated({
            blocks: shipData.blocks as BlockConfig[],
            position: currentPosition,
            rotation: currentRotation,
          });
        }
      },
      debrisData => {
        // Handle debris creation
        if (this._splitCallbacks.onDebrisCreated) {
          this._splitCallbacks.onDebrisCreated({
            blocks: debrisData.blocks as BlockConfig[],
            position: currentPosition,
            rotation: currentRotation,
          });
        }
      }
    );

    // CRITICAL FIX: If ship was split, mark this instance as destroyed to prevent orphaned objects
    if (wasSplit) {
      console.log('🔧 Ship was split - marking original instance as destroyed');
      this._isDestroyed = true;
      // Clear any remaining references to prevent orphaned objects
      this._blockConfigs = [];
      this._renderObjectIds = [];
      this._physicsBody = null;
    }

    return wasSplit;
  }

  /**
   * Trigger flash effect for a specific block
   */
  private triggerBlockFlash(blockIndex: number): void {
    if (blockIndex < 0 || blockIndex >= this._blockFlashStates.length) {
      return;
    }

    console.log(`✨ Triggering flash effect for block ${blockIndex}`);

    // Set flash state
    this._blockFlashStates[blockIndex] = true;
    this._blockFlashTimers[blockIndex] = 200; // 200ms flash duration

    // Change block color to white for flash effect
    if (blockIndex < this._renderObjectIds.length) {
      this._rendererSystem.updateRenderObjectColor(
        this._renderObjectIds[blockIndex],
        0xffffff // White flash
      );
    }
  }

  /**
   * Create a new ComplexModularShip from split data
   * This static method can be used to create new ships after splitting
   */
  public static createFromSplitData(
    entityManager: EntityManager,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    splitData: { blocks: BlockConfig[]; position: Vector2D; rotation: number },
    debrisManager?: DebrisManager,
    splitCallbacks?: ShipSplitCallbacks
  ): ComplexModularShip {
    const newShip = new ComplexModularShip(
      entityManager,
      physicsSystem,
      rendererSystem,
      splitData.position,
      debrisManager,
      undefined,
      splitCallbacks
    );

    // Replace the default block configuration with the split data
    newShip._blockConfigs = splitData.blocks;

    // Recreate physics and render objects based on the new configuration
    newShip.recreateShipFromBlocks(splitData.position, splitData.rotation);

    return newShip;
  }

  /**
   * Recreate the ship's physics body and render objects from current block configuration
   * Used when creating ships from split data
   */
  private recreateShipFromBlocks(position: Vector2D, rotation: number): void {
    // Clear existing objects
    this.cleanupPhysicsAndRender();

    // Recreate physics body from current block configuration
    this.createPhysicsBodyFromBlocks(position, rotation);

    // Recreate render objects from current block configuration
    this.createRenderObjectsFromBlocks(position);

    // Reinitialize weapon system based on current blocks
    this.reinitializeWeaponSystem();
  } /**
   * Create physics body from current block configuration
   */
  private createPhysicsBodyFromBlocks(
    position: Vector2D,
    rotation: number
  ): void {
    const parts: CompoundBodyPart[] = [];

    for (const blockConfig of this._blockConfigs) {
      parts.push({
        type: 'rectangle',
        x: blockConfig.offset.x,
        y: blockConfig.offset.y,
        width: blockConfig.size.x,
        height: blockConfig.size.y,
        componentId: blockConfig.id,
      });
    }

    this._physicsBody = this._physicsSystem.createCompoundBody(
      position.x,
      position.y,
      parts,
      {
        isStatic: false,
        density: 0.001,
        friction: 0.1,
        restitution: 0.3,
        frictionAir: 0.02,
      }
    );

    if (rotation !== 0) {
      this._physicsSystem.setRotation(this._physicsBody, rotation);
    }
  }

  /**
   * Create render objects from current block configuration
   */
  private createRenderObjectsFromBlocks(position: Vector2D): void {
    const blockTypeColors: Record<keyof typeof BlockType, number> = {
      COCKPIT: 0xff8c00, // Orange - command center
      WEAPON: 0xff4444, // Red - weapons
      ENGINE: 0x4444ff, // Blue - engines
      ARMOR: 0x888888, // Gray - armor
      SHIELD: 0x44ffff, // Energy shields
      CARGO: 0xffff44, // Yellow - cargo
      SENSOR: 0x44ff44, // Green - sensors
    };

    this._renderObjectIds = [];
    this._blockFlashStates = [];
    this._blockFlashTimers = [];
    this._originalColors = [];

    for (let i = 0; i < this._blockConfigs.length; i++) {
      const config = this._blockConfigs[i];
      const color = blockTypeColors[config.type];
      this._originalColors.push(color);

      const renderObjectId = `complex_ship_${this._id}_block_${i}`;
      this._renderObjectIds.push(renderObjectId);
      this._blockFlashStates.push(false);
      this._blockFlashTimers.push(0);

      // Calculate world position
      const blockWorldX = position.x + config.offset.x;
      const blockWorldY = position.y + config.offset.y;

      this._rendererSystem.createRenderObject({
        id: renderObjectId,
        position: { x: blockWorldX, y: blockWorldY },
        angle: 0,
        width: config.size.x,
        height: config.size.y,
        color: color,
        type: 'rectangle',
      });
    }
  }

  /**
   * Reinitialize weapon system based on current blocks
   */
  private reinitializeWeaponSystem(): void {
    this._weaponBlocks = [];
    this._weaponCooldowns = [];

    for (let i = 0; i < this._blockConfigs.length; i++) {
      if (this._blockConfigs[i].type === 'WEAPON') {
        this._weaponBlocks.push(i);
        this._weaponCooldowns.push(0);
      }
    }
  }
  /**
   * Clean up physics body and render objects
   */
  private cleanupPhysicsAndRender(): void {
    if (this._physicsBody) {
      this._physicsSystem.removeBody(this._physicsBody);
      this._physicsBody = null;
    }

    for (const renderObjectId of this._renderObjectIds) {
      this._rendererSystem.removeRenderObject(renderObjectId);
    }
    this._renderObjectIds = [];
  }

  /**
   * Debug helper: Get current block world positions for debugging
   */
  public getBlockWorldPositions(): Array<{
    index: number;
    type: string;
    worldPos: Vector2D;
    offset: Vector2D;
  }> {
    const shipPosition = this.position;
    const shipRotation = this.rotation;
    const cos = Math.cos(shipRotation);
    const sin = Math.sin(shipRotation);

    return this._blockConfigs.map((block, index) => {
      const rotatedOffset = {
        x: block.offset.x * cos - block.offset.y * sin,
        y: block.offset.x * sin + block.offset.y * cos,
      };
      const worldPos = {
        x: shipPosition.x + rotatedOffset.x,
        y: shipPosition.y + rotatedOffset.y,
      };
      return {
        index,
        type: block.type,
        worldPos,
        offset: block.offset,
      };
    });
  }

  /**
   * Rebuild the physics body to match the current block configuration
   * This is necessary when blocks are destroyed to keep physics and visuals in sync
   */
  private rebuildPhysicsBody(): void {
    if (!this._physicsBody) {
      console.warn('⚠️ Cannot rebuild physics body - no existing body');
      return;
    }

    // Store current physics state
    const currentPosition = this._physicsBody.position;
    const currentAngle = this._physicsBody.angle;
    const currentVelocity = this._physicsBody.velocity;
    const currentAngularVelocity = this._physicsBody.angularVelocity;

    console.log(
      `🔧 Rebuilding physics body with ${this._blockConfigs.length} remaining blocks`
    );

    // Remove the old physics body
    this._physicsSystem.removeBody(this._physicsBody);

    // Create new parts array from current block configs
    const parts: CompoundBodyPart[] = this._blockConfigs.map(config => ({
      type: 'rectangle' as const,
      x: config.offset.x,
      y: config.offset.y,
      width: config.size.x,
      height: config.size.y,
      componentId: config.id, // Use the GUID from block config
    }));

    // Create new compound body
    this._physicsBody = this._physicsSystem.createCompoundBody(
      currentPosition.x,
      currentPosition.y,
      parts,
      {
        isStatic: false,
        density: 0.001,
        friction: 0.1,
        restitution: 0.3,
        frictionAir: 0.02,
      }
    );

    // Restore physics state
    this._physicsSystem.setRotation(this._physicsBody, currentAngle);
    this._physicsSystem.setVelocity(this._physicsBody, currentVelocity);
    this._physicsSystem.setAngularVelocity(
      this._physicsBody,
      currentAngularVelocity
    );

    console.log(
      `✅ Physics body rebuilt successfully with ${parts.length} parts`
    );
  }
}
