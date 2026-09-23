import { Building2, Users, Package, DollarSign, Bike, Calendar } from 'lucide-react';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

export default function OverviewTab({ dashboard }) {
  if (!dashboard) return null;

  return (
    <>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Tenants Ativos</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_tenants}</p>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Usuários</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_users}</p>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={20} style={{ color: '#d97706' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregadores</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_drivers}</p>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} style={{ color: '#db2777' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Pedidos</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_orders}</p>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Receita Total</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                R$ {Number(dashboard.stats.total_revenue || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos (7 dias)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.week_orders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Tenants */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
          Top Tenants por Pedidos
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {dashboard.top_tenants.map((tenant, index) => (
            <div key={tenant.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem', borderRadius: '0.5rem', background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: index === 0 ? '#fbbf24' : index === 1 ? '#64748b' : '#cd7f32',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 600, color: 'white'
                }}>
                  {index + 1}
                </span>
                <div>
                  <p style={{ fontWeight: 500, color: '#1e293b' }}>{tenant.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{tenant.slug} • {tenant.plan}</p>
                </div>
              </div>
              <span style={{ fontWeight: 600, color: '#2563eb' }}>{tenant.orders} pedidos</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
