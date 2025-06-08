import { forwardRef } from 'react';

interface GameCanvasProps {
  className?: string;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ className = '' }, ref) => {
    return (
      <canvas ref={ref} className={className} style={{ cursor: 'crosshair' }} />
    );
  }
);

GameCanvas.displayName = 'GameCanvas';
