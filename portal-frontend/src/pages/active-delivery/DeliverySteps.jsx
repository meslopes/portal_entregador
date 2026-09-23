import React from 'react';
import { CheckCircle } from 'lucide-react';
import { utils, API_BASE_URL } from '@/lib/api';
import { STATUS_FLOW } from './constants';

const DeliverySteps = ({ currentStepIndex, isDelivered, order }) => {
  return (
    <>
      {/* Status Steps */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          {/* Linha de fundo */}
          <div style={{
            position: 'absolute', top: '1.25rem', left: '2.5rem', right: '2.5rem',
            height: '3px', background: '#e2e8f0', zIndex: 0
          }} />
          {/* Linha progresso */}
          <div style={{
            position: 'absolute', top: '1.25rem', left: '2.5rem',
            width: `${(currentStepIndex / (STATUS_FLOW.length - 1)) * (100 - 12)}%`,
            height: '3px', background: '#2563eb', zIndex: 1,
            transition: 'width 0.5s ease'
          }} />

          {STATUS_FLOW.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem',
                  borderRadius: '50%',
                  background: isCompleted ? '#22c55e' : isCurrent ? '#2563eb' : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isCompleted || isCurrent ? 'white' : '#64748b',
                  transition: 'all 0.3s',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none'
                }}>
                  {isCompleted ? <CheckCircle size={18} /> : <StepIcon size={18} />}
                </div>
                <span style={{
                  fontSize: '0.6875rem',
                  marginTop: '0.5rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? '#1e293b' : '#64748b',
                  textAlign: 'center'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entrega concluída */}
      {isDelivered && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '4rem', height: '4rem',
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <CheckCircle size={32} style={{ color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
            Entrega Concluída!
          </h2>
          <p style={{ color: '#16a34a', marginBottom: '1rem' }}>
            Parabéns! Sua entrega foi realizada com sucesso.
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>
            +{utils.formatCurrency(order.delivery?.driver_earnings || 0)}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#16a34a', marginTop: '0.25rem' }}>ganho nesta entrega</p>
          
          {/* Prova de Entrega */}
          {order.delivery?.proof_of_delivery_url && (
            <div style={{ marginTop: '1rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #bbf7d0' }}>
              <img
                src={order.delivery.proof_of_delivery_url.startsWith('http') ? order.delivery.proof_of_delivery_url : `${API_BASE_URL}${order.delivery.proof_of_delivery_url}`}
                alt="Prova de entrega"
                style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', background: '#f0fdf4' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DeliverySteps;
