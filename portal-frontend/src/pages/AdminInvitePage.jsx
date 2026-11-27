import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { sanitizeUserForStorage } from '@/lib/utils';

/**
 * Página pública de aceite de convite de admin.
 *
 * O super admin gera um link (com token) e envia ao futuro admin.
 * Aberto o link, a pessoa vê para qual empresa é o convite, preenche
 * os próprios dados e a conta é criada já ligada ao tenant — com login
 * automático, caindo direto no checklist de primeiros passos.
 */
const AdminInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Conta criada mas pendente de aprovação do super administrador
  const [created, setCreated] = useState(false);

  // Carrega os dados do convite ao abrir a página
  useEffect(() => {
    const loadInvite = async () => {
      try {
        const response = await api.get(`/api/auth/invites/${token}`);
        setInvite(response.data);
        setInviteStatus(response.data.status);
        // Se o convite já define o email, preenche e trava o campo
        if (response.data.email) {
          setForm((f) => ({ ...f, email: response.data.email }));
        }
      } catch (err) {
        setInviteError(
          err?.response?.data?.error || 'Convite não encontrado ou inválido'
        );
        setInviteStatus(err?.response?.data?.status || 'NOT_FOUND');
      } finally {
        setLoadingInvite(false);
      }
    };
    loadInvite();
  }, [token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações amigáveis antes de chamar a API
    if (form.password !== form.password_confirm) {
      setError('As senhas não coincidem');
      return;
    }
    if (form.password.length < 8) {
      setError('A senha precisa de pelo menos 8 caracteres');
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('A senha precisa de pelo menos 1 letra e 1 número');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        token,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
        email: form.email.trim(),
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();

      const response = await api.post('/api/auth/invites/accept', payload);

      // Conta nasce pendente de aprovação do super administrador — sem auto-login
      if (response.data.pending_approval) {
        setCreated(true);
        return;
      }

      // Login automático — mesmas chaves e higienização do AuthContext
      sessionStorage.setItem('token', response.data.access_token);
      sessionStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(response.data.user)));

      // Recarrega a página: o AuthContext hidrata a sessão no mount e o
      // ProtectedRoute deixa entrar no painel (navigate() não re-hidrata)
      window.location.href = '/admin';
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao criar a conta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Estados de carregamento ──
  if (loadingInvite) {
    return (
      <div style={styles.center}>
        <Loader2 size={32} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280', marginTop: 12 }}>Carregando convite...</p>
      </div>
    );
  }

  // ── Convite inutilizável ──
  if (inviteError || !invite?.valid) {
    const mensagens = {
      EXPIRED: 'Este convite expirou. Peça um novo convite ao administrador da plataforma.',
      USED: 'Este convite já foi utilizado. Se você já criou sua conta, faça login normalmente.',
      REVOKED: 'Este convite foi revogado. Peça um novo convite ao administrador da plataforma.',
      NOT_FOUND: 'Convite não encontrado ou inválido.',
    };
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h1 style={{ ...styles.title, textAlign: 'center' }}>Convite indisponível</h1>
          <p style={styles.muted}>
            {mensagens[inviteStatus] || inviteError}
          </p>
          <button onClick={() => navigate('/login')} style={{ ...styles.button, marginTop: 8 }}>
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  // ── Conta criada, aguardando aprovação do super administrador ──
  if (created) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <ShieldCheck size={40} color="#16a34a" style={{ margin: '0 auto 12px' }} />
          <h1 style={{ ...styles.title, textAlign: 'center' }}>Conta criada!</h1>
          <p style={styles.muted}>
            Sua conta de administrador foi criada, mas precisa da aprovação do{' '}
            <strong style={{ color: '#111827' }}>super administrador</strong> antes de acessar o painel.
            Você poderá entrar assim que for liberado.
          </p>
          <button onClick={() => navigate('/login')} style={{ ...styles.button, marginTop: 8 }}>
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário de aceite ──
  return (
    <div style={styles.center}>
      <div style={{ ...styles.card, maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <ShieldCheck size={36} color="#4f46e5" style={{ margin: '0 auto 8px' }} />
          <h1 style={styles.title}>Você foi convidado!</h1>
          <p style={styles.muted}>
            Crie sua conta para administrar{' '}
            <strong style={{ color: '#111827' }}>{invite.tenant_name}</strong> no muv.log
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Nome</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                maxLength={100}
                style={styles.input}
                placeholder="Seu nome"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Sobrenome</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
                maxLength={100}
                style={styles.input}
                placeholder="Seu sobrenome"
              />
            </div>
          </div>

          <div>
            <label style={styles.label}>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              maxLength={255}
              disabled={!!invite.email}
              style={{
                ...styles.input,
                background: invite.email ? '#f3f4f6' : '#fff',
                cursor: invite.email ? 'not-allowed' : 'text',
              }}
              placeholder="voce@empresa.com"
            />
            {invite.email && (
              <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                O convite foi feito para este email
              </p>
            )}
          </div>

          <div>
            <label style={styles.label}>Telefone (opcional)</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              maxLength={20}
              style={styles.input}
              placeholder="(51) 99999-0000"
            />
          </div>

          <div>
            <label style={styles.label}>Senha</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              maxLength={128}
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
              Pelo menos 8 caracteres, com 1 letra e 1 número
            </p>
          </div>

          <div>
            <label style={styles.label}>Confirmar senha</label>
            <input
              name="password_confirm"
              type="password"
              value={form.password_confirm}
              onChange={handleChange}
              required
              minLength={8}
              maxLength={128}
              style={styles.input}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              'Criar conta e começar'
            )}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 14 }}>
          Após criar a conta, você será levado ao painel de configuração da sua praça.
        </p>
      </div>
    </div>
  );
};

// Estilos em bloco — padrão inline do projeto
const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    padding: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 28,
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.6,
    marginTop: 6,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '11px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 12,
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 1.5,
  },
};

export default AdminInvitePage;
