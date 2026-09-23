import React from 'react';
import { STATUS_FLOW, STATUS_ACTIONS } from './active-delivery/constants';
import { useDelivery } from './active-delivery/useDelivery';
import { LoadingSpinner, ErrorAlert, ActionButton, WaitingMessage } from './active-delivery/UIBlocks';
import DeliverySteps from './active-delivery/DeliverySteps';
import OrderDetails from './active-delivery/OrderDetails';
import ProofCapture from './active-delivery/ProofCapture';
import CodeModal from './active-delivery/CodeModal';
import RatingModal from './active-delivery/RatingModal';
import MapModal from './active-delivery/MapModal';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para icones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ActiveDeliveryPage = () => {
  const {
    order, isLoading, isUpdating, error,
    proofPhoto, showCamera, previewUrl, showMap, mapTarget,
    showRating, ratingValue, setRatingValue,
    ratingFeedback, setRatingFeedback, isRating,
    showCodeModal, codeInput, setCodeInput, pendingStatus,
    fileInputRef, videoRef, canvasRef, mapRef,
    handleAdvanceStatus, handleFileSelect, takePhoto, confirmPhoto,
    skipPhoto, submitRating, skipRating,
    handleCodeModalClose, handleCodeModalConfirm,
    handleMapNavigate, handleMapCall, handleOpenMap,
    setShowCamera, setPreviewUrl, setShowMap, setMapTarget, setProofPhoto,
    navigate
  } = useDelivery();

  if (isLoading) return <LoadingSpinner />;
  if (!order) return null;

  const currentStepIndex = STATUS_FLOW.findIndex(s => s.key === order.status);
  const action = STATUS_ACTIONS[order.status];
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
            padding: '0.25rem', display: 'flex'
          }}>
            ← Voltar
          </button>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Pedido #{order.order_number}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Acompanhe o andamento da entrega
        </p>
      </div>

      <ErrorAlert error={error} />

      <DeliverySteps currentStepIndex={currentStepIndex} isDelivered={isDelivered} order={order} />

      <RatingModal
        showRating={showRating}
        ratingValue={ratingValue}
        setRatingValue={setRatingValue}
        ratingFeedback={ratingFeedback}
        setRatingFeedback={setRatingFeedback}
        isRating={isRating}
        restaurantName={order?.restaurant?.name}
        onSubmit={submitRating}
        onSkip={skipRating}
      />

      {!isDelivered && <ActionButton action={action} isUpdating={isUpdating} onClick={handleAdvanceStatus} />}

      <ProofCapture
        showCamera={showCamera}
        previewUrl={previewUrl}
        proofPhoto={proofPhoto}
        isDelivered={isDelivered}
        videoRef={videoRef}
        canvasRef={canvasRef}
        fileInputRef={fileInputRef}
        onCloseCamera={() => { setShowCamera(false); setPreviewUrl(null); }}
        onTakePhoto={takePhoto}
        onFileSelect={handleFileSelect}
        onConfirmPhoto={confirmPhoto}
        onRemoveProof={() => { setProofPhoto(null); setPreviewUrl(null); }}
        onSkipPhoto={skipPhoto}
        onRetakePhoto={() => setPreviewUrl(null)}
      />

      <CodeModal
        showCodeModal={showCodeModal}
        codeInput={codeInput}
        setCodeInput={setCodeInput}
        pendingStatus={pendingStatus}
        isUpdating={isUpdating}
        order={order}
        proofPhoto={proofPhoto}
        onClose={handleCodeModalClose}
        onConfirm={handleCodeModalConfirm}
      />

      <WaitingMessage status={order.status} />

      <MapModal
        showMap={showMap}
        mapTarget={mapTarget}
        order={order}
        mapRef={mapRef}
        onClose={() => { setShowMap(false); setMapTarget(null); }}
        onNavigate={handleMapNavigate}
        onCall={handleMapCall}
      />

      <OrderDetails order={order} onOpenMap={handleOpenMap} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ActiveDeliveryPage;
