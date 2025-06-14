import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type {
  IRendererSystem,
  RenderableObject,
} from '../interfaces/IRendererSystem';
import type { Vector2D, IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import type { ICameraSystem } from '../interfaces/ICamera';
import { HoverRenderer } from './HoverRenderer';
import type { Entity } from '../entity/Entity';

export class PixiRendererSystem implements IRendererSystem {
  private app: Application | null = null;

  private renderObjects: Map<string, Graphics> = new Map();

  private gameContainer: Container = new Container();

  private cameraSystem: ICameraSystem | null = null;

  private physicsSystem: IPhysicsSystem | null = null;

  private hoverRenderer: HoverRenderer = new HoverRenderer();

  // Grid container - persistent grid container
  private gridContainer: Container | null = null;

  // Flag to prevent recreating grid
  private gridInitialized: boolean = false;

  // Test objects
  private testText: Text | null = null;

  // Debug visualization - currently unused but available for future debugging
  // private debugContainer: Container = new Container();
  // private showDebugBounds: boolean = false;

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

      // Create a separate container for the background grid that doesn't get camera transforms
      this.gridContainer = new Container();
      this.gridContainer.label = 'background-grid-container';
      this.app.stage.addChild(this.gridContainer);

      // Make sure grid is behind game content
      this.app.stage.setChildIndex(this.gridContainer, 0);

      // Create border around the canvas
      this.createBorder();

      // Create test text at world origin (0, 0)
      this.createTestText();

      // Add resize listener with error handling
      this.app.renderer.on('resize', this.onResize);

      // Test: Add a simple text object at the world origin
      this.addTestText();
    } catch (error) {
      console.error('Failed to initialize PixiJS renderer:', error);

      throw error;
    }
  }

  private addTestText(): void {
    if (!this.app) return;

    // Create a text style with a large, readable font
    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 36,
      fill: '#ffffff', // White color
      align: 'center',
    });

    // Create a text object with the current FPS
    const fpsText = new Text('FPS: 60', textStyle);

    // Position the text at the top-left corner
    fpsText.x = 10;
    fpsText.y = 10;

    // Add the text object to the stage
    this.app.stage.addChild(fpsText);

    // Update the text content on each render
    this.app.ticker.add(() => {
      fpsText.text = `FPS: ${Math.round(this.app!.ticker.FPS)}`;
    });

    // Store the test text object for later use
    this.testText = fpsText;
  }

  public render(): void {
    if (!this.app || !this.app.renderer) return;

    try {
      // Create grid early, before camera system is available
      this.updateBackgroundGrid();

      // Update camera transforms for the game container
      if (this.cameraSystem) {
        this.updateCameraTransform();
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

    // Store render data for future color updates
    (graphics as any)._renderData = {
      type: object.type,
      width: object.width,
      height: object.height,
      radius: object.radius,
      vertices: object.vertices,
    };

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
    // Use world coordinates directly - camera transform handled by container
    graphics.x = object.position.x;
    graphics.y = object.position.y;
    graphics.rotation = object.angle;

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
      // Use world coordinates directly - camera transform handled by container
      graphics.x = position.x;
      graphics.y = position.y;
      graphics.rotation = angle;
    }
  }

  public updateRenderObjectColor(id: string, color: number): void {
    const graphics = this.renderObjects.get(id);

    console.log(
      `🎨 Renderer: Updating color for ID ${id} to #${color.toString(16).padStart(6, '0')} - Found graphics: ${!!graphics}`
    );

    if (graphics) {
      // Clear and redraw with new color
      graphics.clear();

      // Get the stored shape information to redraw
      const renderData = (graphics as any)._renderData;

      if (renderData) {
        console.log(
          `🎨 Renderer: Redrawing ${renderData.type} with color #${color.toString(16).padStart(6, '0')}`
        );

        if (renderData.type === 'rectangle') {
          graphics.rect(
            -renderData.width / 2,
            -renderData.height / 2,
            renderData.width,
            renderData.height
          );
          graphics.fill(color);
          graphics.stroke({ color: 0x0f3460, width: 2 });
        } else if (renderData.type === 'circle') {
          graphics.circle(0, 0, renderData.radius);
          graphics.fill(color);
          graphics.stroke({ color: 0x0f3460, width: 2 });
        } else if (renderData.type === 'polygon') {
          graphics.poly(
            renderData.vertices.map((v: any) => ({ x: v.x, y: v.y }))
          );
          graphics.fill(color);
          graphics.stroke({ color: 0x0f3460, width: 2 });
        }
      } else {
        console.warn(`🎨 Renderer: No render data found for ID ${id}`);
      }
    } else {
      console.warn(
        `🎨 Renderer: Graphics object not found for ID ${id}. Available IDs:`,
        Array.from(this.renderObjects.keys())
      );
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

  /**
   * Show hover indicator around the specified entity
   */
  public showHoverIndicator(entity: Entity): void {
    this.hoverRenderer.showHoverIndicator(entity);
  }

  /**
   * Hide the hover indicator
   */
  public hideHoverIndicator(): void {
    this.hoverRenderer.hideHoverIndicator();
  }

  /**
   * Update hover indicator position (called when camera moves)
   */
  public updateHoverIndicator(entity: Entity): void {
    this.hoverRenderer.updateHoverIndicator(entity);
  }

  public destroy(): void {
    if (this.app) {
      this.app.renderer.off('resize', this.onResize);

      // Clean up hover renderer
      this.hoverRenderer.destroy();

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
    }

    // Create background grid first (behind everything) - only if camera system is available
    if (this.cameraSystem) {
      this.updateBackgroundGrid();
    }

    // Create viewport border (around the screen) - this should stay fixed
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
    // World borders are disabled for uncapped world space
    // Entities can move freely in infinite space without visual boundaries
    return;
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
    // Initialize hover renderer with physics system if available
    this.initializeHoverRenderer();
  }

  public setPhysicsSystem(physicsSystem: IPhysicsSystem): void {
    this.physicsSystem = physicsSystem;

    // Re-initialize hover renderer if camera system is already set
    if (this.cameraSystem) {
      this.initializeHoverRenderer();
    }
  }

  private initializeHoverRenderer(): void {
    if (this.cameraSystem) {
      this.hoverRenderer.initialize(
        this.cameraSystem,
        this.gameContainer,
        this.physicsSystem || undefined
      );
    }
  }

  public getCameraSystem(): ICameraSystem | null {
    return this.cameraSystem;
  }

  private updateWorldBorder(): void {
    // World borders are disabled for uncapped world space
    // No visual boundaries are rendered
    return;
  }

  private createTestText(): void {
    if (!this.app) return;

    // Create test text with a bright color and large size
    const textStyle = new TextStyle({
      fontSize: 48,
      fill: 0xff0000, // Bright red
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      stroke: { color: 0xffffff, width: 2 }, // White outline
    });

    this.testText = new Text({
      text: 'ORIGIN (0,0)',
      style: textStyle,
    });

    // Position at world coordinates (0, 0)
    this.testText.x = 0;
    this.testText.y = 0;

    // Center the text on the origin
    this.testText.anchor.set(0.5, 0.5);

    // Add to game container so it gets camera transforms
    this.gameContainer.addChild(this.testText);

    console.log('Created test text at world origin (0, 0)');
  }

  private updateBackgroundGrid(): void {
    if (!this.app || this.gridInitialized) return;

    // Create grid container if it doesn't exist
    if (!this.gridContainer) {
      this.gridContainer = new Container();
      this.gridContainer.label = 'background-grid';
      this.gameContainer.addChild(this.gridContainer);
      // Ensure grid is behind other game content
      this.gameContainer.setChildIndex(this.gridContainer, 0);
    }

    // Create the grid contents only once
    this.createWorldSpaceGrid();
    this.gridInitialized = true;
    console.log('Grid initialized once - will not recreate');
  }

  private createWorldSpaceGrid(): void {
    if (!this.gridContainer) return;

    // Create one consolidated Graphics object for all grid elements
    const allGridGraphics = new Graphics();

    // Big green test rectangle
    allGridGraphics.rect(-2000, -2000, 4000, 4000);
    allGridGraphics.fill(0x00ff00);
    allGridGraphics.stroke({ color: 0xff0000, width: 10 });

    // Blue origin cross lines
    allGridGraphics.moveTo(-5000, 0);
    allGridGraphics.lineTo(5000, 0);
    allGridGraphics.moveTo(0, -5000);
    allGridGraphics.lineTo(0, 5000);
    allGridGraphics.stroke({ color: 0x0000ff, width: 8 });

    // Grid settings
    const gridSize = 100;
    const minorGridSize = 20;
    const gridExtent = 5000;

    // Minor grid lines
    for (let x = -gridExtent; x <= gridExtent; x += minorGridSize) {
      if (x % gridSize !== 0) {
        allGridGraphics.moveTo(x, -gridExtent);
        allGridGraphics.lineTo(x, gridExtent);
      }
    }
    for (let y = -gridExtent; y <= gridExtent; y += minorGridSize) {
      if (y % gridSize !== 0) {
        allGridGraphics.moveTo(-gridExtent, y);
        allGridGraphics.lineTo(gridExtent, y);
      }
    }
    allGridGraphics.stroke({ color: 0x444444, width: 1 });

    // Major grid lines
    for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
      if (x !== 0) {
        allGridGraphics.moveTo(x, -gridExtent);
        allGridGraphics.lineTo(x, gridExtent);
      }
    }
    for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
      if (y !== 0) {
        allGridGraphics.moveTo(-gridExtent, y);
        allGridGraphics.lineTo(gridExtent, y);
      }
    }
    allGridGraphics.stroke({ color: 0x888888, width: 2 });

    // Add single graphics object to gameContainer
    this.gameContainer.addChild(allGridGraphics);

    // Move to back
    this.gameContainer.setChildIndex(allGridGraphics, 0);

    console.log('Optimized grid created as single Graphics object');
  }

  private updateCameraTransform(): void {
    if (!this.cameraSystem || !this.app) return;

    const cameraPos = this.cameraSystem.getCamera().getPosition();
    const zoom = this.cameraSystem.getCamera().getZoom();
    const viewport = this.cameraSystem.getCamera().getViewport();

    // Transform the game container to follow the camera
    // The camera position represents where the camera is looking,
    // so we need to move the world in the opposite direction
    this.gameContainer.x = -cameraPos.x * zoom + viewport.width / 2;
    this.gameContainer.y = -cameraPos.y * zoom + viewport.height / 2;
    this.gameContainer.scale.set(zoom);
  }
}
