import { useRef, useEffect, useState } from 'react';
import { GameCanvas } from '../../engine';
import { Engine } from '../../engine/Engine';
import { AsteroidsGame } from '../../game/AsteroidsGame';

export function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initializeEngine = async () => {
      try {
        const engine = new Engine();
        const game = new AsteroidsGame(); await engine.initialize(canvasRef.current!, false); // No boundaries for asteroids
        game.initialize(engine);

        engine.start();

        engineRef.current = engine;
        gameRef.current = game;

        // Start game loop
        lastTimeRef.current = performance.now();
        gameLoop();
      } catch (error) {
        console.error('Failed to initialize game engine:', error);
      }
    }; const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (gameRef.current) {
        gameRef.current.update(deltaTime);

        // Update UI state
        setScore(gameRef.current.getScore());
        setLives(gameRef.current.getLives());
        setGameOver(gameRef.current.isGameOver());
      }      requestAnimationFrame(gameLoop);
    };

    initializeEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
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
      <div className="bg-gray-100 p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-800">Asteroids</h2>
          <div className="flex gap-6 items-center">
            <div className="text-sm font-medium text-gray-700">
              Score: <span className="text-blue-600">{score.toLocaleString()}</span>
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
            <p className="text-red-600 font-medium">Game Over! Click Restart to play again.</p>
          ) : (
            <p>
              Use <kbd className="px-1 bg-gray-200 rounded">W/↑</kbd> to thrust,
              <kbd className="px-1 bg-gray-200 rounded mx-1">A/←</kbd> and <kbd className="px-1 bg-gray-200 rounded">D/→</kbd> to rotate,
              <kbd className="px-1 bg-gray-200 rounded mx-1">Space</kbd> or <kbd className="px-1 bg-gray-200 rounded">Click</kbd> to shoot
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <GameCanvas
          ref={canvasRef}
          className="flex-1"
        />
      </div>
    </div>
  );
}
