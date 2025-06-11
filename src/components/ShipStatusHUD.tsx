import React from 'react';
import type { ICompositeShip } from '../game/interfaces/ICompositeShip';

interface ShipStatusHUDProps {
  ship: ICompositeShip | null;
}

export const ShipStatusHUD: React.FC<ShipStatusHUDProps> = ({ ship }) => {
  if (!ship) return null;

  const weaponEffectiveness = ship.getWeaponEffectiveness();
  const engineEffectiveness = ship.getEngineEffectiveness();
  const weaponParts = ship.getWeaponParts();
  const engineParts = ship.getEngineParts();
  const totalParts = ship.getActiveParts().length;

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg font-mono text-sm">
      <h3 className="text-lg font-bold mb-2 text-cyan-400">Ship Status</h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span>Hull Integrity:</span>
          <span className="text-green-400">{totalParts} parts</span>
        </div>

        <div className="flex justify-between items-center">
          <span>Weapons:</span>
          <div className="flex items-center space-x-2">
            <span
              className={
                weaponParts.length > 0 ? 'text-yellow-400' : 'text-red-400'
              }
            >
              {weaponParts.length} active
            </span>
            <div className="w-16 h-2 bg-gray-600 rounded">
              <div
                className="h-full bg-yellow-400 rounded transition-all duration-300"
                style={{ width: `${weaponEffectiveness * 100}%` }}
              />
            </div>
            <span className="text-xs">
              {(weaponEffectiveness * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span>Engines:</span>
          <div className="flex items-center space-x-2">
            <span
              className={
                engineParts.length > 0 ? 'text-orange-400' : 'text-red-400'
              }
            >
              {engineParts.length} active
            </span>
            <div className="w-16 h-2 bg-gray-600 rounded">
              <div
                className="h-full bg-orange-400 rounded transition-all duration-300"
                style={{ width: `${engineEffectiveness * 100}%` }}
              />
            </div>
            <span className="text-xs">
              {(engineEffectiveness * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            <div>Lives: {ship.lives}</div>
            <div className={ship.isInvulnerable ? 'text-blue-400' : ''}>
              {ship.isInvulnerable ? 'INVULNERABLE' : 'VULNERABLE'}
            </div>
          </div>
        </div>

        {weaponParts.length === 0 && (
          <div className="text-red-400 text-xs mt-2 animate-pulse">
            ⚠️ NO WEAPONS - Cannot fire!
          </div>
        )}

        {engineParts.length === 0 && (
          <div className="text-red-400 text-xs mt-1 animate-pulse">
            ⚠️ NO ENGINES - Cannot thrust!
          </div>
        )}
      </div>
    </div>
  );
};
export default ShipStatusHUD;
