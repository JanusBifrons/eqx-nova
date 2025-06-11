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
    inputSystem: IInputSystem,
    element?: HTMLElement
  ): void {
    this.physicsSystem = physicsSystem;
    this.cameraSystem = cameraSystem;
    this.inputSystem = inputSystem;

    // Create the mouse constraint - if element is provided, Matter.js will handle everything automatically!
    this.mouseConstraint = this.physicsSystem.createMouseConstraint(
      {
        stiffness: 1.0, // Maximum stiffness for immediate response
        damping: 0.3, // Good damping for control
      },
      element
    );

    // Set up the coordinate transformation for the mouse constraint
    this.updateMouseConstraintTransform();

    // Only set up our custom event handlers if no element is provided
    // When element is provided, Matter.js handles mouse events automatically
    if (!element) {
      this.setupEventHandlers();
      console.log('🖱️ MouseInteractionSystem: Using custom event handling');
    } else {
      console.log(
        '🖱️ MouseInteractionSystem: Using native Matter.js mouse handling with coordinate transformation!'
      );
    }
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
      '🖱️ MOUSE DOWN - Starting drag at screen:',
      event.position,
      'world:',
      worldPosition
    );
    this.physicsSystem.updateMouseConstraint(
      this.mouseConstraint,
      worldPosition
    );
    this.isDragging = true;
    console.log(
      '🔗 DRAG STARTED - Mouse constraint activated with MAX STRENGTH!'
    );
  }

  private handleMouseUp(event: MouseInputEvent): void {
    if (event.action !== 'up' || event.button !== 'left') return;

    if (!this.physicsSystem || !this.mouseConstraint) return;

    this.isDragging = false;
    console.log('🖱️ MOUSE UP - Ending drag');
    // Release the constraint by moving it to an empty area
    this.physicsSystem.updateMouseConstraint(this.mouseConstraint, {
      x: -1000,
      y: -1000,
    });
    console.log('🔗 DRAG ENDED - Mouse constraint released');
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

    // Log frequently to show dragging is happening
    if (Math.random() < 0.2) {
      // 20% chance to log (even more frequent)
      console.log(
        '🎯 DRAGGING ACTIVE - Moving to world position:',
        worldPosition,
        '- CONSTRAINT IS PULLING!'
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

  private updateMouseConstraintTransform(): void {
    if (!this.mouseConstraint || !this.physicsSystem || !this.cameraSystem) {
      return;
    }
    // Get current camera state
    const camera = this.cameraSystem.getCamera();
    const cameraPosition = camera.getPosition();
    const cameraZoom = camera.getZoom();
    const viewport = camera.getViewport();
    const viewportSize = { x: viewport.width, y: viewport.height };

    // Update the mouse constraint with current camera transformation
    this.physicsSystem.setMouseConstraintTransform(
      this.mouseConstraint,
      cameraPosition,
      cameraZoom,
      viewportSize
    );
  }

  public onCameraUpdate(): void {
    // Call this method whenever the camera changes
    this.updateMouseConstraintTransform();
  }
}
