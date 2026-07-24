import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import EarningsPage from '@/pages/EarningsPage';
import HistoryPage from '@/pages/HistoryPage';
import ActiveDeliveryPage from '@/pages/ActiveDeliveryPage';
import DriverRankingPage from '@/pages/DriverRankingPage';
import DriverProfilePage from '@/pages/DriverProfilePage';
import ClientLoginPage from '@/pages/client/ClientLoginPage';
import ClientRegisterPage from '@/pages/client/ClientRegisterPage';
import ClientDashboardPage from '@/pages/client/ClientDashboardPage';
import NewOrderPage from '@/pages/client/NewOrderPage';
import ClientOrdersPage from '@/pages/client/ClientOrdersPage';
import ClientFinancialPage from '@/pages/client/ClientFinancialPage';
import ClientInvoicePage from '@/pages/client/ClientInvoicePage';
import ClientIntegrationsPage from '@/pages/client/ClientIntegrationsPage';
import ClientProfilePage from '@/pages/client/ClientProfilePage';
import ClientLayout from '@/components/ClientLayout';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminEstablishmentsPage from '@/pages/admin/AdminEstablishmentsPage';
import AdminDriversPage from '@/pages/admin/AdminDriversPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import AdminFinancePage from '@/pages/admin/AdminFinancePage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminDriverPaymentsPage from '@/pages/admin/AdminDriverPaymentsPage';
import AdminSquaresPage from '@/pages/admin/AdminSquaresPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import './App.css';

// Componente de redirecionamento inteligente baseado no tipo de usuario
function SmartRedirect() {
  const { user } = useAuth();
  const userType = user?.user_type;

  if (userType === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  } else if (userType === 'CLIENT') {
    return <Navigate to="/client" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
          {/* Rotas públicas */}
          <Route 
            path="/login" 
            element={
              <ProtectedRoute requireAuth={false}>
                <LoginPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <ProtectedRoute requireAuth={false}>
                <RegisterPage />
              </ProtectedRoute>
            } 
          />

          {/* Rotas do entregador */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrdersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/earnings"
            element={
              <ProtectedRoute>
                <Layout>
                  <EarningsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <Layout>
                  <HistoryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/active"
            element={
              <ProtectedRoute>
                <Layout>
                  <ActiveDeliveryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ranking"
            element={
              <ProtectedRoute>
                <Layout>
                  <DriverRankingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <DriverProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Rotas do cliente */}
          <Route
            path="/client/login"
            element={
              <ProtectedRoute requireAuth={false}>
                <ClientLoginPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/register"
            element={
              <ProtectedRoute requireAuth={false}>
                <ClientRegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <ClientDashboardPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/new-order"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <NewOrderPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/orders"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <ClientOrdersPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/financial"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <ClientFinancialPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/invoices"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <ClientInvoicePage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/integrations"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <ClientIntegrationsPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <ClientProfilePage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />

          {/* Rotas do admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminDashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/establishments"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminEstablishmentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/drivers"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminDriversPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminOrdersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/finance"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminFinancePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminReportsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/driver-payments"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminDriverPaymentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/squares"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminSquaresPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminUsersPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirecionamento padrão */}
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
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
