# EQX Nova

A modern React application built with Vite, TypeScript, Tailwind CSS, and TanStack Router.

## Features

- ⚡ **Vite** - Fast development and build tool
- ⚛️ **React 18** - Modern React with latest features
- 📝 **TypeScript** - Type safety and better developer experience
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧭 **TanStack Router** - Type-safe routing for React
- 🛠️ **ESLint** - Code linting and formatting

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd eqx-nova
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── App.tsx          # Main application component with navigation
├── main.tsx         # Application entry point
├── router.tsx       # Router configuration and routes
├── index.css        # Global styles with Tailwind directives
└── assets/          # Static assets
```

## Routes

- `/` - Home page with project overview
- `/about` - About page

## Development Tools

- **TanStack Router DevTools** - Enabled in development mode for debugging routes
- **Hot Module Replacement** - Instant updates during development
- **TypeScript** - Full type checking and IntelliSense support

## Styling

This project uses Tailwind CSS for styling. The configuration can be found in `tailwind.config.js`.

## Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.
