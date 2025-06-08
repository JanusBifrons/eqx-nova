import type { Engine } from '../../engine';
import type { Vector2D } from '../../engine/interfaces/IPhysicsSystem';
import type { CompositeShipConfig } from '../interfaces/ICompositeShip';
import { CompositeShip } from '../entities/CompositeShip';
import { ShipPartFactory } from './ShipPartFactory';

/**
 * CompositeShipFactory - Creates composite ships from configuration
 * Follows Single Responsibility Principle: only creates composite ships
 * Follows Open/Closed Principle: extensible through configuration
 * Follows Factory Pattern for consistent object creation
 */
export class CompositeShipFactory {

    /**
     * Create a composite ship from configuration
     */
    public static create(
        engine: Engine,
        config: CompositeShipConfig,
        shipId: string,
        onDestroy?: (ship: CompositeShip) => void
    ): CompositeShip {        // Create ship parts using the factory
        const parts = ShipPartFactory.createMultiple(
            engine,
            config.centerPosition,
            [...config.partPositions], // Convert readonly array to mutable
            config.partSize,
            shipId,
            {
                color: config.partColor,
                density: 0.01,      // Increased from 0.001 - more realistic mass
                friction: 0.3,
                frictionAir: 0.02   // Increased air resistance for better control
            }
        ); return new CompositeShip(
            shipId,
            parts,
            engine,
            config.centerPosition,
            config.lives ?? 3,
            onDestroy
        );
    }

    /**
     * Create a single-part ship for testing (simplest possible composite ship)
     */
    public static createSinglePartShip(
        engine: Engine,
        position: Vector2D,
        shipId: string,
        onDestroy?: (ship: CompositeShip) => void
    ): CompositeShip {
        const partSize = 16; // Size of the single square part

        const config: CompositeShipConfig = {
            centerPosition: position,
            partSize,
            partPositions: [
                { x: 0, y: 0 }  // Single part at center
            ],
            partColor: 0x00ff00, // Green
            lives: 3
        };

        return this.create(engine, config, shipId, onDestroy);
    }

    /**
     * Create a simple 2-part ship (horizontal layout)
     */
    public static createTwoPartShip(
        engine: Engine,
        position: Vector2D,
        shipId: string,
        onDestroy?: (ship: CompositeShip) => void
    ): CompositeShip {
        const partSize = 16; // Size of each square part
        const spacing = partSize; // Space between parts

        const config: CompositeShipConfig = {
            centerPosition: position,
            partSize,
            partPositions: [
                { x: -spacing / 2, y: 0 }, // Left part
                { x: spacing / 2, y: 0 }   // Right part
            ],
            partColor: 0x00ff00, // Green
            lives: 3
        };

        return this.create(engine, config, shipId, onDestroy);
    }

    /**
     * Create a simple 3-part ship (T-shape)
     */
    public static createThreePartShip(
        engine: Engine,
        position: Vector2D,
        shipId: string,
        onDestroy?: (ship: CompositeShip) => void
    ): CompositeShip {
        const partSize = 16;
        const spacing = partSize;

        const config: CompositeShipConfig = {
            centerPosition: position,
            partSize,
            partPositions: [
                { x: 0, y: 0 },              // Center part
                { x: -spacing, y: 0 },       // Left part
                { x: spacing, y: 0 }         // Right part
            ],
            partColor: 0x00ff00,
            lives: 3
        };

        return this.create(engine, config, shipId, onDestroy);
    }

    /**
     * Create a 4-part ship (plus/cross shape)
     */
    public static createFourPartShip(
        engine: Engine,
        position: Vector2D,
        shipId: string,
        onDestroy?: (ship: CompositeShip) => void
    ): CompositeShip {
        const partSize = 16;
        const spacing = partSize;

        const config: CompositeShipConfig = {
            centerPosition: position,
            partSize,
            partPositions: [
                { x: 0, y: 0 },              // Center part
                { x: -spacing, y: 0 },       // Left part
                { x: spacing, y: 0 },        // Right part
                { x: 0, y: -spacing }        // Top part
            ],
            partColor: 0x00ff00,
            lives: 4
        };

        return this.create(engine, config, shipId, onDestroy);
    }

    /**
     * Create a custom ship from part positions
     */
    public static createCustomShip(
        engine: Engine,
        position: Vector2D,
        partPositions: Vector2D[],
        partSize: number,
        shipId: string,
        color: number = 0x00ff00,
        lives: number = 3,
        onDestroy?: (ship: CompositeShip) => void
    ): CompositeShip {
        const config: CompositeShipConfig = {
            centerPosition: position,
            partSize,
            partPositions,
            partColor: color,
            lives
        };

        return this.create(engine, config, shipId, onDestroy);
    }
}
