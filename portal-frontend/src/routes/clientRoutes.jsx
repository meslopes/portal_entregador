import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClientLayout from '@/components/ClientLayout';
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
import PaymentReportsPage from '@/pages/PaymentReportsPage';

function WrappedRoute({ children }) {
  return (
    <ProtectedRoute>
      <ClientLayout>{children}</ClientLayout>
    </ProtectedRoute>
  );
}

export default function ClientRoutes() {
  return (
    <>
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
      <Route path="/client" element={<WrappedRoute><ClientDashboardPage /></WrappedRoute>} />
      <Route path="/client/new-order" element={<WrappedRoute><NewOrderPage /></WrappedRoute>} />
      <Route path="/client/orders" element={<WrappedRoute><ClientOrdersPage /></WrappedRoute>} />
      <Route path="/client/financial" element={<WrappedRoute><ClientFinancialPage /></WrappedRoute>} />
      <Route path="/client/payment-reports" element={<WrappedRoute><PaymentReportsPage /></WrappedRoute>} />
      <Route path="/client/invoices" element={<WrappedRoute><ClientInvoicePage /></WrappedRoute>} />
      <Route path="/client/integrations" element={<WrappedRoute><ClientIntegrationsPage /></WrappedRoute>} />
      <Route path="/client/drivers" element={<WrappedRoute><EstablishmentDriversPage /></WrappedRoute>} />
      <Route path="/client/drivers/financial" element={<WrappedRoute><OwnDriverFinancialPage /></WrappedRoute>} />
      <Route path="/client/drivers/metrics" element={<WrappedRoute><OwnDriverMetricsPage /></WrappedRoute>} />
      <Route path="/client/profile" element={<WrappedRoute><ClientProfilePage /></WrappedRoute>} />
      <Route path="/client/routes" element={<WrappedRoute><EstablishmentRoutesPage /></WrappedRoute>} />
    </>
  );
}
