import { forwardRef } from 'react';
import type { MouseEvent } from 'react';

interface GameCanvasProps {
  className?: string;
  onMouseClick?: (x: number, y: number) => void;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ className = '', onMouseClick }, ref) => {
    const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
      if (!onMouseClick || !ref || typeof ref === 'function') return;

      const canvas = ref.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      onMouseClick(x, y);
    };

    return (
      <canvas
        ref={ref}
        className={className}
        onClick={handleCanvasClick}
        style={{ cursor: 'crosshair' }}
      />
    );
  }
);

GameCanvas.displayName = 'GameCanvas';
