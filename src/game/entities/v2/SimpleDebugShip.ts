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
 * SIMPLE DEBUG SHIP - Replaces ModularShip temporarily for debugging
 * Uses a compound body with multiple equal-sized rectangle blocks
 * This helps us verify that physics and rendering are properly aligned
 */
export class SimpleDebugShip implements IModularShip {
  private readonly _id: string;
  private readonly _physicsSystem: IPhysicsSystem;
  private readonly _rendererSystem: IRendererSystem;
  private readonly _debrisManager: DebrisManager | null;

  // Single compound physics body and multiple render objects
  private _physicsBody: IPhysicsBody | null = null;
  private _renderObjectIds: string[] = []; // For broken apart state
  private _isBrokenApart: boolean = false;
  private _individualBodies: IPhysicsBody[] = [];
  private _blockSize: number = 20;
  private _blockOffsets: Vector2D[] = [];

  // Flash effect state for each block
  private _blockFlashStates: boolean[] = [];
  private _blockFlashTimers: number[] = [];
  private _originalColors: number[] = [];
  private _flashDuration: number = 200; // milliseconds
  private _flashColor: number = 0xffffff; // white

  // Weapon system
  private _weaponBlocks: number[] = []; // Array of block indices that are weapon blocks
  private _weaponCooldowns: number[] = []; // Cooldown timers for each weapon block
  private _weaponCooldownTime: number = 100; // milliseconds between weapon shots

  // Callback for respawn requests
  private _onRespawnRequest: (() => void) | null = null;

