import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { useSquare } from '@/contexts/SquareContext';
import api from '@/lib/api';

const SquareSelector = () => {
  const { selectedSquare, setSelectedSquare, squares, setSquares } = useSquare();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSquares();
  }, []);

  const loadSquares = async () => {
    try {
      const response = await api.get('/api/admin/squares');
      const squaresData = response.data.squares || [];
      setSquares(squaresData);

      // Se não tem praça selecionada e tem praças disponíveis, selecionar a primeira
      if (!selectedSquare && squaresData.length > 0) {
        setSelectedSquare(squaresData[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar praças:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || squares.length === 0) {
    return null;
  }

  // Se só tem uma praça, não mostrar seletor
  if (squares.length === 1) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '0.5rem',
        background: '#f0fdf4',
        fontSize: '0.8125rem',
        color: '#16a34a'
      }}>
        <MapPin size={14} />
        {squares[0].name}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          background: 'white',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          color: '#374151',
          transition: 'all 0.15s',
          minWidth: '150px'
        }}
      >
        <MapPin size={14} style={{ color: '#2563eb' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          {selectedSquare?.name || 'Selecionar praça'}
        </span>
        <ChevronDown size={14} style={{ 
          color: '#94a3b8',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s'
        }} />
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99998
            }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.25rem',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 99999,
            minWidth: '200px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '0.5rem',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <p style={{
                fontSize: '0.6875rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0.25rem 0.5rem'
              }}>
                Selecionar Praça
              </p>
            </div>
            {squares.map(square => (
              <button
                key={square.id}
                onClick={() => {
                  setSelectedSquare(square);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  border: 'none',
                  background: selectedSquare?.id === square.id ? '#eff6ff' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  color: selectedSquare?.id === square.id ? '#2563eb' : '#374151',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (selectedSquare?.id !== square.id) {
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSquare?.id !== square.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <MapPin size={14} style={{ 
                  color: selectedSquare?.id === square.id ? '#2563eb' : '#94a3b8' 
                }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontWeight: selectedSquare?.id === square.id ? 600 : 400 }}>
                    {square.name}
                  </p>
                  {square.city && (
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                      {square.city}/{square.state}
                    </p>
                  )}
                </div>
                {selectedSquare?.id === square.id && (
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#2563eb'
                  }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SquareSelector;
