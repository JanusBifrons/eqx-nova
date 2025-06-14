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
    id?: string
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

    // Store block offsets for later use when breaking apart
    this._blockOffsets = [
      { x: -this._blockSize, y: -halfBlock }, // Top left
      { x: 0, y: -halfBlock }, // Top center
      { x: this._blockSize, y: -halfBlock }, // Top right
      { x: -this._blockSize, y: halfBlock }, // Bottom left
      { x: 0, y: halfBlock }, // Bottom center
      { x: this._blockSize, y: halfBlock }, // Bottom right
    ];

    // Create compound body with 6 equal-sized rectangle blocks in a 3x2 pattern
    const parts: CompoundBodyPart[] = [
      // Top row (3 blocks)
      {
        type: 'rectangle',
        x: this._blockOffsets[0].x,
        y: this._blockOffsets[0].y,
        width: this._blockSize,
        height: this._blockSize,
        componentId: 'block_0',
      },
      {
        type: 'rectangle',
        x: this._blockOffsets[1].x,
        y: this._blockOffsets[1].y,
        width: this._blockSize,
        height: this._blockSize,
        componentId: 'block_1',
      },
      {
        type: 'rectangle',
        x: this._blockOffsets[2].x,
        y: this._blockOffsets[2].y,
        width: this._blockSize,
        height: this._blockSize,
        componentId: 'block_2',
      },
      // Bottom row (3 blocks)
      {
        type: 'rectangle',
        x: this._blockOffsets[3].x,
        y: this._blockOffsets[3].y,
        width: this._blockSize,
        height: this._blockSize,
        componentId: 'block_3',
      },
      {
        type: 'rectangle',
        x: this._blockOffsets[4].x,
        y: this._blockOffsets[4].y,
        width: this._blockSize,
        height: this._blockSize,
        componentId: 'block_4',
      },
      {
        type: 'rectangle',
        x: this._blockOffsets[5].x,
        y: this._blockOffsets[5].y,
        width: this._blockSize,
        height: this._blockSize,
        componentId: 'block_5',
      },
    ];

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

    // Create render objects for each block with different colors
    const colors = [
      0xff0000, // Red
      0x00ff00, // Green
      0x0000ff, // Blue
      0xffff00, // Yellow
      0xff00ff, // Magenta
      0x00ffff, // Cyan
    ];

    // Initialize flash effect arrays
    this._originalColors = [...colors];
    this._blockFlashStates = new Array(colors.length).fill(false);
    this._blockFlashTimers = new Array(colors.length).fill(0);

    const blockPositions = [
      { x: position.x - this._blockSize, y: position.y - this._blockSize / 2 }, // Top left
      { x: position.x, y: position.y - this._blockSize / 2 }, // Top center
      { x: position.x + this._blockSize, y: position.y - this._blockSize / 2 }, // Top right
      { x: position.x - this._blockSize, y: position.y + this._blockSize / 2 }, // Bottom left
      { x: position.x, y: position.y + this._blockSize / 2 }, // Bottom center
      { x: position.x + this._blockSize, y: position.y + this._blockSize / 2 }, // Bottom right
    ];

    for (let i = 0; i < parts.length; i++) {
      const renderObjectId = `ship_${this._id}_block_${i}`;
      this._renderObjectIds.push(renderObjectId);

      this._rendererSystem.createRenderObject({
        id: renderObjectId,
        position: blockPositions[i],
        angle: 0,
        width: this._blockSize,
        height: this._blockSize,
        color: colors[i],
        type: 'rectangle',
      });
    }

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
      this._physicsSystem.applyForce(this._physicsBody, force);
    }
    // Note: When broken apart, we don't apply input forces to individual pieces
    // They should behave as independent debris
  }
  public update(_deltaTime?: number): void {
    const deltaTime = _deltaTime || 16; // Default to ~60fps if not provided

    // Update flash effects
    this.updateFlashEffects(deltaTime);

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
