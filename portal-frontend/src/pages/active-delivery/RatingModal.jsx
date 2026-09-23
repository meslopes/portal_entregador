import React from 'react';

const RatingModal = ({
  showRating, ratingValue, setRatingValue, ratingFeedback, setRatingFeedback, isRating,
  restaurantName, onSubmit, onSkip
}) => {
  if (!showRating) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '1rem', padding: '2rem',
        maxWidth: '400px', width: '100%', textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          Como foi a coleta?
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Avalie o estabelecimento {restaurantName}
        </p>

        {/* Estrelas */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRatingValue(star)}
              aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '2.5rem', color: star <= ratingValue ? '#f59e0b' : '#e2e8f0',
                transition: 'color 0.15s'
              }}
            >
              ★
            </button>
          ))}
        </div>

        {/* Comentário */}
        <textarea
          value={ratingFeedback}
          onChange={(e) => setRatingFeedback(e.target.value)}
          placeholder="Comentário (opcional)..."
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
            border: '1px solid #e2e8f0', fontSize: '0.875rem',
            resize: 'vertical', minHeight: '80px', marginBottom: '1.5rem',
            fontFamily: 'inherit'
          }}
        />

        {/* Botões */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onSkip}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white',
              color: '#64748b', cursor: 'pointer', fontSize: '0.875rem'
            }}
          >
            Pular
          </button>
          <button
            onClick={onSubmit}
            disabled={isRating || ratingValue === 0}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
              border: 'none', background: ratingValue > 0 ? '#2563eb' : '#64748b',
              color: 'white', cursor: ratingValue > 0 ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem', fontWeight: 600
            }}
          >
            {isRating ? 'Enviando...' : 'Avaliar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
