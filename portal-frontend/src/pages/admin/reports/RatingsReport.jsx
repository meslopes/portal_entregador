import { Star } from 'lucide-react';
import { ReportTable, StarBadge, tdStyle } from './shared';

const RatingsReport = ({ data }) => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {[5,4,3,2,1].map(star => (
        <div key={star} style={{ background: 'white', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.125rem', marginBottom: '0.25rem' }}>
            {Array(star).fill(0).map((_, i) => <Star key={i} size={14} fill="#f59e0b" stroke="#f59e0b" />)}
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{data.distribution?.[star] || 0}</p>
        </div>
      ))}
    </div>
    {data.drivers?.length > 0 && (
      <ReportTable title="Avaliação por Entregador" headers={['Entregador', 'Média', 'Total', 'Positivas', 'Negativas']}>
        {data.drivers.map((d, i) => (
          <tr key={d.id}>
            <td style={{ ...tdStyle, fontWeight: 500 }}>{d.name}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}><StarBadge value={d.avg_rating} /></td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{d.total_ratings}</td>
            <td style={{ ...tdStyle, textAlign: 'center', color: '#16a34a' }}>{d.positive}</td>
            <td style={{ ...tdStyle, textAlign: 'center', color: '#dc2626' }}>{d.negative}</td>
          </tr>
        ))}
      </ReportTable>
    )}
  </div>
);

export default RatingsReport;
