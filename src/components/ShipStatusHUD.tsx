import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Speed as EngineIcon,
  GpsFixed as WeaponIcon,
  Shield as HullIcon,
  Battery20 as LowIcon,
  Battery50 as MedIcon,
  Battery80 as HighIcon,
  BatteryFull as FullIcon,
} from '@mui/icons-material';
import type { ICompositeShip } from '../game/interfaces/ICompositeShip';

interface ShipStatusHUDProps {
  ship: ICompositeShip | null;
}

const getEffectivenessColor = (effectiveness: number) => {
  if (effectiveness >= 0.8) return 'success';
  if (effectiveness >= 0.5) return 'warning';
  if (effectiveness >= 0.2) return 'error';
  return 'error';
};

const getEffectivenessIcon = (effectiveness: number) => {
  if (effectiveness >= 0.8) return <FullIcon />;
  if (effectiveness >= 0.5) return <HighIcon />;
  if (effectiveness >= 0.2) return <MedIcon />;
  return <LowIcon />;
};

export const ShipStatusHUD: React.FC<ShipStatusHUDProps> = ({ ship }) => {
  if (!ship) return null;

  const weaponEffectiveness = ship.getWeaponEffectiveness();
  const engineEffectiveness = ship.getEngineEffectiveness();
  const weaponParts = ship.getWeaponParts();
  const engineParts = ship.getEngineParts();
  const totalParts = ship.getActiveParts().length;
  const lives = ship.lives || 3;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        width: 320,
        zIndex: 1000,
      }}
    >
      <Card
        elevation={8}
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
        }}
      >
        <CardContent sx={{ pb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'cyan',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              mb: 2,
              textAlign: 'center',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
            }}
          >
            SHIP STATUS
          </Typography>

          <Stack spacing={2}>
            {/* Hull Integrity */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <HullIcon sx={{ color: 'lightgreen', fontSize: 20 }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'white', fontFamily: 'monospace' }}
                >
                  Hull Integrity
                </Typography>
                <Chip
                  label={`${totalParts} parts`}
                  size="small"
                  sx={{
                    backgroundColor:
                      totalParts > 6
                        ? 'rgba(76, 175, 80, 0.2)'
                        : 'rgba(244, 67, 54, 0.2)',
                    color: totalParts > 6 ? 'lightgreen' : 'salmon',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                  }}
                />
              </Stack>
            </Box>

            <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Weapons System */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <WeaponIcon sx={{ color: 'gold', fontSize: 20 }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'white', fontFamily: 'monospace' }}
                >
                  Weapons
                </Typography>
                <Tooltip title={`${weaponParts.length} weapon parts active`}>
                  <Chip
                    icon={getEffectivenessIcon(weaponEffectiveness)}
                    label={`${weaponParts.length} active`}
                    size="small"
                    color={getEffectivenessColor(weaponEffectiveness) as any}
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                  />
                </Tooltip>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={2}>
                <LinearProgress
                  variant="determinate"
                  value={weaponEffectiveness * 100}
                  sx={{
                    flexGrow: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: weaponParts.length > 0 ? 'gold' : 'gray',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'gold',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    minWidth: '40px',
                  }}
                >
                  {(weaponEffectiveness * 100).toFixed(0)}%
                </Typography>
              </Stack>
            </Box>

            {/* Engine System */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <EngineIcon sx={{ color: 'orange', fontSize: 20 }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'white', fontFamily: 'monospace' }}
                >
                  Engines
                </Typography>
                <Tooltip title={`${engineParts.length} engine parts active`}>
                  <Chip
                    icon={getEffectivenessIcon(engineEffectiveness)}
                    label={`${engineParts.length} active`}
                    size="small"
                    color={getEffectivenessColor(engineEffectiveness) as any}
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                  />
                </Tooltip>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={2}>
                <LinearProgress
                  variant="determinate"
                  value={engineEffectiveness * 100}
                  sx={{
                    flexGrow: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        engineParts.length > 0 ? 'orange' : 'gray',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'orange',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    minWidth: '40px',
                  }}
                >
                  {(engineEffectiveness * 100).toFixed(0)}%
                </Typography>
              </Stack>
            </Box>

            <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Lives Indicator */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="body2"
                  sx={{ color: 'white', fontFamily: 'monospace' }}
                >
                  Lives:
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor:
                          i < lives ? 'cyan' : 'rgba(255, 255, 255, 0.2)',
                        boxShadow:
                          i < lives ? '0 0 8px rgba(0, 255, 255, 0.6)' : 'none',
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Box>

            {/* Status Indicators */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="body2"
                  sx={{ color: 'white', fontFamily: 'monospace' }}
                >
                  Status:
                </Typography>
                <Chip
                  label={ship.isInvulnerable ? 'INVULNERABLE' : 'VULNERABLE'}
                  size="small"
                  sx={{
                    backgroundColor: ship.isInvulnerable
                      ? 'rgba(33, 150, 243, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: ship.isInvulnerable ? 'lightblue' : 'white',
                    fontFamily: 'monospace',
                    fontSize: '0.6rem',
                  }}
                />
              </Stack>
            </Box>

            {/* Warning Messages */}
            {weaponParts.length === 0 && (
              <Box
                sx={{
                  p: 1,
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: 1,
                  animation: 'pulse 2s infinite',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'salmon',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    display: 'block',
                  }}
                >
                  ⚠️ NO WEAPONS - Cannot fire!
                </Typography>
              </Box>
            )}

            {engineParts.length === 0 && (
              <Box
                sx={{
                  p: 1,
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  borderRadius: 1,
                  animation: 'pulse 2s infinite',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'orange',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    display: 'block',
                  }}
                >
                  ⚠️ NO ENGINES - Cannot thrust!
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
export default ShipStatusHUD;
