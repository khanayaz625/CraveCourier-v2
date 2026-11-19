import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { RefreshCw } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, isAuthInitialized } = useAuthStore();
  const location = useLocation();

  if (!isAuthInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
          <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium font-heading">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}

