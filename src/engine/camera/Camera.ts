import type { Vector2D } from '../interfaces/IPhysicsSystem';
import type { ICamera } from '../interfaces/ICamera';
import type { Entity } from '../entity';

/**
 * Camera implementation following Single Responsibility Principle
 * Handles only camera positioning and viewport management
 */
export class Camera implements ICamera {
    private position: Vector2D = { x: 0, y: 0 };
    private viewport: { width: number; height: number } = { width: 800, height: 600 };
    private zoom: number = 1.0;

    constructor(
        initialPosition: Vector2D = { x: 0, y: 0 },
        viewportWidth: number = 800,
        viewportHeight: number = 600
    ) {
        this.position = { ...initialPosition };
        this.viewport = { width: viewportWidth, height: viewportHeight };
    }
    public lookAt(target: Vector2D | Entity): void {
        if ('position' in target) {
            // target is an Entity
            this.position = { ...target.position };
        } else {
            // target is a Vector2D
            this.position = { ...target };
        }
    }

    public getPosition(): Vector2D {
        return { ...this.position };
    }

    public getViewport(): { width: number; height: number } {
        return { ...this.viewport };
    }

    public setViewport(width: number, height: number): void {
        this.viewport = { width, height };
    }

    public getZoom(): number {
        return this.zoom;
    }

    public setZoom(zoom: number): void {
        this.zoom = Math.max(0.1, zoom); // Prevent negative or zero zoom
    }
}
