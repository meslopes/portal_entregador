import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Shield, Car } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api, { API_BASE_URL } from '@/lib/api';
import RegisterBranding from './register/RegisterBranding';
import RegisterProgress from './register/RegisterProgress';
import RegisterStep1 from './register/RegisterStep1';
import RegisterStep2 from './register/RegisterStep2';
import RegisterStep3 from './register/RegisterStep3';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', cpf: '',
    password: '', confirmPassword: '',
    vehicle_type: '', vehicle_plate: '', vehicle_model: '', vehicle_year: '',
    driver_license: '', pix_key: '', square_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle'); // idle, checking, available, taken
  const [squares, setSquares] = useState([]);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, detecting, found, error
  const [nearestSquare, setNearestSquare] = useState(null);
  const [searchParams] = useSearchParams();
  const geocodeCache = useRef({});

  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Função Haversine para calcular distância entre coordenadas (em km)
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Verificar se email já está cadastrado
  const checkEmail = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setEmailStatus(data.available ? 'available' : 'taken');
    } catch {
      setEmailStatus('idle'); // Falhou, não bloqueia o cadastro
    }
  };

  // Geocodificar cidade usando Nominatim
  const geocodeCity = async (city, state) => {
    const cacheKey = `${city.toLowerCase()}-${state.toLowerCase()}`;
    if (geocodeCache.current[cacheKey]) return geocodeCache.current[cacheKey];
    try {
      const query = `${city}, ${state}, Brasil`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
        { headers: { 'User-Agent': 'muvlog-portal/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.current[cacheKey] = coords;
        return coords;
      }
    } catch (err) {}
    return null;
  };

  // Carregar praças e detectar localização
  useEffect(() => {
    // Verificar se veio de um link de convite (?square=X)
    const inviteSquareId = searchParams.get('square');

    fetch(`${API_BASE_URL}/api/auth/squares/public`)
      .then(res => res.json())
      .then(data => {
        const loadedSquares = data.squares || [];
        setSquares(loadedSquares);

        // Se link de convite, selecionar direto
        if (inviteSquareId) {
          const found = loadedSquares.find(s => s.id === parseInt(inviteSquareId));
          if (found) {
            setFormData(prev => ({ ...prev, square_id: String(found.id) }));
            setNearestSquare(found);
            setLocationStatus('found');
            return;
          }
        }

        // Caso contrário, tentar GPS
        detectNearestSquare(loadedSquares);
      })
      .catch(() => {});
  }, []);

  // Detectar praça mais próxima via GPS
  const detectNearestSquare = async (loadedSquares) => {
    if (!loadedSquares || loadedSquares.length === 0) return;

    // Se só tem1praça, selecionar automaticamente
    if (loadedSquares.length === 1) {
      setFormData(prev => ({ ...prev, square_id: String(loadedSquares[0].id) }));
      setNearestSquare(loadedSquares[0]);
      setLocationStatus('found');
      return;
    }

    // Tentar obter localização GPS
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    setLocationStatus('detecting');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let bestSquare = null;
        let bestDistance = Infinity;

        // Geocodificar cada praça e calcular distância
        for (const sq of loadedSquares) {
          const coords = await geocodeCity(sq.city, sq.state);
          if (coords) {
            const dist = haversineDistance(latitude, longitude, coords.lat, coords.lng);
            if (dist < bestDistance) {
              bestDistance = dist;
              bestSquare = sq;
            }
          }
        }

        // Se encontrou praça a menos de 100km, selecionar
        if (bestSquare && bestDistance < 100) {
          setFormData(prev => ({ ...prev, square_id: String(bestSquare.id) }));
          setNearestSquare(bestSquare);
          setLocationStatus('found');
        } else {
          setLocationStatus('error');
        }
      },
      () => {
        // GPS negado ou erro
        setLocationStatus('error');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    clearError();
    setLocalError('');
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone) {
        setLocalError('Preencha todos os campos obrigatórios');
        return false;
      }
    }
    if (step === 2) {
      if (formData.password !== formData.confirmPassword) {
        setLocalError('As senhas não coincidem');
        return false;
      }
      if (formData.password.length < 6) {
        setLocalError('A senha deve ter pelo menos 6 caracteres');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(s => s + 1);
      setLocalError('');
    }
  };

  const prevStep = () => {
    setStep(s => s - 1);
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailStatus === 'taken') {
      setLocalError('Este email já está cadastrado. Use outro email.');
      return;
    }
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = formData;
      // Chamar API via axios (com interceptor e base URL configurada)
      const response = await api.post('/api/auth/register', registerData);
      const data = response.data;
      if (response.status >= 400) {
        setLocalError(data.error || 'Erro ao criar conta');
        return;
      }
      // Limpar token antigo e salvar token do novo cadastro
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      // Nao fazer login - redirecionar para tela de aguardo
      navigate('/pending-approval');
    } catch (err) {
      setLocalError(err.response?.data?.error || 'Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const currentError = localError || error;

  const stepConfig = [
    { icon: User, label: 'Dados Pessoais', num: 1 },
    { icon: Shield, label: 'Acesso', num: 2 },
    { icon: Car, label: 'Veículo', num: 3 },
  ];

  return (
    <div className="auth-split-layout">
      {/* Lado esquerdo - Branding */}
      <RegisterBranding />

      {/* Lado direito - Formulário */}
      <div className="auth-form-panel">
        <div className="auth-form-container auth-animate-in">
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              Criar Conta
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
              Preencha seus dados para se cadastrar
            </p>
          </div>

          {/* Indicador de progresso */}
          <RegisterProgress step={step} stepConfig={stepConfig} />

          <div className="auth-form-card">
            {currentError && (
              <div className="auth-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm-.5 3h1v5h-1V4zm.5 7.5c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7z"/>
                </svg>
                {currentError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <RegisterStep1
                  formData={formData}
                  handleChange={handleChange}
                  checkEmail={checkEmail}
                  emailStatus={emailStatus}
                  nextStep={nextStep}
                />
              )}

              {step === 2 && (
                <RegisterStep2
                  formData={formData}
                  handleChange={handleChange}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showConfirmPassword={showConfirmPassword}
                  setShowConfirmPassword={setShowConfirmPassword}
                  prevStep={prevStep}
                  nextStep={nextStep}
                />
              )}

              {step === 3 && (
                <RegisterStep3
                  formData={formData}
                  handleChange={handleChange}
                  squares={squares}
                  locationStatus={locationStatus}
                  nearestSquare={nearestSquare}
                  setNearestSquare={setNearestSquare}
                  setLocationStatus={setLocationStatus}
                  isLoading={isLoading}
                  prevStep={prevStep}
                />
              )}
            </form>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Já tem uma conta?{' '}
              <Link to="/login" className="auth-footer-link">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
