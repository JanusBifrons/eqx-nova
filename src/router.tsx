import { createRouter } from '@tanstack/react-router';
import { rootRoute, homeRoute, aboutRoute } from './routes';

// Create the route tree
const routeTree = rootRoute.addChildren([homeRoute, aboutRoute]);

// Create the router
export const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
