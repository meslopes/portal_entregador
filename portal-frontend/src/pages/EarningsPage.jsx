import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { driverService, utils } from '@/lib/api';

const EarningsPage = () => {
  const [earnings, setEarnings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsRes, statsRes] = await Promise.all([
        driverService.getEarningsHistory(),
        driverService.getStats()
      ]);
      setEarnings(earningsRes);
      setStats(statsRes);
    } catch (error) {
      setError('Erro ao carregar dados de ganhos');
      console.error('Erro ao carregar ganhos:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Ganhos</h1>
          <p className="text-gray-600">Acompanhe seus ganhos e pagamentos</p>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ganhos Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {utils.formatCurrency(stats?.today_earnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {utils.formatCurrency(stats?.week_earnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Acumulado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {utils.formatCurrency(stats?.total_earnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {earnings?.payments?.length > 0 ? (
              <div className="divide-y">
                {earnings.payments.map((payment) => (
                  <div key={payment.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-medium">
                        {payment.payment_type === 'DELIVERY_EARNING' ? 'Entrega realizada' : 
                         payment.payment_type === 'BONUS' ? 'Bônus' : 'Ajuste'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {utils.formatDateTime(payment.created_at)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {utils.getStatusText(payment.status)}
                      </p>
                    </div>
                    <span className="text-green-600 font-semibold text-lg">
                      +{utils.formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Nenhum pagamento registrado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EarningsPage;
