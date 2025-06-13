import type { Vector2D } from '../../../../engine/interfaces/IPhysicsSystem';
import type { IShipComponent, GridPosition } from './IShipComponent';

/**
 * Manages structural integrity of ship components
 * Following Single Responsibility Principle - only handles connectivity
 */
export interface IShipStructure {
  readonly components: ReadonlyArray<IShipComponent>;
  readonly cockpitComponent: IShipComponent | null;
  readonly gridSize: number;

  // Component management
  addComponent(component: IShipComponent): void;
  removeComponent(componentId: string): void;
  getComponent(componentId: string): IShipComponent | null;

  // Connectivity analysis
  checkConnectivity(): IShipComponent[];
  getConnectedComponents(): IShipComponent[];
  getDisconnectedComponents(): IShipComponent[];

  // Grid utilities
  getComponentAt(gridPosition: GridPosition): IShipComponent | null;
  getAdjacentComponents(component: IShipComponent): IShipComponent[];
  gridToWorld(gridPosition: GridPosition, shipPosition: Vector2D): Vector2D;
}

/**
 * Configuration for ship structure creation
 */
export interface ShipStructureConfig {
  readonly gridSize: number;
  readonly cockpitPosition: GridPosition;
  readonly componentPositions: ReadonlyArray<GridPosition>;
}
