import React from 'react';

const OrderTimeline = ({ timeline, statusConfig, formatLocalDateTime }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Acompanhamento</h3>
    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
      <div style={{ position: 'absolute', left: '0.75rem', top: 0, bottom: 0, width: '2px', background: '#e2e8f0' }} />

      {timeline.map((item, idx) => (
        <div key={idx} style={{ position: 'relative', marginBottom: '1.25rem', paddingBottom: idx < timeline.length - 1 ? '0.25rem' : 0 }}>
          <div style={{
            position: 'absolute', left: '-1.5rem', top: '0.25rem',
            width: '12px', height: '12px', borderRadius: '50%',
            background: item.current ? item.color : '#e2e8f0',
            border: item.current ? `2px solid ${item.color}` : '2px solid #cbd5e1',
            zIndex: 1
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                <span style={{ fontWeight: 600, color: item.current ? item.color : '#1e293b', fontSize: '0.875rem' }}>{item.label}</span>
                {item.current && (
                  <span style={{ padding: '0.125rem 0.375rem', borderRadius: '9999px', background: statusConfig.bg, color: statusConfig.color, fontSize: '0.625rem', fontWeight: 600 }}>
                    ATUAL
                  </span>
                )}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.detail}</p>
            </div>
            {item.time && (
              <span style={{ color: '#64748b', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                {formatLocalDateTime(item.time)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default OrderTimeline;
