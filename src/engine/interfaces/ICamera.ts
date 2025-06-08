import type { Vector2D } from './IPhysicsSystem';
import type { Entity } from '../entity';

/**
 * Camera interface following Interface Segregation Principle
 * Provides simple interface for camera positioning and viewport management
 */
export interface ICamera {
  /**
   * Set the camera to look at a specific world position or entity
   */
  lookAt(target: Vector2D | Entity): void;

  /**
   * Get the current camera position in world space
   */
  getPosition(): Vector2D;

  /**
   * Get the camera's viewport dimensions
   */
  getViewport(): { width: number; height: number };

  /**
   * Set the camera's viewport dimensions
   */
  setViewport(width: number, height: number): void;

  /**
   * Get the zoom level (1.0 = normal, >1.0 = zoomed in, <1.0 = zoomed out)
   */
  getZoom(): number;

  /**
   * Set the zoom level
   */
  setZoom(zoom: number): void;
}

/**
 * Camera system interface for coordinate transformations
 * Separated from ICamera to follow Interface Segregation Principle
 */
export interface ICameraSystem {
  /**
   * Initialize the camera system with viewport dimensions
   */
  initialize(viewportWidth: number, viewportHeight: number): void;

  /**
   * Transform world coordinates to screen coordinates
   */
  worldToScreen(worldPosition: Vector2D): Vector2D;

  /**
   * Transform screen coordinates to world coordinates
   */
  screenToWorld(screenPosition: Vector2D): Vector2D;

  /**
   * Get the camera bounds in world space
   */
  getWorldBounds(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };

  /**
   * Check if a world position is visible in the current camera view
   */
  isVisible(worldPosition: Vector2D, margin?: number): boolean;

  /**
   * Get the current camera being used by the system
   */
  getCamera(): ICamera;

  /**
   * Set the active camera
   */
  setCamera(camera: ICamera): void;
}
