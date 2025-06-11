import type { Vector2D } from '../interfaces/IPhysicsSystem';

export interface InputEvent {
  type: 'mouse' | 'keyboard' | 'touch';
  timestamp: number;
}

export interface MouseInputEvent extends InputEvent {
  type: 'mouse';
  button: 'left' | 'right' | 'middle';
  action: 'down' | 'up' | 'move';
  position: Vector2D;
  target: HTMLElement;
}

export interface KeyboardInputEvent extends InputEvent {
  type: 'keyboard';
  key: string;
  code: string;
  action: 'down' | 'up';
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
}

export interface TouchInputEvent extends InputEvent {
  type: 'touch';
  action: 'start' | 'move' | 'end';
  touches: Vector2D[];
  target: HTMLElement;
}

export type InputEventUnion =
  | MouseInputEvent
  | KeyboardInputEvent
  | TouchInputEvent;

export type InputEventHandler<T extends InputEvent = InputEventUnion> = (
  event: T
) => void;

export interface IInputSystem {
  initialize(element: HTMLElement): void;
  destroy(): void;
  addEventListener<T extends InputEvent>(
    eventType: T['type'],
    handler: InputEventHandler<T>
  ): void;
  removeEventListener<T extends InputEvent>(
    eventType: T['type'],
    handler: InputEventHandler<T>
  ): void;
  isKeyPressed(key: string): boolean;
  getMousePosition(): Vector2D | null;
  isMouseButtonPressed(button: 'left' | 'right' | 'middle'): boolean;
}

/**
 * InputSystem - Centralized input handling for the game engine
 * Follows SRP by focusing only on input capture and event management
 * Implements the Observer pattern for event handling
 */
export class InputSystem implements IInputSystem {
  private element: HTMLElement | null = null;

  private eventHandlers: Map<string, InputEventHandler<any>[]> = new Map();

  private pressedKeys: Set<string> = new Set();

  private mousePosition: Vector2D | null = null;

  private pressedMouseButtons: Set<string> = new Set();

  private isInitialized = false;

  // Bound event listeners for proper cleanup
  private boundMouseDownHandler = this.handleMouseDown.bind(this);

  private boundMouseUpHandler = this.handleMouseUp.bind(this);

  private boundMouseMoveHandler = this.handleMouseMove.bind(this);

  private boundKeyDownHandler = this.handleKeyDown.bind(this);

  private boundKeyUpHandler = this.handleKeyUp.bind(this);

  private boundTouchStartHandler = this.handleTouchStart.bind(this);

  private boundTouchMoveHandler = this.handleTouchMove.bind(this);

  private boundTouchEndHandler = this.handleTouchEnd.bind(this);

  private boundContextMenuHandler = this.handleContextMenu.bind(this);

  public initialize(element: HTMLElement): void {
    if (this.isInitialized) {
      this.destroy();
    }
    this.element = element;
    this.setupEventListeners();
    this.isInitialized = true;
  }

  public destroy(): void {
    if (!this.isInitialized || !this.element) return;

    this.removeEventListeners();
    this.element = null;
    this.eventHandlers.clear();
    this.pressedKeys.clear();
    this.pressedMouseButtons.clear();
    this.mousePosition = null;
    this.isInitialized = false;
  }

  public addEventListener<T extends InputEvent>(
    eventType: T['type'],
    handler: InputEventHandler<T>
  ): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  public removeEventListener<T extends InputEvent>(
    eventType: T['type'],
    handler: InputEventHandler<T>
  ): void {
    const handlers = this.eventHandlers.get(eventType);

    if (!handlers) return;

    const index = handlers.indexOf(handler);

    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  public isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
  }

  public getMousePosition(): Vector2D | null {
    return this.mousePosition ? { ...this.mousePosition } : null;
  }

  public isMouseButtonPressed(button: 'left' | 'right' | 'middle'): boolean {
    return this.pressedMouseButtons.has(button);
  }

  private setupEventListeners(): void {
    if (!this.element) return;

    // Mouse events
    this.element.addEventListener('mousedown', this.boundMouseDownHandler);
    this.element.addEventListener('mouseup', this.boundMouseUpHandler);
    this.element.addEventListener('mousemove', this.boundMouseMoveHandler);
    this.element.addEventListener('contextmenu', this.boundContextMenuHandler);

    // Keyboard events (on document for global capture)
    document.addEventListener('keydown', this.boundKeyDownHandler);
    document.addEventListener('keyup', this.boundKeyUpHandler);

    // Touch events
    this.element.addEventListener('touchstart', this.boundTouchStartHandler, {
      passive: false,
    });
    this.element.addEventListener('touchmove', this.boundTouchMoveHandler, {
      passive: false,
    });
    this.element.addEventListener('touchend', this.boundTouchEndHandler, {
      passive: false,
    });

    // Make element focusable for keyboard events
    if (!this.element.hasAttribute('tabindex')) {
      this.element.setAttribute('tabindex', '0');
    }
  }

