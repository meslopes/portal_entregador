import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bike, Lock, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

/**
 * Ativação do entregador próprio (Opção 2 do Enviar Acesso).
 * O estabelecimento gera o link em "Meus Entregadores" ? Enviar Acesso ?
 * Link de ativação. O entregador abre e define o PRÓPRIO PIN — nenhum
 * segredo é transmitido (padrão do convite de admin).
 */
const OwnDriverActivationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState(''); // EXPIRED / USED / NOT_FOUND
  const [dados, setDados] = useState(null); // driver_name, restaurant_name
  const [pin, setPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [mostrarPin, setMostrarPin] = useState(false);

  useEffect(() => {
    const consultar = async () => {
      try {
        const res = await api.get(`/api/own-driver/activation/${token}`);
        if (res.data.valid) {
          setDados(res.data);
        } else {
          setStatus(res.data.status || 'NOT_FOUND');
        }
      } catch (err) {
        setStatus(err.response?.status === 404 ? 'NOT_FOUND' : 'ERRO');
        setErro(err.response?.data?.error || 'Não foi possível verificar o link');
      } finally {
        setLoading(false);
      }
    };
    consultar();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    if (pin.length !== 4) { setErro('O PIN deve ter 4 dígitos'); return; }
    if (pin !== confirmarPin) { setErro('Os PINs não conferem'); return; }
    try {
      setAtivando(true);
      const res = await api.post(`/api/own-driver/activation/${token}`, { pin });
      // Auto-login — mesmo formato do login com telefone + PIN
      sessionStorage.setItem('', res.data.token);
      localStorage.setItem('own_driver_data', JSON.stringify({
        id: res.data.driver?.id,
        name: res.data.driver?.name,
      }));
      localStorage.setItem('own_driver_restaurant', JSON.stringify({
        id: res.data.restaurant?.id,
        name: res.data.restaurant?.name,
      }));
      navigate('/own-driver');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao ativar o acesso');
    } finally {
      setAtivando(false);
    }
  };

  const mensagens = {
    EXPIRED: 'Este link expirou. Peça um novo link ao estabelecimento.',
    USED: 'Este link já foi utilizado. Se você já definiu seu PIN, faça login normalmente.',
    NOT_FOUND: 'Link inválido. Peça um novo link ao estabelecimento.',
    ERRO: 'Não foi possível verificar o link. Tente novamente.',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '1rem', padding: '2rem',
        width: '100%', maxWidth: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '4rem', height: '4rem', borderRadius: '50%',
            background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Bike size={32} style={{ color: '#0d9488' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            muv.log
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Ativação da conta do entregador
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0d9488' }} />
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.75rem' }}>Verificando link...</p>
          </div>
        )}

        {!loading && (status || !dados) && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem',
            fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <AlertCircle size={16} /> {mensagens[status] || erro}
          </div>
        )}

        {!loading && dados && (
          <>
            <div style={{
              background: '#dcfce7', border: '1px solid #86efac',
              color: '#166534', padding: '0.75rem 1rem', borderRadius: '0.5rem',
              marginBottom: '1.25rem', fontSize: '0.875rem'
            }}>
              <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.375rem' }} />
              Bem-vindo, <strong>{dados.driver_name}</strong>!
              {dados.restaurant_name && <> Você foi cadastrado no <strong>{dados.restaurant_name}</strong>.</>}
            </div>

            {erro && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <AlertCircle size={16} /> {erro}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Escolha seu PIN (4 dígitos)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type={mostrarPin ? 'text' : 'password'}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="****"
                    maxLength={4}
                    inputMode="numeric"
                    autoFocus
                    style={{
                      width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                      borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
                      fontSize: '1.25rem', outline: 'none', boxSizing: 'border-box',
                      letterSpacing: '0.5rem', textAlign: 'center', fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPin(!mostrarPin)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem'
                    }}
                  >
                    {mostrarPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Confirme o PIN
                </label>
                <input
                  type={mostrarPin ? 'text' : 'password'}
                  value={confirmarPin}
                  onChange={e => setConfirmarPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="****"
                  maxLength={4}
                  inputMode="numeric"
                  style={{
                    width: '100%', padding: '0.75rem',
                    borderRadius: '0.5rem', border: `1.5px solid ${confirmarPin && confirmarPin !== pin ? '#fecaca' : '#e2e8f0'}`,
                    fontSize: '1.25rem', outline: 'none', boxSizing: 'border-box',
                    letterSpacing: '0.5rem', textAlign: 'center', fontFamily: 'monospace'
                  }}
                />
                {confirmarPin && confirmarPin !== pin && (
                  <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem' }}>Os PINs não conferem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={ativando || pin.length !== 4 || pin !== confirmarPin}
                style={{
                  width: '100%', padding: '0.875rem', borderRadius: '0.5rem',
                  border: 'none', background: '#0d9488', color: 'white',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: (ativando || pin.length !== 4 || pin !== confirmarPin) ? 'not-allowed' : 'pointer',
                  opacity: (ativando || pin.length !== 4 || pin !== confirmarPin) ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                }}
              >
                {ativando ? 'Ativando...' : 'Ativar e Entrar'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '1.25rem', lineHeight: 1.6 }}>
              Guarde este PIN — é com ele que você entra no app.
            </p>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default OwnDriverActivationPage;
