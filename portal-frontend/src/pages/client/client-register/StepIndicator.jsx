import React from 'react';
import { Check } from 'lucide-react';

const steps = [
  { num: 1, label: 'Estabelecimento' },
  { num: 2, label: 'Acesso' },
  { num: 3, label: 'Endereço' },
  { num: 4, label: 'Configurações' },
];

const StepIndicator = ({ step }) => (
  <div className="step-indicator">
    {steps.map((s, i) => (
      <React.Fragment key={s.num}>
        <div style={{ textAlign: 'center' }}>
          <div className={`step-dot ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: step === s.num ? '2.5rem' : '2rem', height: '2rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: step >= s.num ? 'white' : '#64748b' }}>
            {step > s.num ? <Check size={14} /> : s.num}
          </div>
          <span className="step-label" style={{ fontSize: '0.6875rem', marginTop: '0.375rem', display: 'block', whiteSpace: 'nowrap' }}>
            {s.label}
          </span>
        </div>
        {i < 3 && (
          <div style={{ width: '2rem', height: '2px', background: step > s.num ? '#22c55e' : '#e2e8f0', marginBottom: '1.25rem', transition: 'background 0.3s' }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

export default StepIndicator;
