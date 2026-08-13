import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ArrowLeft, Clock, CheckCircle, Package, Filter, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { utils } from '@/lib/api';

const OwnDriverEarningsPage = () => {
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');

  useEffect(() => { loadEarnings(); }, [period]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get(`/api/own-driver/earnings?period=${period}`, { headers });
      setEarnings(res.data.earnings || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Erro ao carregar ganhos:', err);
      setError('Erro ao carregar ganhos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <button onClick={() => navigate('/own-driver')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Meus Ganhos</h1>
      </header>

      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        {/* Erro */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Cards de Resumo */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              borderRadius: '0.75rem', padding: '1.25rem', color: 'white'
            }}>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total Ganhos</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{utils.formatCurrency(summary.total || 0)}</p>
            </div>
            <div style={{
              background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Pendente</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                {utils.formatCurrency(summary.pending || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Filtro de Período */}
        <div style={{
          display: 'flex', gap: '0.5rem', marginBottom: '1rem'
        }}>
          {[
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mês' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setPeriod(f.key)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '9999px', border: 'none',
                background: period === f.key ? '#0d9488' : 'white',
                color: period === f.key ? 'white' : '#64748b',
                fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de Ganhos */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : earnings.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '2rem',
            textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <DollarSign size={40} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum ganho neste período</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {earnings.map(earning => (
              <div
                key={earning.id}
                style={{
                  background: 'white', borderRadius: '0.75rem', padding: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
                    #{earning.order_number}
                  </span>
                  <span style={{
                    padding: '0.125rem 0.5rem', borderRadius: '9999px',
                    fontSize: '0.6875rem', fontWeight: 600,
                    background: earning.is_paid ? '#dcfce7' : '#fef3c7',
                    color: earning.is_paid ? '#16a34a' : '#92400e'
                  }}>
                    {earning.is_paid ? 'Pago' : 'Pendente'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    <span>Frete: {utils.formatCurrency(earning.delivery_fee)}</span>
                    {earning.distance_km > 0 && (
                      <span style={{ marginLeft: '0.5rem' }}>• {earning.distance_km} km</span>
                    )}
                  </div>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#16a34a' }}>
                    +{utils.formatCurrency(earning.driver_earning)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnDriverEarningsPage;
