import { useContext } from 'react';
import SquareContext from './SquareContext';

export const useSquare = () => {
  const context = useContext(SquareContext);
  if (!context) {
    throw new Error('useSquare must be used within a SquareProvider');
  }
  return context;
};