  // Simple state
  private _isDestroyed: boolean = false;
  constructor(
    _entityManager: EntityManager,
    physicsSystem: IPhysicsSystem,
    rendererSystem: IRendererSystem,
    position: Vector2D,
    debrisManager: DebrisManager | null = null,
    id?: string,
    customBlockOffsets?: Vector2D[] // NEW: Allow custom block layouts
  ) {
    this._id = id || uuidv4();
    this._physicsSystem = physicsSystem;
    this._rendererSystem = rendererSystem;
    this._debrisManager = debrisManager;
    console.log(
      '🔧 Creating SIMPLE DEBUG SHIP - Compound body with multiple equal-sized blocks'
    );

    // Define block size and arrangement
    this._blockSize = 20; // All blocks are 20x20
    const halfBlock = this._blockSize / 2;

    if (customBlockOffsets && customBlockOffsets.length > 0) {
      // Use custom block layout (these are already relative offsets from AIManager)
      this._blockOffsets = customBlockOffsets.map(pos => ({
        x: pos.x,
        y: pos.y,
      }));
      console.log(`🔧 Using CUSTOM block layout with ${this._blockOffsets.length} blocks`);
      console.log(`🔧 Custom block offsets:`, this._blockOffsets);
    } else {
      // Store block offsets for later use when breaking apart
      // Keep the original vertical layout since that looks correct visually
      // We'll align the physics with an initial rotation instead
      this._blockOffsets = [
        { x: -this._blockSize, y: -halfBlock }, // Top left (weapon)
        { x: 0, y: -halfBlock }, // Top center (weapon)
        { x: this._blockSize, y: -halfBlock }, // Top right (weapon)
        { x: -this._blockSize, y: halfBlock }, // Bottom left
        { x: 0, y: halfBlock }, // Bottom center
        { x: this._blockSize, y: halfBlock }, // Bottom right
      ];
    }

    // Create compound body with dynamic number of blocks based on _blockOffsets
    const parts: CompoundBodyPart[] = this._blockOffsets.map((offset, index) => ({
      type: 'rectangle' as const,
      x: offset.x,
      y: offset.y,
      width: this._blockSize,
      height: this._blockSize,
      componentId: `block_${index}`,
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

    // DO NOT rotate the physics body - keep it at default orientation
    // Let the rendering system handle visual rotation
    // this._physicsSystem.setRotation(this._physicsBody, -Math.PI / 2);

    console.log(
      `🚀 Ship ${this._id} created at position (${position.x}, ${position.y})`
    );
    console.log(
      `🚀 Physics body at default orientation (0° = right, ship visually points up)`
    );
    console.log(`🚀 Block offsets:`, this._blockOffsets);
    console.log(`🚀 Weapon blocks: [${this._weaponBlocks.join(', ')}]`);

    // Create render objects for each block with different colors
    // Front row (weapons) will be red/orange colors, rear row will be blue/green
    const baseColors = [
      0xff0000, // Red (Front left weapon)
      0xff4500, // Orange Red (Front center weapon)
      0xff8c00, // Dark Orange (Front right weapon)
      0x0000ff, // Blue (Rear left)
      0x4169e1, // Royal Blue (Rear center)
      0x00bfff, // Deep Sky Blue (Rear right)
    ];

    // Create colors array for the actual number of blocks
    const colors = Array.from({ length: this._blockOffsets.length }, (_, i) =>
      baseColors[i % baseColors.length]
    );

    // Initialize flash effect arrays
    this._originalColors = [...colors];
    this._blockFlashStates = new Array(this._blockOffsets.length).fill(false);
    this._blockFlashTimers = new Array(this._blockOffsets.length).fill(0);

    // Create render objects for each block dynamically
    for (let i = 0; i < this._blockOffsets.length; i++) {
      const renderObjectId = `ship_${this._id}_block_${i}`;
      this._renderObjectIds.push(renderObjectId);

      // Calculate world position from block offset
      const blockWorldX = position.x + this._blockOffsets[i].x;
      const blockWorldY = position.y + this._blockOffsets[i].y;

      console.log(`🎨 Creating render object ${i}: ID=${renderObjectId}, pos=(${blockWorldX}, ${blockWorldY}), color=0x${colors[i % colors.length].toString(16)}`);

      this._rendererSystem.createRenderObject({
        id: renderObjectId,
        position: { x: blockWorldX, y: blockWorldY },
        angle: 0,
        width: this._blockSize,
        height: this._blockSize,
        color: colors[i % colors.length], // Cycle through colors if we have more blocks
        type: 'rectangle',
      });
    }

    // Initialize weapon system
    this.initializeWeaponSystem();

    console.log(
      `🔧 Simple debug ship created as compound body with ${parts.length} blocks at (${position.x}, ${position.y})`
    );
  }

  // Implement IModularShip interface with minimal functionality
  public get id(): string {
    return this._id;
  }
  public get position(): Vector2D {
    // Return the position of the compound body or first individual body
    if (this._physicsBody) {
      return this._physicsBody.position;
    } else if (this._individualBodies.length > 0) {
      return this._individualBodies[0].position;
    }
    return { x: 0, y: 0 };
  }

  public get rotation(): number {
    // Return the rotation of the compound body or first individual body
    if (this._physicsBody) {
      return this._physicsBody.angle;
    } else if (this._individualBodies.length > 0) {
      return this._individualBodies[0].angle;
    }
    return 0;
  }

  public get velocity(): Vector2D {
    // Return the velocity of the compound body or first individual body
    if (this._physicsBody) {
      return this._physicsBody.velocity;
    } else if (this._individualBodies.length > 0) {
      return this._individualBodies[0].velocity;
    }
    return { x: 0, y: 0 };
  }
  public get structure(): IShipStructure {
    // Return minimal structure - cast to avoid interface mismatch
    return {
      components: [],
      cockpitComponent: null,
      gridSize: 20,
    } as unknown as IShipStructure;
  }

  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  public get isAlive(): boolean {
    return !this._isDestroyed;
  }
  public get physicsBodyId(): string | null {
    // Return the ID of the compound body
    return this._physicsBody?.id || null;
  }
  public setPosition(position: Vector2D): void {
    // Only set position for the compound body when intact
    if (this._physicsBody && !this._isBrokenApart) {
      this._physicsSystem.setPosition(this._physicsBody, position);
    }
    // Note: When broken apart, we don't move individual pieces
    // They should maintain their physics-driven positions
  }
  public setRotation(rotation: number): void {
    // Only set rotation for the compound body when intact
    if (this._physicsBody && !this._isBrokenApart) {
      this._physicsSystem.setRotation(this._physicsBody, rotation);
    }
    // Note: When broken apart, we don't control individual pieces
  }
  public setAngularVelocity(velocity: number): void {
    // Only set angular velocity for the compound body when intact
    if (this._physicsBody && !this._isBrokenApart) {
      this._physicsSystem.setAngularVelocity(this._physicsBody, velocity);
    }
    // Note: When broken apart, we don't control individual pieces
  }
  public applyForce(force: Vector2D): void {
    // Only apply force to the compound body when intact
    // When broken apart, the pieces should just float as debris
    if (this._physicsBody && !this._isBrokenApart) {
      console.log(
        `🚀 Applying force (${force.x.toFixed(2)}, ${force.y.toFixed(2)}) to ship at angle ${this._physicsBody.angle.toFixed(3)} radians (${((this._physicsBody.angle * 180) / Math.PI).toFixed(1)}°)`
      );
      this._physicsSystem.applyForce(this._physicsBody, force);
    }
    // Note: When broken apart, we don't apply input forces to individual pieces
    // They should behave as independent debris
  }
  public update(_deltaTime?: number): void {
    const deltaTime = _deltaTime || 16; // Default to ~60fps if not provided

    // Update flash effects
    this.updateFlashEffects(deltaTime);

    // Update weapon cooldowns
    this.updateWeaponCooldowns(deltaTime);

    // Check for key presses (X to break apart, R to respawn)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', this.handleKeyPress.bind(this), {
        once: true,
      });
    }

    // Update render objects based on current state
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

        // Update each render object position using stored offsets
        for (
          let i = 0;
          i < this._renderObjectIds.length && i < this._blockOffsets.length;
          i++
        ) {
          const offset = this._blockOffsets[i];

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
    console.log('🔧 Destroying simple debug ship');

    // Remove the compound physics body if it exists
    if (this._physicsBody) {
      this._physicsSystem.removeBody(this._physicsBody);
      this._physicsBody = null;
    }

    // Remove individual physics bodies if they exist
    for (const body of this._individualBodies) {
      this._physicsSystem.removeBody(body);
    }
    this._individualBodies = [];

    // Remove all render objects
    for (const renderObjectId of this._renderObjectIds) {
      this._rendererSystem.removeRenderObject(renderObjectId);
    }
    this._renderObjectIds = [];

    this._isDestroyed = true;
  }

  // Weapon system methods
  private initializeWeaponSystem(): void {
    // Designate specific blocks as weapon blocks
    // For custom layouts: Use the first few blocks as weapons (up to 3)
    // For default layout: Use top row blocks (indices 0, 1, 2) as weapon blocks
    const maxWeapons = Math.min(3, this._blockOffsets.length);
    this._weaponBlocks = Array.from({ length: maxWeapons }, (_, i) => i);
    this._weaponCooldowns = new Array(this._blockOffsets.length).fill(0);

    console.log(
      `🔫 Weapon system initialized: ${this._weaponBlocks.length} weapon blocks (indices: ${this._weaponBlocks.join(', ')}) out of ${this._blockOffsets.length} total blocks`
    );
  }

  /**
   * Get firing positions for all weapon blocks
   */
  public getWeaponFiringPositions(): Array<{
    position: Vector2D;
    rotation: number;
  }> {
    if (this._isBrokenApart || !this._physicsBody) {
      console.log(
        `🔫 Cannot fire: broken apart (${this._isBrokenApart}) or no physics body (${!this._physicsBody})`
      );
      return []; // No weapons when broken apart or no physics body
    }

    const firingPositions: Array<{ position: Vector2D; rotation: number }> = [];
    const shipAngle = this._physicsBody.angle;
    const shipPosition = this._physicsBody.position;
    const cos = Math.cos(shipAngle);
    const sin = Math.sin(shipAngle);
    const now = performance.now();

    console.log(
      `🔫 Ship angle: ${shipAngle.toFixed(3)} radians (${((shipAngle * 180) / Math.PI).toFixed(1)}°)`
    );
    console.log(
      `🔫 Ship position: (${shipPosition.x.toFixed(1)}, ${shipPosition.y.toFixed(1)})`
    );
    console.log(
      `🔫 Checking ${this._weaponBlocks.length} weapon blocks: [${this._weaponBlocks.join(', ')}]`
    );

    // Calculate firing position for each weapon block that can fire
    for (const weaponBlockIndex of this._weaponBlocks) {
      const cooldownTime = this._weaponCooldowns[weaponBlockIndex] || 0;
      const canFire = cooldownTime < now;

      console.log(
        `🔫 Weapon ${weaponBlockIndex}: cooldown expires at ${cooldownTime}, now is ${now}, can fire: ${canFire}`
      );

      // Only include weapons that are not on cooldown
      if (canFire && weaponBlockIndex < this._blockOffsets.length) {
        const offset = this._blockOffsets[weaponBlockIndex];

        // Calculate world position of the weapon block
        const blockWorldX = shipPosition.x + (offset.x * cos - offset.y * sin);
        const blockWorldY = shipPosition.y + (offset.x * sin + offset.y * cos);

        // Calculate firing position (slightly ahead of the block)
        const firingOffset = this._blockSize / 2 + 5; // Fire from front edge of block
        // Physics body is at default orientation, but ship visually points "up"
        // To fire "forward" (up from ship's perspective), we need to fire at -90° from physics angle
        const firingAngle = shipAngle - Math.PI / 2; // Ship forward direction (up)
        const firingX = blockWorldX + Math.cos(firingAngle) * firingOffset;
        const firingY = blockWorldY + Math.sin(firingAngle) * firingOffset;

        console.log(
          `🔫 Block ${weaponBlockIndex}: offset (${offset.x}, ${offset.y}) -> world (${blockWorldX.toFixed(1)}, ${blockWorldY.toFixed(1)}) -> firing (${firingX.toFixed(1)}, ${firingY.toFixed(1)})`
        );

        firingPositions.push({
          position: { x: firingX, y: firingY },
          rotation: firingAngle, // Use corrected firing angle for laser direction
        });
      }
    }

    console.log(
      `🔫 Final result: ${firingPositions.length} firing positions generated`
    );
    return firingPositions;
  }

  /**
   * Check if any weapon can fire (not on cooldown)
   */
  public canFireWeapons(): boolean {
    if (this._isBrokenApart || !this._physicsBody) {
      return false;
    }

    const now = performance.now();
    const canFire = this._weaponBlocks.some(
      weaponIndex => (this._weaponCooldowns[weaponIndex] || 0) < now
    );

    // Debug logging for weapon cooldowns
    if (Math.random() < 0.1) {
      // 10% chance to log
      console.log(
        `🔫 Weapon cooldown check: ${this._weaponBlocks.length} weapons, can fire: ${canFire}`
      );
    }

    return canFire;
  }

  /**
   * Update weapon cooldowns
   */
  public updateWeaponCooldowns(_deltaTime: number): void {
    // Weapon cooldowns are managed using absolute timestamps, so no delta time update needed
    // This method exists for consistency with other update patterns
  }

  /**
   * Record that weapons have fired (sets cooldown)
   */
  public recordWeaponsFired(): void {
    const now = performance.now();
    // Only set cooldown for weapons that can actually fire (not already on cooldown)
    let firedCount = 0;
    for (const weaponIndex of this._weaponBlocks) {
      if ((this._weaponCooldowns[weaponIndex] || 0) < now) {
        this._weaponCooldowns[weaponIndex] = now + this._weaponCooldownTime;
        firedCount++;
      }
    }

    if (firedCount > 0 && Math.random() < 0.2) {
      // 20% chance to log
      console.log(`🔫 ${firedCount} weapons fired and put on cooldown`);
    }
  }

  // Stub methods for IModularShip interface
  public addComponent(): boolean {
    return false;
  }
  public removeComponent(): boolean {
    return false;
  }
  public takeDamageAtComponent(): boolean {
    return false;
  }
  public takeDamageAtPosition(): boolean {
    return false;
  }
  public takeDamageAtComponentId(): boolean {
    return false;
  }
  public takeDamageAtPartIndex(): boolean {
    return false;
  }
  public getComponentAt(): any {
    return null;
  }
  public getConnectedComponents(): any[] {
    return [];
  }
  public checkStructuralIntegrity(): boolean {
    return true;
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'x' || event.key === 'X') {
      console.log('🔧 X key pressed - breaking apart ship!');
      this.breakApart();
    } else if (event.key === 'r' || event.key === 'R') {
      if (this._isBrokenApart && this._onRespawnRequest) {
        console.log('🔧 R key pressed - requesting respawn!');
        this._onRespawnRequest();
      }
    }
  }

