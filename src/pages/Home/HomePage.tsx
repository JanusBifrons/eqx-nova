import { GameCanvas } from '../../engine';

export function HomePage() {
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

        <div className="mb-8">
          <GameCanvas width={800} height={600} className="mx-auto" />
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
