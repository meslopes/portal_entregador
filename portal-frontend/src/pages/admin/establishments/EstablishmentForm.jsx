import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { adminService } from '@/lib/api';
import api from '@/lib/api';
import { showToast } from '@/components/Toast';
import { Modal, FormField, inputStyle, btnPrimary, btnSecondary } from './ui';

const EMPTY_FORM = {
  name: '', cnpj: '', phone: '', email: '', password: '123456',
  address_street: '', address_number: '', address_neighborhood: '',
  address_city: 'Capão da Canoa', address_state: 'RS', address_zip: '',
  latitude: '', longitude: '', tenant_id: '', square_id: '', pricing_table_id: '',
  preparation_minutes: '10',
  pickup_confirmation_type: 'code', delivery_confirmation_type: 'code'
};

function parseAddressToFields(addr) {
  let cleanAddr = (addr || '').replace(/,\s*\d{5}-?\d{3}\s*$/, '').trim();
  cleanAddr = cleanAddr.replace(/,\s*,/g, ',').trim().replace(/,+$/, '');

  let street = '', number = '', neighborhood = '';
  let city = 'Capão da Canoa', state = 'RS', zip = '';

  const numberMatch = cleanAddr.match(/,\s*(\d+)/);
  if (numberMatch) {
    number = numberMatch[1];
    cleanAddr = cleanAddr.replace(/,\s*\d+/, ',');
  }

  const parts = cleanAddr.split(',').map(s => s.trim()).filter(p => p);

  if (parts.length >= 1) street = parts[0].replace(/\s*-\s*\d+\s*$/, '').trim();

  if (parts.length >= 2) {
    const hoodPart = parts[1];
    if (hoodPart.includes(' - ')) {
      const hoodParts = hoodPart.split(' - ');
      neighborhood = hoodParts[0].trim();
      if (hoodParts[1]) {
        const csParts = hoodParts[1].split('/');
        city = (csParts[0] || city).trim();
        state = (csParts[1] || state).trim();
      }
    } else if (hoodPart.includes('/')) {
      const csParts = hoodPart.split('/');
      city = (csParts[0] || city).trim();
      state = (csParts[1] || state).trim();
    } else {
      neighborhood = hoodPart.trim();
    }
  }

  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes('/')) {
      const csParts = lastPart.split('/');
      city = (csParts[0] || city).trim();
      state = (csParts[1] || state).trim();
    } else if (lastPart.length <= 2) {
      state = lastPart.trim();
    } else {
      city = lastPart.trim();
    }
  }

  return { address_street: street, address_number: number, address_neighborhood: neighborhood, address_city: city, address_state: state, address_zip: zip };
}

