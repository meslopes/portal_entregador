/**
 * PDF report generator for the database map.
 * Pure presentation logic — opens a print-ready HTML page in a new window.
 */

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

export function handleGeneratePDF(data) {
  if (!data) return;
  const d = data;
  const now = new Date().toLocaleString('pt-BR');

  // Build tenants map for lookup
  const tenantMap = {};
  (d.tenants || []).forEach(t => { tenantMap[t.id] = t.name; });
  const squareMap = {};
  (d.squares || []).forEach(s => { squareMap[s.id] = s.name; });

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Mapa do Banco de Dados - muv.log</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  h2 { font-size: 14px; color: #0d9488; margin: 18px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  h3 { font-size: 12px; color: #2563eb; margin: 12px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
  th { background: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 4px 6px; border: 1px solid #e2e8f0; }
  td { padding: 4px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) { background: #f8fafc; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 9999px; font-size: 9px; font-weight: 600; margin-right: 3px; }
  .b-admin { background: #f3e8ff; color: #7c3aed; }
  .b-client { background: #f0fdfa; color: #0d9488; }
  .b-driver { background: #dbeafe; color: #2563eb; }
  .b-own { background: #fef3c7; color: #92400e; }
  .b-platform { background: #dbeafe; color: #2563eb; }
  .b-active { background: #dcfce7; color: #166534; }
  .b-inactive { background: #fee2e2; color: #dc2626; }
  .b-online { background: #dcfce7; color: #166534; }
  .b-offline { background: #f1f5f9; color: #64748b; }
  .b-pin { background: #dbeafe; color: #1d4ed8; }
  .b-nopin { background: #fee2e2; color: #dc2626; }
  .section-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 10px; background: white; }
  .flow-box { border: 2px solid #0d9488; border-radius: 8px; padding: 12px; margin: 8px 0; background: #f0fdfa; }
  .flow-arrow { text-align: center; font-size: 16px; color: #64748b; margin: 4px 0; }
  .info { color: #64748b; font-size: 10px; }
  @media print { body { padding: 10px; } .no-print { display: none; } }
</style>
</head><body>
<button class="no-print" onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;z-index:999">🖨️ Imprimir / Salvar PDF</button>
<h1>📊 Mapa do Banco de Dados — muv.log</h1>
<p class="subtitle">Gerado em ${now} | Dados em tempo real</p>

<!-- TENANTS -->
<h2>🏢 Tenants (${(d.tenants||[]).length})</h2>
<table><tr><th>ID</th><th>Nome</th><th>Slug</th><th>Plano</th><th>Status</th></tr>`;

  (d.tenants || []).forEach(t => {
    html += `<tr><td>${t.id}</td><td><strong>${escapeHtml(t.name)}</strong></td><td>${escapeHtml(t.slug)}</td><td>${escapeHtml(t.plan)}</td><td>${t.is_active ? '<span class="badge b-active">Ativo</span>' : '<span class="badge b-inactive">Inativo</span>'}</td></tr>`;
  });
  html += `</table>`;

  // PRAÇAS
  html += `<h2>📍 Praças (${(d.squares||[]).length})</h2>
  <table><tr><th>ID</th><th>Nome</th><th>Cidade/UF</th><th>Tenant</th><th>Status</th></tr>`;
  (d.squares || []).forEach(s => {
    html += `<tr><td>${s.id}</td><td><strong>${escapeHtml(s.name)}</strong></td><td>${escapeHtml(s.city)}/${escapeHtml(s.state)}</td><td>${s.tenant_id ? escapeHtml(tenantMap[s.tenant_id] || s.tenant_id) : '-'}</td><td>${s.is_active ? '<span class="badge b-active">Ativo</span>' : '<span class="badge b-inactive">Inativo</span>'}</td></tr>`;
  });
  html += `</table>`;

  // USUÁRIOS
  html += `<h2>👥 Usuários (${(d.users||[]).length})</h2>
  <table><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Email</th><th>Telefone</th><th>Tenant</th><th>Praça</th><th>Status</th><th>Vínculo</th></tr>`;
  (d.users || []).forEach(u => {
    const typeClass = u.user_type === 'ADMIN' ? 'b-admin' : u.user_type === 'CLIENT' ? 'b-client' : 'b-driver';
    const isSuper = u.user_type === 'ADMIN' && u.is_super_admin;
    html += `<tr>
      <td>${u.id}</td>
      <td><strong>${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</strong></td>
      <td><span class="badge ${typeClass}">${escapeHtml(u.user_type)}</span>${isSuper ? ' <span class="badge b-own">SUPER</span>' : ''}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.phone) || '-'}</td>
      <td>${u.tenant_id ? escapeHtml(tenantMap[u.tenant_id] || u.tenant_id) : '-'}</td>
      <td>${escapeHtml(u.square_name) || '-'}</td>
      <td>${u.status === 'ACTIVE' ? '<span class="badge b-active">Ativo</span>' : '<span class="badge b-inactive">' + escapeHtml(u.status) + '</span>'}</td>
      <td>${escapeHtml(u.linked_name || u.restaurant_name) || '-'}</td>
    </tr>`;
  });
  html += `</table>`;

  // RESTAURANTES
  html += `<h2>🏪 Restaurantes (${(d.restaurants||[]).length})</h2>
  <table><tr><th>ID</th><th>Nome</th><th>Endereço</th><th>Tenant</th><th>Praça</th><th>Próprios</th><th>Status</th></tr>`;
  (d.restaurants || []).forEach(r => {
    html += `<tr><td>${r.id}</td><td><strong>${escapeHtml(r.name)}</strong></td><td style="font-size:9px">${escapeHtml(r.address) || '-'}</td><td>${r.tenant_id ? escapeHtml(tenantMap[r.tenant_id] || r.tenant_id) : '-'}</td><td>${r.square_id ? escapeHtml(squareMap[r.square_id] || r.square_id) : '-'}</td><td>${r.has_own_drivers ? '<span class="badge b-own">Sim</span>' : 'Não'}</td><td>${r.is_active ? '<span class="badge b-active">Ativo</span>' : '<span class="badge b-inactive">Inativo</span>'}</td></tr>`;
  });
  html += `</table>`;

  // ENTREGADORES PLATAFORMA
  html += `<h2>🚚 Entregadores da Plataforma (${(d.platform_drivers||[]).length})</h2>
  <table><tr><th>ID</th><th>Nome</th><th>Email</th><th>Veículo</th><th>Placa</th><th>Tenant</th><th>Praça</th><th>Online</th><th>Entregas</th><th>Nota</th></tr>`;
  (d.platform_drivers || []).forEach(p => {
    html += `<tr><td>${p.id}</td><td><strong>${escapeHtml(p.name)}</strong></td><td>${escapeHtml(p.email) || '-'}</td><td>${escapeHtml(p.vehicle_type) || '-'}</td><td>${escapeHtml(p.vehicle_plate) || '-'}</td><td>${p.tenant_id ? escapeHtml(tenantMap[p.tenant_id] || p.tenant_id) : '-'}</td><td>${p.square_id ? escapeHtml(squareMap[p.square_id] || p.square_id) : '-'}</td><td>${p.is_online ? '<span class="badge b-online">Online</span>' : '<span class="badge b-offline">Offline</span>'}</td><td>${p.total_deliveries || 0}</td><td>${p.rating || '-'}</td></tr>`;
  });
  html += `</table>`;

  // ENTREGADORES PRÓPRIOS
  html += `<h2>🏍️ Entregadores Próprios (${(d.own_drivers||[]).length})</h2>
  <table><tr><th>ID</th><th>Nome</th><th>Telefone</th><th>Veículo</th><th>Placa</th><th>Restaurante</th><th>Tenant</th><th>Praça</th><th>Online</th><th>PIN</th><th>Entregas</th></tr>`;
  (d.own_drivers || []).forEach(o => {
    html += `<tr><td>${o.id}</td><td><strong>${escapeHtml(o.name)}</strong></td><td>${escapeHtml(o.phone) || '-'}</td><td>${escapeHtml(o.vehicle_type) || '-'}</td><td>${escapeHtml(o.vehicle_plate) || '-'}</td><td>${escapeHtml(o.restaurant_name)} (ID:${o.restaurant_id})</td><td>${o.tenant_id ? escapeHtml(tenantMap[o.tenant_id] || o.tenant_id) : '-'}</td><td>${escapeHtml(o.square_name) || '-'}</td><td>${o.is_online ? '<span class="badge b-online">Online</span>' : '<span class="badge b-offline">Offline</span>'}</td><td>${o.has_pin ? '<span class="badge b-pin">Sim</span>' : '<span class="badge b-nopin">Não</span>'}</td><td>${o.total_deliveries || 0}</td></tr>`;
  });
  html += `</table>`;

  // FLUXOGRAMA
  html += `<h2>📐 Fluxograma de Relacionamentos</h2>`;
  html += `<div class="flow-box">`;
  html += `<h3 style="margin:0 0 8px;color:#0d9488">muv.log (Plataforma SaaS)</h3>`;

  (d.tenants || []).forEach(t => {
    html += `<div style="margin-left:20px;border-left:3px solid #7c3aed;padding-left:12px;margin-bottom:8px;">`;
    html += `<strong>🏢 ${t.name}</strong> <span class="badge b-admin">${t.plan}</span><br>`;

    const tenantSquares = (d.squares || []).filter(s => s.tenant_id === t.id);
    tenantSquares.forEach(s => {
      html += `<div style="margin-left:16px;border-left:3px solid #0d9488;padding-left:10px;margin-top:4px;margin-bottom:4px;">`;
      html += `<strong>📍 ${s.name}</strong> (${s.city}/${s.state})<br>`;

      const sqRestaurants = (d.restaurants || []).filter(r => r.square_id === s.id);
      sqRestaurants.forEach(r => {
        html += `<div style="margin-left:16px;border-left:3px solid #f59e0b;padding-left:10px;margin-top:3px;margin-bottom:3px;">`;
        html += `<strong>🏪 ${r.name}</strong>${r.has_own_drivers ? ' <span class="badge b-own">Tem Próprios</span>' : ''}<br>`;

        const sqDrivers = (d.platform_drivers || []).filter(dr => dr.square_id === s.id);
        if (sqDrivers.length > 0) {
          html += `<span class="info">🚚 Entregadores Plataforma:</span><br>`;
          sqDrivers.forEach(dr => {
            html += `<span style="margin-left:10px;">• ${dr.name} (${dr.vehicle_type}) ${dr.is_online ? '🟢' : '⚪'} ${dr.total_deliveries || 0} entregas</span><br>`;
          });
        }

        const rOwnDrivers = (d.own_drivers || []).filter(od => od.restaurant_id === r.id);
        if (rOwnDrivers.length > 0) {
          html += `<span class="info">🏍️ Entregadores Próprios:</span><br>`;
          rOwnDrivers.forEach(od => {
            html += `<span style="margin-left:10px;">• ${od.name} (${od.vehicle_type}) ${od.is_online ? '🟢' : '⚪'} PIN:${od.has_pin ? '✅' : '❌'} ${od.total_deliveries || 0} entregas</span><br>`;
          });
        }

        html += `</div>`;
      });

      const sqUsers = (d.users || []).filter(u => u.square_id === s.id && u.user_type === 'DRIVER');
      if (sqUsers.length > 0 && sqRestaurants.length === 0) {
        html += `<span class="info">🚚 Entregadores vinculados:</span><br>`;
        sqUsers.forEach(u => {
          html += `<span style="margin-left:10px;">• ${u.first_name} ${u.last_name} (${u.email}) ${u.status === 'ACTIVE' ? '🟢' : '⚪'}</span><br>`;
        });
      }

      html += `</div>`;
    });

    const tenantUsersNoSquare = (d.users || []).filter(u => u.tenant_id === t.id && !u.square_id);
    if (tenantUsersNoSquare.length > 0) {
      html += `<div style="margin-left:16px;margin-top:4px;"><span class="info">👤 Usuários sem praça:</span><br>`;
      tenantUsersNoSquare.forEach(u => {
        html += `<span style="margin-left:10px;">• ${u.first_name} ${u.last_name} <span class="badge ${u.user_type === 'ADMIN' ? 'b-admin' : u.user_type === 'CLIENT' ? 'b-client' : 'b-driver'}">${u.user_type}</span></span><br>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  const noTenantUsers = (d.users || []).filter(u => !u.tenant_id);
  if (noTenantUsers.length > 0) {
    html += `<div style="margin-left:20px;border-left:3px solid #f59e0b;padding-left:12px;margin-top:8px;">`;
    html += `<strong>⚠️ Sem Tenant</strong><br>`;
    noTenantUsers.forEach(u => {
      const isSuper = u.user_type === 'ADMIN';
      html += `<span style="margin-left:10px;">• ${u.first_name} ${u.last_name} <span class="badge ${u.user_type === 'ADMIN' ? 'b-admin' : 'b-driver'}">${u.user_type}</span>${isSuper ? ' <span class="badge b-own">SUPER ADMIN</span>' : ''} ${u.square_name ? '(Praça: ' + u.square_name + ')' : ''}</span><br>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  html += `<p class="info" style="margin-top:20px;text-align:center;">Fim do relatório — muv.log Database Map</p>`;
  html += `</body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    return false; // signal popup blocked
  }
  win.document.write(html);
  win.document.close();
  return true;
}
