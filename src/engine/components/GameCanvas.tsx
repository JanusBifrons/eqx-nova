import { forwardRef } from 'react';

interface GameCanvasProps {
  className?: string;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ className = '' }, ref) => {
    return (
      <canvas
        ref={ref}
        className={className}
      // Remove all sizing - let the parent and resizeTo handle it
      />
    );
  }
);

GameCanvas.displayName = 'GameCanvas';
