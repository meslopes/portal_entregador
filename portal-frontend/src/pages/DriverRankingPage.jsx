import React, { useState, useEffect } from 'react';
import {
  Trophy, Star, Target, TrendingUp, Award, Flame,
  AlertCircle, Medal, Crown, Zap
} from 'lucide-react';
import { driverService, utils } from '@/lib/api';

const DriverRankingPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ranking');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const rankingData = await driverService.getRanking();
      setData(rankingData);
    } catch (err) {
      setError('Erro ao carregar ranking');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Ranking & Conquistas
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Veja sua posição e conquistas desbloqueadas
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Minha Posicao */}
      {data?.my_position && (
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem',
          color: 'white', textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>Sua Posição</p>
          <p style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>
            {data.my_position}º
          </p>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>
            de {data.total_drivers} entregadores
          </p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('ranking')} style={{
          flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          background: activeTab === 'ranking' ? '#f59e0b' : '#f1f5f9',
          color: activeTab === 'ranking' ? 'white' : '#64748b',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}>
          <Trophy size={16} /> Ranking
        </button>
        <button onClick={() => setActiveTab('achievements')} style={{
          flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          background: activeTab === 'achievements' ? '#8b5cf6' : '#f1f5f9',
          color: activeTab === 'achievements' ? 'white' : '#64748b',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}>
          <Award size={16} /> Conquistas
        </button>
      </div>

      {/* Ranking */}
      {activeTab === 'ranking' && data?.ranking && (
        <div>
          {/* Top 3 */}
          {data.ranking.length >= 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem 0' }}>
              {/* 2o lugar */}
              <div style={{ textAlign: 'center', flex: 1, maxWidth: '150px' }}>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#c0c0c0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', border: '3px solid #e5e7eb' }}>
                  <Medal size={20} style={{ color: 'white' }} />
                </div>
                <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.ranking[1].name}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{data.ranking[1].recent_deliveries} entregas</p>
                <div style={{ height: '4rem', background: '#e5e7eb', borderRadius: '0.375rem 0.375rem 0 0', marginTop: '0.5rem' }} />
              </div>
              {/* 1o lugar */}
              <div style={{ textAlign: 'center', flex: 1, maxWidth: '150px' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', border: '3px solid #fbbf24' }}>
                  <Crown size={24} style={{ color: 'white' }} />
                </div>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.ranking[0].name}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{data.ranking[0].recent_deliveries} entregas</p>
                <div style={{ height: '6rem', background: 'linear-gradient(to top, #f59e0b, #fbbf24)', borderRadius: '0.375rem 0.375rem 0 0', marginTop: '0.5rem' }} />
              </div>
              {/* 3o lugar */}
              <div style={{ textAlign: 'center', flex: 1, maxWidth: '150px' }}>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#cd7f32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', border: '3px solid #d97706' }}>
                  <Medal size={20} style={{ color: 'white' }} />
                </div>
                <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.ranking[2].name}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{data.ranking[2].recent_deliveries} entregas</p>
                <div style={{ height: '3rem', background: '#cd7f32', borderRadius: '0.375rem 0.375rem 0 0', marginTop: '0.5rem' }} />
              </div>
            </div>
          )}

          {/* Lista completa */}
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {data.ranking.map((driver, i) => (
              <div key={driver.driver_id} style={{
                display: 'flex', alignItems: 'center', padding: '0.875rem 1.25rem',
                borderBottom: i < data.ranking.length - 1 ? '1px solid #f8fafc' : 'none',
                background: driver.is_me ? '#fffbeb' : 'transparent'
              }}>
                <span style={{
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#e2e8f0',
                  color: i < 3 ? 'white' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, marginRight: '0.75rem', flexShrink: 0
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: driver.is_me ? 700 : 500, color: '#1e293b', fontSize: '0.875rem' }}>
                    {driver.name} {driver.is_me && <span style={{ fontSize: '0.6875rem', color: '#f59e0b' }}>(você)</span>}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.6875rem', color: '#94a3b8' }}>
                    <span>⭐ {driver.rating.toFixed(1)}</span>
                    <span>📦 {driver.recent_deliveries} entregas</span>
                  </div>
                </div>
                <span style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.875rem' }}>
                  {utils.formatCurrency(driver.recent_earnings)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conquistas */}
      {activeTab === 'achievements' && data?.achievements && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {data.achievements.map(ach => (
            <div key={ach.id} style={{
              background: 'white', borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              padding: '1.25rem', textAlign: 'center',
              opacity: ach.unlocked ? 1 : 0.6,
              border: ach.unlocked ? '2px solid #f59e0b' : '2px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {ach.icon}
              </div>
              <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                {ach.title}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.5rem' }}>
                {ach.description}
              </p>
              {ach.progress !== undefined && (
                <div>
                  <div style={{ height: '0.375rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '9999px',
                      background: '#f59e0b',
                      width: `${Math.min((ach.progress / ach.target) * 100, 100)}%`
                    }} />
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {ach.progress}/{ach.target}
                  </p>
                </div>
              )}
              {ach.unlocked && (
                <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', background: '#dcfce7', color: '#16a34a', fontSize: '0.6875rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  Desbloqueada
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DriverRankingPage;
