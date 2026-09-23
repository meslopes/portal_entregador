import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SquareProvider } from '@/contexts/SquareContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import ToastContainer from '@/components/Toast';
import ConfirmDialogContainer from '@/components/ConfirmDialog';
import InstallPwaBanner from '@/components/InstallPwaBanner';
import { initOfflineSync } from '@/lib/offline';
import {
  PublicRoutes,
  DriverRoutes,
  ClientRoutes,
  OwnDriverRoutes,
  PlatformRoutes,
  AdminRoutes,
} from '@/routes';
import './App.css';

// Componente de redirecionamento inteligente baseado no tipo de usuario
function SmartRedirect() {
  const { user } = useAuth();
  const userType = user?.user_type;
  // Super admin: campo is_super_admin do backend
  const isSuperAdmin = user?.user_type === 'ADMIN' && user?.is_super_admin;

  // Usuario pendente de aprovacao
  if (user?.status === 'INACTIVE') {
    return <Navigate to="/pending-approval" replace />;
  }

  // Super admin vai para /platform
  if (userType === 'ADMIN' && isSuperAdmin) {
    return <Navigate to="/platform" replace />;
  } else if (userType === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  } else if (userType === 'CLIENT') {
    return <Navigate to="/client" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
}

function App() {
  useEffect(() => {
    initOfflineSync();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SquareProvider>
          <Router>
            <ToastContainer />
            <ConfirmDialogContainer />
            <InstallPwaBanner />
            <Routes>
              <PublicRoutes />
              <DriverRoutes />
              <ClientRoutes />
              <OwnDriverRoutes />
              <PlatformRoutes />
              <AdminRoutes />

              {/* Redirecionamento padrao */}
              <Route path="/" element={
                <ProtectedRoute>
                  <SmartRedirect />
                </ProtectedRoute>
              } />
              <Route path="*" element={
                <ProtectedRoute>
                  <SmartRedirect />
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </SquareProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
