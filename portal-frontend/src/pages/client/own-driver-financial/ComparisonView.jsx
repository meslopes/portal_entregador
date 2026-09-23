import React from 'react';
import { Users, TrendingUp, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from './constants';

const ComparisonView = ({ comparison }) => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Entregadores Próprios */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: '#1e293b' }}>Entregadores Próprios</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Sua equipe</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregas</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{comparison.own_drivers.deliveries}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo Total</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{formatCurrency(comparison.own_drivers.total_earning)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo/Entrega</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.own_drivers.avg_cost_per_delivery)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Frete Total</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.own_drivers.total_delivery_fee)}</p>
          </div>
        </div>
      </div>

      {/* Plataforma */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: '#1e293b' }}>Plataforma MUV</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregadores da rede</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregas</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{comparison.platform.deliveries}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo Total</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(comparison.platform.total_delivery_fee)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo/Entrega</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.platform.avg_cost_per_delivery)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Frete Total</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.platform.total_delivery_fee)}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Economia */}
    <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '0.75rem', padding: '1.5rem', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowDownRight size={24} />
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Economia estimada no período</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(comparison.savings.estimated_savings)}</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            {(comparison.savings.savings_percentage || 0).toFixed(1)}% de economia em relação à plataforma
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default ComparisonView;
