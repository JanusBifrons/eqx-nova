import { Entity } from '../../engine/entity/Entity';
import type { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { IShipPart } from '../interfaces/ICompositeShip';

/**
 * ShipPart - Represents an individual square component of a composite ship
 * Follows Single Responsibility Principle: manages only one ship part
 */
export class ShipPart implements IShipPart {
    private readonly _entity: Entity;
    private readonly _partId: string;
    private readonly _relativePosition: Vector2D;
    private readonly _size: number;
    private _isDestroyed: boolean = false;
    private _isConnected: boolean = true;
    private _connectedParts: Set<string> = new Set();
    private _onDestroy?: (part: ShipPart) => void;

    constructor(
        entity: Entity,
        partId: string,
        relativePosition: Vector2D,
        size: number,
        onDestroy?: (part: ShipPart) => void
    ) {
        // Validate that entity is a square rectangle
        if (entity.type !== 'rectangle') {
            throw new Error('ShipPart entity must be a rectangle');
        }        this._entity = entity;
        this._partId = partId;
        this._relativePosition = { ...relativePosition };
        this._size = size;
        this._onDestroy = onDestroy;
    }

    public get entity(): Entity {
        return this._entity;
    }

    public get partId(): string {
        return this._partId;
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

    public destroy(): void {
        this._isDestroyed = true;
        this._isConnected = false;
        this._connectedParts.clear();
        this._entity.destroy();

        if (this._onDestroy) {
            this._onDestroy(this);
        }
    }

    public disconnect(): void {
        this._isConnected = false;
        // Keep connected parts info for potential reconnection logic
    }

    public connectToPart(partId: string): void {
        if (!this._isDestroyed) {
            this._connectedParts.add(partId);
            this._isConnected = true;
        }
    } public disconnectFromPart(partId: string): void {
        this._connectedParts.delete(partId);

        if (this._connectedParts.size === 0) {
            this._isConnected = false;
        }
    } public updatePosition(shipPosition: Vector2D, shipRotation: number, engine?: Engine): void {
        if (this._isDestroyed) return;

        // Calculate rotated relative position
        const cos = Math.cos(shipRotation);
        const sin = Math.sin(shipRotation);

        const rotatedX = this._relativePosition.x * cos - this._relativePosition.y * sin;
        const rotatedY = this._relativePosition.x * sin + this._relativePosition.y * cos;

        const newPosition = {
            x: shipPosition.x + rotatedX,
            y: shipPosition.y + rotatedY
        };

        // Use physics system to properly update position and rotation
        if (engine) {
            const physicsSystem = engine.getPhysicsSystem();
            const allBodies = physicsSystem.getAllBodies();
            const physicsBody = allBodies.find(body => body.id === this._entity.physicsBodyId);

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
            const physicsBody = allBodies.find(body => body.id === this._entity.physicsBodyId);

            if (physicsBody) {
                // Add slight rotation for visual effect
                const currentAngularVel = physicsBody.angularVelocity;
                if (Math.abs(currentAngularVel) < 0.02) {
                    const randomSpin = (Math.random() - 0.5) * 0.01;
                    physicsSystem.setAngularVelocity(physicsBody, randomSpin);
                }                // Apply light drag to eventually slow down
                const velocity = physicsBody.velocity;
                const drag = 0.999; // Very light drag
                physicsSystem.setVelocity(physicsBody, {
                    x: velocity.x * drag,
                    y: velocity.y * drag
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
}
