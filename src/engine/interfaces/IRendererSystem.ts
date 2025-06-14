import type { Vector2D } from './IPhysicsSystem';
import type { ICameraSystem } from './ICamera';
import type { Entity } from '../entity/Entity';

export interface RenderableObject {
  id: string;
  position: Vector2D;
  angle: number;
  width?: number;
  height?: number;
  radius?: number;
  vertices?: Vector2D[];
  color?: number;
  type: 'rectangle' | 'circle' | 'polygon';
}

export interface IRendererSystem {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(): void;
  createRenderObject(object: RenderableObject): void;
  updateRenderObject(id: string, position: Vector2D, angle: number): void;
  updateRenderObjectColor(id: string, color: number): void;
  removeRenderObject(id: string): void;
  resize(width: number, height: number): void;
  destroy(): void;
  getWidth(): number;
  getHeight(): number;

  // Camera support
  setCameraSystem(cameraSystem: ICameraSystem): void;
  getCameraSystem(): ICameraSystem | null;

  // Hover support
  showHoverIndicator(entity: Entity): void;
  hideHoverIndicator(): void;
  updateHoverIndicator(entity: Entity): void;

  // Debug support
  getCanvas(): HTMLCanvasElement | null;
}
