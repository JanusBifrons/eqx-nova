// Core interfaces
export type { ICollisionTarget } from './interfaces/ICollisionTarget';
export type { ICollisionSource } from './interfaces/ICollisionSource';

// Core system components
export { GenericCollisionSystem } from './GenericCollisionSystem';
export { CollisionEntityRegistry } from './CollisionEntityRegistry';
export { CollisionInfoExtractor } from './CollisionInfoExtractor';
export { CollisionResolver } from './CollisionResolver';
export type { CollisionInfo } from './CollisionInfoExtractor';
export type { CollisionResult } from './CollisionResolver';

// Adapters for existing entities
export { ModularShipCollisionAdapter } from './adapters/ModularShipCollisionAdapter';
export {
  LaserCollisionAdapter,
  AsteroidCollisionAdapter,
} from './adapters/ProjectileCollisionAdapters';
