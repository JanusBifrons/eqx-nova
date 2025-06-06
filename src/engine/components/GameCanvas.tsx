import { forwardRef } from 'react';

interface GameCanvasProps {
  className?: string;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ className = '' }, ref) => {
    return (
      <canvas
        ref={ref}
        className={`game-canvas ${className}`}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    );
  }
);

GameCanvas.displayName = 'GameCanvas';
