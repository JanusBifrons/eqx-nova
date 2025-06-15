import type { IModularShip } from './interfaces/IModularShip';
import type { IShipStructure } from './interfaces/IShipStructure';
import type { Vector2D } from '../../../engine/interfaces/IPhysicsSystem';
import type {
    IPhysicsSystem,
    IPhysicsBody,
    CompoundBodyPart,
} from '../../../engine/interfaces/IPhysicsSystem';
import type { IRendererSystem } from '../../../engine/interfaces/IRendererSystem';
import type { EntityManager } from '../../../engine/entity/EntityManager';
import type { DebrisManager } from '../../managers/DebrisManager';
import { v4 as uuidv4 } from 'uuid';

/**
 * CONFIGURABLE DEBUG SHIP - A ship that can be created with custom block positions
 * Designed specifically for creating thin and long AI ships with varying configurations
 */
export class ConfigurableDebugShip implements IModularShip {
    private readonly _id: string;
    private readonly _physicsSystem: IPhysicsSystem;
    private readonly _rendererSystem: IRendererSystem;  // Ship configuration
    private readonly _blockSize: number = 20; // Same as SimpleDebugShip
    private readonly _blockOffsets: Vector2D[];
    private readonly _blockColors: number[];

    // Physics and rendering
    private _physicsBody: IPhysicsBody | null = null;
    private readonly _renderObjectIds: string[] = [];
    private _individualBodies: IPhysicsBody[] = [];
    // Ship state
    private _isDestroyed: boolean = false;
    private _isBrokenApart: boolean = false;
    private _debugUpdateLogged: boolean = false;

    // Weapon system (simplified)
    private _weaponBlocks: number[] = [];
    private _weaponCooldowns: number[] = []; constructor(
        _entityManager: EntityManager,
        physicsSystem: IPhysicsSystem,
        rendererSystem: IRendererSystem,
        position: Vector2D,
        blockPositions: Vector2D[], // Custom block positions for thin/long configurations
        _debrisManager: DebrisManager | null = null,
        id?: string
    ) {
        this._id = id || uuidv4();
        this._physicsSystem = physicsSystem;
        this._rendererSystem = rendererSystem; console.log(
            `🔧 Creating CONFIGURABLE DEBUG SHIP with ${blockPositions.length} blocks in custom configuration`
        );
        console.log(`🔧 Block positions: ${blockPositions.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(', ')}`);

        // CRITICAL FIX: Convert world positions to LOCAL offsets relative to ship center
        // This must match exactly how SimpleDebugShip does it
        this._blockOffsets = blockPositions.map(pos => ({
            x: pos.x - position.x,
            y: pos.y - position.y,
        }));

        console.log(`🔧 Block offsets: ${this._blockOffsets.map(o => `(${o.x.toFixed(1)}, ${o.y.toFixed(1)})`).join(', ')}`);

        // Create colors for each block (COPIED FROM SimpleDebugShip)
        this._blockColors = blockPositions.map((_, index) => {
            const colors = [
                0xff0000, // Red (Front left weapon)
                0xff4500, // Orange Red (Front center weapon)  
                0xff8c00, // Dark Orange (Front right weapon)
                0x0000ff, // Blue (Rear left)
                0x4169e1, // Royal Blue (Rear center)
                0x00bfff, // Deep Sky Blue (Rear right)
            ];
            return colors[index % colors.length];
        });

        // EXACT same sequence as SimpleDebugShip: physics first, then render, then weapons
        this.createPhysicsBody(position);
        this.createRenderObjects(position);
        this.initializeWeaponSystem();

        console.log(
            `🚀 Configurable ship created with ${this._blockOffsets.length} blocks`
        );
    }

