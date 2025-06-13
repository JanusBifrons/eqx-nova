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

    if (!ctx) return;

    // Set canvas dimensions with device pixel ratio for crisp rendering
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
      }

      // Clear canvas with dark background
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
        // Get game engine and camera system
        const gameEngine = (game as any).gameEngine;

        if (!gameEngine) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }

        const cameraSystem = gameEngine.getCameraSystem();
        if (!cameraSystem) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }

        // Get camera position and create local area bounds
        const camera = cameraSystem.getCamera();
        const cameraPos = camera.getPosition();
        const viewport = camera.getViewport();

        // Define the minimap area as 3x the viewport size centered on the camera
        const minimapWorldWidth = viewport.width * 3;
        const minimapWorldHeight = viewport.height * 3;

        const minimapBounds = {
          left: cameraPos.x - minimapWorldWidth / 2,
          right: cameraPos.x + minimapWorldWidth / 2,
          top: cameraPos.y - minimapWorldHeight / 2,
          bottom: cameraPos.y + minimapWorldHeight / 2,
        };

        // Scale factors for converting world coordinates to minimap coordinates
        const scaleX = width / minimapWorldWidth;
        const scaleY = height / minimapWorldHeight;

        const entities: MinimapEntity[] = [];

        // Helper function to convert world position to minimap position
        const worldToMinimap = (worldPos: { x: number; y: number }) => ({
          x: (worldPos.x - minimapBounds.left) * scaleX,
          y: (worldPos.y - minimapBounds.top) * scaleY,
        });

        // Helper function to check if a world position is within minimap bounds
        const isInBounds = (worldPos: { x: number; y: number }) => {
          return (
            worldPos.x >= minimapBounds.left &&
            worldPos.x <= minimapBounds.right &&
            worldPos.y >= minimapBounds.top &&
            worldPos.y <= minimapBounds.bottom
          );
        };

        // Get player
        const playerManager = (game as any).playerManager;
        if (playerManager) {
          const modularShip = playerManager.getModularShip();
          const player = playerManager.getPlayer();

          if (modularShip) {
            const pos = modularShip.position;
            if (isInBounds(pos)) {
              const minimapPos = worldToMinimap(pos);
              entities.push({
                x: minimapPos.x,
                y: minimapPos.y,
                color: '#00ff88', // Bright green for player
                size: 5,
                type: 'player',
              });
            }
          } else if (player && isInBounds(player.entity.position)) {
            const minimapPos = worldToMinimap(player.entity.position);
            entities.push({
              x: minimapPos.x,
              y: minimapPos.y,
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
              if (isInBounds(pos)) {
                const minimapPos = worldToMinimap(pos);
                entities.push({
                  x: minimapPos.x,
                  y: minimapPos.y,
                  color: '#ff3366', // Bright red for AI ships
                  size: 4,
                  type: 'ai',
                });
              }
            }
          });
        } // Get asteroids
        const asteroidManager = (game as any).asteroidManager;
        if (asteroidManager) {
          const asteroids = asteroidManager.getAllAsteroids();
          asteroids.forEach((asteroidData: any) => {
            const pos = asteroidData.entity.position;
            if (isInBounds(pos)) {
              const minimapPos = worldToMinimap(pos);
              let size = 2;

              // Check if this is the enormous static asteroid (much larger than normal)
              // The enormous asteroid is at the center and much bigger than others
              const isEnormousAsteroid =
                asteroidData.size === 'large' &&
                Math.abs(pos.x - 25000) < 100 &&
                Math.abs(pos.y - 25000) < 100; // Center of 50k x 50k world

              if (isEnormousAsteroid) {
                size = 8; // Much larger on minimap
              } else if (asteroidData.size === 'large') {
                size = 3;
              } else if (asteroidData.size === 'medium') {
                size = 2;
              } else {
                size = 1;
              }

              entities.push({
                x: minimapPos.x,
                y: minimapPos.y,
                color: isEnormousAsteroid ? '#666666' : '#cccccc', // Darker color for enormous asteroid
                size: size,
                type: 'asteroid',
              });
            }
          });
        }

        // Get lasers
        const laserManager = (game as any).laserManager;
        if (laserManager) {
          const lasers = laserManager.getAllLasers();
          lasers.forEach((laserData: any) => {
            const pos = laserData.entity.position;
            if (isInBounds(pos)) {
              const minimapPos = worldToMinimap(pos);
              const color =
                laserData.source === 'player' ? '#00ffff' : '#ffff00'; // Cyan for player, yellow for AI
              entities.push({
                x: minimapPos.x,
                y: minimapPos.y,
                color: color,
                size: 1,
                type: 'laser',
              });
            }
          });
        }

        // Draw entities with glow effect
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
        });

        // Draw camera viewport indicator (center of minimap since we're camera-centered)
        const viewportWidth = (viewport.width / minimapWorldWidth) * width;
        const viewportHeight = (viewport.height / minimapWorldHeight) * height;
        const viewportX = (width - viewportWidth) / 2;
        const viewportY = (height - viewportHeight) / 2;

        // Draw viewport background with low opacity
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);

        // Draw viewport border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
        ctx.setLineDash([]);
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
        🗺️ Local Area Radar
      </div>
      <div
        className="bg-gray-900 p-1"
        style={{ backgroundColor: 'rgba(17, 24, 39, 1)' }}
      >
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
      <div
        className="px-2 py-1 text-xs text-gray-400 bg-gray-800 rounded-b-lg border-t border-gray-700"
        style={{ backgroundColor: 'rgba(31, 41, 55, 1)' }}
      >
        <div className="flex justify-between text-xs">
          <span>🟢 Player</span>
          <span>🔴 AI Ships</span>
          <span>⚪ Asteroids</span>
        </div>
        <div className="text-center text-xs text-gray-500 mt-1">
          <span>⬜ Viewport • 📡 3x Range</span>
        </div>
      </div>
    </div>
  );
};
