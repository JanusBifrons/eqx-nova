import { useRef, useEffect, useState } from 'react';
import { GameCanvas } from '../../engine';
import { Engine } from '../../engine/Engine';
import { AsteroidsGame } from '../../game/AsteroidsGame';
import { Minimap, ShipStatusHUD } from '../../components';
import type { ICompositeShip } from '../../game/interfaces/ICompositeShip';

export function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerShip, setPlayerShip] = useState<ICompositeShip | null>(null); // Track player ship for MUI HUD
  useEffect(() => {
    if (!canvasRef.current) return;

    // Clean up any existing instances first (for React Strict Mode)
    if (engineRef.current) {
      if ((engineRef.current as any).uiUpdateInterval) {
        clearInterval((engineRef.current as any).uiUpdateInterval);
      }
      if ((engineRef.current as any).gameUpdateCallback) {
        engineRef.current.unregisterUpdateCallback(
          (engineRef.current as any).gameUpdateCallback
        );
      }
      engineRef.current.destroy();
      engineRef.current = null;
    }
    // Reset singleton instance to prevent double initialization
    AsteroidsGame.resetInstance();

    const initializeEngine = async () => {
      try {
        const engine = new Engine();
        const game = AsteroidsGame.getInstance();
        await engine.initialize(canvasRef.current!, false); // No boundaries for asteroids
        game.initialize(engine);

        engineRef.current = engine;
        gameRef.current = game;

        // Register the game's update method with the engine
        const gameUpdateCallback = (deltaTime: number) => {
          game.update(deltaTime);
        };
        engine.registerUpdateCallback(gameUpdateCallback);

        // Store the callback for cleanup
        (engineRef.current as any).gameUpdateCallback = gameUpdateCallback;

        // Start the engine's internal game loop
        engine.start();

        // Set up periodic UI updates instead of running our own game loop
        const uiUpdateInterval = setInterval(() => {
          if (gameRef.current) {
            setScore(gameRef.current.getScore());
            setGameOver(gameRef.current.isGameOver());

            // Update player ship for MUI HUD
            const playerManager = (gameRef.current as any).playerManager;
            if (playerManager) {
              const compositeShip = playerManager.getCompositeShip();
              setPlayerShip(compositeShip);
            }
          }
        }, 16); // ~60fps UI updates

        // Store interval ID for cleanup
        (engineRef.current as any).uiUpdateInterval = uiUpdateInterval;
      } catch (error) {
        console.error('Failed to initialize game engine:', error);
      }
    };
    initializeEngine();

    return () => {
      if (engineRef.current) {
        // Clear UI update interval if it exists
        if ((engineRef.current as any).uiUpdateInterval) {
          clearInterval((engineRef.current as any).uiUpdateInterval);
        }
        // Unregister game update callback if it exists
        if ((engineRef.current as any).gameUpdateCallback) {
          engineRef.current.unregisterUpdateCallback(
            (engineRef.current as any).gameUpdateCallback
          );
        }
        engineRef.current.destroy();
        engineRef.current = null;
      }
      // Clean up singleton instance
      AsteroidsGame.resetInstance();
      gameRef.current = null;
    };
  }, []);
  const handleRestart = () => {
    if (gameRef.current) {
      gameRef.current.restart();
      setScore(0);
      setGameOver(false);
    }
  };

  return (
    <div
      className="flex flex-1 overflow-hidden"
      style={{ position: 'relative' }}
    >
      <GameCanvas ref={canvasRef} className="flex-1" />

      {/* MUI Ship Status HUD positioned in top-left corner */}
      <ShipStatusHUD ship={playerShip} />

      {/* Minimap positioned in top-right corner with absolute positioning relative to parent */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1001,
          pointerEvents: 'none',
        }}
      >
        <Minimap game={gameRef.current} width={200} height={150} />
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="mb-4">Final Score: {score.toLocaleString()}</p>
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
            >
              Restart Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
