import React from 'react';
import { Bike, Star } from 'lucide-react';

const RatingModal = ({ order, onClose, onSubmit, rating, setRating, feedback, setFeedback, loading }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Avaliar Entrega</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Pedido #{order.order_number}</p>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Entregador */}
          {order.driver && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bike size={20} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b' }}>{order.driver.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.driver.phone}</p>
              </div>
            </div>
          )}

          {/* Estrelas */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>Como foi a entrega?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1,2,3,4,5].map(s => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  aria-label={`${s} estrela${s > 1 ? 's' : ''}`}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.25rem', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Star size={36} fill={s <= rating ? '#f59e0b' : 'none'} stroke={s <= rating ? '#f59e0b' : '#d1d5db'} />
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              {rating === 0 && 'Toque nas estrelas para avaliar'}
              {rating === 1 && 'Ruim'}
              {rating === 2 && 'Regular'}
              {rating === 3 && 'Bom'}
              {rating === 4 && 'Muito Bom'}
              {rating === 5 && 'Excelente'}
            </p>
          </div>

          {/* Comentario */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Comentário (opcional)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Deixe um comentário sobre a entrega..."
              rows={3}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Botoes */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569' }}>
              Cancelar
            </button>
            <button
              onClick={onSubmit}
              disabled={rating === 0 || loading}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                border: 'none', background: rating === 0 ? '#e2e8f0' : '#f59e0b',
                color: rating === 0 ? '#64748b' : 'white',
                fontSize: '0.875rem', fontWeight: 600, cursor: rating === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {loading ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
