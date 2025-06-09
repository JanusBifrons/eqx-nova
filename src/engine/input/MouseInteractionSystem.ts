import type {
  Vector2D,
  IPhysicsSystem,
  IMouseConstraint,
} from '../interfaces/IPhysicsSystem';
import type { ICameraSystem } from '../interfaces/ICamera';
import type { IInputSystem, MouseInputEvent } from './InputSystem';

/**
 * MouseInteractionSystem - Handles mouse-based physics interactions
 * Follows Single Responsibility Principle by focusing only on mouse-physics interaction
 * Integrates with camera system for proper coordinate transformation
 */
export class MouseInteractionSystem {
  private physicsSystem: IPhysicsSystem | null = null;

  private cameraSystem: ICameraSystem | null = null;

  private inputSystem: IInputSystem | null = null;

  private mouseConstraint: IMouseConstraint | null = null;

  private isInitialized = false;

  private isDragging = false;

  // Bound event handlers for proper cleanup
  private boundMouseDownHandler = this.handleMouseDown.bind(this);

  private boundMouseUpHandler = this.handleMouseUp.bind(this);

  private boundMouseMoveHandler = this.handleMouseMove.bind(this);

  public initialize(
    physicsSystem: IPhysicsSystem,
    cameraSystem: ICameraSystem,
    inputSystem: IInputSystem
  ): void {
    this.physicsSystem = physicsSystem;
    this.cameraSystem = cameraSystem;
    this.inputSystem = inputSystem;

    // Create the mouse constraint for dragging
    this.mouseConstraint = this.physicsSystem.createMouseConstraint({
      stiffness: 0.2,
      damping: 0.1,
    });

    // Set up input event handlers
    this.setupEventHandlers();
    this.isInitialized = true;

    console.log(
      'MouseInteractionSystem: Initialized with mouse constraint:',
      this.mouseConstraint?.id
    );
  }

  public destroy(): void {
    if (!this.isInitialized) return;

    this.removeEventHandlers();

    if (this.mouseConstraint && this.physicsSystem) {
      this.physicsSystem.removeMouseConstraint(this.mouseConstraint);
      this.mouseConstraint = null;
    }
    this.physicsSystem = null;
    this.cameraSystem = null;
    this.inputSystem = null;
    this.isDragging = false;
    this.isInitialized = false;
  }

  private setupEventHandlers(): void {
    if (!this.inputSystem) return;

    this.inputSystem.addEventListener('mouse', this.boundMouseDownHandler);
    this.inputSystem.addEventListener('mouse', this.boundMouseUpHandler);
    this.inputSystem.addEventListener('mouse', this.boundMouseMoveHandler);
  }

  private removeEventHandlers(): void {
    if (!this.inputSystem) return;

    this.inputSystem.removeEventListener('mouse', this.boundMouseDownHandler);
    this.inputSystem.removeEventListener('mouse', this.boundMouseUpHandler);
    this.inputSystem.removeEventListener('mouse', this.boundMouseMoveHandler);
  }

  private handleMouseDown(event: MouseInputEvent): void {
    if (event.action !== 'down' || event.button !== 'left') return;

    if (!this.physicsSystem || !this.cameraSystem || !this.mouseConstraint)
      return;

    const worldPosition = this.screenToWorld(event.position);
    console.log(
      'MouseInteractionSystem: Mouse down at screen:',
      event.position,
      'world:',
      worldPosition
    );
    this.physicsSystem.updateMouseConstraint(
      this.mouseConstraint,
      worldPosition
    );
    this.isDragging = true;
    console.log('MouseInteractionSystem: Started dragging, constraint updated');
  }

  private handleMouseUp(event: MouseInputEvent): void {
    if (event.action !== 'up' || event.button !== 'left') return;

    if (!this.physicsSystem || !this.mouseConstraint) return;

    this.isDragging = false;
    console.log('MouseInteractionSystem: Mouse up, stopping drag');
    // Release the constraint by moving it to an empty area
    this.physicsSystem.updateMouseConstraint(this.mouseConstraint, {
      x: -1000,
      y: -1000,
    });
  }

  private handleMouseMove(event: MouseInputEvent): void {
    if (event.action !== 'move') return;

    if (
      !this.isDragging ||
      !this.physicsSystem ||
      !this.cameraSystem ||
      !this.mouseConstraint
    )
      return;

    const worldPosition = this.screenToWorld(event.position);
    this.physicsSystem.updateMouseConstraint(
      this.mouseConstraint,
      worldPosition
    );

    // Log occasionally to avoid spam
    if (Math.random() < 0.01) {
      console.log(
        'MouseInteractionSystem: Dragging to world position:',
        worldPosition
      );
    }
  }

  private screenToWorld(screenPosition: Vector2D): Vector2D {
    if (!this.cameraSystem) {
      // Fallback to screen coordinates if camera system is not available
      return screenPosition;
    }
return this.cameraSystem.screenToWorld(screenPosition);
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getMouseConstraint(): IMouseConstraint | null {
    return this.mouseConstraint;
  }
}
