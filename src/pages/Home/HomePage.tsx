import { useRef, useEffect, useState } from 'react';
import { GameCanvas } from '../../engine';
import { Engine } from '../../engine/Engine';
import { AsteroidsGame } from '../../game/AsteroidsGame';

export function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
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
            setLives(gameRef.current.getLives());
            setGameOver(gameRef.current.isGameOver());
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
      setLives(3);
      setGameOver(false);
    }
  };
  return (
    <div className="flex flex-1 flex-col">
      {' '}
      <div className="bg-gray-100 p-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Asteroids</h2>
            <div className="text-xs font-medium">
              <span className="text-green-600">
                ✓ SOLID Architecture • Separated Concerns
              </span>
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-sm font-medium text-gray-700">
              Score:{' '}
              <span className="text-blue-600">{score.toLocaleString()}</span>
            </div>
            <div className="text-sm font-medium text-gray-700">
              Lives: <span className="text-red-600">{lives}</span>
            </div>
            {gameOver && (
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
              >
                Restart Game
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-600">
          {gameOver ? (
            <p className="text-red-600 font-medium">
              Game Over! Click Restart to play again.
            </p>
          ) : (
            <div>
              <p className="mb-1">
                Use <kbd className="px-1 bg-gray-200 rounded">W/↑</kbd> to
                thrust,
                <kbd className="px-1 bg-gray-200 rounded mx-1">
                  A/←
                </kbd> and <kbd className="px-1 bg-gray-200 rounded">D/→</kbd>{' '}
                to rotate,
                <kbd className="px-1 bg-gray-200 rounded mx-1">Space</kbd> to
                shoot
              </p>
              <p className="text-blue-600">
                This game demonstrates SOLID principles: PlayerManager,
                LaserManager, AsteroidManager, CollisionManager, and
                InputManager work together through clean interfaces.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <GameCanvas ref={canvasRef} className="flex-1" />
      </div>
    </div>
  );
}
