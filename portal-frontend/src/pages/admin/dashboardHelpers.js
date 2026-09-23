export const getTimeRemaining = (scheduledAt) => {
  if (!scheduledAt) return null;
  const now = new Date();
  const scheduledStr = scheduledAt.endsWith('Z') ? scheduledAt : scheduledAt + 'Z';
  const scheduled = new Date(scheduledStr);
  const diffMs = scheduled - now;
  if (diffMs <= 0) return 'Agora';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Menos de 1 min';
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${diffHours}h ${remainingMins}min`;
};

export const geocodeCity = async (city, state) => {
  try {
    const query = `${city}, ${state}, Brasil`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
      { headers: { 'User-Agent': 'muvlog-portal/1.0' } }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (err) {
    console.warn('Erro ao geocodificar cidade:', err);
    return null;
  }
};
