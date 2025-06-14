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

## Debug Features

### Physics Debug Mode

The game includes a physics debug mode that allows you to visualize MatterJS physics bodies directly, helping you understand the difference between what PixiJS renders and what MatterJS simulates.

**Debug mode is ENABLED by default** to help with development and debugging.

**How to use:**

1. Start the game - you should immediately see a green-bordered debug overlay
2. White wireframes show actual collision boundaries
3. Green lines show velocity vectors
4. Red lines show collision points
5. Press **P** to toggle physics debug mode on/off

**Other Debug Controls:**

- **X** - Damage player ship for testing
- **Z** - Damage AI ship for testing
- **T** - Test ship connectivity
- **B** - Manually break AI ship
- **C** - Test manual connectivity

The debug mode creates a separate canvas overlay, so it won't interfere with the main game rendering. This is particularly useful for debugging complex compound bodies like modular ships where the visual representation might not match the physics simulation.

## Styling

This project uses Tailwind CSS for styling. The configuration can be found in `tailwind.config.js`.

## Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.
