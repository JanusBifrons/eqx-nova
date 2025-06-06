import React, { useEffect, useRef } from 'react';
import { Engine } from '../';

interface GameCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  width = 800,
  height = 600,
  className = '',
}) => {
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

    // Cleanup on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`game-canvas-container ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg shadow-lg"
        style={{ display: 'block' }}
      />
    </div>
  );
};
