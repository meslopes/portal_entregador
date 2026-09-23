import React from 'react';
import { Star } from 'lucide-react';

export const RankBadge = ({ rank }) => (
  <span style={{
    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
    background: rank === 1 ? '#22c55e' : rank === 2 ? '#3b82f6' : rank === 3 ? '#f59e0b' : '#e2e8f0',
    color: rank <= 3 ? 'white' : '#64748b',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.625rem', fontWeight: 700
  }}>{rank}</span>
);

export const StarBadge = ({ value }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{value}</span>
  </span>
);

export const ReportCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
      <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{label}</p>
    </div>
    <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

export const MiniReport = ({ label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '3px solid #2563eb' }}>
    <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</p>
    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

export const ReportTable = ({ title, headers, children }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1e293b' }}>{title}</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'center', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
    {React.Children.count(children) === 0 && (
      <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Sem dados no período</p>
    )}
  </div>
);
