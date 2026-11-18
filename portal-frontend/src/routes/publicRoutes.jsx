import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AdminInvitePage from '@/pages/AdminInvitePage';
import OrderLinkPage from '@/pages/OrderLinkPage';
import SupportPage from '@/pages/SupportPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TrackPage from '@/pages/TrackPage';
import PendingApprovalPage from '@/pages/PendingApprovalPage';

export const publicRoutes = (
    <>
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
      <Route path="/invite/:token" element={<AdminInvitePage />} />
      <Route path="/order/:token" element={<OrderLinkPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
    </>
  );
