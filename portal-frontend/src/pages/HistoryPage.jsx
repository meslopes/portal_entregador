import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Package,
  Store
} from 'lucide-react';
import { driverService, utils } from '@/lib/api';

const HistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await driverService.getDeliveryHistory(page);
      setOrders(response.orders || []);
      setTotalPages(response.pages || 1);
    } catch (error) {
      setError('Erro ao carregar histórico');
      console.error('Erro ao carregar histórico:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Entregas</h1>
          <p className="text-gray-600">Veja todas as suas entregas anteriores</p>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Lista de pedidos */}
        <Card>
          <CardHeader>
            <CardTitle>Entregas Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <div className="divide-y">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">#{order.order_number}</span>
                          <Badge className={utils.getStatusColor(order.status)}>
                            {utils.getStatusText(order.status)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Store className="h-4 w-4" />
                          <span>{order.restaurant?.name || 'Restaurante'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{order.delivery_address?.street || 'Destino'}</span>
                        </div>

                        <p className="text-xs text-gray-400">
                          {utils.formatDateTime(order.created_at)}
                        </p>
                      </div>

                      <div className="text-right">
                        {order.status === 'DELIVERED' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {order.delivery?.driver_earnings && (
                          <p className="text-sm font-semibold text-green-600 mt-1">
                            +{utils.formatCurrency(order.delivery.driver_earnings)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhuma entrega no histórico</p>
                <p className="text-sm">Suas entregas realizadas aparecerão aqui</p>
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

export default HistoryPage;
