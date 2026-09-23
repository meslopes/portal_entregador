import React from 'react';
import {
  DollarSign, Calendar, Users, ChevronDown, ChevronRight
} from 'lucide-react';

const PaymentList = ({
  reports,
  expandedDriver,
  expandedPeriod,
  onToggleDriver,
  onTogglePeriod,
  onPayAll,
  onPayPeriod,
  formatCurrency,
  formatDate,
  formatDateTime,
  PAYMENT_FREQUENCY_LABELS
}) => {
  if (reports.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <DollarSign size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum pagamento registrado</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {reports.map(report => {
        const freqConfig = PAYMENT_FREQUENCY_LABELS[report.payment_frequency] || PAYMENT_FREQUENCY_LABELS.WEEKLY;
        const isExpanded = expandedDriver === report.driver_id;

        return (
          <div key={report.driver_id} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Driver header */}
            <div
              onClick={() => onToggleDriver(report.driver_id)}
              style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} style={{ color: '#0d9488' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{report.driver_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                      {report.restaurant_name}
                    </span>
                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: `${freqConfig.color}20`, color: freqConfig.color }}>
                      {freqConfig.icon} {freqConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pendente</p>
                  <p style={{ fontWeight: 700, color: report.total_pending > 0 ? '#d97706' : '#059669', fontSize: '1.125rem' }}>
                    {formatCurrency(report.total_pending)}
                  </p>
                </div>
                {report.total_pending > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPayAll(report.driver_id); }}
                    style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#059669', color: 'white', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                  >
                    Pagar Tudo
                  </button>
                )}
                {isExpanded ? <ChevronDown size={20} style={{ color: '#64748b' }} /> : <ChevronRight size={20} style={{ color: '#64748b' }} />}
              </div>
            </div>

            {/* Expanded periods */}
            {isExpanded && (
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {report.periods.map((period, idx) => {
                    const isPeriodExpanded = expandedPeriod === `${report.driver_id}-${idx}`;

                    return (
                      <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        {/* Period header */}
                        <div
                          onClick={() => onTogglePeriod(isPeriodExpanded ? null : `${report.driver_id}-${idx}`)}
                          style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: period.is_paid ? '#f0fdf4' : '#fffbeb' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calendar size={16} style={{ color: '#64748b' }} />
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                                {formatDate(period.period_start)} - {formatDate(period.period_end)}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {period.delivery_count} entrega(s)
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</p>
                              <p style={{ fontWeight: 700, color: '#1e293b' }}>{formatCurrency(period.total_earning)}</p>
                            </div>
                            {period.is_paid ? (
                              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>
                                ✓ Pago
                              </span>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); onPayPeriod(report.driver_id, period.period_start); }}
                                style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', background: '#059669', color: 'white', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                Pagar
                              </button>
                            )}
                            {isPeriodExpanded ? <ChevronDown size={16} style={{ color: '#64748b' }} /> : <ChevronRight size={16} style={{ color: '#64748b' }} />}
                          </div>
                        </div>

                        {/* Period details */}
                        {isPeriodExpanded && (
                          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Pedido</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Data</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Tipo</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>Frete</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>Ganho</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {period.earnings.map(earning => (
                                  <tr key={earning.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.5rem' }}>#{earning.order_id}</td>
                                    <td style={{ padding: '0.5rem' }}>{formatDateTime(earning.created_at)}</td>
                                    <td style={{ padding: '0.5rem' }}>
                                      <span style={{ padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.625rem', background: '#dbeafe', color: '#1d4ed8' }}>
                                        {earning.payment_type}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(earning.delivery_fee)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(earning.driver_earning)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                      {earning.is_paid ? (
                                        <span style={{ color: '#059669' }}>✓</span>
                                      ) : (
                                        <span style={{ color: '#d97706' }}>⏳</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PaymentList;
