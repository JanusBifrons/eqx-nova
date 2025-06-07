import { Application, Graphics, Container } from 'pixi.js';
import type { IRendererSystem, RenderableObject } from '../interfaces/IRendererSystem';
import type { Vector2D } from '../interfaces/IPhysicsSystem';

export class PixiRendererSystem implements IRendererSystem {
    private app: Application | null = null;
    private renderObjects: Map<string, Graphics> = new Map();
    private gameContainer: Container = new Container();

    public async initialize(canvas: HTMLCanvasElement): Promise<void> {
        // Create PixiJS application
        this.app = new Application();

        // Initialize the application
        await this.app.init({
            canvas,
            backgroundColor: 0x1a1a2e,
            resizeTo: canvas,
        });

        // Add game container to stage
        this.app.stage.addChild(this.gameContainer);

        // Create border around the canvas
        this.createBorder();

        // Add resize listener
        this.app.renderer.on('resize', this.onResize);
    }

    public render(): void {
        if (!this.app) return;
        this.app.renderer.render(this.app.stage);
    }

    public createRenderObject(object: RenderableObject): void {
        if (!this.app) return;

        const graphics = new Graphics();

        if (object.type === 'rectangle') {
            const width = object.width ?? 50;
            const height = object.height ?? 50;

            graphics.rect(-width / 2, -height / 2, width, height);
            graphics.fill(object.color ?? 0x16213e);
            graphics.stroke({ color: 0x0f3460, width: 2 });
        } else if (object.type === 'circle') {
            const radius = object.radius ?? 25;

            graphics.circle(0, 0, radius);
            graphics.fill(object.color ?? 0x16213e);
            graphics.stroke({ color: 0x0f3460, width: 2 });
        }        graphics.x = object.position.x;
        graphics.y = object.position.y;
        graphics.rotation = object.angle;

        this.renderObjects.set(object.id, graphics);
        this.gameContainer.addChild(graphics);
    }

    public updateRenderObject(id: string, position: Vector2D, angle: number): void {
        const graphics = this.renderObjects.get(id);
        if (graphics) {
            graphics.x = position.x;
            graphics.y = position.y;
            graphics.rotation = angle;
        }
    }

    public removeRenderObject(id: string): void {
        const graphics = this.renderObjects.get(id);
        if (graphics) {
            this.gameContainer.removeChild(graphics);
            graphics.destroy();
            this.renderObjects.delete(id);
        }
    }

    public resize(width: number, height: number): void {
        if (this.app) {
            this.app.renderer.resize(width, height);
            this.createBorder();
        }
    }

    public getWidth(): number {
        return this.app?.screen.width ?? 0;
    }

    public getHeight(): number {
        return this.app?.screen.height ?? 0;
    }

    public destroy(): void {
        if (this.app) {
            this.app.renderer.off('resize', this.onResize);

            // Clear all render objects
            this.renderObjects.forEach((graphics) => {
                graphics.destroy();
            });
            this.renderObjects.clear();

            this.app.destroy(true);
            this.app = null;
        }
    }

    private createBorder(): void {
        if (!this.app) return;

        // Remove existing border if it exists
        const existingBorder = this.app.stage.getChildByName('border');
        if (existingBorder) {
            this.app.stage.removeChild(existingBorder);
            existingBorder.destroy();
        }        // Create new border
        const border = new Graphics();
        border.name = 'border';
        border.rect(0, 0, this.app.screen.width, this.app.screen.height);
        border.stroke({ color: 0x0f3460, width: 10 });

        // Add border behind game objects
        this.app.stage.addChildAt(border, 0);
    }

    private onResize = (): void => {
        if (this.app) {
            this.createBorder();
        }
    };
}
