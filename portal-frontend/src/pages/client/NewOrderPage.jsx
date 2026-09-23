import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, AlertCircle, Store } from 'lucide-react';
import { orderService, adminService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext.hooks';
import { Card, Label } from './new-order/shared';
import { inputStyle } from './new-order/shared.constants';
import CustomerFields from './new-order/CustomerFields';
import DeliveryAddressFields from './new-order/DeliveryAddressFields';
import PaymentFields from './new-order/PaymentFields';
import OrderSummary from './new-order/OrderSummary';
import PinMapModal from './new-order/PinMapModal';
import SuccessView from './new-order/SuccessView';

const NewOrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [establishments, setEstablishments] = useState([]);
  const [pricingTable, setPricingTable] = useState(null);
  const [hasOwnDrivers, setHasOwnDrivers] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [showPinMap, setShowPinMap] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [pinAdjusted, setPinAdjusted] = useState(false);
  const mapContainerRef = useRef(null);
  const previewMapRef = useRef(null);
  const previewMapInstanceRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const isAdmin = user?.user_type === 'ADMIN';

  const [form, setForm] = useState({
    selected_establishment: '',
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    delivery_number: '',
    delivery_complement: '',
    delivery_neighborhood: '',
    delivery_city: 'Capão da Canoa',
    delivery_state: 'RS',
    delivery_zip_code: '',
    product_value: '',
    product_payment_type: 'ESTABLISHMENT',
    product_payment_method: 'CASH',
    change_for: '',
    special_instructions: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      import('@/lib/api').then(({ default: api }) => {
        api.get('/api/user/profile').then(res => {
          setHasOwnDrivers(res.data.has_own_drivers || false);
        }).catch(() => {});
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      adminService.getEstablishments(1, 100).then(data => {
        setEstablishments(data.establishments || []);
      }).catch(err => console.error(err));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (form.selected_establishment) {
      const est = establishments.find(e => e.id === parseInt(form.selected_establishment));
      if (est && est.pricing_table_id) {
        adminService.getPricingTable(est.pricing_table_id).then(data => {
          setPricingTable(data.pricing_table);
        }).catch(() => setPricingTable(null));
      } else {
        setPricingTable(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.selected_establishment]);

  const calculateFee = async (customLat = null, customLng = null) => {
    if (!form.delivery_address || !form.delivery_number || !form.delivery_neighborhood) {
      setError('Preencha o endereço completo para calcular o frete');
      return;
    }
    try {
      setCalculatingFee(true);
      setError('');
      const fullAddress = form.delivery_address + ', ' + form.delivery_number + ' - ' + form.delivery_neighborhood + ', ' + form.delivery_city + ' - ' + form.delivery_state;
      const { default: api } = await import('@/lib/api');
      const payload = {
        delivery_address: fullAddress,
        delivery_city: form.delivery_city,
        delivery_state: form.delivery_state,
        restaurant_id: isAdmin ? form.selected_establishment : undefined
      };
      if (customLat && customLng) {
        payload.latitude = customLat;
        payload.longitude = customLng;
      }
      const res = await api.post('/api/orders/estimate-fee', payload);
      setEstimatedFee(res.data);
      if (res.data.latitude && res.data.longitude) {
        setPinLocation({ lat: res.data.latitude, lng: res.data.longitude });
        setTimeout(() => initPreviewMap(res.data.latitude, res.data.longitude), 300);
      }
      if (res.data.distance_km === 0 && !customLat) {
        setError('Não foi possível calcular a distância. Use "Ajustar no Mapa" para marcar o local exato.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao calcular frete';
      if (errorMsg.includes('Estabelecimento não encontrado')) {
        setError('Estabelecimento não encontrado. Verifique se o cadastro foi aprovado pelo administrador.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setCalculatingFee(false);
    }
  };

  const initPinMap = (lat, lng) => {
    if (!mapContainerRef.current || !window.L) return;
    const L = window.L;
    if (mapInstanceRef.current) mapInstanceRef.current.remove();
    const map = L.map(mapContainerRef.current).setView([lat, lng], 15);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    markerRef.current = marker;
    marker.on('dragend', function(e) {
      const pos = e.target.getLatLng();
      setPinLocation({ lat: pos.lat, lng: pos.lng });
    });
  };

  const initPreviewMap = (lat, lng) => {
    if (!previewMapRef.current || !window.L) return;
    const L = window.L;
    if (previewMapInstanceRef.current) previewMapInstanceRef.current.remove();
    const map = L.map(previewMapRef.current).setView([lat, lng], 16);
    previewMapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    L.marker([lat, lng]).addTo(map);
  };

  const handleConfirmPin = async () => {
    if (!pinLocation) return;
    setShowPinMap(false);
    setPinAdjusted(true);
    await calculateFee(pinLocation.lat, pinLocation.lng);
  };

  const handleResetPin = () => {
    setPinAdjusted(false);
    setPinLocation(null);
    setEstimatedFee(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleOpenPinMap = () => {
    setShowPinMap(true);
    if (pinLocation) setTimeout(() => initPinMap(pinLocation.lat, pinLocation.lng), 200);
  };

  const DISTANCE_KM = 0;
  const PRICE_PER_KM = pricingTable?.price_per_km || 2.95;
  const MIN_DISTANCE_KM = pricingTable?.min_distance_km || 4;
  const DELIVERY_FEE = 0;
  const PRODUCT_VALUE = parseFloat((form.product_value || '').replace(',', '.')) || 0;
  const TOTAL = DELIVERY_FEE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isAdmin && !form.selected_establishment) { setError('Selecione um estabelecimento'); return; }
    if (!form.customer_name.trim()) { setError('Nome do cliente é obrigatório'); return; }
    if (!form.customer_phone.trim()) { setError('Telefone do cliente é obrigatório'); return; }
    if (!form.delivery_address.trim()) { setError('Endereço é obrigatório'); return; }
    if (!form.delivery_number.trim()) { setError('Número é obrigatório'); return; }
    if (!form.delivery_neighborhood.trim()) { setError('Bairro é obrigatório'); return; }
    if (!estimatedFee) { setError('Calcule o frete antes de enviar o pedido'); return; }
    if (form.product_payment_type === 'DELIVERY' && !form.product_value) { setError('Valor dos itens é obrigatório para cobrança na entrega'); return; }
    try {
      setIsLoading(true);
      const fullAddress = form.delivery_address + ', ' + form.delivery_number + (form.delivery_complement ? ' - ' + form.delivery_complement : '');
      const DELIVERY_FEE = estimatedFee.delivery_fee || 0;
      const orderItems = [{ name: 'Entrega', quantity: 1, price: 0 }];
      if (form.product_payment_type === 'DELIVERY' && PRODUCT_VALUE > 0) {
        orderItems.push({ name: 'Produtos', quantity: 1, price: PRODUCT_VALUE });
      }
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const orderData = {
        ...(isAdmin && { restaurant_id: form.selected_establishment }),
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_address: fullAddress,
        delivery_neighborhood: form.delivery_neighborhood,
        delivery_city: form.delivery_city,
        delivery_state: form.delivery_state,
        delivery_zip_code: form.delivery_zip_code,
        items: orderItems,
        subtotal: subtotal,
        delivery_fee: DELIVERY_FEE,
        total_amount: subtotal + DELIVERY_FEE,
        payment_method: form.product_payment_method,
        special_instructions: form.special_instructions || '',
        product_payment_type: form.product_payment_type,
        product_payment_method: form.product_payment_method,
        change_for: form.change_for || null,
        ...(form.product_payment_type === 'DELIVERY' && { product_value: PRODUCT_VALUE }),
      };
      if (pinLocation) {
        orderData.delivery_latitude = pinLocation.lat;
        orderData.delivery_longitude = pinLocation.lng;
      }
      const response = await orderService.createOrder(orderData);
      setSuccess(true);
      if (!isAdmin && hasOwnDrivers && response.order) {
        setCreatedOrder(response.order);
        setShowDistribution(true);
      } else {
        setTimeout(() => navigate(isAdmin ? '/admin/orders' : '/client/orders'), 2000);
      }
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      const msg = err.response?.data?.error || err.message || 'Erro ao criar pedido';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SuccessView
        showDistribution={showDistribution}
        createdOrder={createdOrder}
        onCloseDistribution={() => { setShowDistribution(false); navigate('/client/orders'); }}
        onDistributed={() => { setShowDistribution(false); navigate('/client/orders'); }}
      />
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(isAdmin ? '/admin' : '/client')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Lançar Novo Pedido</h1>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isAdmin && (
          <Card title="Estabelecimento" icon={<Store size={16} />}>
            <Label>Selecionar Estabelecimento *</Label>
            <select name="selected_establishment" value={form.selected_establishment} onChange={handleChange} required style={inputStyle}>
              <option value="">Selecione um estabelecimento</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>{est.name} - {est.address}</option>
              ))}
            </select>
          </Card>
        )}

        <CustomerFields form={form} handleChange={handleChange} />

        <DeliveryAddressFields
          form={form}
          handleChange={handleChange}
          feeCalculatorProps={{
            pricingTable, pricePerKm: PRICE_PER_KM, minDistanceKm: MIN_DISTANCE_KM,
            estimatedFee, pinLocation, previewMapRef, calculatingFee,
            calculateFee, pinAdjusted, handleResetPin, onOpenPinMap: handleOpenPinMap,
          }}
        />

        <PaymentFields form={form} setForm={setForm} handleChange={handleChange} />

        <Card title="Observações" icon={<Package size={16} />}>
          <textarea name="special_instructions" value={form.special_instructions} onChange={handleChange} placeholder="Ex: Urgente, cuidado ao manusear..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Card>

        <OrderSummary form={form} estimatedFee={estimatedFee} productValue={PRODUCT_VALUE} />

        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: 'none', background: '#0d9488', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)' }}>
          {isLoading ? 'Enviando Pedido...' : 'Enviar Pedido'}
        </button>
      </form>

      {showPinMap && (
        <PinMapModal
          pinLocation={pinLocation}
          mapContainerRef={mapContainerRef}
          onClose={() => setShowPinMap(false)}
          onConfirm={handleConfirmPin}
        />
      )}
    </div>
  );
};

export default NewOrderPage;
