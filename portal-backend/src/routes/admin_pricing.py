"""Configurações, tabelas de preço e preço dinâmico.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    DynamicPricing,
    PricingTable,
    Restaurant,
    Tenant,
    db,
)
from src.routes.admin_finance import get_square_filter
from src.utils.auth import admin_required, client_or_admin_required
from src.utils.tenant import get_current_tenant_id, get_current_user

admin_pricing_bp = Blueprint('pricing', __name__)


@admin_pricing_bp.route('/settings', methods=['GET'])

@jwt_required()

@client_or_admin_required

def get_settings():

    """Obtém configurações do admin/cliente"""

    try:

        from src.models.portal_models import SystemConfig

        tenant_id = get_current_tenant_id()



        query = SystemConfig.query

        if tenant_id:

            query = query.filter(

                (SystemConfig.tenant_id == tenant_id) | (SystemConfig.tenant_id.is_(None))

            )

        else:

            query = query.filter(SystemConfig.tenant_id.is_(None))



        configs = query.all()

        settings = {c.config_key: c.config_value for c in configs}

        return jsonify(settings), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/settings', methods=['PUT'])

@jwt_required()

@client_or_admin_required

def update_settings():

    """Atualiza configurações do admin/cliente"""

    try:

        from src.models.portal_models import SystemConfig

        tenant_id = get_current_tenant_id()

        data = request.get_json()



        for key, value in data.items():

            # Busca config existente para este tenant

            config = SystemConfig.query.filter_by(config_key=key, tenant_id=tenant_id).first()

            if not config:

                # Se não existe para este tenant, cria

                config = SystemConfig(config_key=key, config_value=str(value), tenant_id=tenant_id)

                db.session.add(config)

            else:

                config.config_value = str(value)

                config.updated_at = datetime.now(timezone.utc)



        db.session.commit()

        return jsonify({'message': 'Configurações salvas com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# CONFIGURAÇÕES DE WHITE-LABEL (TENANT)

# ============================================



@admin_pricing_bp.route('/tenant/settings', methods=['GET'])

@jwt_required()

@admin_required

def get_tenant_settings():

    """Obtém configurações de white-label do tenant atual"""

    try:

        user = get_current_user()

        if not user or not user.tenant_id:

            # Retornar tenant padrão se usuário não tem tenant

            return jsonify({'tenant': {

                'id': None,

                'name': 'muvy.log',

                'slug': 'muvylog',

                'logo_url': None,

                'primary_color': '#6366f1',

                'secondary_color': '#ffffff',

                'plan': 'premium',

                'is_active': True

            }}), 200



        tenant = Tenant.query.get(user.tenant_id)

        if not tenant:

            return jsonify({'error': 'Organização não encontrada'}), 404



        return jsonify({'tenant': tenant.to_dict()}), 200

    except Exception:

        # Se tabela tenants não existir, retornar dados padrão

        return jsonify({'tenant': {

            'id': None,

            'name': 'muvy.log',

            'slug': 'muvylog',

            'logo_url': None,

            'primary_color': '#6366f1',

            'secondary_color': '#ffffff',

            'plan': 'premium',

            'is_active': True

        }}), 200





@admin_pricing_bp.route('/tenant/settings', methods=['PUT'])

@jwt_required()

@admin_required

def update_tenant_settings():

    """Atualiza configurações de white-label do tenant atual"""

    try:



        user = get_current_user()

        if not user or not user.tenant_id:

            return jsonify({'error': 'Usuário não pertence a nenhuma organização'}), 400



        tenant = Tenant.query.get(user.tenant_id)

        if not tenant:

            return jsonify({'error': 'Organização não encontrada'}), 404



        data = request.get_json()



        # Atualizar campos permitidos

        if 'name' in data:

            tenant.name = data['name']

        if 'logo_url' in data:

            tenant.logo_url = data['logo_url']

        if 'primary_color' in data:

            tenant.primary_color = data['primary_color']

        if 'secondary_color' in data:

            tenant.secondary_color = data['secondary_color']

        if 'phone' in data:

            tenant.phone = data['phone']

        if 'email' in data:

            tenant.email = data['email']

        if 'address' in data:

            tenant.address = data['address']

        if 'cnpj' in data:

            tenant.cnpj = data['cnpj']

        if 'terms_url' in data:

            tenant.terms_url = data['terms_url']

        if 'privacy_url' in data:

            tenant.privacy_url = data['privacy_url']

        if 'custom_domain' in data:

            tenant.custom_domain = data['custom_domain']



        tenant.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Configurações atualizadas com sucesso',

            'tenant': tenant.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# TABELAS DE PREÇOS (PRICING TABLES)

# ============================================



@admin_pricing_bp.route('/pricing-tables', methods=['GET'])

@jwt_required()

@admin_required

def list_pricing_tables():

    """Lista tabelas de preços do tenant"""

    try:

        tenant_id = get_current_tenant_id()

        square_id = request.args.get('square_id', type=int)



        query = PricingTable.query

        if tenant_id:

            query = query.filter(PricingTable.tenant_id == tenant_id)

        if square_id:

            query = query.filter(PricingTable.square_id == square_id)



        tables = query.order_by(PricingTable.name).all()

        return jsonify({'pricing_tables': [t.to_dict() for t in tables]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/pricing-tables', methods=['POST'])

@jwt_required()

@admin_required

def create_pricing_table():

    """Cria uma nova tabela de preços"""

    try:

        tenant_id = get_current_tenant_id()

        data = request.get_json()



        if not data.get('name') or not data.get('square_id'):

            return jsonify({'error': 'Nome e praca sao obrigatorios'}), 400



        def safe_float(value, default):

            if value is None or value == '':

                return default

            try:

                return float(value)

            except (ValueError, TypeError):

                return default



        price_per_km = safe_float(data.get('price_per_km'), 2.95)

        min_distance_km = safe_float(data.get('min_distance_km'), 4.0)

        min_delivery_fee = safe_float(data.get('min_delivery_fee'), price_per_km * min_distance_km)



        table = PricingTable(

            tenant_id=tenant_id,

            square_id=data['square_id'],

            name=data['name'],

            description=data.get('description'),

            price_per_km=price_per_km,

            min_distance_km=min_distance_km,

            min_delivery_fee=min_delivery_fee,

            max_delivery_fee=safe_float(data.get('max_delivery_fee'), 50.0),

            driver_percentage=safe_float(data.get('driver_percentage'), 65.0),

            gamification_percentage=safe_float(data.get('gamification_percentage'), 5.0),

            is_active=data.get('is_active', True)

        )

        db.session.add(table)

        db.session.commit()



        return jsonify({

            'message': 'Tabela de precos criada com sucesso',

            'pricing_table': table.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/pricing-tables/<int:table_id>', methods=['GET'])

@jwt_required()

@admin_required

def get_pricing_table(table_id):

    """Obtém detalhes de uma tabela de preços"""

    try:

        table = PricingTable.query.get(table_id)

        if not table:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        tenant_id = get_current_tenant_id()

        if tenant_id and table.tenant_id != tenant_id:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        return jsonify({'pricing_table': table.to_dict()}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/pricing-tables/<int:table_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_pricing_table(table_id):

    """Atualiza uma tabela de preços"""

    try:

        table = PricingTable.query.get(table_id)

        if not table:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        tenant_id = get_current_tenant_id()

        if tenant_id and table.tenant_id != tenant_id:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        data = request.get_json()



        def safe_float(value, default=None):

            if value is None or value == '':

                return default

            try:

                return float(value)

            except (ValueError, TypeError):

                return default



        if 'name' in data:

            table.name = data['name']

        if 'description' in data:

            table.description = data['description']

        if 'price_per_km' in data:

            val = safe_float(data['price_per_km'])

            if val is not None:

                table.price_per_km = val

        if 'min_distance_km' in data:

            val = safe_float(data['min_distance_km'])

            if val is not None:

                table.min_distance_km = val

        if 'min_delivery_fee' in data:

            val = safe_float(data['min_delivery_fee'])

            if val is not None:

                table.min_delivery_fee = val

        if 'max_delivery_fee' in data:

            val = safe_float(data['max_delivery_fee'])

            if val is not None:

                table.max_delivery_fee = val

        if 'driver_percentage' in data:

            val = safe_float(data['driver_percentage'])

            if val is not None:

                table.driver_percentage = val

        if 'gamification_percentage' in data:

            val = safe_float(data['gamification_percentage'])

            if val is not None:

                table.gamification_percentage = val

        if 'is_active' in data:

            table.is_active = data['is_active']



        table.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Tabela atualizada com sucesso',

            'pricing_table': table.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/pricing-tables/<int:table_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_pricing_table(table_id):

    """Exclui uma tabela de preços"""

    try:

        table = PricingTable.query.get(table_id)

        if not table:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        tenant_id = get_current_tenant_id()

        if tenant_id and table.tenant_id != tenant_id:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        # Verificar se há estabelecimentos usando esta tabela

        restaurants_using = Restaurant.query.filter_by(pricing_table_id=table_id).count()

        if restaurants_using > 0:

            return jsonify({'error': f'Tabela em uso por {restaurants_using} estabelecimento(s)'}), 400



        db.session.delete(table)

        db.session.commit()



        return jsonify({'message': 'Tabela excluída com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# DYNAMIC PRICING (Taxas Adicionais)

# ============================================



@admin_pricing_bp.route('/dynamic-pricing', methods=['GET'])

@jwt_required()

@admin_required

def get_dynamic_pricing():

    """Lista configurações de taxas adicionais por praça"""

    try:

        tenant_id = get_current_tenant_id()
        square_id = get_square_filter()

        query = DynamicPricing.query

        if tenant_id:

            query = query.join(DynamicPricing.square).filter(

                db.or_(DynamicPricing.square.has(tenant_id=tenant_id), DynamicPricing.square.has(tenant_id=None))

            )

        if square_id:
            query = query.filter(DynamicPricing.square_id == square_id)

        configs = query.all()

        return jsonify({'dynamic_pricing': [d.to_dict() for d in configs]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/dynamic-pricing', methods=['POST'])

@jwt_required()

@admin_required

def create_dynamic_pricing():

    """Cria configuração de taxas adicionais para uma praça"""

    try:

        data = request.get_json()

        if not data or not data.get('square_id'):

            return jsonify({'error': 'Praça é obrigatória'}), 400



        square_id = data['square_id']

        existing = DynamicPricing.query.filter_by(square_id=square_id).first()

        if existing:

            return jsonify({'error': 'Já existe configuração para esta praça. Edite a existente.'}), 400



        config = DynamicPricing(

            square_id=square_id,

            rainy_day_active=data.get('rainy_day_active', False),

            rainy_day_bonus=data.get('rainy_day_bonus', 3.00),

            high_demand_active=data.get('high_demand_active', False),

            high_demand_threshold=data.get('high_demand_threshold', 5),

            high_demand_bonus=data.get('high_demand_bonus', 2.00),

            holiday_active=data.get('holiday_active', False),

            holiday_bonus=data.get('holiday_bonus', 5.00),

            cancellation_fee_active=data.get('cancellation_fee_active', False),

            cancellation_fee=data.get('cancellation_fee', 5.00)

        )

        db.session.add(config)

        db.session.commit()



        return jsonify({

            'message': 'Configuração criada com sucesso',

            'dynamic_pricing': config.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/dynamic-pricing/<int:config_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_dynamic_pricing(config_id):

    """Atualiza configuração de taxas adicionais"""

    try:

        config = DynamicPricing.query.get(config_id)

        if not config:

            return jsonify({'error': 'Configuração não encontrada'}), 404



        data = request.get_json()

        if not data:

            return jsonify({'error': 'Dados não fornecidos'}), 400



        if 'rainy_day_active' in data:

            config.rainy_day_active = data['rainy_day_active']

        if 'rainy_day_bonus' in data:

            config.rainy_day_bonus = data['rainy_day_bonus']

        if 'high_demand_active' in data:

            config.high_demand_active = data['high_demand_active']

        if 'high_demand_threshold' in data:

            config.high_demand_threshold = data['high_demand_threshold']

        if 'high_demand_bonus' in data:

            config.high_demand_bonus = data['high_demand_bonus']

        if 'holiday_active' in data:

            config.holiday_active = data['holiday_active']

        if 'holiday_bonus' in data:

            config.holiday_bonus = data['holiday_bonus']

        if 'cancellation_fee_active' in data:

            config.cancellation_fee_active = data['cancellation_fee_active']

        if 'cancellation_fee' in data:

            config.cancellation_fee = data['cancellation_fee']



        config.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Configuração atualizada com sucesso',

            'dynamic_pricing': config.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_pricing_bp.route('/dynamic-pricing/<int:config_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_dynamic_pricing(config_id):

    """Exclui configuração de taxas adicionais"""

    try:

        config = DynamicPricing.query.get(config_id)

        if not config:

            return jsonify({'error': 'Configuração não encontrada'}), 404



        db.session.delete(config)

        db.session.commit()



        return jsonify({'message': 'Configuração excluída com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





