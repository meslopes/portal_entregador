import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true, requiredRole = null, redirectTo = '/login' }) => {
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

  // Verifica se o usuario tem o papel necessario
  if (requiredRole && user?.user_type !== requiredRole) {
    // Redireciona para a rota correta baseada no tipo de usuario
    const userType = user?.user_type;
    if (userType === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    } else if (userType === 'CLIENT') {
      return <Navigate to="/client" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

