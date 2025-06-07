import type { Vector2D } from './IPhysicsSystem';

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
  removeRenderObject(id: string): void;
  resize(width: number, height: number): void;
  destroy(): void;
  getWidth(): number;
  getHeight(): number;
}
