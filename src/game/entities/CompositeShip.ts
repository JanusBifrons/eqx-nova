import type { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
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
    private _centerPosition: Vector2D;
    private _rotation: number = 0;
    private _thrust: boolean = false; private _lives: number;
    private _isInvulnerable: boolean = false;
    private _invulnerabilityTimer: number = 0;
    private _collisionRadius: number;
    private _onDestroy?: (ship: CompositeShip) => void; constructor(
        id: string,
        parts: ShipPart[],
        engine: Engine,
        centerPosition: Vector2D,
        lives: number = 3,
        onDestroy?: (ship: CompositeShip) => void
    ) {
        this._id = id;
        this._parts = [...parts]; this._engine = engine;
        this._lives = lives;
        this._centerPosition = { ...centerPosition }; // Use the provided center position
        this._collisionRadius = this.calculateCollisionRadius();
        this._onDestroy = onDestroy;

        // Connect all parts to each other initially
        this.connectAllParts();
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
            y: Math.sin(this._rotation)
        };
    }

    public setRotation(angle: number): void {
        this._rotation = angle;
        this.updateAllPartPositions();
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
        }        // Make invulnerable briefly after taking damage
        this._isInvulnerable = true;
        this._invulnerabilityTimer = 2000; // 2 seconds

        return false; // Ship damaged but not destroyed
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
        }); this.connectAllParts();
        this.updateAllPartPositions();
    }

    public update(deltaTime: number): void {
        // Update invulnerability timer
        if (this._isInvulnerable) {
            this._invulnerabilityTimer -= deltaTime;

            if (this._invulnerabilityTimer <= 0) {
                this._isInvulnerable = false;
            }
        }        // Update center position based on physics of connected parts
        this.updateCenterPosition();

        // Update all part positions
        this.updateAllPartPositions();

        // Apply floating physics to disconnected parts
        this._parts.forEach(part => {
            if (!part.isConnected && !part.isDestroyed) {
                (part as ShipPart).applyFloatingPhysics(this._engine);
            }
        });
    }

    public destroy(): void {
        this._parts.forEach(part => part.destroy());

        if (this._onDestroy) {
            this._onDestroy(this);
        }
    }

    public destroyPart(partId: string): void {
        const part = this._parts.find(p => p.partId === partId);
        if (part && !part.isDestroyed) {
            part.destroy();

            // Disconnect this part from others
            this._parts.forEach(otherPart => {
                if (otherPart.partId !== partId) {
                    (otherPart as ShipPart).disconnectFromPart(partId);
                }
            });

            // Check for isolated parts and disconnect them
            this.updatePartConnections();
        }
    }

    public getActiveParts(): ReadonlyArray<IShipPart> {
        return this._parts.filter(part => part.isActive());
    }

    public getDestroyedParts(): ReadonlyArray<IShipPart> {
        return this._parts.filter(part => part.isDestroyed);
    } private calculateCenterPosition(): Vector2D {
        const activeParts = this.getActiveParts();
        if (activeParts.length === 0) {
            return { x: 0, y: 0 };
        }        // Calculate the actual center of mass based on physics positions
        let totalX = 0;
        let totalY = 0;

        activeParts.forEach(part => {
            totalX += part.position.x;
            totalY += part.position.y;
        });

        return {
            x: totalX / activeParts.length,
            y: totalY / activeParts.length
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

    private connectAllParts(): void {
        // Connect adjacent parts (simplified - could be more sophisticated)
        this._parts.forEach((part, index) => {
            this._parts.forEach((otherPart, otherIndex) => {
                if (index !== otherIndex && !part.isDestroyed && !otherPart.isDestroyed) {
                    (part as ShipPart).connectToPart(otherPart.partId);
                }
            });
        });
    } private updateAllPartPositions(): void {
        this._parts.forEach(part => {
            if (!part.isDestroyed && part.isConnected) {
                part.updatePosition(this._centerPosition, this._rotation, this._engine);
            }
        });
    }

    private updateCenterPosition(): void {
        // Get physics position from the first active connected part
        const activeParts = this.getActiveParts().filter(part => part.isConnected);
        if (activeParts.length > 0) {
            const firstPart = activeParts[0];

            // Calculate center based on first part's physics position
            const cos = Math.cos(this._rotation);
            const sin = Math.sin(this._rotation);

            const relPos = firstPart.relativePosition;
            const rotatedX = relPos.x * cos - relPos.y * sin;
            const rotatedY = relPos.x * sin + relPos.y * cos;

            this._centerPosition = {
                x: firstPart.position.x - rotatedX,
                y: firstPart.position.y - rotatedY
            };
        }
    }

    private applyThrustForce(): void {
        const thrustMagnitude = 0.002;
        const forceX = Math.cos(this._rotation) * thrustMagnitude;
        const forceY = Math.sin(this._rotation) * thrustMagnitude;

        // Apply thrust to all connected parts
        const activeParts = this.getActiveParts().filter(part => part.isConnected);
        const physicsSystem = this._engine.getPhysicsSystem();
        const allBodies = physicsSystem.getAllBodies();

        activeParts.forEach(part => {
            const physicsBody = allBodies.find(body => body.id === part.entity.physicsBodyId);
            if (physicsBody) {
                physicsSystem.applyForce(physicsBody, { x: forceX, y: forceY });
            }
        });
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

                if (remainingConnections.length === 0 && this.getActiveParts().length > 1) {
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
        this.updateAllPartPositions();
    } private restorePart(_part: ShipPart): void {
        // This would need to recreate the entity and physics body
        // For now, just mark as not destroyed (simplified)
        // In a full implementation, would need to recreate the Entity
    }
}
