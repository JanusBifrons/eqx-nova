import React, { useRef, useEffect } from 'react';
import type { AsteroidsGame } from '../game/AsteroidsGame';

interface MinimapProps {
  game: AsteroidsGame | null;
  width?: number;
  height?: number;
  className?: string;
}

interface MinimapEntity {
  x: number;
  y: number;
  color: string;
  size: number;
  type: 'player' | 'ai' | 'asteroid' | 'laser';
}

export const Minimap: React.FC<MinimapProps> = ({
  game,
  width = 200,
  height = 150,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!game || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Set canvas dimensions with device pixel ratio for crisp rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const render = () => {
      if (!ctx || !game || !game.isReady()) {
        animationRef.current = requestAnimationFrame(render);
        return;
      } // Clear canvas with dark background
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      // Draw a subtle grid pattern
      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw border
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      try {
        // Get world dimensions from the game engine
        const gameEngine = (game as any).gameEngine;
        if (!gameEngine) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }

        const worldDimensions = gameEngine.getWorldDimensions();
        const scaleX = width / worldDimensions.width;
        const scaleY = height / worldDimensions.height;

        const entities: MinimapEntity[] = [];

        // Get player
        const playerManager = (game as any).playerManager;
        if (playerManager) {
          const compositeShip = playerManager.getCompositeShip();
          const player = playerManager.getPlayer();

          if (compositeShip) {
            const pos = compositeShip.centerPosition;
            entities.push({
              x: pos.x * scaleX,
              y: pos.y * scaleY,
              color: '#00ff88', // Bright green for player
              size: 5,
              type: 'player',
            });
          } else if (player) {
            entities.push({
              x: player.position.x * scaleX,
              y: player.position.y * scaleY,
              color: '#00ff88', // Bright green for player
              size: 5,
              type: 'player',
            });
          }
        }

        // Get AI ships
        const aiManager = (game as any).aiManager;
        if (aiManager) {
          const aiShips = aiManager.getAllAIShips();
          aiShips.forEach((aiShip: any) => {
            if (aiShip.isActive) {
              const pos = aiShip.ship.centerPosition;
              entities.push({
                x: pos.x * scaleX,
                y: pos.y * scaleY,
                color: '#ff3366', // Bright red for AI ships
                size: 4,
                type: 'ai',
              });
            }
          });
        }

        // Get asteroids
        const asteroidManager = (game as any).asteroidManager;
        if (asteroidManager) {
          const asteroids = asteroidManager.getAllAsteroids();
          asteroids.forEach((asteroidData: any) => {
            const pos = asteroidData.entity.position;
            let size = 2;
            if (asteroidData.size === 'large') size = 3;
            else if (asteroidData.size === 'medium') size = 2;
            else size = 1;
            entities.push({
              x: pos.x * scaleX,
              y: pos.y * scaleY,
              color: '#cccccc', // Light gray for asteroids
              size: size,
              type: 'asteroid',
            });
          });
        }

        // Get lasers
        const laserManager = (game as any).laserManager;
        if (laserManager) {
          const lasers = laserManager.getAllLasers();
          lasers.forEach((laserData: any) => {
            const pos = laserData.entity.position;
            const color = laserData.source === 'player' ? '#00ffff' : '#ffff00'; // Cyan for player, yellow for AI
            entities.push({
              x: pos.x * scaleX,
              y: pos.y * scaleY,
              color: color,
              size: 1,
              type: 'laser',
            });
          });
        } // Draw entities with glow effect
        entities.forEach(entity => {
          // Ensure coordinates are within bounds
          if (
            entity.x < 0 ||
            entity.x > width ||
            entity.y < 0 ||
            entity.y > height
          ) {
            return;
          }

          // Draw glow
          ctx.shadowColor = entity.color;
          ctx.shadowBlur =
            entity.type === 'player' ? 8 : entity.type === 'ai' ? 6 : 2;
          ctx.fillStyle = entity.color;
          ctx.beginPath();
          ctx.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2);
          ctx.fill();

          // Draw inner bright core for better visibility
          ctx.shadowBlur = 0;
          ctx.fillStyle =
            entity.type === 'player'
              ? '#ffffff'
              : entity.type === 'ai'
                ? '#ffffff'
                : entity.color;
          ctx.beginPath();
          ctx.arc(
            entity.x,
            entity.y,
            Math.max(1, entity.size - 1),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }); // Draw camera viewport indicator
        try {
          const cameraSystem = gameEngine.getCameraSystem();
          if (cameraSystem) {
            const camera = cameraSystem.getCamera();
            const cameraPos = camera.getPosition();
            const viewport = camera.getViewport();

            const viewportX = (cameraPos.x - viewport.width / 2) * scaleX;
            const viewportY = (cameraPos.y - viewport.height / 2) * scaleY;
            const viewportWidth = viewport.width * scaleX;
            const viewportHeight = viewport.height * scaleY;

            // Draw viewport background with low opacity
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);

            // Draw viewport border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
            ctx.setLineDash([]);
          }
        } catch (error) {
          // Silently ignore camera errors
        }
      } catch (error) {
        console.warn('Minimap render error:', error);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [game, width, height]);
  return (
    <div
      className={`bg-gray-900 border-2 border-gray-500 rounded-lg shadow-2xl backdrop-blur-sm ${className}`}
      style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)' }}
    >
      <div className="px-3 py-1 text-xs font-medium text-gray-200 bg-gray-800 rounded-t-lg border-b border-gray-600">
        🗺️ Battlefield Overview
      </div>
      <div className="bg-gray-900 p-1">
        <canvas
          ref={canvasRef}
          className="block border border-gray-700 rounded"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: '#1a1a2e',
          }}
        />
      </div>
      <div className="px-2 py-1 text-xs text-gray-400 bg-gray-800 rounded-b-lg border-t border-gray-700">
        <div className="flex justify-between text-xs">
          <span>🟢 Player</span>
          <span>🔴 AI Ships</span>
          <span>⚪ Asteroids</span>
        </div>
        <div className="text-center text-xs text-gray-500 mt-1">
          <span>⬜ Viewport</span>
        </div>
      </div>
    </div>
  );
};
