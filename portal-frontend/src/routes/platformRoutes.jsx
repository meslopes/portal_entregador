import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PlatformDashboardPage from '@/pages/admin/PlatformDashboardPage';
import PlatformLoginPage from '@/pages/platform/PlatformLoginPage';

export default function PlatformRoutes() {
  return (
    <>
      <Route path="/platform/login" element={<PlatformLoginPage />} />
      <Route
        path="/platform"
        element={
          // Exige ADMIN + is_super_admin — admins comuns não acessam o painel multi-tenant
          <ProtectedRoute requiredRole="ADMIN" requireSuperAdmin>
            <Layout>
              <PlatformDashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
    </>
  );
}
