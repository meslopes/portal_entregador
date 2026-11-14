import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ConfirmDialog.utils';
import { Copy, Link2, Loader2, Plus, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';

/**
 * Seção de convites de admin (painel super admin).
 *
 * Permite gerar link de convite para um tenant, copiar o link,
 * acompanhar o status (PENDENTE/USADO/EXPIRADO/REVOGADO) e revogar.
 */
const InvitesSection = () => {
  const [invites, setInvites] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ tenant_id: '', new_company_name: '', email: '', expires_days: 7 });

  const loadInvites = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/platform/admin-invites');
      setInvites(response.data.invites || []);
    } catch (err) {
      console.error('Erro ao carregar convites:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await api.get('/api/platform/tenants');
      setTenants(response.data.tenants || []);
    } catch (err) {
      console.error('Erro ao carregar tenants:', err);
    }
  };

  useEffect(() => {
    loadInvites();
    loadTenants();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      let tenantId = form.tenant_id;

      // Opção "Nova empresa": cria o tenant com o nome digitado e usa o id novo
      if (tenantId === 'new') {
        const nome = form.new_company_name.trim();
        if (!nome) {
          showToast('Digite o nome da empresa', 'error');
          return;
        }
        const tenantResp = await api.post('/api/platform/tenants', { name: nome });
        tenantId = tenantResp.data.tenant?.id || tenantResp.data.id;
        if (!tenantId) {
          showToast('Erro ao criar a empresa', 'error');
          return;
        }
      }

      if (!tenantId) {
        showToast('Selecione a empresa ou digite um nome novo', 'error');
        return;
      }

      setCreating(true);
      const payload = {
        tenant_id: parseInt(tenantId, 10),
        expires_days: parseInt(form.expires_days, 10) || 7,
      };
      if (form.email.trim()) payload.email = form.email.trim();

      const response = await api.post('/api/platform/admin-invites', payload);
      const invite = response.data.invite;

      // Copia o link gerado para a área de transferência já na criação
      const link = buildInviteUrl(invite.token);
      await copyToClipboard(link);

      showToast('Convite criado! Link copiado para a área de transferência.', 'success');
      setShowForm(false);
      setForm({ tenant_id: '', new_company_name: '', email: '', expires_days: 7 });
      loadInvites();
      loadTenants();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao criar convite', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (token) => {
    await copyToClipboard(buildInviteUrl(token));
    showToast('Link copiado!', 'success');
  };

  const handleRevoke = async (invite) => {
    const ok = await confirmAsync({
      title: 'Revogar convite',
      message: 'Tem certeza que deseja revogar este convite? O link deixará de funcionar.',
      confirmText: 'Revogar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/platform/admin-invites/${invite.id}`);
      showToast('Convite revogado', 'success');
      loadInvites();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao revogar convite', 'error');
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={18} color="#4f46e5" />
          Convites de acesso
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {showForm ? <XCircle size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancelar' : 'Gerar link de convite'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.6 }}>
        Gere um link e envie ao futuro admin — ele cria a própria conta e já entra
        no painel, sem você precisar definir senha. O link é de uso único e expira
        no prazo escolhido.
      </p>

      {/* Formulário de criação */}
      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Empresa *</label>
            <select
              value={form.tenant_id}
              onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              required
              style={styles.input}
            >
              <option value="">Selecione...</option>
              <option value="new">＋ Nova empresa (digitar nome)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {form.tenant_id === 'new' && (
            <div style={styles.field}>
              <label style={styles.label}>Nome da empresa *</label>
              <input
                type="text"
                value={form.new_company_name}
                onChange={(e) => setForm({ ...form, new_company_name: e.target.value })}
                placeholder="Ex.: Expresso Zona Sul"
                maxLength={200}
                required
                style={styles.input}
              />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email pré-definido (opcional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Se vazio, qualquer email pode aceitar"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Validade (dias)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.expires_days}
              onChange={(e) => setForm({ ...form, expires_days: e.target.value })}
              style={styles.input}
            />
          </div>
          <button type="submit" disabled={creating} style={styles.submitBtn}>
            {creating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Gerar e copiar link'}
          </button>
        </form>
      )}

      {/* Lista de convites */}
      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : invites.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>
          Nenhum convite gerado ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {invites.map((invite) => (
            <div key={invite.id} style={styles.inviteRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {invite.tenant_name || `Tenant ${invite.tenant_id}`}
                  {invite.email && <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}> → {invite.email}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Criado em {formatDate(invite.created_at)} · Expira em {formatDate(invite.expires_at)}
                </div>
              </div>

              <span style={statusBadge(invite.status)}>{statusLabel(invite.status)}</span>

              {invite.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleCopy(invite.token)}
                    title="Copiar link do convite"
                    style={styles.iconBtn}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => handleRevoke(invite)}
                    title="Revogar convite"
                    style={{ ...styles.iconBtn, color: '#dc2626' }}
                  >
                    <XCircle size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Monta o link completo do convite a partir da origem atual
function buildInviteUrl(token) {
  return `${window.location.origin}/invite/${token}`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback para navegadores sem clipboard API
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusLabel(status) {
  return { PENDING: 'Pendente', USED: 'Usado', EXPIRED: 'Expirado', REVOKED: 'Revogado' }[status] || status;
}

function statusBadge(status) {
  const cores = {
    PENDING: { background: '#eef2ff', color: '#4338ca' },
    USED: { background: '#f0fdf4', color: '#065f46' },
    EXPIRED: { background: '#f3f4f6', color: '#6b7280' },
    REVOKED: { background: '#fef2f2', color: '#b91c1c' },
  };
  return {
    ...(cores[status] || cores.EXPIRED),
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
}

const styles = {
  form: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
  },
  field: { flex: '1 1 180px' },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
  },
  submitBtn: {
    padding: '9px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#059669',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 38,
  },
  inviteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#4f46e5',
    cursor: 'pointer',
  },
};

export default InvitesSection;
