import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true, redirectTo = '/login' }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    const defaultRoute = user?.user_type === 'ADMIN' ? '/admin' : user?.user_type === 'CLIENT' ? '/client' : '/dashboard';
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
};

export default ProtectedRoute;

