import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import EarningsPage from '@/pages/EarningsPage';
import HistoryPage from '@/pages/HistoryPage';
import ActiveDeliveryPage from '@/pages/ActiveDeliveryPage';
import ClientLoginPage from '@/pages/client/ClientLoginPage';
import ClientRegisterPage from '@/pages/client/ClientRegisterPage';
import ClientDashboardPage from '@/pages/client/ClientDashboardPage';
import NewOrderPage from '@/pages/client/NewOrderPage';
import ClientLayout from '@/components/ClientLayout';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminEstablishmentsPage from '@/pages/admin/AdminEstablishmentsPage';
import AdminDriversPage from '@/pages/admin/AdminDriversPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import './App.css';

function App() {
  return (
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

          {/* Redirecionamento padrão */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
