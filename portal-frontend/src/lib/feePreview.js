/**
 * Prévia do frete — espelho client-side da fórmula do backend
 * (calcular_frete_tabela em services/order_helpers.py): faixas (TIERS),
 * tarifa fixa, por km com distância mínima e piso/teto.
 *
 * Compartilhada por Meus Preços e Tabelas de Preço (admin) para as duas
 * telas mostrarem exatamente a mesma coisa (sem drift entre elas).
 * Volta/deslocamento NÃO entram aqui: dependem da distância do motorista,
 * que só existe no momento do cálculo real (as telas mostram a nota).
 */
export function calcularFretePreview(form, km) {
  const aplicarLimites = (v) => {
    let fee = v;
    const minFee = parseFloat(form.min_delivery_fee);
    if (!isNaN(minFee)) fee = Math.max(fee, minFee);
    const maxFee = parseFloat(form.max_delivery_fee);
    if (!isNaN(maxFee)) fee = Math.min(fee, maxFee);
    return fee;
  };
  // Modo faixas: preço da faixa que contém a distância
  if (form.pricing_mode === 'TIERS' && form.tier_bands && form.tier_bands.length) {
    const faixas = form.tier_bands
      .map(b => ({ to_km: b.to_km === '' ? null : parseFloat(b.to_km), price: parseFloat(b.price) || 0 }))
      .sort((a, b) => (a.to_km === null) - (b.to_km === null) || (a.to_km || 0) - (b.to_km || 0));
    let ultimo = 0;
    for (const f of faixas) {
      ultimo = f.price;
      if (f.to_km === null || km <= f.to_km) return aplicarLimites(f.price);
    }
    return aplicarLimites(ultimo);
  }
  const fixed = parseFloat(form.fixed_fee) || 0;
  if (fixed > 0) return fixed;
  const price = parseFloat(form.price_per_km) || 0;
  const minKm = parseFloat(form.min_distance_km) || 4;
  return aplicarLimites(Math.max(km, minKm) * price);
}
