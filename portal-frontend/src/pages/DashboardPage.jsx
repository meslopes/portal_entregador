import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Clock, 
  Star, 
  Package, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Navigation
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { driverService, orderService, utils } from '@/lib/api';

const DashboardPage = () => {
  const { user, updateUser } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Carrega dados iniciais
  useEffect(() => {
    loadDashboardData();
    getCurrentLocation();
  }, []);

  // Atualiza status online baseado nos dados do usuário
  useEffect(() => {
    if (user?.driver) {
      setIsOnline(user.driver.is_online);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, orderData] = await Promise.all([
        driverService.getStats(),
        orderService.getCurrentOrder()
      ]);
      
      setStats(statsData);
      setCurrentOrder(orderData.order || null);
    } catch (error) {
      setError('Erro ao carregar dados do dashboard');
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
        }
      );
    }
  };

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      
      if (newStatus && !location) {
        setError('Localização necessária para ficar online');
        return;
      }

      const response = await driverService.toggleOnlineStatus(
        newStatus,
        location?.latitude,
        location?.longitude
      );

      setIsOnline(newStatus);
      updateUser({
        ...user,
        driver: response.driver
      });

      setError('');
    } catch (error) {
      setError('Erro ao alterar status');
      console.error('Erro ao alterar status:', error);
    }
  };

  const updateLocation = async () => {
    if (!location) {
      getCurrentLocation();
      return;
    }

    try {
      await driverService.updateLocation(location.latitude, location.longitude);
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
    }
  };

  // Atualiza localização a cada 30 segundos se estiver online
  useEffect(() => {
    let interval;
    if (isOnline && location) {
      interval = setInterval(updateLocation, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, location]);

  if (isLoading) {
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Bem-vindo, {user?.first_name} {user?.last_name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={isOnline ? "default" : "secondary"} className="text-sm">
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Status:</span>
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleToggleOnline}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pedido atual */}
        {currentOrder && (
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Pedido em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Número do Pedido</p>
                  <p className="font-semibold">{currentOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={utils.getStatusColor(currentOrder.status)}>
                    {utils.getStatusText(currentOrder.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="font-semibold">{utils.formatCurrency(currentOrder.total_amount)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full md:w-auto">
                  Ver Detalhes do Pedido
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ganhos Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? utils.formatCurrency(stats.today_earnings) : 'R$ 0,00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ganhos da Semana</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? utils.formatCurrency(stats.week_earnings) : 'R$ 0,00'}
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">Total de Entregas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? stats.total_deliveries : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avaliação</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? stats.average_rating.toFixed(1) : '5.0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Pedidos Disponíveis</h3>
              <p className="text-gray-600 mb-4">Veja os pedidos disponíveis na sua região</p>
              <Button className="w-full">Ver Pedidos</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Meus Ganhos</h3>
              <p className="text-gray-600 mb-4">Acompanhe seu histórico de ganhos</p>
              <Button className="w-full">Ver Ganhos</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Histórico</h3>
              <p className="text-gray-600 mb-4">Veja suas entregas anteriores</p>
              <Button className="w-full">Ver Histórico</Button>
            </CardContent>
          </Card>
        </div>

        {/* Status da localização */}
        {location && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>
                  Localização: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={getCurrentLocation}
                  className="ml-auto"
                >
                  <Navigation className="w-4 h-4 mr-1" />
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

