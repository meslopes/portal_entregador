import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Search, 
  AlertCircle,
  Truck,
  Phone,
  Mail,
  Star,
  DollarSign
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminDriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadDrivers();
  }, [page, statusFilter]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDrivers(page, 20, search, statusFilter);
      setDrivers(response.drivers || []);
      setTotalPages(response.pages || 1);
    } catch (error) {
      setError('Erro ao carregar entregadores');
      console.error('Erro ao carregar entregadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadDrivers();
  };

  if (loading && drivers.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Entregadores</h1>
          <p className="text-gray-600">Gerencie todos os entregadores do sistema</p>
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
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome, email ou telefone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === 'online' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('online')}
                >
                  Online
                </Button>
                <Button
                  variant={statusFilter === 'offline' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('offline')}
                >
                  Offline
                </Button>
              </div>
              <Button onClick={handleSearch}>Buscar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de entregadores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              {drivers.length} entregador(es) encontrado(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drivers.length > 0 ? (
              <div className="space-y-4">
                {drivers.map((driver) => (
                  <div key={driver.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Truck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {driver.user?.first_name} {driver.user?.last_name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {driver.user?.email}
                            </span>
                            <span className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {driver.user?.phone}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm mt-2">
                            <Badge variant={driver.user?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {driver.user?.status === 'ACTIVE' ? 'Ativo' : 
                               driver.user?.status === 'INACTIVE' ? 'Inativo' : 'Suspenso'}
                            </Badge>
                            <Badge variant={driver.is_online ? 'default' : 'outline'}>
                              {driver.is_online ? 'Online' : 'Offline'}
                            </Badge>
                            <span className="text-gray-600">
                              {driver.vehicle_type === 'MOTORCYCLE' ? 'Moto' : 
                               driver.vehicle_type === 'CAR' ? 'Carro' : 
                               driver.vehicle_type === 'BICYCLE' ? 'Bicicleta' : 'A pé'}
                            </span>
                            {driver.vehicle_plate && (
                              <span className="text-gray-600">Placa: {driver.vehicle_plate}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="flex items-center text-yellow-500">
                            <Star className="w-4 h-4 mr-1" />
                            <span className="font-semibold">{driver.rating?.toFixed(1) || '5.0'}</span>
                          </div>
                          <p className="text-xs text-gray-500">Avaliação</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{driver.total_deliveries || 0}</p>
                          <p className="text-xs text-gray-500">Entregas</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-green-600">
                            {utils.formatCurrency(driver.total_earnings || 0)}
                          </p>
                          <p className="text-xs text-gray-500">Ganhos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhum entregador encontrado</p>
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

export default AdminDriversPage;
