// Modular Ship System V2 - Redesigned following SOLID principles
// export { ModularShip } from './ModularShip'; // TEMPORARILY DISABLED - file corrupted
export { SimpleDebugShip } from './SimpleDebugShip';
export { ComplexModularShip } from './ComplexModularShip';
export { ModularShipFactory } from './ModularShipFactory';
export { UniversalShipFactory } from './UniversalShipFactory';
export { PlayerShipController } from './PlayerShipController';
export { AIShipController } from './AIShipController';
export { ShipComponent } from './ShipComponent';
export { ShipComponentPiece } from './ShipComponentPiece';

// Interfaces
export type { IModularShip } from './interfaces/IModularShip';
export type {
  IShip,
  IShipController,
  IShipConfiguration,
} from './interfaces/IShip';
export type { IShipComponent, GridPosition } from './interfaces/IShipComponent';
export type { IShipStructure } from './interfaces/IShipStructure';
