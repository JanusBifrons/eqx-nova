import { Application, Graphics } from 'pixi.js';

export class Engine {
  private app: Application | null = null;
  private isRunning = false;
  private animationFrameId: number | null = null;
  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // Create PixiJS application
    this.app = new Application();

    // Initialize the application
    await this.app.init({
      canvas,
      width: 800,
      height: 600,
      backgroundColor: 0x1a1a2e,
    });

    // Create a simple demo sprite - a rotating rectangle
    const graphics = new Graphics();
    graphics.rect(0, 0, 100, 100);
    graphics.fill(0x16213e);
    graphics.stroke({ color: 0x0f3460, width: 2 });

    // Center the rectangle
    graphics.x = this.app.screen.width / 2 - 50;
    graphics.y = this.app.screen.height / 2 - 50;

    this.app.stage.addChild(graphics);
  }
  public start(): void {
    if (this.isRunning || !this.app) return;

    this.isRunning = true;
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning || !this.app) return;

    // Update game logic here (for now, just rotate the rectangle)
    if (this.app.stage.children.length > 0) {
      const graphics = this.app.stage.children[0] as Graphics;
      graphics.rotation += 0.01;
    }    // Manually render the frame
    this.app.renderer.render(this.app.stage);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
  public destroy(): void {
    this.stop();

    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }

  public getApplication(): Application | null {
    return this.app;
  }
}
