import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  MapPin, 
  Clock, 
  DollarSign, 
  Navigation,
  Store,
  User,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { orderService, utils } from '@/lib/api';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingOrder, setAcceptingOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAvailableOrders();
    
    // Atualiza a lista a cada 30 segundos
    const interval = setInterval(loadAvailableOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAvailableOrders = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getAvailableOrders();
      setOrders(response.orders || []);
      setError('');
    } catch (error) {
      setError('Erro ao carregar pedidos disponíveis');
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      setAcceptingOrder(orderId);
      await orderService.acceptOrder(orderId);
      
      // Remove o pedido da lista e navega para o dashboard
      setOrders(orders.filter(order => order.id !== orderId));
      navigate('/dashboard');
    } catch (error) {
      setError('Erro ao aceitar pedido');
      console.error('Erro ao aceitar pedido:', error);
    } finally {
      setAcceptingOrder(null);
    }
  };

  const calculateEarnings = (order) => {
    // Estimativa de ganhos (70% da taxa de entrega + bônus por distância)
    const baseEarning = order.delivery_fee * 0.7;
    const distanceBonus = (order.delivery_distance_km || 0) * 0.5;
    return baseEarning + distanceBonus;
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pedidos Disponíveis</h1>
              <p className="text-gray-600">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} disponível{orders.length !== 1 ? 'eis' : ''} na sua região
              </p>
            </div>
            <Button
              onClick={loadAvailableOrders}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Lista de pedidos */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum pedido disponível
              </h3>
              <p className="text-gray-600 mb-6">
                Não há pedidos disponíveis na sua região no momento. 
                Verifique novamente em alguns minutos.
              </p>
              <Button onClick={loadAvailableOrders}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Pedido #{order.order_number}
                    </CardTitle>
                    <Badge className={utils.getStatusColor(order.status)}>
                      {utils.getStatusText(order.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Informações do restaurante */}
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Store className="w-5 h-5 text-gray-500 mt-1" />
                        <div>
                          <p className="font-semibold">{order.restaurant.name}</p>
                          <p className="text-sm text-gray-600">{order.restaurant.address}</p>
                          {order.distance_to_restaurant_km && (
                            <p className="text-sm text-blue-600">
                              {order.distance_to_restaurant_km} km de você
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <User className="w-5 h-5 text-gray-500 mt-1" />
                        <div>
                          <p className="font-semibold">{order.customer.name}</p>
                          <p className="text-sm text-gray-600">{order.customer.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                        <div>
                          <p className="font-semibold">Endereço de Entrega</p>
                          <p className="text-sm text-gray-600">
                            {order.delivery_address.street}, {order.delivery_address.neighborhood}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.delivery_address.city} - {order.delivery_address.state}
                          </p>
                          {order.delivery_distance_km && (
                            <p className="text-sm text-green-600">
                              {order.delivery_distance_km} km de distância
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informações do pedido */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Itens do Pedido</h4>
                        <div className="space-y-1">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>{utils.formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Valor Total</p>
                          <p className="text-lg font-bold">{utils.formatCurrency(order.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Seus Ganhos</p>
                          <p className="text-lg font-bold text-green-600">
                            {utils.formatCurrency(calculateEarnings(order))}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Pagamento</p>
                          <p className="font-semibold">{utils.getStatusText(order.payment_method)}</p>
                        </div>
                        {order.estimated_delivery_time_minutes && (
                          <div>
                            <p className="text-sm text-gray-600">Tempo Estimado</p>
                            <p className="font-semibold flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {order.estimated_delivery_time_minutes} min
                            </p>
                          </div>
                        )}
                      </div>

                      {order.special_instructions && (
                        <div>
                          <p className="text-sm text-gray-600">Instruções Especiais</p>
                          <p className="text-sm bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                            {order.special_instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-4">
                    <Button
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={acceptingOrder === order.id}
                      className="flex-1"
                    >
                      {acceptingOrder === order.id ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Aceitando...
                        </div>
                      ) : (
                        <>
                          <Package className="w-4 h-4 mr-2" />
                          Aceitar Pedido
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Navigation className="w-4 h-4 mr-2" />
                      Ver no Mapa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;

