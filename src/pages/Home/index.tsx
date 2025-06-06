import React from 'react';

export default function HomePage() {
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
}
