import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const SquareContext = createContext();

export const useSquare = () => {
  const context = useContext(SquareContext);
  if (!context) {
    throw new Error('useSquare must be used within a SquareProvider');
  }
  return context;
};

export const SquareProvider = ({ children }) => {
  const [selectedSquare, setSelectedSquare] = useState(() => {
    const saved = localStorage.getItem('selectedSquare');
    return saved ? JSON.parse(saved) : null;
  });

  const [squares, setSquares] = useState([]);

  // Validar praça do localStorage contra o backend ao carregar (apenas para admins)
  useEffect(() => {
    const validateSquare = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // Apenas admins precisam validar praças
        if (!user || user.user_type !== 'ADMIN') return;

        const res = await api.get('/api/admin/squares');
        const validSquares = res.data.squares || res.data || [];
        setSquares(validSquares);
        // Se a praça salva não existe mais na lista, limpar
        if (selectedSquare && validSquares.length > 0) {
          const stillValid = validSquares.some(s => s.id === selectedSquare.id);
          if (!stillValid) {
            setSelectedSquare(validSquares[0] || null);
          }
        }
      } catch (err) {
        // Se falhar, mantém o estado atual
      }
    };
    validateSquare();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Salvar no localStorage quando mudar
  useEffect(() => {
    if (selectedSquare) {
      localStorage.setItem('selectedSquare', JSON.stringify(selectedSquare));
    } else {
      localStorage.removeItem('selectedSquare');
    }
  }, [selectedSquare]);

  const value = {
    selectedSquare,
    setSelectedSquare,
    squares,
    setSquares,
    squareId: selectedSquare?.id || null
  };

  return (
    <SquareContext.Provider value={value}>
      {children}
    </SquareContext.Provider>
  );
};

export default SquareContext;
