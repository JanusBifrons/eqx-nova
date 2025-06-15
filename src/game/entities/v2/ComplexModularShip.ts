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
  offset: Vector2D;
  type: keyof typeof BlockType;
  size: Vector2D;
  health: number;
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
  constructor(
    _entityManager: EntityManager,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    position: Vector2D,
    _debrisManager: DebrisManager | null = null,
    id?: string
  ) {
    this._id = id || uuidv4();
    this._physicsSystem = physicsSystem;
    this._rendererSystem = rendererSystem;

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
        offset: { x: 0, y: -b * 2 },
        type: BlockType.SENSOR,
        size: { x: b, y: b },
        health: 50,
      },

      // Row 2: Main weapons and cockpit
      {
        offset: { x: -b, y: -b },
        type: BlockType.WEAPON,
        size: { x: b, y: b },
        health: 75,
      },
      {
        offset: { x: 0, y: -b },
        type: BlockType.COCKPIT,
        size: { x: b, y: b },
        health: 100,
      },
      {
        offset: { x: b, y: -b },
        type: BlockType.WEAPON,
        size: { x: b, y: b },
        health: 75,
      },

      // Row 3: Wide engine and armor section
      {
        offset: { x: -b * 2, y: 0 },
        type: BlockType.ENGINE,
        size: { x: b, y: b },
        health: 60,
      },
      {
        offset: { x: -b, y: 0 },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        offset: { x: 0, y: 0 },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        offset: { x: b, y: 0 },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        offset: { x: b * 2, y: 0 },
        type: BlockType.ENGINE,
        size: { x: b, y: b },
        health: 60,
      },

      // Row 4: Lower defensive section
      {
        offset: { x: -b, y: b },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },
      {
        offset: { x: 0, y: b },
        type: BlockType.SHIELD,
        size: { x: b, y: b },
        health: 80,
      },
      {
        offset: { x: b, y: b },
        type: BlockType.ARMOR,
        size: { x: b, y: b },
        health: 120,
      },

      // Row 5: Rear engine
      {
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
    const parts: CompoundBodyPart[] = this._blockConfigs.map(
      (config, index) => ({
        type: 'rectangle' as const,
        x: config.offset.x,
        y: config.offset.y,
        width: config.size.x,
        height: config.size.y,
        componentId: `${config.type}_${index}`,
      })
    );
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

    if (this._physicsBody) {
      this._physicsSystem.removeBody(this._physicsBody);
      this._physicsBody = null;
    }

    for (const body of this._individualBodies) {
      this._physicsSystem.removeBody(body);
    }
    this._individualBodies = [];

    for (const renderObjectId of this._renderObjectIds) {
      this._rendererSystem.removeRenderObject(renderObjectId);
    }
    this._renderObjectIds = [];

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

    // Find the closest block to the damage position
    let closestBlockIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < this._blockConfigs.length; i++) {
      const blockWorldPos = {
        x: this.position.x + this._blockConfigs[i].offset.x,
        y: this.position.y + this._blockConfigs[i].offset.y,
      };

      const distance = Math.sqrt(
        Math.pow(blockWorldPos.x - position.x, 2) +
          Math.pow(blockWorldPos.y - position.y, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestBlockIndex = i;
      }
    }

    return this.damageBlock(closestBlockIndex, damage);
  }
  public takeDamageAtComponentId(
    componentId: string,
    damage: number = 25
  ): boolean {
    console.log(
      `💥 Complex ship taking ${damage} damage at component ${componentId}`
    );

    // Extract block index from component ID (format: "block_X")
    const blockIndex = parseInt(componentId.replace('block_', ''));
    if (
      isNaN(blockIndex) ||
      blockIndex < 0 ||
      blockIndex >= this._blockConfigs.length
    ) {
      console.warn(`⚠️ Invalid component ID: ${componentId}`);
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
  }

  /**
   * Apply damage to a specific block and trigger flash effect
   */
  private damageBlock(blockIndex: number, damage: number): boolean {
    if (blockIndex < 0 || blockIndex >= this._blockConfigs.length) {
      return false;
    }

    const block = this._blockConfigs[blockIndex];
    console.log(
      `🎯 Damaging ${block.type} block at index ${blockIndex} for ${damage} damage`
    );

    // Reduce block health
    block.health -= damage;

    // Trigger flash effect
    this.triggerBlockFlash(blockIndex);

    // Check if block is destroyed
    if (block.health <= 0) {
      console.log(`💀 ${block.type} block destroyed!`);
      // For now, just mark as destroyed but don't remove
      // In the future, we could break apart the ship or remove the block
      return true;
    }

    return false;
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
}