  private removeEventListeners(): void {
    if (!this.element) return;

    // Mouse events
    this.element.removeEventListener('mousedown', this.boundMouseDownHandler);
    this.element.removeEventListener('mouseup', this.boundMouseUpHandler);
    this.element.removeEventListener('mousemove', this.boundMouseMoveHandler);
    this.element.removeEventListener(
      'contextmenu',
      this.boundContextMenuHandler
    );

    // Keyboard events
    document.removeEventListener('keydown', this.boundKeyDownHandler);
    document.removeEventListener('keyup', this.boundKeyUpHandler);

    // Touch events
    this.element.removeEventListener('touchstart', this.boundTouchStartHandler);
    this.element.removeEventListener('touchmove', this.boundTouchMoveHandler);
    this.element.removeEventListener('touchend', this.boundTouchEndHandler);
  }

  private handleMouseDown(event: MouseEvent): void {
    const button = this.getMouseButtonName(event.button);
    const position = this.getRelativePosition(event);

    this.pressedMouseButtons.add(button);
    this.mousePosition = position;

    const inputEvent: MouseInputEvent = {
      type: 'mouse',
      button,
      action: 'down',
      position,
      target: event.target as HTMLElement,
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleMouseUp(event: MouseEvent): void {
    const button = this.getMouseButtonName(event.button);
    const position = this.getRelativePosition(event);

    this.pressedMouseButtons.delete(button);
    this.mousePosition = position;

    const inputEvent: MouseInputEvent = {
      type: 'mouse',
      button,
      action: 'up',
      position,
      target: event.target as HTMLElement,
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleMouseMove(event: MouseEvent): void {
    const position = this.getRelativePosition(event);
    this.mousePosition = position;

    const inputEvent: MouseInputEvent = {
      type: 'mouse',
      button: 'left', // Default, could be enhanced to track which button is held
      action: 'move',
      position,
      target: event.target as HTMLElement,
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.pressedKeys.add(key);

    const inputEvent: KeyboardInputEvent = {
      type: 'keyboard',
      key: event.key,
      code: event.code,
      action: 'down',
      modifiers: {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.pressedKeys.delete(key);

    const inputEvent: KeyboardInputEvent = {
      type: 'keyboard',
      key: event.key,
      code: event.code,
      action: 'up',
      modifiers: {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touches = this.getTouchPositions(event.touches);

    const inputEvent: TouchInputEvent = {
      type: 'touch',
      action: 'start',
      touches,
      target: event.target as HTMLElement,
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touches = this.getTouchPositions(event.touches);

    const inputEvent: TouchInputEvent = {
      type: 'touch',
      action: 'move',
      touches,
      target: event.target as HTMLElement,
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    const touches = this.getTouchPositions(event.touches);

    const inputEvent: TouchInputEvent = {
      type: 'touch',
      action: 'end',
      touches,
      target: event.target as HTMLElement,
      timestamp: performance.now(),
    };

    this.dispatchEvent(inputEvent);
  }

  private handleContextMenu(event: Event): void {
    event.preventDefault(); // Prevent right-click context menu
  }

  private getMouseButtonName(button: number): 'left' | 'right' | 'middle' {
    switch (button) {
      case 0:
        return 'left';
      case 1:
        return 'middle';
      case 2:
        return 'right';
      default:
        return 'left';
    }
  }

  private getRelativePosition(event: MouseEvent): Vector2D {
    if (!this.element) return { x: 0, y: 0 };

    const rect = this.element.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private getTouchPositions(touches: TouchList): Vector2D[] {
    if (!this.element) return [];

    const rect = this.element.getBoundingClientRect();
    const positions: Vector2D[] = [];

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      positions.push({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
    return positions;
  }

  private dispatchEvent(event: InputEventUnion): void {
    const handlers = this.eventHandlers.get(event.type);

    if (!handlers) return;

    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in input event handler for ${event.type}:`, error);
      }
    });
  }
}
