/**
 * Game class - This will contain the actual game logic
 * For now, this is just a placeholder to demonstrate the separation
 * between engine and game logic
 */
export class Game {
  private isInitialized = false;
  public initialize(): void {
    console.log('Game initialized - ready for game logic!');
    this.isInitialized = true;
  }
  public update(_deltaTime: number): void {
    // Game update logic will go here
    // This is separate from the engine's render loop
    // Prefixed parameter with underscore to indicate it's intentionally unused
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public destroy(): void {
    this.isInitialized = false;
    console.log('Game destroyed');
  }
}
