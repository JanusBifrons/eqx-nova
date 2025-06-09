import { Graphics } from 'pixi.js';
import type { Vector2D } from '../interfaces/IPhysicsSystem';
import type { ICameraSystem } from '../interfaces/ICamera';
import type { Entity } from '../entity/Entity';

export class HoverRenderer {
    private cameraSystem: ICameraSystem | null = null;
    private gameContainer: any = null;
    private hoverIndicator: Graphics | null = null;
    private isInitialized = false;

    // Subtle but visible styling
    private readonly CORNER_LENGTH = 20;
    private readonly CORNER_THICKNESS = 2;
    private readonly CORNER_COLOR = 0x00ccff; // Light blue
    private readonly CORNER_ALPHA = 0.8;
    private readonly MARGIN = 10;

    public initialize(cameraSystem: ICameraSystem, gameContainer: any): void {
        this.cameraSystem = cameraSystem;
        this.gameContainer = gameContainer;
        this.isInitialized = true;
    }

    public showHoverIndicator(entity: Entity): void {
        if (!this.isInitialized || !this.cameraSystem || !this.gameContainer) return;

        if (!this.hoverIndicator) {
            this.hoverIndicator = new Graphics();
            this.hoverIndicator.alpha = this.CORNER_ALPHA;
            this.gameContainer.addChild(this.hoverIndicator);
        }

        this.hoverIndicator.clear();

        const worldPosition = entity.position;
        const screenPosition = this.cameraSystem.worldToScreen(worldPosition);
        const boundingSize = this.calculateEntityBoundingSize(entity);

        this.drawCorneredSquare(
            screenPosition,
            boundingSize.width + this.MARGIN * 2,
            boundingSize.height + this.MARGIN * 2
        );
    }

    public hideHoverIndicator(): void {
        if (this.hoverIndicator) {
            this.hoverIndicator.clear();
            this.hoverIndicator.visible = false;
        }
    }

    public updateHoverIndicator(entity: Entity): void {
        if (!this.hoverIndicator || !this.isInitialized) return;
        this.hoverIndicator.visible = true;
        this.showHoverIndicator(entity);
    }

    public destroy(): void {
        this.hideHoverIndicator();
        if (this.hoverIndicator && this.gameContainer) {
            this.gameContainer.removeChild(this.hoverIndicator);
            this.hoverIndicator.destroy();
            this.hoverIndicator = null;
        }
        this.cameraSystem = null;
        this.gameContainer = null;
        this.isInitialized = false;
    }

    private calculateEntityBoundingSize(entity: Entity): { width: number; height: number } {
        switch (entity.type) {
            case 'circle':
                const radius = 30; // More reasonable size
                return { width: radius * 2, height: radius * 2 };
            case 'rectangle':
                return { width: 60, height: 60 };
            case 'polygon':
                return { width: 80, height: 80 }; // Reasonable for asteroids
            default:
                return { width: 70, height: 70 };
        }
    }

    private drawCorneredSquare(center: Vector2D, width: number, height: number): void {
        if (!this.hoverIndicator) return;

        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const left = center.x - halfWidth;
        const right = center.x + halfWidth;
        const top = center.y - halfHeight;
        const bottom = center.y + halfHeight;

        this.drawCornerLines(left, right, top, bottom);
    }

    private drawCornerLines(left: number, right: number, top: number, bottom: number): void {
        if (!this.hoverIndicator) return;

        // Top-left corner
        this.hoverIndicator
            .moveTo(left, top + this.CORNER_LENGTH)
            .lineTo(left, top)
            .lineTo(left + this.CORNER_LENGTH, top)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });

        // Top-right corner
        this.hoverIndicator
            .moveTo(right - this.CORNER_LENGTH, top)
            .lineTo(right, top)
            .lineTo(right, top + this.CORNER_LENGTH)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });

        // Bottom-right corner
        this.hoverIndicator
            .moveTo(right, bottom - this.CORNER_LENGTH)
            .lineTo(right, bottom)
            .lineTo(right - this.CORNER_LENGTH, bottom)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });

        // Bottom-left corner
        this.hoverIndicator
            .moveTo(left + this.CORNER_LENGTH, bottom)
            .lineTo(left, bottom)
            .lineTo(left, bottom - this.CORNER_LENGTH)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });
    }
}
