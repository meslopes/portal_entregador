import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  MapPin,
  Settings,
  Store,
  Users,
  ListChecks,
  X,
  BookOpen,
} from 'lucide-react';
import { adminService } from '@/lib/api';

/**
 * Checklist "Primeiros Passos" — guia lateral de configuração inicial do admin.
 *
 * Mostra as 5 etapas obrigatórias para a praça começar a operar:
 * identidade → praça → tabela de preço → estabelecimento → entregador.
 *
 * Comportamento:
 * - Marca ✅ automaticamente conforme os registros aparecem no banco
 * - Botão "Dispensar" esconde o checklist (salvo em localStorage por usuário)
 * - Quando dispensado mas incompleto, um botão flutuante reabre
 * - Quando todos os passos estão feitos, fecha sozinho
 */
const AdminSetupChecklist = () => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(5);
  const [loading, setLoading] = useState(true);
  // 'visible' | 'dismissed' | 'collapsed' (botão flutuante)
  const [viewState, setViewState] = useState('visible');

  // Chave do localStorage única por usuário (não vazar estado entre contas)
  const storageKey = `setup_checklist_dismissed_${localStorage.getItem('userId') || 'anon'}`;

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminService.getSetupStatus();
      setSteps(data.steps || []);
      setCompleted(data.completed || 0);
      setTotal(data.total || 5);

      // Se tudo pronto, não mostra mais nada (nem botão flutuante)
      if (data.all_done) {
        setViewState('dismissed');
      } else if (localStorage.getItem(storageKey)) {
        setViewState('collapsed');
      } else {
        setViewState('visible');
      }
    } catch (err) {
      // Sem conectividade ou rota indisponível: não exibe nada em vez de quebrar o dashboard
      console.warn('Checklist de setup indisponível:', err?.message);
      setViewState('dismissed');
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, '1');
    setViewState('collapsed');
  };

  const handleReopen = () => {
    localStorage.removeItem(storageKey);
    setViewState('visible');
    loadStatus();
  };

  if (loading) return null;

  // Botão flutuante — reaparece quando dispensado mas ainda há pendências
  if (viewState === 'collapsed') {
    return (
      <button
        onClick={handleReopen}
        title="Reabrir checklist de configuração"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 24,
          border: 'none',
          background: '#4f46e5',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
        }}
      >
        <ListChecks size={18} />
        Configuração ({completed}/{total})
      </button>
    );
  }

  if (viewState === 'dismissed') return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 380,
        maxHeight: 'calc(100% - 32px)',
        overflowY: 'auto',
        zIndex: 800,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      {/* Cabeçalho do checklist */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ListChecks size={20} color="#4f46e5" />
            Primeiros Passos
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            Configure sua praça nesta ordem para começar a operar — {completed} de {total} etapas concluídas
          </p>
        </div>
        <button
          onClick={handleDismiss}
          title="Dispensar checklist"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: 4,
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          height: 6,
          background: '#e5e7eb',
          borderRadius: 3,
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${total > 0 ? (completed / total) * 100 : 0}%`,
            background: '#10b981',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Lista de etapas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => navigate(step.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              border: step.done ? '1px solid #d1fae5' : '1px solid #e5e7eb',
              background: step.done ? '#f0fdf4' : '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s ease',
            }}
          >
            {/* Ícone de status */}
            {step.done ? (
              <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={20} color="#d1d5db" style={{ flexShrink: 0 }} />
            )}

            {/* Ícone da etapa */}
            <StepIcon stepId={step.id} done={step.done} />

            {/* Texto */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: step.done ? '#065f46' : '#111827',
                  textDecoration: step.done ? 'none' : 'none',
                }}
              >
                {index + 1}. {step.title}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {step.description}
              </div>
            </div>

            {/* Indicador de navegação */}
            {!step.done && (
              <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, flexShrink: 0 }}>
                Configurar →
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Rodapé com link para o guia completo */}
      <button
        onClick={() => navigate('/admin/guide')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 14,
          padding: '8px 0 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#4f46e5',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <BookOpen size={16} />
        Ver guia completo dos primeiros passos
      </button>
    </div>
  );
};

/** Ícone contextual de cada etapa do checklist. */
const StepIcon = ({ stepId, done }) => {
  const color = done ? '#10b981' : '#9ca3af';
  const iconMap = {
    identity: Settings,
    square: MapPin,
    pricing_table: ListChecks,
    establishment: Store,
    driver: Users,
  };
  const Icon = iconMap[stepId] || Circle;
  return <Icon size={18} color={color} style={{ flexShrink: 0 }} />;
};

export default AdminSetupChecklist;
