import React from 'react';
import { Save, RefreshCw, Route, MapPin, Zap, Bell, Package } from 'lucide-react';
import SettingsCard from './SettingsCard';
import ToggleSwitch from './ToggleSwitch';

const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' };
const inputStyle = { width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' };
const hintStyle = { fontSize: '0.75rem', color: '#64748b' };

const ToggleRow = ({ label, description, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
    <div>
      <p style={{ fontWeight: 500, color: '#1e293b' }}>{label}</p>
      <p style={{ ...hintStyle }}>{description}</p>
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} />
  </div>
);

const RouteSettingsForm = ({ settings, handleChange, saving, handleSave, loadSettings }) => (
  <>
    {/* Auto-Roteirização */}
    <SettingsCard icon={Zap} iconColor="#2563eb" title="Auto-Roteirização" subtitle="Sistema cria rotas automaticamente">
      <ToggleRow
        label="Ativar Auto-Roteirização"
        description="Sistema analisa pedidos e cria rotas automaticamente"
        checked={settings.auto_routing_enabled}
        onChange={e => handleChange('auto_routing_enabled', e.target.checked)}
      />
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Intervalo de Análise (minutos)</label>
        <input type="number" min="1" max="60" value={settings.auto_routing_interval_min}
          onChange={e => handleChange('auto_routing_interval_min', parseInt(e.target.value) || 5)}
          style={inputStyle}
        />
        <p style={{ ...hintStyle, marginTop: '0.25rem' }}>De 1 a 60 minutos</p>
      </div>
    </SettingsCard>

    {/* Limites */}
    <SettingsCard icon={Route} iconColor="#16a34a" title="Limites" subtitle="Limites de pedidos e distância">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Máx. Pedidos (Auto)</label>
          <input type="number" min="2" max="20" value={settings.max_orders_auto}
            onChange={e => handleChange('max_orders_auto', parseInt(e.target.value) || 6)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Máx. Pedidos (Manual)</label>
          <input type="number" min="2" max="20" value={settings.max_orders_manual}
            onChange={e => handleChange('max_orders_manual', parseInt(e.target.value) || 10)}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Distância Máxima entre Pedidos (km)</label>
        <input type="number" min="1" max="50" step="0.5" value={settings.max_distance_km}
          onChange={e => handleChange('max_distance_km', parseFloat(e.target.value) || 10)}
          style={inputStyle}
        />
      </div>
    </SettingsCard>

    {/* Status de Pedidos */}
    <SettingsCard icon={Package} iconColor="#f59e0b" title="Status de Pedidos" subtitle="Quais status incluir na roteirização">
      <ToggleRow label="Prontos (READY)" description="Pedidos prontos para coleta"
        checked={settings.include_ready} onChange={e => handleChange('include_ready', e.target.checked)} />
      <ToggleRow label="Em Preparo (PREPARING)" description="Pedidos sendo preparados"
        checked={settings.include_preparing} onChange={e => handleChange('include_preparing', e.target.checked)} />
      <ToggleRow label="Aceitos (ACCEPTED)" description="Pedidos aceitos pelo restaurante"
        checked={settings.include_accepted} onChange={e => handleChange('include_accepted', e.target.checked)} />
      <ToggleRow label="Pendentes (PENDING)" description="Pedidos aguardando aceite"
        checked={settings.include_pending} onChange={e => handleChange('include_pending', e.target.checked)} />
      <ToggleRow label="Agendados (SCHEDULED)" description="Pedidos agendados para horário futuro"
        checked={settings.include_scheduled} onChange={e => handleChange('include_scheduled', e.target.checked)} />

      {settings.include_scheduled && (
        <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
          <label style={labelStyle}>Antecedência para Agendados (minutos)</label>
          <input type="number" min="5" max="120" value={settings.scheduled_advance_min}
            onChange={e => handleChange('scheduled_advance_min', parseInt(e.target.value) || 30)}
            style={inputStyle}
          />
          <p style={{ ...hintStyle, marginTop: '0.25rem' }}>
            Incluir agendados que começam em até {settings.scheduled_advance_min} minutos
          </p>
        </div>
      )}
    </SettingsCard>

    {/* Algoritmo */}
    <SettingsCard icon={MapPin} iconColor="#8b5cf6" title="Algoritmo" subtitle="Pesos e thresholds do algoritmo">
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Peso da Direção: {Math.round(settings.direction_weight * 100)}%</label>
        <input type="range" min="0" max="100" value={settings.direction_weight * 100}
          onChange={e => handleChange('direction_weight', parseInt(e.target.value) / 100)}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...hintStyle }}>
          <span>Distância</span><span>Direção</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Economia Mín. (min)</label>
          <input type="number" min="1" max="60" value={settings.min_time_savings_min}
            onChange={e => handleChange('min_time_savings_min', parseInt(e.target.value) || 10)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Clusterização Mín.: {Math.round(settings.min_clusterization * 100)}%</label>
          <input type="range" min="0" max="100" value={settings.min_clusterization * 100}
            onChange={e => handleChange('min_clusterization', parseInt(e.target.value) / 100)}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </SettingsCard>

    {/* Notificações */}
    <SettingsCard icon={Bell} iconColor="#f59e0b" title="Notificações" subtitle="Alertas sobre rotas automáticas">
      <ToggleRow
        label="Notificar Admin"
        description="Alertar quando sistema criar rota automática"
        checked={settings.notify_admin_auto_route}
        onChange={e => handleChange('notify_admin_auto_route', e.target.checked)}
      />
      <ToggleRow
        label="Notificar Entregador"
        description="Alertar entregador sobre nova rota"
        checked={settings.notify_driver_auto_route}
        onChange={e => handleChange('notify_driver_auto_route', e.target.checked)}
      />
    </SettingsCard>

    {/* Botões de ação */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
      <button
        onClick={loadSettings}
        style={{
          padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
          border: '1.5px solid #e2e8f0', background: 'white',
          fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}
      >
        <RefreshCw size={16} /> Restaurar Padrão
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
          border: 'none', background: saving ? '#94a3b8' : '#2563eb',
          color: 'white', fontSize: '0.875rem', fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}
      >
        <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </div>
  </>
);

export default RouteSettingsForm;
