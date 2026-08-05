import React, { useState, useRef, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Função utilitária fora do componente
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialDates = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return { startDate: formatDate(start), endDate: formatDate(now) };
};

const DateRangeFilter = ({ onChange }) => {
  const initial = useRef(getInitialDates());
  const [startDate, setStartDate] = useState(initial.current.startDate);
  const [endDate, setEndDate] = useState(initial.current.endDate);
  const [preset, setPreset] = useState('thisWeek');
  const initialSent = useRef(false);

  // Enviar valor inicial apenas uma vez
  React.useEffect(() => {
    if (!initialSent.current && onChange) {
      initialSent.current = true;
      onChange({ startDate: initial.current.startDate, endDate: initial.current.endDate, preset: 'thisWeek' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = useCallback((presetKey) => {
    setPreset(presetKey);
    const now = new Date();
    let start, end;

    switch (presetKey) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'thisWeek':
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'lastWeek':
        const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        start = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate());
        end = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'last7days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'last30days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      default:
        return;
    }

    const startStr = formatDate(start);
    const endStr = formatDate(end);
    setStartDate(startStr);
    setEndDate(endStr);
    if (onChange) onChange({ startDate: startStr, endDate: endStr, preset: presetKey });
  }, [onChange]);

  const handleCustomDateChange = useCallback((newStart, newEnd) => {
    if (newStart && newEnd) {
      setPreset('custom');
      if (onChange) onChange({ startDate: newStart, endDate: newEnd, preset: 'custom' });
    }
  }, [onChange]);

  const navigateWeek = useCallback((direction) => {
    const current = new Date(startDate);
    if (direction === 'prev') {
      current.setDate(current.getDate() - 7);
    } else {
      current.setDate(current.getDate() + 7);
    }
    const newStart = formatDate(current);
    const newEnd = formatDate(new Date(current.getTime() + 6 * 24 * 60 * 60 * 1000));
    setStartDate(newStart);
    setEndDate(newEnd);
    setPreset('custom');
    if (onChange) onChange({ startDate: newStart, endDate: newEnd, preset: 'custom' });
  }, [startDate, onChange]);

  const presets = [
    { key: 'today', label: 'Hoje' },
    { key: 'yesterday', label: 'Ontem' },
    { key: 'thisWeek', label: 'Esta semana' },
    { key: 'lastWeek', label: 'Semana passada' },
    { key: 'last7days', label: 'Últimos 7 dias' },
    { key: 'thisMonth', label: 'Este mês' },
    { key: 'lastMonth', label: 'Mês passado' },
    { key: 'last30days', label: 'Últimos 30 dias' },
  ];

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <Calendar size={18} style={{ color: '#64748b' }} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>Período</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {presets.map(p => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: preset === p.key ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: preset === p.key ? '#eff6ff' : 'white',
              color: preset === p.key ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: preset === p.key ? 600 : 400
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigateWeek('prev')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); handleCustomDateChange(e.target.value, endDate); }} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
          <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>até</span>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); handleCustomDateChange(startDate, e.target.value); }} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
        </div>
        <button onClick={() => navigateWeek('next')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
