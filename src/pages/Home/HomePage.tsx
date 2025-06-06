import { useRef, useEffect } from 'react';
import { GameCanvas } from '../../engine';
import { Engine } from '../../engine/Engine';

export function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

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

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []); return (
    <GameCanvas ref={canvasRef} />
  );
}
