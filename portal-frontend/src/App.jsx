import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SquareProvider } from '@/contexts/SquareContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import OwnDriverProtectedRoute from '@/components/OwnDriverProtectedRoute';
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
import DriverRouteMap from '@/pages/DriverRouteMap';
import WalletPage from '@/pages/WalletPage';
import ClientLoginPage from '@/pages/client/ClientLoginPage';
import ClientRegisterPage from '@/pages/client/ClientRegisterPage';
import ClientDashboardPage from '@/pages/client/ClientDashboardPage';
import NewOrderPage from '@/pages/client/NewOrderPage';
import ClientOrdersPage from '@/pages/client/ClientOrdersPage';
import ClientFinancialPage from '@/pages/client/ClientFinancialPage';
import ClientInvoicePage from '@/pages/client/ClientInvoicePage';
import ClientIntegrationsPage from '@/pages/client/ClientIntegrationsPage';
import ClientProfilePage from '@/pages/client/ClientProfilePage';
import EstablishmentDriversPage from '@/pages/client/EstablishmentDriversPage';
import EstablishmentRoutesPage from '@/pages/client/EstablishmentRoutesPage';
import OwnDriverFinancialPage from '@/pages/client/OwnDriverFinancialPage';
import OwnDriverMetricsPage from '@/pages/client/OwnDriverMetricsPage';
import OwnDriverLoginPage from '@/pages/own-driver/OwnDriverLoginPage';
import OwnDriverDashboardPage from '@/pages/own-driver/OwnDriverDashboardPage';
import OwnDriverDeliveryPage from '@/pages/own-driver/OwnDriverDeliveryPage';
import OwnDriverOrdersPage from '@/pages/own-driver/OwnDriverOrdersPage';
import OwnDriverEarningsPage from '@/pages/own-driver/OwnDriverEarningsPage';
import OwnDriverRoutesPage from '@/pages/own-driver/OwnDriverRoutesPage';
import PaymentReportsPage from '@/pages/PaymentReportsPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import ClientLayout from '@/components/ClientLayout';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminEstablishmentsPage from '@/pages/admin/AdminEstablishmentsPage';
import AdminDriversPage from '@/pages/admin/AdminDriversPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import OverdueReportPage from '@/pages/admin/OverdueReportPage';
import OrderDetailPage from '@/pages/admin/OrderDetailPage';
import AdminFinancePage from '@/pages/admin/AdminFinancePage';
import AdminWithdrawalsPage from '@/pages/admin/AdminWithdrawalsPage';
import AdminInvoicesPage from '@/pages/admin/AdminInvoicesPage';
import AdminPricingPage from '@/pages/admin/AdminPricingPage';
import AdminDynamicPricingPage from '@/pages/admin/AdminDynamicPricingPage';
import AdminIntegrationsPage from '@/pages/admin/AdminIntegrationsPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminRouteSettingsPage from '@/pages/admin/AdminRouteSettingsPage';
import AdminDriverPaymentsPage from '@/pages/admin/AdminDriverPaymentsPage';
import AdminSquaresPage from '@/pages/admin/AdminSquaresPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminWhiteLabelPage from '@/pages/admin/AdminWhiteLabelPage';
import PlatformDashboardPage from '@/pages/admin/PlatformDashboardPage';
import DatabaseMapPage from '@/pages/admin/DatabaseMapPage';
import PlatformLoginPage from '@/pages/platform/PlatformLoginPage';
import TrackPage from '@/pages/TrackPage';
import SupportPage from '@/pages/SupportPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import PendingApprovalPage from '@/pages/PendingApprovalPage';
import './App.css';

// Componente de redirecionamento inteligente baseado no tipo de usuario
function SmartRedirect() {
  const { user } = useAuth();
  const userType = user?.user_type;
  // Super admin: qualquer ADMIN sem tenant_id
  const isSuperAdmin = user?.user_type === 'ADMIN' && !user?.tenant_id;

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
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SquareProvider>
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
          <Route path="/support" element={<SupportPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/track/:token" element={<TrackPage />} />
          <Route 
            path="/register" 
            element={
              <ProtectedRoute requireAuth={false}>
                <RegisterPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

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
            path="/wallet"
            element={
              <ProtectedRoute>
                <Layout>
                  <WalletPage />
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
            path="/delivery/:orderId?"
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
          <Route
            path="/route"
            element={
              <ProtectedRoute>
                <Layout>
                  <DriverRouteMap />
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
            path="/client/payment-reports"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <PaymentReportsPage />
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
            path="/client/drivers"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <EstablishmentDriversPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/drivers/financial"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <OwnDriverFinancialPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/drivers/metrics"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <OwnDriverMetricsPage />
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
          <Route
            path="/client/routes"
            element={
              <ProtectedRoute>
                <ClientLayout>
                  <EstablishmentRoutesPage />
                </ClientLayout>
              </ProtectedRoute>
            }
          />

          {/* Rotas do entregador próprio (PWA) */}
          <Route path="/own-driver/login" element={<OwnDriverLoginPage />} />
          <Route path="/own-driver" element={<OwnDriverProtectedRoute><OwnDriverDashboardPage /></OwnDriverProtectedRoute>} />
          <Route path="/own-driver/delivery/:orderId" element={<OwnDriverProtectedRoute><OwnDriverDeliveryPage /></OwnDriverProtectedRoute>} />
          <Route path="/own-driver/orders" element={<OwnDriverProtectedRoute><OwnDriverOrdersPage /></OwnDriverProtectedRoute>} />
          <Route path="/own-driver/earnings" element={<OwnDriverProtectedRoute><OwnDriverEarningsPage /></OwnDriverProtectedRoute>} />
          <Route path="/own-driver/routes" element={<OwnDriverProtectedRoute><OwnDriverRoutesPage /></OwnDriverProtectedRoute>} />

          {/* Rotas do super admin (plataforma) */}
          <Route path="/platform/login" element={<PlatformLoginPage />} />
          <Route
            path="/platform"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <PlatformDashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Rotas do admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminDashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/establishments"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminEstablishmentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/drivers"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminDriversPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminOrdersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders/:orderId"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <OrderDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/finance"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminFinancePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payment-reports"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <PaymentReportsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subscriptions"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <SubscriptionPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/overdue-report"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <OverdueReportPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pricing"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminPricingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dynamic-pricing"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminDynamicPricingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/integrations"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminIntegrationsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminWithdrawalsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/invoices"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminInvoicesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminReportsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/driver-payments"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminDriverPaymentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/squares"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminSquaresPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/route-settings"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminRouteSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/white-label"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminWhiteLabelPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <AdminUsersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/database-map"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Layout>
                  <DatabaseMapPage />
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
      </SquareProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
