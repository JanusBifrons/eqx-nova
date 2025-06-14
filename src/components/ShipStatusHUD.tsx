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
} from '@mui/material';
import {
  Shield as HullIcon,
  Build as ComponentIcon,
  Navigation as CoordinateIcon,
} from '@mui/icons-material';
import type { IModularShip } from '../game/entities/v2/interfaces/IModularShip';

interface ShipStatusHUDProps {
  ship: IModularShip | null;
}

export const ShipStatusHUD: React.FC<ShipStatusHUDProps> = ({ ship }) => {
  if (!ship) return null;

  // Calculate simple ship status from available components
  const components = ship.structure.components;
  const totalComponents = components.length;
  const activeComponents = components.filter(c => !c.isDestroyed);
  const totalHealth = components.reduce((sum, c) => sum + c.health, 0);
  const maxTotalHealth = components.reduce((sum, c) => sum + c.maxHealth, 0);
  const overallHealthPercent =
    maxTotalHealth > 0 ? (totalHealth / maxTotalHealth) * 100 : 0;
  const structuralIntegrity =
    totalComponents > 0 ? (activeComponents.length / totalComponents) * 100 : 0;
  // Calculate grid coordinates based on the updated grid system
  // Grid system uses: minor (100), major (500), super (2000)
  const gridX = Math.round(ship.position.x / 100) * 100;
  const gridY = Math.round(ship.position.y / 100) * 100;
  const majorGridX = Math.round(ship.position.x / 500) * 500;
  const majorGridY = Math.round(ship.position.y / 500) * 500;
  const superGridX = Math.round(ship.position.x / 2000) * 2000;
  const superGridY = Math.round(ship.position.y / 2000) * 2000;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        minWidth: '280px',
        maxWidth: '320px',
      }}
    >
      <Card sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
        <CardContent sx={{ padding: '12px !important' }}>
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            SHIP STATUS
          </Typography>
          <Divider
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              marginBottom: '12px',
            }}
          />
          {/* Overall Health */}
          <Box sx={{ marginBottom: '12px' }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ marginBottom: '4px' }}
            >
              <HullIcon sx={{ color: 'lightblue', fontSize: '1rem' }} />
              <Typography
                variant="body2"
                sx={{ color: 'white', fontSize: '0.8rem' }}
              >
                Overall Health
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={overallHealthPercent}
              sx={{
                height: '6px',
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor:
                    overallHealthPercent > 50
                      ? 'lightgreen'
                      : overallHealthPercent > 20
                        ? 'orange'
                        : 'red',
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'white',
                fontSize: '0.7rem',
                float: 'right',
                marginTop: '2px',
              }}
            >
              {overallHealthPercent.toFixed(0)}%
            </Typography>
          </Box>{' '}
          {/* Structural Integrity */}
          <Box sx={{ marginBottom: '12px' }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ marginBottom: '4px' }}
            >
              <ComponentIcon sx={{ color: 'lightcyan', fontSize: '1rem' }} />
              <Typography
                variant="body2"
                sx={{ color: 'white', fontSize: '0.8rem' }}
              >
                Structural Integrity
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={structuralIntegrity}
              sx={{
                height: '6px',
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor:
                    structuralIntegrity > 75
                      ? 'lightgreen'
                      : structuralIntegrity > 50
                        ? 'orange'
                        : 'red',
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'white',
                fontSize: '0.7rem',
                float: 'right',
                marginTop: '2px',
              }}
            >
              {structuralIntegrity.toFixed(0)}%
            </Typography>
          </Box>
          {/* Grid Coordinates */}
          <Box sx={{ marginBottom: '12px' }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ marginBottom: '4px' }}
            >
              <CoordinateIcon sx={{ color: 'lightgreen', fontSize: '1rem' }} />
              <Typography
                variant="body2"
                sx={{ color: 'white', fontSize: '0.8rem' }}
              >
                Grid Coordinates
              </Typography>
            </Stack>
            <Box
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'lightgreen',
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                Position: ({ship.position.x.toFixed(0)},{' '}
                {ship.position.y.toFixed(0)})
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'lightblue',
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                Minor Grid: ({gridX}, {gridY})
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'lightyellow',
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                Major Grid: ({majorGridX}, {majorGridY})
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'lightcoral',
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                Super Grid: ({superGridX}, {superGridY})
              </Typography>
            </Box>
          </Box>
          {/* Components Status */}
          <Box sx={{ marginBottom: '8px' }}>
            <Typography
              variant="body2"
              sx={{ color: 'white', fontSize: '0.8rem', marginBottom: '4px' }}
            >
              Components: {activeComponents.length} / {totalComponents}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {components.map((component, index) => (
                <Chip
                  key={component.id}
                  label={`${index + 1}`}
                  size="small"
                  sx={{
                    backgroundColor: component.isDestroyed
                      ? 'rgba(255, 0, 0, 0.3)'
                      : 'rgba(0, 255, 0, 0.3)',
                    color: 'white',
                    fontSize: '0.7rem',
                    height: '20px',
                    minWidth: '20px',
                  }}
                />
              ))}
            </Stack>
          </Box>
          {/* Status */}
          <Box sx={{ marginTop: '8px' }}>
            <Typography
              variant="body2"
              sx={{ color: 'white', fontSize: '0.8rem', marginBottom: '4px' }}
            >
              Status: {ship.isDestroyed ? 'DESTROYED' : 'OPERATIONAL'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
