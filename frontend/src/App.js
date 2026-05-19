import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Shield } from 'lucide-react';
import { isAuthenticated } from './utils/auth';
import './App.css';

// Lazy load pages for native bundle transitions
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Brand new premium Logo Loading Spinner
const LogoSpinner = () => (
  <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center transition-all duration-300">
    <div className="relative flex items-center justify-center">
      {/* Outer high-contrast spinning ring */}
      <div className="absolute w-24 h-24 rounded-full border-2 border-t-white border-zinc-900 animate-spin" style={{ animationDuration: '1s' }} />
      {/* Inner brand emblem container */}
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl animate-pulse">
        <Shield className="w-8 h-8 text-black" strokeWidth={2.25} />
      </div>
    </div>
    <p className="text-zinc-500 mt-8 font-mono text-xs tracking-widest uppercase animate-pulse">
      Securing Connection
    </p>
  </div>
);

// Route-level transition manager that simulates authentic security handshakes on page change
const RouteTransition = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 650); // Premium 650ms secure handshake load
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (loading) {
    return <LogoSpinner />;
  }

  return children;
};

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/" />;
};

function App() {
  return (
    <div className="App bg-zinc-950 min-h-screen">
      <BrowserRouter>
        <Suspense fallback={<LogoSpinner />}>
          <Routes>
            <Route
              path="/"
              element={
                <RouteTransition>
                  <Login />
                </RouteTransition>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RouteTransition>
                    <Dashboard />
                  </RouteTransition>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        theme="light"
        toastOptions={{
          className: 'bg-zinc-900 border border-zinc-800 text-white rounded-full px-6 py-3 shadow-2xl font-sans',
        }}
      />
    </div>
  );
}

export default App;