import { Search, Filter, X } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import StatusTab from './StatusTab';
import DriversTab from './DriversTab';
import EstablishmentsTab from './EstablishmentsTab';
import EmpresasTab from './EmpresasTab';
import PendingTab from './PendingTab';
import RoutesTab from './RoutesTab';

const tabBtn = (isActive) => ({
  padding: '0.5rem 0.75rem', border: 'none', background: 'transparent',
  fontWeight: 600, whiteSpace: 'nowrap',
  color: isActive ? '#2563eb' : '#64748b',
  borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
  cursor: 'pointer', fontSize: '0.75rem'
});

const badgeStyle = (bg) => ({
  background: bg, color: 'white', borderRadius: '9999px',
  padding: '0 0.375rem', fontSize: '0.75rem', fontWeight: 700,
  minWidth: '1.25rem', textAlign: 'center'
});

export default function Sidebar({
  sidebarOpen,
  onToggleSidebar,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  pendingUsers,
  platformRoutes,
  orders,
  allDrivers,
  allEstablishments,
  squares,
  selectedSquare,
  onSelectSquare,
  tenants,
  onApprove,
  onReject,
  onOpenAssign,
  onCenterMap,
  getTimeRemaining,
  onChangeStatus,
  onNavigate,
  onOpenSettings,
  // StatusTab internal state (lifted so Sidebar owns it)
  expandedStatus,
  setExpandedStatus,
  selectedOrderMenu,
  setSelectedOrderMenu,
}) {
  const TabButton = ({ id, label, count, badgeBg }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={tabBtn(activeTab === id)}
    >
      {label}
      {count > 0 && (
        <span style={{ ...badgeStyle(badgeBg), marginLeft: '0.25rem' }}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Botão toggle sidebar (mobile) */}
      <button
        onClick={onToggleSidebar}
        style={{
          position: 'absolute', top: '0.5rem', left: sidebarOpen ? '280px' : '0.5rem', zIndex: 1001,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem',
          padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'left 0.2s'
        }}
      >
        {sidebarOpen ? <X size={16} /> : <Filter size={16} />}
      </button>

      {/* Sidebar Esquerda */}
      <div className="admin-sidebar" style={{
        width: sidebarOpen ? '320px' : '0px', background: 'white', borderRight: '1px solid #e2e8f0',
        overflow: sidebarOpen ? 'auto' : 'hidden', flexShrink: 0, transition: 'width 0.2s',
        minWidth: sidebarOpen ? '320px' : '0px'
      }}>
        {/* Filtros */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Filter size={16} style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Filtros</span>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Buscar por ID, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem',
                  border: '1px solid #e2e8f0', borderRadius: '0.375rem',
                  fontSize: '0.8125rem', outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', alignItems: 'center', overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveTab('status')} style={tabBtn(activeTab === 'status')}>Status</button>
          <button onClick={() => setActiveTab('drivers')} style={tabBtn(activeTab === 'drivers')}>Entreg.</button>
          <button onClick={() => setActiveTab('establishments')} style={tabBtn(activeTab === 'establishments')}>Estab.</button>
          <button onClick={() => setActiveTab('empresas')} style={tabBtn(activeTab === 'empresas')}>Praças</button>
          {pendingUsers.length > 0 && (
            <TabButton id="pending" label="Pendentes" count={pendingUsers.length} badgeBg="#ef4444" />
          )}
          {platformRoutes.length > 0 && (
            <TabButton id="routes" label="Rotas" count={platformRoutes.length} badgeBg="#2563eb" />
          )}
          <Tooltip text="Configurações da sidebar" position="bottom">
            <button
              onClick={onOpenSettings}
              style={{
                padding: '0.5rem', border: 'none', background: 'transparent',
                cursor: 'pointer', color: '#64748b', fontSize: '1.25rem'
              }}
              title="Configurações"
            >
              ⚙️
            </button>
          </Tooltip>
        </div>

        {/* Conteúdo da aba ativa */}
        {activeTab === 'status' && (
          <StatusTab
            orders={orders}
            expandedStatus={expandedStatus}
            setExpandedStatus={setExpandedStatus}
            selectedOrderMenu={selectedOrderMenu}
            setSelectedOrderMenu={setSelectedOrderMenu}
            onOpenAssign={onOpenAssign}
            onCenterMap={onCenterMap}
            getTimeRemaining={getTimeRemaining}
            onChangeStatus={onChangeStatus}
            onNavigate={onNavigate}
          />
        )}
        {activeTab === 'drivers' && <DriversTab drivers={allDrivers} />}
        {activeTab === 'establishments' && <EstablishmentsTab establishments={allEstablishments} />}
        {activeTab === 'empresas' && <EmpresasTab squares={squares} selectedSquare={selectedSquare} onSelectSquare={onSelectSquare} />}
        {activeTab === 'pending' && (
          <PendingTab
            pendingUsers={pendingUsers}
            squares={squares}
            tenants={tenants}
            selectedSquare={selectedSquare}
            onApprove={onApprove}
            onReject={onReject}
          />
        )}
        {activeTab === 'routes' && <RoutesTab routes={platformRoutes} onNavigate={onNavigate} />}
      </div>
    </>
  );
}
