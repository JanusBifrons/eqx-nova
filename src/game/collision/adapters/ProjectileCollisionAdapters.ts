import type { ICollisionSource } from '../interfaces/ICollisionSource';

/**
 * Adapter for laser entities to work with the generic collision system
 */
export class LaserCollisionAdapter implements ICollisionSource {
    private readonly laser: any; // Replace with proper laser type
    private readonly _damage: number;

    constructor(laser: any, damage: number = 15) {
        this.laser = laser;
        this._damage = damage;
    }
    get id(): string {
        return this.laser.entity.id;
    }

    get physicsBodyId(): string {
        return this.laser.entity.physicsBodyId;
    }

    get sourceType(): string {
        return 'laser';
    }
    get sourceId(): string {
        return this.laser.sourceId || this.laser.source || '';
    }

    get damage(): number {
        return this._damage;
    }

    onCollisionWith(_targetId: string): boolean {
        // Lasers are consumed (removed) when they hit something
        return true;
    }
}

/**
 * Adapter for asteroid entities to work with the generic collision system
 */
export class AsteroidCollisionAdapter implements ICollisionSource {
    private readonly asteroid: any; // Replace with proper asteroid type
    private readonly _damage: number;

    constructor(asteroid: any, damage: number = 35) {
        this.asteroid = asteroid;
        this._damage = damage;
    }
    get id(): string {
        return this.asteroid.entity.id;
    }

    get physicsBodyId(): string {
        return this.asteroid.entity.physicsBodyId;
    }

    get sourceType(): string {
        return 'asteroid';
    }
    get sourceId(): string {
        return this.asteroid.entity.id; // Asteroids are their own source
    }

    get damage(): number {
        return this._damage;
    }

    onCollisionWith(_targetId: string): boolean {
        // Asteroids are consumed (broken apart) when they hit something
        return true;
    }
}
