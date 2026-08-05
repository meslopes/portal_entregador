import React, { useState, useRef, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DateRangeFilter = ({ onChange }) => {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff));
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [preset, setPreset] = useState('thisWeek');

  const applyPreset = useCallback((presetKey) => {
    setPreset(presetKey);
    const now = new Date();
    let start, end;
    switch (presetKey) {
      case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); break;
      case 'yesterday': start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59); break;
      case 'thisWeek': { const d = now.getDay(); const diff = d === 0 ? 6 : d - 1; start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); break; }
      case 'lastWeek': { const le = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); const ls = new Date(le); ls.setDate(le.getDate() - 6); start = new Date(ls.getFullYear(), ls.getMonth(), ls.getDate()); end = new Date(le.getFullYear(), le.getMonth(), le.getDate(), 23, 59, 59); break; }
      case 'thisMonth': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); break;
      case 'lastMonth': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); break;
      case 'last7days': start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); break;
      case 'last30days': start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); break;
      default: return;
    }
    const s = formatDate(start); const e = formatDate(end);
    setStartDate(s); setEndDate(e);
    if (onChange) onChange({ startDate: s, endDate: e, preset: presetKey });
  }, [onChange]);

  const navigateWeek = useCallback((dir) => {
    const c = new Date(startDate);
    c.setDate(c.getDate() + (dir === 'prev' ? -7 : 7));
    const s = formatDate(c); const e = formatDate(new Date(c.getTime() + 6 * 86400000));
    setStartDate(s); setEndDate(e); setPreset('custom');
    if (onChange) onChange({ startDate: s, endDate: e, preset: 'custom' });
  }, [startDate, onChange]);

  const handleDateChange = useCallback((field, value) => {
    if (field === 'start') setStartDate(value); else setEndDate(value);
    const s = field === 'start' ? value : startDate;
    const e = field === 'end' ? value : endDate;
    if (s && e) { setPreset('custom'); if (onChange) onChange({ startDate: s, endDate: e, preset: 'custom' }); }
  }, [startDate, endDate, onChange]);

  const presets = [
    { key: 'today', label: 'Hoje' }, { key: 'yesterday', label: 'Ontem' },
    { key: 'thisWeek', label: 'Esta semana' }, { key: 'lastWeek', label: 'Semana passada' },
    { key: 'last7days', label: 'Últimos 7 dias' }, { key: 'thisMonth', label: 'Este mês' },
    { key: 'lastMonth', label: 'Mês passado' }, { key: 'last30days', label: 'Últimos 30 dias' },
  ];

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <Calendar size={18} style={{ color: '#64748b' }} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>Período</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {presets.map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: preset === p.key ? '2px solid #2563eb' : '1px solid #e2e8f0', background: preset === p.key ? '#eff6ff' : 'white', color: preset === p.key ? '#2563eb' : '#64748b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: preset === p.key ? 600 : 400 }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigateWeek('prev')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="date" value={startDate} onChange={(e) => handleDateChange('start', e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
          <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>até</span>
          <input type="date" value={endDate} onChange={(e) => handleDateChange('end', e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
        </div>
        <button onClick={() => navigateWeek('next')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
