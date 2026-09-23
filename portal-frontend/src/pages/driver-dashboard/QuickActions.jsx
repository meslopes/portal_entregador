import React from 'react';
import { Package, Bike, DollarSign, Clock } from 'lucide-react';
import ActionCard from './ActionCard';

const QuickActions = ({ navigate, pendingRoutes }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
    <ActionCard
      icon={<Package size={24} />}
      iconBg="#eff6ff"
      iconColor="#2563eb"
      title="Pedidos Disponíveis"
      description="Veja os pedidos disponíveis na sua região"
      onClick={() => navigate('/orders')}
    />
    <ActionCard
      icon={<Bike size={24} />}
      iconBg="#dbeafe"
      iconColor="#1d4ed8"
      title="Rotas da Plataforma"
      description={pendingRoutes > 0 ? `${pendingRoutes} rota${pendingRoutes > 1 ? 's' : ''} aguardando aceite!` : 'Veja suas rotas atribuídas e aceite/rejeite'}
      onClick={() => navigate('/platform-driver/routes')}
      badge={pendingRoutes > 0 ? pendingRoutes : null}
    />
    <ActionCard
      icon={<DollarSign size={24} />}
      iconBg="#f0fdf4"
      iconColor="#16a34a"
      title="Meus Ganhos"
      description="Acompanhe seu histórico de ganhos"
      onClick={() => navigate('/earnings')}
    />
    <ActionCard
      icon={<Clock size={24} />}
      iconBg="#faf5ff"
      iconColor="#9333ea"
      title="Histórico"
      description="Veja suas entregas anteriores"
      onClick={() => navigate('/history')}
    />
  </div>
);

export default QuickActions;
