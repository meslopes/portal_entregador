import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  AlertCircle,
  Store,
  User,
  MapPin,
  Clock,
  Filter
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllOrders(page, 20, statusFilter);
      setOrders(response.orders || []);
      setTotalPages(response.pages || 1);
    } catch (error) {
      setError('Erro ao carregar pedidos');
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && orders.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">Gerencie todos os pedidos do sistema</p>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">Filtrar por status:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('')}
                >
                  Todos
                </Button>
                {['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {utils.getStatusText(status)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              {orders.length} pedido(s) encontrado(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="font-mono text-sm text-gray-500">#{order.order_number}</span>
                          <Badge className={utils.getStatusColor(order.status)}>
                            {utils.getStatusText(order.status)}
                          </Badge>
                          <Badge variant="outline">
                            {utils.getStatusText(order.payment_method)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-start gap-2">
                            <Store className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">{order.restaurant?.name}</p>
                              <p className="text-gray-500">{order.restaurant?.address}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">{order.customer?.name}</p>
                              <p className="text-gray-500">{order.customer?.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">Entrega</p>
                              <p className="text-gray-500">{order.delivery_address?.street}</p>
                            </div>
                          </div>
                        </div>

                        {order.driver && (
                          <div className="mt-3 flex items-center gap-2 text-sm">
                            <Truck className="w-4 h-4 text-green-500" />
                            <span className="text-gray-600">Entregador:</span>
                            <span className="font-medium">{order.driver.name}</span>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {utils.formatDateTime(order.created_at)}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold">{utils.formatCurrency(order.total_amount)}</p>
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-sm text-green-600 font-medium mt-1">
                          Taxa: {utils.formatCurrency(order.delivery_fee)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhum pedido encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="px-4 py-2 flex items-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
