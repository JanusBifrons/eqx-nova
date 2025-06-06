import { Outlet, Link } from "@tanstack/react-router";

function App() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header - fixed small height */}
      <nav className="h-12 bg-white shadow-sm border-b">
        <div className="h-full max-w-7xl mx-auto px-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-900">EQX Nova</h1>
          <div className="flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              activeProps={{ className: "text-blue-600" }}
            >
              Home
            </Link>
            <Link
              to="/about"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              activeProps={{ className: "text-blue-600" }}
            >
              About
            </Link>
          </div>
        </div>
      </nav>      {/* Main content - takes remaining height, no overflow */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
export default App;
