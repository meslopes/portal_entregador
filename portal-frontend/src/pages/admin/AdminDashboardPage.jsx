import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Truck, 
  Package, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (error) {
      setError('Erro ao carregar dashboard administrativo');
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-600">Visão geral do sistema muv.log</p>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Entregadores</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_drivers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Online Agora</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.online_drivers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_orders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Receita Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {utils.formatCurrency(dashboard?.today_revenue || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards do dia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Resumo do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pedidos Hoje</span>
                  <span className="font-semibold">{dashboard?.today_orders || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Entregas Hoje</span>
                  <span className="font-semibold">{dashboard?.today_deliveries || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Receita Hoje</span>
                  <span className="font-semibold text-green-600">
                    {utils.formatCurrency(dashboard?.today_revenue || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Pedidos por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.orders_by_status && Object.entries(dashboard.orders_by_status).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">{utils.getStatusText(status)}</span>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {(!dashboard?.orders_by_status || Object.keys(dashboard.orders_by_status).length === 0) && (
                  <p className="text-gray-500 text-center py-4">Nenhum pedido registrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Entregadores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="w-5 h-5 mr-2" />
              Entregadores Mais Ativos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.top_drivers?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.top_drivers.map((driver, index) => (
                  <div key={driver.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-gray-400 w-8">{index + 1}º</span>
                      <span className="font-medium">{driver.name}</span>
                    </div>
                    <span className="text-blue-600 font-semibold">{driver.deliveries} entregas</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum entregador ativo</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
