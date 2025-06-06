import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import { AboutPage } from '../pages';

export const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});
