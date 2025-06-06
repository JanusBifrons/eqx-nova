import { useRef, useEffect } from 'react';
import { GameCanvas } from '../../engine';
import { Engine } from '../../engine/Engine';
import { Game } from '../../game/Game';

export function PhysicsDemoPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const gameRef = useRef<Game | null>(null);
    const lastTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!canvasRef.current) return;

        const initializeEngine = async () => {
            try {
                const engine = new Engine();
                const game = new Game(); await engine.initialize(canvasRef.current!, true); // With boundaries for physics demo
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
        };

        const gameLoop = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTimeRef.current;
            lastTimeRef.current = currentTime;

            if (gameRef.current) {
                gameRef.current.update(deltaTime);
            }

            requestAnimationFrame(gameLoop);
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

    return (
        <div className="flex flex-1 flex-col">
            <div className="bg-gray-100 p-4 text-center">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Physics Demonstration</h2>
                <p className="text-sm text-gray-600">
                    Click anywhere on the canvas to create objects and apply forces!
                    Objects spawn automatically and interact with the physics world.
                </p>
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
