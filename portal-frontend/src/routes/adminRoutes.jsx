import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
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
import AdminPlatformRoutesPage from '@/pages/admin/AdminPlatformRoutesPage';
import AdminDriverPaymentsPage from '@/pages/admin/AdminDriverPaymentsPage';
import AdminSquaresPage from '@/pages/admin/AdminSquaresPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminWhiteLabelPage from '@/pages/admin/AdminWhiteLabelPage';
import DatabaseMapPage from '@/pages/admin/DatabaseMapPage';
import PaymentReportsPage from '@/pages/PaymentReportsPage';
import SubscriptionPage from '@/pages/SubscriptionPage';

function AdminRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function AdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/establishments" element={<AdminRoute><AdminEstablishmentsPage /></AdminRoute>} />
      <Route path="/admin/drivers" element={<AdminRoute><AdminDriversPage /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
      <Route path="/admin/orders/:orderId" element={<AdminRoute><OrderDetailPage /></AdminRoute>} />
      <Route path="/admin/finance" element={<AdminRoute><AdminFinancePage /></AdminRoute>} />
      <Route path="/admin/payment-reports" element={<AdminRoute><PaymentReportsPage /></AdminRoute>} />
      <Route path="/admin/subscriptions" element={<AdminRoute><SubscriptionPage /></AdminRoute>} />
      <Route path="/admin/overdue-report" element={<AdminRoute><OverdueReportPage /></AdminRoute>} />
      <Route path="/admin/pricing" element={<AdminRoute><AdminPricingPage /></AdminRoute>} />
      <Route path="/admin/dynamic-pricing" element={<AdminRoute><AdminDynamicPricingPage /></AdminRoute>} />
      <Route path="/admin/integrations" element={<AdminRoute><AdminIntegrationsPage /></AdminRoute>} />
      <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdrawalsPage /></AdminRoute>} />
      <Route path="/admin/invoices" element={<AdminRoute><AdminInvoicesPage /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
      <Route path="/admin/driver-payments" element={<AdminRoute><AdminDriverPaymentsPage /></AdminRoute>} />
      <Route path="/admin/squares" element={<AdminRoute><AdminSquaresPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/route-settings" element={<AdminRoute><AdminRouteSettingsPage /></AdminRoute>} />
      <Route path="/admin/platform-routes" element={<AdminRoute><AdminPlatformRoutesPage /></AdminRoute>} />
      <Route path="/admin/white-label" element={<AdminRoute><AdminWhiteLabelPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/database-map" element={<AdminRoute><DatabaseMapPage /></AdminRoute>} />
    </>
  );
}