  private breakApart(): void {
    if (this._isBrokenApart || !this._physicsBody) {
      return; // Already broken apart or no physics body
    }

    console.log('🔧 Breaking apart compound ship into individual pieces');

    // Store current position and velocity for transferring to individual pieces
    const currentPos = this._physicsBody.position;
    const currentVel = this._physicsBody.velocity;
    const currentAngle = this._physicsBody.angle;
    const currentAngularVel = this._physicsBody.angularVelocity;

    // Remove the compound body
    this._physicsSystem.removeBody(this._physicsBody);
    this._physicsBody = null;

    // Create individual physics bodies for each block
    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);

    for (let i = 0; i < this._blockOffsets.length; i++) {
      const offset = this._blockOffsets[i];

      // Calculate world position of this block
      const worldX = currentPos.x + (offset.x * cos - offset.y * sin);
      const worldY = currentPos.y + (offset.x * sin + offset.y * cos);

      // Create individual physics body
      const individualBody = this._physicsSystem.createRectangle(
        worldX,
        worldY,
        this._blockSize,
        this._blockSize,
        {
          isStatic: false,
          density: 0.001,
          friction: 0.1,
          restitution: 0.3,
          frictionAir: 0.02,
        }
      );

      // Set initial velocity (with some random spread for dramatic effect)
      const randomSpread = 0.3;
      const spreadX = (Math.random() - 0.5) * randomSpread;
      const spreadY = (Math.random() - 0.5) * randomSpread;

      this._physicsSystem.setVelocity(individualBody, {
        x: currentVel.x + spreadX,
        y: currentVel.y + spreadY,
      });

      this._physicsSystem.setRotation(individualBody, currentAngle);
      this._physicsSystem.setAngularVelocity(
        individualBody,
        currentAngularVel + (Math.random() - 0.5) * 0.1
      );

      this._individualBodies.push(individualBody);
    }

