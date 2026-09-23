import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import EarningsPage from '@/pages/EarningsPage';
import HistoryPage from '@/pages/HistoryPage';
import ActiveDeliveryPage from '@/pages/ActiveDeliveryPage';
import DriverRankingPage from '@/pages/DriverRankingPage';
import DriverProfilePage from '@/pages/DriverProfilePage';
import DriverRouteMap from '@/pages/DriverRouteMap';
import WalletPage from '@/pages/WalletPage';
import PlatformDriverDashboardPage from '@/pages/driver/PlatformDriverDashboardPage';
import PlatformDriverRoutesPage from '@/pages/driver/PlatformDriverRoutesPage';

function WrappedRoute({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function DriverRoutes() {
  return (
    <>
      <Route path="/dashboard" element={<WrappedRoute><DashboardPage /></WrappedRoute>} />
      <Route
        path="/platform-driver"
        element={
          <ProtectedRoute>
            <PlatformDriverDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform-driver/routes"
        element={
          <ProtectedRoute>
            <PlatformDriverRoutesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/orders" element={<WrappedRoute><OrdersPage /></WrappedRoute>} />
      <Route path="/earnings" element={<WrappedRoute><EarningsPage /></WrappedRoute>} />
      <Route path="/wallet" element={<WrappedRoute><WalletPage /></WrappedRoute>} />
      <Route path="/history" element={<WrappedRoute><HistoryPage /></WrappedRoute>} />
      <Route path="/delivery/:orderId?" element={<WrappedRoute><ActiveDeliveryPage /></WrappedRoute>} />
      <Route path="/ranking" element={<WrappedRoute><DriverRankingPage /></WrappedRoute>} />
      <Route path="/profile" element={<WrappedRoute><DriverProfilePage /></WrappedRoute>} />
      <Route path="/route" element={<WrappedRoute><DriverRouteMap /></WrappedRoute>} />
    </>
  );
}
