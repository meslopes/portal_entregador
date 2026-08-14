import React, { createContext, useContext, useState, useEffect } from 'react';

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
    // Carregar do localStorage
    const saved = localStorage.getItem('selectedSquare');
    return saved ? JSON.parse(saved) : null;
  });

  const [squares, setSquares] = useState([]);

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
