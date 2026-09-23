import { Calendar, Clock } from 'lucide-react';

const PeakHoursReport = ({ data }) => (
  <div>
    {data.hourly?.length > 0 && (
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} style={{ color: '#8b5cf6' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedidos por Hora</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
            {Array.from({ length: 24 }, (_, i) => {
              const hourData = data.hourly.find(h => h.hour === i);
              const count = hourData?.count || 0;
              const maxCount = Math.max(...data.hourly.map(h => h.count));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                  title={`${i}h: ${count} pedidos`}>
                  <div style={{ width: '100%', maxWidth: '16px', height: `${Math.max(height, 2)}%`, background: count === maxCount ? '#dc2626' : '#8b5cf6', borderRadius: '2px 2px 0 0' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.5rem', color: '#64748b' }}>
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </div>
      </div>
    )}
    {data.daily?.length > 0 && (
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} style={{ color: '#0d9488' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedidos por Dia da Semana</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '100px' }}>
            {data.daily.map((d, i) => {
              const maxCount = Math.max(...data.daily.map(x => x.count));
              const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                  title={`${d.day}: ${d.count} pedidos`}>
                  <div style={{ width: '100%', height: `${Math.max(height, 2)}%`, background: '#0d9488', borderRadius: '4px 4px 0 0' }} />
                  <p style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.25rem' }}>{d.day}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </div>
);

export default PeakHoursReport;
