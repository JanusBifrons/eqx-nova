import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import { PhysicsDemoPage } from '../pages';

export const physicsDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/physics-demo',
  component: PhysicsDemoPage,
});
