import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderService } from '@/lib/api';
import { offlineDB, isOnline } from '@/lib/offline';
import { showToast } from '@/components/Toast.utils';
import { STATUS_ACTIONS } from './constants';

export function useDelivery() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [proofPhoto, setProofPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapTarget, setMapTarget] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [pendingCode, setPendingCode] = useState(null);
  const [isRating, setIsRating] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const isMounted = useRef(true);

  // Navegação externa (Google Maps ou Waze)
  const openNavigation = (lat, lng) => {
    if (!lat || !lng) {
      const address = mapTarget === 'restaurant' ? order?.restaurant?.address : order?.delivery_address?.street;
      if (address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
      }
      return;
    }
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const useWaze = window.confirm('Abrir no Waze?\n\nCancelar = Google Maps');
      if (useWaze) {
        window.open(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      }
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const loadCurrentOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      let response;
      if (orderId) {
        response = await orderService.getOrderDetails(orderId);
        if (response && response.id) {
          setOrder(response);
        } else if (response?.order) {
          setOrder(response.order);
        } else {
          navigate('/orders');
        }
      } else {
        response = await orderService.getCurrentOrder();
        if (!isMounted.current) return;
        if (response.order) {
          setOrder(response.order);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Erro ao carregar pedido:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao carregar pedido');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    isMounted.current = true;
    loadCurrentOrder();
    return () => { isMounted.current = false; };
  }, [loadCurrentOrder]);

  const confirmStatusUpdate = async (status, code) => {
    try {
      setIsUpdating(true);
      setError('');
      const payload = { status };
      if (code) {
        if (status === 'PICKED_UP') payload.pickup_code = code;
        if (status === 'DELIVERED') payload.delivery_code = code;
      }
      if (status === 'DELIVERED' && proofPhoto) {
        payload.proof_of_delivery = proofPhoto;
      }
      if (!isOnline()) {
        const actionType = status === 'PICKED_UP' ? 'CONFIRM_COLLECT' : 'CONFIRM_DELIVERY';
        await offlineDB.addToQueue({ type: actionType, orderId: order.id, ...payload });
        setOrder(prev => prev ? { ...prev, status } : prev);
        setShowCodeModal(false);
        setCodeInput('');
        showToast('Ação salva offline. Será sincronizada quando a internet voltar.', 'info');
      } else {
        await orderService.updateOrderStatus(order.id, status, payload);
        setOrder(prev => prev ? { ...prev, status } : prev);
        setShowCodeModal(false);
        setCodeInput('');
      }
      if (status === 'DELIVERED') setShowRating(true);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Erro ao atualizar status:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao atualizar status');
    } finally {
      if (isMounted.current) setIsUpdating(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!order || isUpdating) return;
    const action = STATUS_ACTIONS[order.status];
    if (!action) return;
    const restaurant = order.restaurant || {};
    const pickupConfirmation = restaurant.pickup_confirmation_type || 'code';
    const deliveryConfirmation = restaurant.delivery_confirmation_type || 'code';
    const confirmationType = action.next === 'PICKED_UP' ? pickupConfirmation : deliveryConfirmation;
    switch (confirmationType) {
      case 'code':
        if (action.next === 'PICKED_UP' && order.pickup_code) {
          setPendingStatus(action.next); setShowCodeModal(true); setCodeInput(''); return;
        }
        if (action.next === 'DELIVERED' && order.delivery_code) {
          setPendingStatus(action.next); setShowCodeModal(true); setCodeInput(''); return;
        }
        break;
      case 'photo':
        if (action.next === 'DELIVERED' && !proofPhoto) { setShowCamera(true); return; }
        break;
      case 'code_and_photo':
        if (action.next === 'PICKED_UP' && order.pickup_code) {
          setPendingStatus(action.next); setShowCodeModal(true); setCodeInput(''); return;
        }
        if (action.next === 'DELIVERED' && order.delivery_code) {
          setPendingStatus(action.next); setShowCodeModal(true); setCodeInput(''); return;
        }
        if (action.next === 'DELIVERED' && !proofPhoto) { setShowCamera(true); return; }
        break;
      case 'none':
      default:
        break;
    }
    await confirmStatusUpdate(action.next);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Erro ao acessar camera:', err);
      setError('Não foi possível acessar a câmera');
    }
  };

  useEffect(() => {
    if (showCamera && !previewUrl) startCamera();
    const videoEl = videoRef.current;
    return () => {
      if (videoEl?.srcObject) videoEl.srcObject.getTracks().forEach(t => t.stop());
    };
  }, [showCamera, previewUrl]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
    video.srcObject?.getTracks().forEach(t => t.stop());
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const confirmPhoto = () => {
    setProofPhoto(previewUrl);
    setShowCamera(false);
    setPreviewUrl(null);
    if (pendingCode) {
      const action = STATUS_ACTIONS[order.status];
      if (action) { confirmStatusUpdate(action.next, pendingCode); setPendingCode(null); }
    }
  };

  const handleAdvanceStatusSkip = async () => {
    if (!order || isUpdating) return;
    const action = STATUS_ACTIONS[order.status];
    if (!action) return;
    try {
      setIsUpdating(true); setError('');
      await orderService.updateOrderStatus(order.id, action.next, { status: action.next });
      setOrder(prev => prev ? { ...prev, status: action.next } : prev);
      if (action.next === 'DELIVERED') setShowRating(true);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      if (isMounted.current) setIsUpdating(false);
    }
  };

  const skipPhoto = () => { setShowCamera(false); setPreviewUrl(null); handleAdvanceStatusSkip(); };

  const submitRating = async () => {
    if (ratingValue === 0) { setError('Selecione uma avaliação'); return; }
    try {
      setIsRating(true);
      const apiModule = (await import('@/lib/api')).default;
      await apiModule.post(`/api/orders/${order.id}/rate-restaurant`, { rating: ratingValue, feedback: ratingFeedback });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar avaliação');
    } finally {
      setIsRating(false);
    }
  };

  const skipRating = () => navigate('/dashboard');

  const handleCodeModalClose = () => { setShowCodeModal(false); setCodeInput(''); setPendingStatus(null); };

  const handleCodeModalConfirm = (code) => {
    const restaurant = order?.restaurant || {};
    const confirmationType = pendingStatus === 'PICKED_UP'
      ? (restaurant.pickup_confirmation_type || 'code')
      : (restaurant.delivery_confirmation_type || 'code');
    if (confirmationType === 'code_and_photo' && pendingStatus === 'DELIVERED' && !proofPhoto) {
      setPendingCode(code); setShowCodeModal(false); setShowCamera(true);
    } else {
      confirmStatusUpdate(pendingStatus, code);
    }
  };

  const handleMapNavigate = () => {
    const lat = mapTarget === 'restaurant' ? order.restaurant?.latitude : order.delivery_address?.latitude;
    const lng = mapTarget === 'restaurant' ? order.restaurant?.longitude : order.delivery_address?.longitude;
    openNavigation(lat, lng);
  };

  const handleMapCall = () => {
    const phone = mapTarget === 'restaurant' ? order.restaurant?.phone : order.customer?.phone;
    if (phone) window.open(`tel:${phone}`);
  };

  const handleOpenMap = (target) => { setMapTarget(target); setShowMap(true); };

  return {
    order, isLoading, isUpdating, error, setError,
    proofPhoto, setProofPhoto, showCamera, setShowCamera,
    previewUrl, setPreviewUrl, showMap, setShowMap,
    mapTarget, setMapTarget, showRating, ratingValue, setRatingValue,
    ratingFeedback, setRatingFeedback, isRating,
    showCodeModal, codeInput, setCodeInput, pendingStatus,
    fileInputRef, videoRef, canvasRef, mapRef,
    handleAdvanceStatus, handleFileSelect, takePhoto, confirmPhoto,
    skipPhoto, submitRating, skipRating,
    handleCodeModalClose, handleCodeModalConfirm,
    handleMapNavigate, handleMapCall, handleOpenMap,
    navigate
  };
}
