import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';
import { router } from './router';

// Temporarily disable StrictMode in development to prevent double initialization
// This addresses the duplicate game initialization issue
const isDevelopment = import.meta.env.DEV;

createRoot(document.getElementById('root')!).render(
  isDevelopment ? (
    <RouterProvider router={router} />
  ) : (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
);
