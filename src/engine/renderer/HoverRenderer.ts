import { Graphics } from 'pixi.js';
import type { Vector2D } from '../interfaces/IPhysicsSystem';
import type { ICameraSystem } from '../interfaces/ICamera';
import type { Entity } from '../entity/Entity';
import type { IPhysicsSystem } from '../interfaces/IPhysicsSystem';

export class HoverRenderer {
    private cameraSystem: ICameraSystem | null = null;
    private physicsSystem: IPhysicsSystem | null = null;
    private gameContainer: any = null;
    private hoverIndicator: Graphics | null = null;
    private isInitialized = false;

    // Subtle but visible styling with dynamic corner sizing
    private readonly CORNER_LENGTH_RATIO = 0.25; // Corner length as ratio of entity size
    private readonly MIN_CORNER_LENGTH = 8; // Minimum corner length
    private readonly MAX_CORNER_LENGTH = 30; // Maximum corner length
    private readonly CORNER_THICKNESS = 2;
    private readonly CORNER_COLOR = 0x00ccff; // Light blue
    private readonly CORNER_ALPHA = 0.8;
    private readonly MARGIN = 10;

    public initialize(cameraSystem: ICameraSystem, gameContainer: any, physicsSystem?: IPhysicsSystem): void {
        this.cameraSystem = cameraSystem;
        this.gameContainer = gameContainer;
        this.physicsSystem = physicsSystem || null;
        this.isInitialized = true;
    }

    public showHoverIndicator(entity: Entity): void {
        if (!this.isInitialized || !this.cameraSystem || !this.gameContainer) return;

        if (!this.hoverIndicator) {
            this.hoverIndicator = new Graphics();
            this.hoverIndicator.alpha = this.CORNER_ALPHA;
            this.gameContainer.addChild(this.hoverIndicator);
        }

        // Ensure visibility is restored
        this.hoverIndicator.visible = true;
        this.hoverIndicator.clear();

        const worldPosition = entity.position;
        const screenPosition = this.cameraSystem.worldToScreen(worldPosition);
        const boundingSize = this.calculateEntityBoundingSize(entity);
        const cornerLength = this.calculateDynamicCornerLength(boundingSize);

        this.drawCorneredSquare(
            screenPosition,
            boundingSize.width + this.MARGIN * 2,
            boundingSize.height + this.MARGIN * 2,
            cornerLength
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
        // Try to get real dimensions from physics body
        if (this.physicsSystem) {
            const allBodies = this.physicsSystem.getAllBodies();
            const physicsBody = allBodies.find(body => body.id === entity.physicsBodyId);
            
            if (physicsBody) {
                // Access the Matter.js body to get actual bounds
                const matterBody = (physicsBody as any).matterBody;
                if (matterBody && matterBody.bounds) {
                    const boundsWidth = matterBody.bounds.max.x - matterBody.bounds.min.x;
                    const boundsHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
                    return { 
                        width: boundsWidth, 
                        height: boundsHeight 
                    };
                }
            }
        }

        // Fallback to reasonable defaults based on entity type
        switch (entity.type) {
            case 'circle':
                return { width: 60, height: 60 }; // Default circle
            case 'rectangle':
                return { width: 60, height: 60 }; // Default rectangle
            case 'polygon':
                return { width: 80, height: 80 }; // Default polygon/asteroid
            default:
                return { width: 70, height: 70 };
        }
    }

    private calculateDynamicCornerLength(boundingSize: { width: number; height: number }): number {
        // Calculate corner length as a ratio of the smaller dimension
        const smallerDimension = Math.min(boundingSize.width, boundingSize.height);
        const dynamicLength = smallerDimension * this.CORNER_LENGTH_RATIO;
        
        // Clamp between min and max values
        return Math.max(this.MIN_CORNER_LENGTH, Math.min(this.MAX_CORNER_LENGTH, dynamicLength));
    }

    private drawCorneredSquare(center: Vector2D, width: number, height: number, cornerLength: number): void {
        if (!this.hoverIndicator) return;

        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const left = center.x - halfWidth;
        const right = center.x + halfWidth;
        const top = center.y - halfHeight;
        const bottom = center.y + halfHeight;

        this.drawCornerLines(left, right, top, bottom, cornerLength);
    }

    private drawCornerLines(left: number, right: number, top: number, bottom: number, cornerLength: number): void {
        if (!this.hoverIndicator) return;

        // Top-left corner
        this.hoverIndicator
            .moveTo(left, top + cornerLength)
            .lineTo(left, top)
            .lineTo(left + cornerLength, top)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });

        // Top-right corner
        this.hoverIndicator
            .moveTo(right - cornerLength, top)
            .lineTo(right, top)
            .lineTo(right, top + cornerLength)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });

        // Bottom-right corner
        this.hoverIndicator
            .moveTo(right, bottom - cornerLength)
            .lineTo(right, bottom)
            .lineTo(right - cornerLength, bottom)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });

        // Bottom-left corner
        this.hoverIndicator
            .moveTo(left + cornerLength, bottom)
            .lineTo(left, bottom)
            .lineTo(left, bottom - cornerLength)
            .stroke({ width: this.CORNER_THICKNESS, color: this.CORNER_COLOR, alpha: this.CORNER_ALPHA });
    }
}
