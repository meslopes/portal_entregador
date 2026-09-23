import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, ArrowLeft, Loader } from 'lucide-react';
import api from '@/lib/api';

const PendingApprovalPage = () => {
  const [status, setStatus] = useState('pending'); // pending, approved, rejected
  const [checking, setChecking] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  // Solicitar permissão de notificação e registrar token
  useEffect(() => {
    const setupPush = async () => {
      try {
        const { requestNotificationPermission } = await import('@/lib/firebase');
        const token = await requestNotificationPermission();
        if (token) {
          setPushEnabled(true);
          // Registrar token no backend
          await api.post('/api/auth/register-push-token', { token }).catch(() => {});
        }
      } catch (err) {
        console.log('[Push] Não foi possível ativar notificações:', err.message);
      }
    };
    setupPush();
  }, []);

  // Polling para verificar status do cadastro
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/api/user/profile');
        const user = res.data;
        if (user.status === 'ACTIVE') {
          setStatus('approved');
          playSound();
          clearInterval(intervalRef.current);
          // Redirecionar para login após 3 segundos
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        // Se retornar 401/403, pode ter sido rejeitado (usuário deletado)
        if (err.response?.status === 401 || err.response?.status === 403) {
          setStatus('rejected');
          playSound();
          clearInterval(intervalRef.current);
        }
      } finally {
        setChecking(false);
      }
    };

    // Verificar imediatamente
    checkStatus();
    // Depois a cada 15 segundos
    intervalRef.current = setInterval(checkStatus, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [navigate]);

  // Escutar mensagens em foreground (quando o app está aberto)
  useEffect(() => {
    let unsubscribe = () => {};
    const setupForeground = async () => {
      try {
        const { onForegroundMessage } = await import('@/lib/firebase');
        unsubscribe = onForegroundMessage((payload) => {
          const type = payload.data?.type;
          if (type === 'ACCOUNT_APPROVED') {
            setStatus('approved');
            playSound();
            setTimeout(() => navigate('/login'), 3000);
          } else if (type === 'ACCOUNT_REJECTED') {
            setStatus('rejected');
            playSound();
          }
        });
      } catch { /* intentionally empty */ }
    };
    setupForeground();
    return () => unsubscribe();
  }, [navigate]);

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Tom de notificação agradável (3 notas ascendentes)
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch { /* intentionally empty */ }
  };

  // Status: Aprovado
  if (status === 'approved') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '2rem'
      }}>
        <div style={{
          background: 'white', borderRadius: '1rem', padding: '3rem 2rem',
          maxWidth: '480px', width: '100%', textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
          }}>
            <CheckCircle size={40} style={{ color: '#16a34a' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', marginBottom: '0.75rem' }}>
            Conta Aprovada!
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Parabéns! Sua conta foi aprovada. Você será redirecionado para o login em instantes.
          </p>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: '#16a34a',
            color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600
          }}>
            <ArrowLeft size={18} /> Ir para o Login
          </Link>
        </div>
      </div>
    );
  }

  // Status: Rejeitado
  if (status === 'rejected') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', padding: '2rem'
      }}>
        <div style={{
          background: 'white', borderRadius: '1rem', padding: '3rem 2rem',
          maxWidth: '480px', width: '100%', textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
          }}>
            <XCircle size={40} style={{ color: '#dc2626' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.75rem' }}>
            Cadastro Não Aprovado
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Infelizmente seu cadastro não foi aprovado. Entre em contato com o administrador para mais informações.
          </p>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: '#dc2626',
            color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600
          }}>
            <ArrowLeft size={18} /> Voltar ao Login
          </Link>
        </div>
      </div>
    );
  }

  // Status: Pendente (aguardando aprovação)
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '2rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '1rem', padding: '3rem 2rem',
        maxWidth: '480px', width: '100%', textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: '#fef3c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
        }}>
          <Clock size={40} style={{ color: '#d97706' }} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
          Cadastro Realizado!
        </h1>

        <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Seu cadastro foi enviado com sucesso e está sendo analisado pela equipe.
        </p>

        <div style={{
          background: pushEnabled ? '#f0fdf4' : '#fef3c7', borderRadius: '0.75rem', padding: '1rem',
          marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left'
        }}>
          {pushEnabled ? (
            <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
          ) : (
            <Clock size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          )}
          <p style={{ color: pushEnabled ? '#166534' : '#92400e', fontSize: '0.8125rem' }}>
            {pushEnabled
              ? 'Notificações ativas! Você será avisado quando seu cadastro for aprovado.'
              : 'Ative as notificações para ser avisado quando seu cadastro for aprovado.'}
          </p>
        </div>

        {checking && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            color: '#64748b', fontSize: '0.75rem', marginBottom: '1.5rem'
          }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Verificando status...
          </div>
        )}

        <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '2rem' }}>
          Após a aprovação, você poderá acessar o sistema normalmente usando seu email e senha.
        </p>

        <Link to="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: '#2563eb',
          color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600
        }}>
          <ArrowLeft size={18} /> Ir para o Login
        </Link>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
