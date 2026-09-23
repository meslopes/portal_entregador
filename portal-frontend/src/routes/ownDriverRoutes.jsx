import { Route } from 'react-router-dom';
import OwnDriverProtectedRoute from '@/components/OwnDriverProtectedRoute';
import OwnDriverLoginPage from '@/pages/own-driver/OwnDriverLoginPage';
import OwnDriverDashboardPage from '@/pages/own-driver/OwnDriverDashboardPage';
import OwnDriverDeliveryPage from '@/pages/own-driver/OwnDriverDeliveryPage';
import OwnDriverOrdersPage from '@/pages/own-driver/OwnDriverOrdersPage';
import OwnDriverEarningsPage from '@/pages/own-driver/OwnDriverEarningsPage';
import OwnDriverRoutesPage from '@/pages/own-driver/OwnDriverRoutesPage';

export default function OwnDriverRoutes() {
  return (
    <>
      <Route path="/own-driver/login" element={<OwnDriverLoginPage />} />
      <Route path="/own-driver" element={<OwnDriverProtectedRoute><OwnDriverDashboardPage /></OwnDriverProtectedRoute>} />
      <Route path="/own-driver/delivery/:orderId" element={<OwnDriverProtectedRoute><OwnDriverDeliveryPage /></OwnDriverProtectedRoute>} />
      <Route path="/own-driver/orders" element={<OwnDriverProtectedRoute><OwnDriverOrdersPage /></OwnDriverProtectedRoute>} />
      <Route path="/own-driver/earnings" element={<OwnDriverProtectedRoute><OwnDriverEarningsPage /></OwnDriverProtectedRoute>} />
      <Route path="/own-driver/routes" element={<OwnDriverProtectedRoute><OwnDriverRoutesPage /></OwnDriverProtectedRoute>} />
    </>
  );
}
