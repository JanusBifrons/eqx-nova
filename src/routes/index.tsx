import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import { HomePage } from '../pages';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});