    this._isBrokenApart = true;
    console.log(
      `🔧 Ship broken apart into ${this._individualBodies.length} individual pieces`
    );
  }

  public setRespawnCallback(callback: () => void): void {
    this._onRespawnRequest = callback;
  }

  public detachDebris(): void {
    console.log(
      '🔧 Detaching broken debris pieces (keeping them in physics world)'
    );

    // Remove the compound physics body if it exists (but keep individual pieces)
    if (this._physicsBody) {
      this._physicsSystem.removeBody(this._physicsBody);
      this._physicsBody = null;
    }

    // Transfer ownership of debris to the debris manager
    if (
      this._debrisManager &&
      this._individualBodies.length > 0 &&
      this._renderObjectIds.length > 0
    ) {
      console.log(
        `🔧 Transferring ${this._individualBodies.length} debris pieces to debris manager`
      );

      for (
        let i = 0;
        i < this._individualBodies.length && i < this._renderObjectIds.length;
        i++
      ) {
        const body = this._individualBodies[i];
        const renderObjectId = this._renderObjectIds[i];

        if (body && renderObjectId) {
          this._debrisManager.addDebris(body, renderObjectId);
        }
      }

      console.log(
        `🔧 ${this._individualBodies.length} debris pieces now managed autonomously`
      );
    } else {
      console.log(
        '🔧 No debris manager available, debris will not be rendered'
      );
    }

    // Clear our references but don't destroy the actual objects
    // The debris manager now owns them
    this._individualBodies = [];
    this._renderObjectIds = [];
    this._isDestroyed = true;

    console.log('🔧 Debris detached and will continue floating autonomously');
  }

  /**
   * Trigger a flash effect on a specific block
   */
  public triggerBlockFlash(blockIndex: number): void {
    if (blockIndex < 0 || blockIndex >= this._renderObjectIds.length) {
      return;
    }

    if (this._blockFlashStates[blockIndex]) {
      return; // Already flashing
    }

    this._blockFlashStates[blockIndex] = true;
    this._blockFlashTimers[blockIndex] = this._flashDuration;

    // Change the block to flash color
    const renderObjectId = this._renderObjectIds[blockIndex];
    if (renderObjectId) {
      this._rendererSystem.updateRenderObjectColor(
        renderObjectId,
        this._flashColor
      );
    }

    console.log(`⚡ Block ${blockIndex} flashing!`);
  }

  /**
   * Trigger flash effect on a random block
   */
  public triggerRandomBlockFlash(): void {
    if (this._renderObjectIds.length === 0) return;

    const randomIndex = Math.floor(
      Math.random() * this._renderObjectIds.length
    );
    this.triggerBlockFlash(randomIndex);
  }

  /**
   * Trigger flash effect on all blocks
   */
  public triggerAllBlocksFlash(): void {
    for (let i = 0; i < this._renderObjectIds.length; i++) {
      this.triggerBlockFlash(i);
    }
  }

  /**
   * Update flash effects (should be called from update method)
   */
  private updateFlashEffects(deltaTime: number): void {
    for (let i = 0; i < this._blockFlashStates.length; i++) {
      if (this._blockFlashStates[i]) {
        this._blockFlashTimers[i] -= deltaTime;

        if (this._blockFlashTimers[i] <= 0) {
          // Flash finished, restore original color
          this._blockFlashStates[i] = false;
          const renderObjectId = this._renderObjectIds[i];
          if (renderObjectId && i < this._originalColors.length) {
            this._rendererSystem.updateRenderObjectColor(
              renderObjectId,
              this._originalColors[i]
            );
          }
        }
      }
    }
  }
}
