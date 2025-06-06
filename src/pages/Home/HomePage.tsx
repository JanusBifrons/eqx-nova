import { useRef, useEffect } from 'react';
import { GameCanvas } from '../../engine';
import { Engine } from '../../engine/Engine';
import { useCanvasResize } from '../../engine/hooks';

export function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  // Handle canvas resizing
  useCanvasResize(canvasRef);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initializeEngine = async () => {
      try {
        const engine = new Engine();
        await engine.initialize(canvasRef.current!);
        engine.start();
        engineRef.current = engine;
      } catch (error) {
        console.error('Failed to initialize game engine:', error);
      }
    };

    initializeEngine();

    // Cleanup on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          EQX Nova - Game Engine Demo
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          A simple PixiJS demo showing the separation between engine, game, and
          website layers.
        </p>

        <div className="mb-8 w-[800px] h-[600px] mx-auto border border-gray-300 rounded-lg shadow-lg">
          <GameCanvas ref={canvasRef} />
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p>• Engine: Handles PixiJS rendering and animation loop</p>
          <p>• Game: Contains game-specific logic (placeholder for now)</p>
          <p>• Website: React-based UI and routing layer</p>
        </div>
      </div>
    </div>
  );
}
