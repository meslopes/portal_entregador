import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Medal, Star, Clock, TrendingUp, Award,
  ArrowLeft, RefreshCw, Target, Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const RANKING_COLORS = ['#f59e0b', '#64748b', '#cd7f32', '#64748b', '#64748b'];
const LEVEL_THRESHOLDS = [
  { min: 0, level: 'Bronze', color: '#cd7f32', icon: '🥉' },
  { min: 500, level: 'Prata', color: '#64748b', icon: '🥈' },
  { min: 1500, level: 'Ouro', color: '#f59e0b', icon: '🥇' },
  { min: 3000, level: 'Diamante', color: '#8b5cf6', icon: '💎' },
];

const DriverRankingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [bonuses, setBonuses] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [rankingRes, bonusesRes, achievementsRes] = await Promise.all([
        api.get(`/api/bonus/ranking?period=${period}`),
        api.get('/api/bonus/bonuses'),
        api.get('/api/bonus/achievements')
      ]);

      setRanking(rankingRes.data.ranking || []);
      setBonuses(bonusesRes.data.bonuses || []);
      setAchievements(achievementsRes.data.achievements || []);

      // Encontra posicao do usuario atual
      const myPos = rankingRes.data.ranking?.find(r => r.driver_id === user?.driver?.id);
      setMyPosition(myPos);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLevel = (score) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (score >= LEVEL_THRESHOLDS[i].min) {
        return LEVEL_THRESHOLDS[i];
      }
    }
    return LEVEL_THRESHOLDS[0];
  };

  const getScoreColor = (value, max) => {
    const pct = (value / max) * 100;
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#f59e0b';
    return '#ef4444';
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem'
        }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
            🏆 Ranking & Bônus
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Acompanhe sua posição e conquistas
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['weekly', 'monthly'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
              background: period === p ? '#f59e0b' : '#f1f5f9',
              color: period === p ? 'white' : '#64748b',
              fontSize: '0.875rem', fontWeight: period === p ? 600 : 400,
              cursor: 'pointer'
            }}
          >
            {p === 'weekly' ? 'Semanal' : 'Mensal'}
          </button>
        ))}
      </div>

      {/* Minha Posicao */}
      {myPosition && (
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem',
          color: 'white', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>Sua Posição</p>
              <p style={{ fontSize: '2rem', fontWeight: 700 }}>#{myPosition.position}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Pontuação</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{myPosition.score} pts</p>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{getLevel(myPosition.score).icon}</span>
            <span style={{ fontWeight: 600 }}>Nível: {getLevel(myPosition.score).level}</span>
          </div>
        </div>
      )}

      {/* Ranking */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Ranking Top 10</span>
        </div>
        <div style={{ padding: '0.5rem' }}>
          {ranking.slice(0, 10).map((item, index) => (
            <div key={item.driver_id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.25rem',
              background: item.driver_id === user?.driver?.id ? '#eff6ff' : 'transparent'
            }}>
              <div style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                background: index < 3 ? RANKING_COLORS[index] : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                color: index < 3 ? 'white' : '#64748b'
              }}>
                {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : item.position}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{item.name}</p>
                <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{item.total_deliveries} entregas</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.875rem' }}>{item.score} pts</p>
                <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>⭐ {item.avg_rating}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bonus */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Meus Bônus</span>
        </div>
        <div style={{ padding: '0.5rem' }}>
          {bonuses.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
              Nenhum bônus disponível ainda
            </p>
          ) : (
            bonuses.slice(0, 5).map(bonus => (
              <div key={bonus.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.25rem',
                background: '#f0fdf4'
              }}>
                <Award size={18} style={{ color: '#22c55e' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{bonus.criteria}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{bonus.bonus_type === 'weekly' ? 'Semanal' : 'Mensal'}</p>
                </div>
                <span style={{ fontWeight: 600, color: '#22c55e', fontSize: '0.875rem' }}>
                  +R$ {(bonus.amount || 0).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conquistas */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Conquistas</span>
        </div>
        <div style={{ padding: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {achievements.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem', width: '100%' }}>
              Nenhuma conquista desbloqueada ainda
            </p>
          ) : (
            achievements.map(ach => (
              <div key={ach.id} style={{
                padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                background: '#fef3c7', border: '1px solid #fcd34d',
                display: 'flex', alignItems: 'center', gap: '0.375rem'
              }}>
                <Trophy size={14} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#92400e' }}>{ach.achievement_name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DriverRankingPage;
