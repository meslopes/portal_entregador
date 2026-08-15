import React from 'react';
import { Navigate } from 'react-router-dom';

const OwnDriverProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('own_driver_token');
  
  if (!token) {
    return <Navigate to="/own-driver/login" replace />;
  }

  return children;
};

export default OwnDriverProtectedRoute;
