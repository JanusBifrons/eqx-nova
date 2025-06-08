/**
 * GameStateManager - Manages game state like score, lives, game over status
 * Following Single Responsibility Principle
 */
export class GameStateManager {
  private score = 0;

  private gameOver = false;

  public getScore(): number {
    return this.score;
  }

  public addScore(points: number): void {
    this.score += points;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public setGameOver(gameOver: boolean): void {
    this.gameOver = gameOver;
  }

  public reset(): void {
    this.score = 0;
    this.gameOver = false;
  }
}
