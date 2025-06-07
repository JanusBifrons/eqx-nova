// SOLID-compliant AsteroidsGame implementation
export { AsteroidsGame } from './AsteroidsGame';

// Architecture components following SOLID principles
export * from './interfaces'; // Interface Segregation Principle
export * from './managers'; // Single Responsibility Principle
export * from './adapters'; // Dependency Inversion Principle

/**
 * REFACTORING SUMMARY:
 *
 * The original AsteroidsGame violated SOLID principles by having too many responsibilities.
 * The refactored version demonstrates:
 *
 * 1. Single Responsibility Principle (SRP):
 *    - PlayerManager: Player logic only
 *    - LaserManager: Laser lifecycle only
 *    - AsteroidManager: Asteroid spawning/breaking only
 *    - CollisionManager: Collision detection only
 *    - InputManager: Input handling only
 *    - GameStateManager: Score/game state only
 *
 * 2. Open/Closed Principle (OCP):
 *    - Extensible through manager composition
 *    - New features can be added without modifying existing code
 *
 * 3. Liskov Substitution Principle (LSP):
 *    - All managers work through consistent interfaces
 *
 * 4. Interface Segregation Principle (ISP):
 *    - IGameEngine exposes only what game logic needs
 *    - No dependency on unused engine capabilities
 *
 * 5. Dependency Inversion Principle (DIP):
 *    - Game depends on IGameEngine abstraction
 *    - GameEngineAdapter hides engine complexity
 *    - High-level game logic doesn't know about physics bodies
 *
 * Benefits:
 * - Much easier to test (each manager can be unit tested)
 * - Easier to maintain (changes isolated to specific managers)
 * - Easier to extend (add new managers without breaking existing code)
 * - Better abstraction (game logic doesn't deal with engine internals)
 */
