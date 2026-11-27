import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext.hooks';
import { SquareProvider } from '@/contexts/SquareContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import ToastContainer from '@/components/Toast';
import ConfirmDialogContainer from '@/components/ConfirmDialog';
import InstallPwaBanner from '@/components/InstallPwaBanner';
import PwaManifestSwitch from '@/components/PwaManifestSwitch';
import { initOfflineSync } from '@/lib/offline';
import {
  publicRoutes,
  driverRoutes,
  clientRoutes,
  ownDriverRoutes,
  platformRoutes,
  adminRoutes,
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

// Raiz do site (2026-11-27): lembra a área do último login — links/atalhos
// de www.muv.log.br caem no app certo (entregador próprio × estabelecimento)
function RootEntry() {
  const lastRole = localStorage.getItem('muv_last_role');
  if (lastRole === 'own') {
    const logado = !!localStorage.getItem('own_driver_token');
    return <Navigate to={logado ? '/own-driver' : '/own-driver/login'} replace />;
  }
  return (
    <ProtectedRoute>
      <SmartRedirect />
    </ProtectedRoute>
  );
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
            <PwaManifestSwitch />
            <ToastContainer />
            <ConfirmDialogContainer />
            <InstallPwaBanner />
            <Routes>
              {publicRoutes}
              {driverRoutes}
              {clientRoutes}
              {ownDriverRoutes}
              {platformRoutes}
              {adminRoutes}

              {/* Redirecionamento padrao */}
              <Route path="/" element={<RootEntry />} />
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
