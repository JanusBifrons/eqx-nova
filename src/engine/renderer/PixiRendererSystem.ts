import { Application, Graphics, Container } from 'pixi.js';
import type {
  IRendererSystem,
  RenderableObject,
} from '../interfaces/IRendererSystem';
import type { Vector2D } from '../interfaces/IPhysicsSystem';
import type { ICameraSystem } from '../interfaces/ICamera';

export class PixiRendererSystem implements IRendererSystem {
  private app: Application | null = null;

  private renderObjects: Map<string, Graphics> = new Map();

  private gameContainer: Container = new Container();

  private cameraSystem: ICameraSystem | null = null;

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    try {
      // Create PixiJS application
      this.app = new Application();

      // Initialize the application with conservative WebGL settings
      await this.app.init({
        canvas,
        backgroundColor: 0x1a1a2e,
        resizeTo: canvas,
        preference: 'webgl', // Prefer WebGL over WebGPU for stability
        antialias: false, // Disable antialiasing to reduce complexity
        premultipliedAlpha: false, // Disable premultiplied alpha
        preserveDrawingBuffer: false, // Don't preserve drawing buffer
        clearBeforeRender: true, // Clear before each render
        backgroundAlpha: 1, // Opaque background
        resolution: 1, // Use 1:1 pixel ratio to reduce shader complexity
      });

      // Add game container to stage
      this.app.stage.addChild(this.gameContainer);

      // Create border around the canvas
      this.createBorder();

      // Add resize listener with error handling
      this.app.renderer.on('resize', this.onResize);
    } catch (error) {
      console.error('Failed to initialize PixiJS renderer:', error);

      throw error;
    }
  }

  public render(): void {
    if (!this.app || !this.app.renderer) return;

    try {
      // Update world border to reflect current camera position (only if camera system exists)
      if (this.cameraSystem) {
        this.updateWorldBorder();
      }
      // Check if WebGL context is lost
      const canvas = this.app.canvas;

      if (canvas instanceof HTMLCanvasElement) {
        const context =
          canvas.getContext('webgl') || canvas.getContext('webgl2');

        if (context && context.isContextLost()) {
          console.warn('WebGL context is lost, skipping render');

          return;
        }
      }
      this.app.renderer.render(this.app.stage);
    } catch (error) {
      // Suppress frequent WebGL errors to avoid console spam
      if (
        error instanceof Error &&
        error.message.includes('uniformMatrix3fv')
      ) {
        // These are common PixiJS shader errors that don't break functionality
        return;
      }
      console.warn('Render error (possibly due to context loss):', error);
    }
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
    } else if (object.type === 'polygon') {
      const vertices = object.vertices ?? [];

      if (vertices.length >= 3) {
        graphics.poly(vertices.map(v => ({ x: v.x, y: v.y })));
        graphics.fill(object.color ?? 0x16213e);
        graphics.stroke({ color: 0x0f3460, width: 2 });
      }
    }
    graphics.x = object.position.x;
    graphics.y = object.position.y;
    graphics.rotation = object.angle;

    // Apply camera transformation if camera system is available
    if (this.cameraSystem) {
      const screenPosition = this.cameraSystem.worldToScreen(object.position);
      graphics.x = screenPosition.x;
      graphics.y = screenPosition.y;
    }
    this.renderObjects.set(object.id, graphics);
    this.gameContainer.addChild(graphics);
  }

  public updateRenderObject(
    id: string,
    position: Vector2D,
    angle: number
  ): void {
    const graphics = this.renderObjects.get(id);

    if (graphics) {
      // Apply camera transformation if camera system is available
      if (this.cameraSystem) {
        const screenPosition = this.cameraSystem.worldToScreen(position);
        graphics.x = screenPosition.x;
        graphics.y = screenPosition.y;
      } else {
        // Fallback to world coordinates if no camera system
        graphics.x = position.x;
        graphics.y = position.y;
      }
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
      this.renderObjects.forEach(graphics => {
        graphics.destroy();
      });
      this.renderObjects.clear();

      this.app.destroy(true);
      this.app = null;
    }
  }

  private createBorder(): void {
    if (!this.app) return;

    // Remove existing viewport border if it exists
    const existingViewportBorder =
      this.app.stage.getChildByLabel('viewport-border');

    if (existingViewportBorder) {
      this.app.stage.removeChild(existingViewportBorder);
      existingViewportBorder.destroy();
    } // Create viewport border (around the screen) - this should stay fixed
    const viewportBorder = new Graphics();
    viewportBorder.label = 'viewport-border';

    // Draw a thick, bold rectangle that exactly matches the screen boundaries
    const borderWidth = 8; // Much thicker border
    viewportBorder.rect(
      borderWidth / 2,
      borderWidth / 2,
      this.app.screen.width - borderWidth,
      this.app.screen.height - borderWidth
    );
    viewportBorder.stroke({ color: 0x00ff00, width: borderWidth }); // Bright green, thick border

    // Ensure it's positioned at screen origin and never moves
    viewportBorder.x = 0;
    viewportBorder.y = 0;

    // Add viewport border to stage (not game container) at the very top layer
    this.app.stage.addChild(viewportBorder); // Add at the end so it's on top

    // Create world border if camera system is available
    this.createWorldBorderIfReady();
  }

  private createWorldBorderIfReady(): void {
    if (!this.app || !this.cameraSystem) {
      // Camera system not ready yet, world border will be created later
      return;
    }
    // Remove existing world border if it exists
    const existingWorldBorder = this.app.stage.getChildByLabel('world-border');

    if (existingWorldBorder) {
      this.app.stage.removeChild(existingWorldBorder);
      existingWorldBorder.destroy();
    }
    // Create the world border
    const worldBorder = new Graphics();
    worldBorder.label = 'world-border';

    // Add world border to stage after game container but before viewport border
    // This way: game objects -> world border -> viewport border (on top)
    const gameContainerIndex = this.app.stage.getChildIndex(this.gameContainer);
    this.app.stage.addChildAt(worldBorder, gameContainerIndex + 1);

    // Draw the initial world border
    this.updateWorldBorder();
  }

  private onResize = (): void => {
    if (this.app) {
      this.createBorder();
    }
  };

  public setCameraSystem(cameraSystem: ICameraSystem): void {
    this.cameraSystem = cameraSystem;
    // Now that camera system is available, create the world border
    this.createWorldBorderIfReady();
  }

  public getCameraSystem(): ICameraSystem | null {
    return this.cameraSystem;
  }

  private updateWorldBorder(): void {
    if (!this.app || !this.cameraSystem) return;

    const existingWorldBorder = this.app.stage.getChildByLabel('world-border');

    if (!existingWorldBorder) return;

    const worldBorder = existingWorldBorder as Graphics;

    // World dimensions are 4x the viewport size
    const worldWidth = this.app.screen.width * 4;
    const worldHeight = this.app.screen.height * 4;

    // Define world boundary corners in world space
    const topLeft = { x: 0, y: 0 };
    const topRight = { x: worldWidth, y: 0 };
    const bottomLeft = { x: 0, y: worldHeight };
    const bottomRight = { x: worldWidth, y: worldHeight };

    // Transform world corners to screen space
    const screenTopLeft = this.cameraSystem.worldToScreen(topLeft);
    const screenTopRight = this.cameraSystem.worldToScreen(topRight);
    const screenBottomLeft = this.cameraSystem.worldToScreen(bottomLeft);
    const screenBottomRight = this.cameraSystem.worldToScreen(bottomRight);

    // Clear and redraw the world border using screen coordinates
    worldBorder.clear();
    worldBorder.moveTo(screenTopLeft.x, screenTopLeft.y);
    worldBorder.lineTo(screenTopRight.x, screenTopRight.y);
    worldBorder.lineTo(screenBottomRight.x, screenBottomRight.y);
    worldBorder.lineTo(screenBottomLeft.x, screenBottomLeft.y);
    worldBorder.lineTo(screenTopLeft.x, screenTopLeft.y); // Close the path
    worldBorder.stroke({ color: 0xff6b6b, width: 4 }); // Red border for world boundary
  }
}
