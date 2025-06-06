# Routes

This folder contains individual route definitions for the TanStack Router application.

## Pattern

Each route is defined in its own file:

- `root.tsx` - The root route that wraps all other routes
- `home.tsx` - The home page route (`/`)
- `about.tsx` - The about page route (`/about`)

## Adding New Routes

To add a new route:

1. Create a new file in this directory (e.g., `contact.tsx`)
2. Define and export the route:

   ```tsx
   import { createRoute } from '@tanstack/react-router';
   import { rootRoute } from './root';
   import { ContactPage } from '../pages';

   export const contactRoute = createRoute({
     getParentRoute: () => rootRoute,
     path: '/contact',
     component: ContactPage,
   });
   ```

3. Export it from `index.ts`
4. Add it to the route tree in `../router.tsx`

This pattern keeps routes modular and easy to maintain.
