import type { Vector2D } from '../interfaces/IPhysicsSystem';
import type { ICamera, ICameraSystem } from '../interfaces/ICamera';
import { Camera } from './Camera';

/**
 * CameraSystem implementation following Single Responsibility Principle
 * Handles coordinate transformations and camera management
 */
export class CameraSystem implements ICameraSystem {
    private camera: ICamera;

    constructor(camera?: ICamera) {
        this.camera = camera ?? new Camera();
    }

    public initialize(viewportWidth: number, viewportHeight: number): void {
        this.camera.setViewport(viewportWidth, viewportHeight);
    }

    public worldToScreen(worldPosition: Vector2D): Vector2D {
        const cameraPos = this.camera.getPosition();
        const viewport = this.camera.getViewport();
        const zoom = this.camera.getZoom();

        // Calculate relative position from camera center
        const relativeX = (worldPosition.x - cameraPos.x) * zoom;
        const relativeY = (worldPosition.y - cameraPos.y) * zoom;

        // Convert to screen coordinates (center of viewport is origin)
        const screenX = relativeX + viewport.width / 2;
        const screenY = relativeY + viewport.height / 2;

        return { x: screenX, y: screenY };
    }

    public screenToWorld(screenPosition: Vector2D): Vector2D {
        const cameraPos = this.camera.getPosition();
        const viewport = this.camera.getViewport();
        const zoom = this.camera.getZoom();

        // Convert screen coordinates to relative position from viewport center
        const relativeX = screenPosition.x - viewport.width / 2;
        const relativeY = screenPosition.y - viewport.height / 2;

        // Apply inverse zoom and add camera position
        const worldX = relativeX / zoom + cameraPos.x;
        const worldY = relativeY / zoom + cameraPos.y;

        return { x: worldX, y: worldY };
    }

    public getWorldBounds(): {
        left: number;
        right: number;
        top: number;
        bottom: number;
    } {
        const cameraPos = this.camera.getPosition();
        const viewport = this.camera.getViewport();
        const zoom = this.camera.getZoom();

        const halfWidth = (viewport.width / 2) / zoom;
        const halfHeight = (viewport.height / 2) / zoom;

        return {
            left: cameraPos.x - halfWidth,
            right: cameraPos.x + halfWidth,
            top: cameraPos.y - halfHeight,
            bottom: cameraPos.y + halfHeight,
        };
    }

    public isVisible(worldPosition: Vector2D, margin: number = 0): boolean {
        const bounds = this.getWorldBounds();

        return (
            worldPosition.x >= bounds.left - margin &&
            worldPosition.x <= bounds.right + margin &&
            worldPosition.y >= bounds.top - margin &&
            worldPosition.y <= bounds.bottom + margin
        );
    }

    public getCamera(): ICamera {
        return this.camera;
    }

    public setCamera(camera: ICamera): void {
        this.camera = camera;
    }
}