    /**
     * Create the compound physics body from the block offsets
     */
    private createPhysicsBody(position: Vector2D): void {
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
    }    /**
     * Create render objects for each block - EXACTLY copied from ComplexModularShip
     */
    private createRenderObjects(position: Vector2D): void {
        console.log(`🎨 Creating render objects for ${this._blockOffsets.length} blocks at base position (${position.x}, ${position.y})`);

        for (let i = 0; i < this._blockOffsets.length; i++) {
            const renderObjectId = `configurable_ship_${this._id}_block_${i}`;
            this._renderObjectIds.push(renderObjectId);

            // Calculate world position - EXACT same as ComplexModularShip
            const blockWorldX = position.x + this._blockOffsets[i].x;
            const blockWorldY = position.y + this._blockOffsets[i].y;

            console.log(`🎨 Creating render object ${i}: ${renderObjectId} at WORLD (${blockWorldX.toFixed(1)}, ${blockWorldY.toFixed(1)}) size ${this._blockSize}x${this._blockSize}`);

            this._rendererSystem.createRenderObject({
                id: renderObjectId,
                position: { x: blockWorldX, y: blockWorldY }, // EXACT same as ComplexModularShip
                angle: 0,
                width: this._blockSize,
                height: this._blockSize,
                color: this._blockColors[i],
                type: 'rectangle',
            });
        }

        console.log(`🎨 Created ${this._renderObjectIds.length} render objects for configurable ship`);
    }

    /**
     * Initialize weapon system - first half of blocks are weapons
     */
    private initializeWeaponSystem(): void {
        // Designate first half of blocks as weapons
        const weaponCount = Math.max(1, Math.floor(this._blockOffsets.length / 2));
        this._weaponBlocks = Array.from({ length: weaponCount }, (_, i) => i);
        this._weaponCooldowns = new Array(this._blockOffsets.length).fill(0);

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
            gridSize: this._blockSize,
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
    public update(_deltaTime?: number): void {
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

                // Debug output on first update
                if (!this._debugUpdateLogged) {
                    console.log(`🔄 Updating render objects for ship at (${this._physicsBody.position.x}, ${this._physicsBody.position.y})`);
                    this._debugUpdateLogged = true;
                }

                for (let i = 0; i < this._renderObjectIds.length && i < this._blockOffsets.length; i++) {
                    const offset = this._blockOffsets[i];
                    const blockX = this._physicsBody.position.x + (offset.x * cos - offset.y * sin);
                    const blockY = this._physicsBody.position.y + (offset.x * sin + offset.y * cos);

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
        this._isDestroyed = true;

        // Clean up physics body
        if (this._physicsBody) {
            this._physicsSystem.removeBody(this._physicsBody);
            this._physicsBody = null;
        }

        // Clean up individual bodies
        for (const body of this._individualBodies) {
            this._physicsSystem.removeBody(body);
        }
        this._individualBodies = [];

        // Clean up render objects
        for (const renderObjectId of this._renderObjectIds) {
            this._rendererSystem.removeRenderObject(renderObjectId);
        }
    }

    // Weapon system (simplified)
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

        for (const weaponBlockIndex of this._weaponBlocks) {
            if (weaponBlockIndex < this._blockOffsets.length) {
                const offset = this._blockOffsets[weaponBlockIndex];
                const blockWorldX = shipPosition.x + (offset.x * cos - offset.y * sin);
                const blockWorldY = shipPosition.y + (offset.x * sin + offset.y * cos);

                const firingOffset = this._blockSize / 2 + 8;
                const firingAngle = shipAngle;
                const firingX = blockWorldX + Math.cos(firingAngle) * firingOffset;
                const firingY = blockWorldY + Math.sin(firingAngle) * firingOffset;

                firingPositions.push({
                    position: { x: firingX, y: firingY },
                    rotation: firingAngle,
                });
            }
        }

        return firingPositions;
    }

    public canFireWeapons(): boolean {
        return !this._isBrokenApart && !!this._physicsBody;
    }

    public recordWeaponsFired(): void {
        const now = performance.now();
        for (const weaponIndex of this._weaponBlocks) {
            this._weaponCooldowns[weaponIndex] = now + 200; // 200ms cooldown
        }
    }

    // Damage system (simplified - no actual damage implementation)
    public takeDamageAtPosition(_position: Vector2D, _damage: number = 25): boolean {
        return false;
    }

    public takeDamageAtComponent(_componentId: string, _damage: number = 25): boolean {
        return false;
    }

    public takeDamageAtComponentId(_componentId: string, _damage: number = 25): boolean {
        return false;
    }

    public takeDamageAtPartIndex(_partIndex: number, _damage: number = 25): boolean {
        return false;
    }

    // Stub methods for IModularShip interface
    public addComponent(): boolean {
        return false;
    }
    public removeComponent(): boolean {
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
}
