import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import App from './App';
import { HomePage, AboutPage } from './pages';

// Create the root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <App />
      <TanStackRouterDevtools />
    </>
  ),
});

// Create the index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function Index() {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Welcome to React + Vite + TanStack Router
          </h1>
          <div className="space-y-4">
            <p className="text-lg text-gray-600">
              This is a modern React application with:
            </p>
            <ul className="list-disc list-inside text-left space-y-2 text-gray-700">
              <li>⚡ Vite for fast development</li>
              <li>📝 TypeScript for type safety</li>
              <li>🎨 Tailwind CSS for styling</li>
              <li>🧭 TanStack Router for routing</li>
            </ul>
          </div>
        </div>
      </div>
    );
  },
});

// Create the about route
const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: function About() {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">About</h1>
          <p className="text-lg text-gray-600 mb-8">
            This is the about page of your React application.
          </p>{' '}
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  },
});

// Create the route tree
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

// Create the router
export const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
