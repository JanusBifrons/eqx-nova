import type { KeyboardInputEvent } from '../../engine/input';

/**
 * InputManager - Handles input state and key mapping
 * Following Single Responsibility Principle
 */
export class InputManager {
  private keys: Set<string> = new Set();
  private actionCallbacks: Map<string, () => void> = new Map();

  public handleInputEvent(event: KeyboardInputEvent): void {
    const key = event.key.toLowerCase();

    if (event.action === 'down') {
      this.keys.add(key);

      // Handle one-time actions
      const callback = this.actionCallbacks.get(key);
      if (callback) {
        callback();
      }
    } else if (event.action === 'up') {
      this.keys.delete(key);
    }
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  public isLeftPressed(): boolean {
    return this.isKeyPressed('a') || this.isKeyPressed('arrowleft');
  }

  public isRightPressed(): boolean {
    return this.isKeyPressed('d') || this.isKeyPressed('arrowright');
  }

  public isThrustPressed(): boolean {
    return this.isKeyPressed('w') || this.isKeyPressed('arrowup');
  }

  public isFirePressed(): boolean {
    return this.isKeyPressed(' ') || this.isKeyPressed('spacebar');
  }

  public onAction(key: string, callback: () => void): void {
    this.actionCallbacks.set(key.toLowerCase(), callback);
  }

  public destroy(): void {
    this.keys.clear();
    this.actionCallbacks.clear();
  }
}
