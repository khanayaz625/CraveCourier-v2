import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { RefreshCw } from 'lucide-react';

export default function RoleRoute({ allowedRoles = [], children }) {
  const { user, isAuthenticated, isLoading, isAuthInitialized } = useAuthStore();

  if (!isAuthInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
          <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium font-heading">
            Checking authorization...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated || !user) {
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Logged in but unauthorized for this role
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'delivery') return <Navigate to="/partner" replace />;
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}