const EstablishmentForm = ({ editing, isSuperAdmin, squares, tenants, onClose, onSave }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [pricingTables, setPricingTables] = useState([]);

  const loadPricingTables = async (sqId) => {
    try {
      const data = await adminService.getPricingTables(sqId);
      setPricingTables(data.pricing_tables || []);
    } catch { setPricingTables([]); }
  };

  useEffect(() => {
    if (editing) {
      const addrFields = parseAddressToFields(editing.address);
      setFormData({
        name: editing.name || '',
        cnpj: editing.cnpj || '',
        phone: editing.phone || '',
        email: editing.email || '',
        password: '',
        ...addrFields,
        latitude: editing.latitude || '',
        longitude: editing.longitude || '',
        tenant_id: editing.tenant_id || '',
        square_id: editing.square_id || '',
        pricing_table_id: editing.pricing_table_id || '',
        preparation_minutes: editing.preparation_minutes || '10',
        pickup_confirmation_type: editing.pickup_confirmation_type || 'code',
        delivery_confirmation_type: editing.delivery_confirmation_type || 'code'
      });
      if (editing.square_id) loadPricingTables(editing.square_id);
    } else {
      setFormData(EMPTY_FORM);
    }
    setFormError('');
  }, [editing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
    if (name === 'square_id') {
      loadPricingTables(value || null);
      setFormData(prev => ({ ...prev, pricing_table_id: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address_street || !formData.address_number || !formData.address_neighborhood) {
      setFormError('Nome, rua, número e bairro são obrigatórios');
      return;
    }

    try {
      setFormLoading(true);
      const fullAddress = `${formData.address_street}, ${formData.address_number} - ${formData.address_neighborhood}, ${formData.address_city} - ${formData.address_state}, ${formData.address_zip}`;

      const payload = {
        name: formData.name,
        cnpj: formData.cnpj || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: fullAddress,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        square_id: formData.square_id || null,
        pricing_table_id: formData.pricing_table_id || null,
        preparation_minutes: parseInt(formData.preparation_minutes) || 10,
        pickup_confirmation_type: formData.pickup_confirmation_type || 'code',
        delivery_confirmation_type: formData.delivery_confirmation_type || 'code',
      };

      if (isSuperAdmin && formData.tenant_id) {
        payload.tenant_id = parseInt(formData.tenant_id);
      }

      if (!editing && formData.password) {
        payload.password = formData.password;
      }

      if (editing) {
        await adminService.updateEstablishment(editing.id, payload);
      } else {
        await adminService.createEstablishment(payload);
      }
      onSave();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar estabelecimento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGeocode = async (useExisting) => {
    const addr = `${formData.address_street || ''}, ${formData.address_number || ''} - ${formData.address_neighborhood || ''}, ${formData.address_city || 'Capão da Canoa'} - ${formData.address_state || 'RS'}`;
    if (!useExisting && !formData.address_street) {
      setFormError('Preencha pelo menos a rua para geocodificar');
      return;
    }
    try {
      const endpoint = editing
        ? `/api/admin/establishments/${editing.id}/geocode`
        : '/api/admin/establishments/geocode';
      const res = await api.post(endpoint, { address: addr });
      setFormData(prev => ({ ...prev, latitude: res.data.latitude, longitude: res.data.longitude }));
      setFormError('');
      showToast('Geocodificação realizada com sucesso!', 'success');
    } catch {
      showToast('Erro ao geocodificar', 'error');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
          {editing ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
        </h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
        {formError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={14} /> {formError}
          </div>
        )}

        <FormField label="Nome *">
          <input type="text" name="name" value={formData.name} onChange={handleChange} style={inputStyle} placeholder="Ex: Farmácia da Esquina" />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <FormField label="CNPJ">
            <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} style={inputStyle} placeholder="00.000.000/0001-00" />
          </FormField>
          <FormField label="Telefone">
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} placeholder="(53) 99999-9999" />
          </FormField>
        </div>

        <FormField label="E-mail">
          <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} placeholder="contato@estabelecimento.com" />
        </FormField>

        {!editing && (
          <FormField label="Senha de Acesso">
            <input type="text" name="password" value={formData.password} onChange={handleChange} style={inputStyle} placeholder="123456 (padrão)" />
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>Senha para o estabelecimento fazer login no portal</p>
          </FormField>
        )}

        {isSuperAdmin && (
          <FormField label="Organização (Tenant)">
            <select name="tenant_id" value={formData.tenant_id} onChange={handleChange} style={inputStyle}>
              <option value="">Selecione uma organização</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Selecione a qual organização este estabelecimento pertence
            </p>
          </FormField>
        )}

        <FormField label="Praça">
          <select name="square_id" value={formData.square_id} onChange={handleChange} style={inputStyle}>
            <option value="">Selecione uma praça</option>
            {squares.map(sq => (
              <option key={sq.id} value={sq.id}>{sq.name} - {sq.city}/{sq.state}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Tabela de Preços">
          <select name="pricing_table_id" value={formData.pricing_table_id} onChange={handleChange} style={inputStyle}>
            <option value="">Padrão da praça</option>
            {pricingTables.map(pt => (
              <option key={pt.id} value={pt.id}>{pt.name} (R$ {parseFloat(pt.price_per_km || 0).toFixed(2)}/km)</option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Selecione uma tabela específica ou deixe vazio para usar a padrão da praça
          </p>
        </FormField>

        <FormField label="Tempo de Preparo (minutos)">
          <input type="number" name="preparation_minutes" value={formData.preparation_minutes} onChange={handleChange} style={inputStyle} placeholder="10" min="1" max="120" />
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Tempo estimado que o estabelecimento leva para preparar um pedido. O entregador é notificado após este tempo para buscar o pedido.
          </p>
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <FormField label="Confirmação de Coleta">
            <select name="pickup_confirmation_type" value={formData.pickup_confirmation_type} onChange={handleChange} style={inputStyle}>
              <option value="code">Código 6 dígitos</option>
              <option value="photo">Foto</option>
              <option value="code_and_photo">Código + Foto</option>
              <option value="none">Nenhuma</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Como o entregador confirma que coletou o pedido no estabelecimento.
            </p>
          </FormField>

          <FormField label="Confirmação de Entrega">
            <select name="delivery_confirmation_type" value={formData.delivery_confirmation_type} onChange={handleChange} style={inputStyle}>
              <option value="code">Código 6 dígitos</option>
              <option value="photo">Foto</option>
              <option value="code_and_photo">Código + Foto</option>
              <option value="none">Nenhuma</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Como o entregador confirma que entregou ao cliente.
            </p>
          </FormField>
        </div>

        <FormField label="Rua/Avenida *">
          <input type="text" name="address_street" value={formData.address_street} onChange={handleChange} style={inputStyle} placeholder="Ex: Rua das Flores" />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <FormField label="Número *">
            <input type="text" name="address_number" value={formData.address_number} onChange={handleChange} style={inputStyle} placeholder="123" />
          </FormField>
          <FormField label="Bairro *">
            <input type="text" name="address_neighborhood" value={formData.address_neighborhood} onChange={handleChange} style={inputStyle} placeholder="Centro" />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <FormField label="Cidade">
            <input type="text" name="address_city" value={formData.address_city} onChange={handleChange} style={inputStyle} placeholder="Capão da Canoa" />
          </FormField>
          <FormField label="UF">
            <input type="text" name="address_state" value={formData.address_state} onChange={handleChange} style={inputStyle} placeholder="RS" />
          </FormField>
        </div>

        <FormField label="CEP">
          <input type="text" name="address_zip" value={formData.address_zip} onChange={handleChange} style={inputStyle} placeholder="95555-000" />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <FormField label="Latitude">
            <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} style={inputStyle} placeholder="-29.9500" />
          </FormField>
          <FormField label="Longitude">
            <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} style={inputStyle} placeholder="-50.4500" />
          </FormField>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <button type="button" onClick={() => handleGeocode(false)} style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            border: '1px solid #e2e8f0', background: '#f8fafc',
            fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer'
          }}>
            📍 Geolocalizar endereço
          </button>
        </div>

        {editing && (
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" onClick={() => handleGeocode(true)} style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: '#f8fafc',
              fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer'
            }}>
              🔄 Re-geocodificar endereço
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>
            {formLoading ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Estabelecimento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EstablishmentForm;
