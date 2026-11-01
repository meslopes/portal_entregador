"""Organizações (tenants) e praças de operação.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    Driver,
    Order,
    Restaurant,
    Tenant,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id, get_current_user

logger = logging.getLogger(__name__)


admin_tenants_squares_bp = Blueprint('tenants_squares', __name__)


@admin_tenants_squares_bp.route('/tenant/logo', methods=['POST'])

@jwt_required()

@admin_required

def upload_tenant_logo():

    """Faz upload do logo do tenant"""

    try:



        import base64
        import os



        user = get_current_user()

        if not user or not user.tenant_id:

            return jsonify({'error': 'Usuário não pertence a nenhuma organização'}), 400



        tenant = Tenant.query.get(user.tenant_id)

        if not tenant:

            return jsonify({'error': 'Organização não encontrada'}), 404



        data = request.get_json()

        logo_data = data.get('logo_data')  # Base64 encoded image

        filename = data.get('filename', 'logo.png')



        if not logo_data:

            return jsonify({'error': 'Dados do logo são obrigatórios'}), 400



        # Criar diretório de uploads se não existir

        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'logos')

        os.makedirs(uploads_dir, exist_ok=True)



        # Salvar arquivo

        if ',' in logo_data:

            logo_data = logo_data.split(',')[1]



        filepath = os.path.join(uploads_dir, f"tenant_{tenant.id}_{filename}")

        with open(filepath, 'wb') as f:

            f.write(base64.b64decode(logo_data))



        # Atualizar URL do logo no tenant

        logo_url = f"/uploads/logos/tenant_{tenant.id}_{filename}"

        tenant.logo_url = logo_url

        tenant.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Logo atualizado com sucesso',

            'logo_url': logo_url

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_tenants_squares_bp.route('/tenants', methods=['POST'])

@jwt_required()

@admin_required

def create_tenant():

    """Cria um novo tenant (organização)"""

    try:

        data = request.get_json()



        name = data.get('name')

        slug = data.get('slug')



        if not name or not slug:

            return jsonify({'error': 'Nome e slug são obrigatórios'}), 400



        # Verificar se slug já existe

        existing = Tenant.query.filter_by(slug=slug).first()

        if existing:

            return jsonify({'error': 'Slug já existe'}), 400



        tenant = Tenant(

            name=name,

            slug=slug,

            primary_color=data.get('primary_color', '#6366f1'),

            secondary_color=data.get('secondary_color', '#ffffff'),

            phone=data.get('phone'),

            email=data.get('email'),

            address=data.get('address'),

            cnpj=data.get('cnpj'),

            plan=data.get('plan', 'free'),

            max_deliveries_month=data.get('max_deliveries_month', 100),

            max_drivers=data.get('max_drivers', 2),

            max_clients=data.get('max_clients', 20),

            is_active=True

        )



        db.session.add(tenant)

        db.session.commit()



        return jsonify({

            'message': 'Tenant criado com sucesso',

            'tenant': tenant.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_tenants_squares_bp.route('/tenants', methods=['GET'])

@jwt_required()

@admin_required

def list_tenants():

    """Lista todos os tenants"""

    try:

        tenants = Tenant.query.order_by(Tenant.name).all()

        return jsonify({'tenants': [t.to_dict() for t in tenants]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





# ============================================

# GESTAO DE PRACAS (MULTI-CIDADE)

# ============================================



@admin_tenants_squares_bp.route('/squares', methods=['GET'])

@jwt_required()

@admin_required

def get_squares():

    """Lista todas as praças"""

    try:

        from src.models.portal_models import Square

        tenant_id = get_current_tenant_id()



        query = Square.query

        if tenant_id:

            query = query.filter(Square.tenant_id == tenant_id)

        squares = query.order_by(Square.name).all()



        squares_data = []

        for sq in squares:

            try:

                sq_dict = sq.to_dict()

                sq_dict['restaurants_count'] = Restaurant.query.filter_by(square_id=sq.id).count()

                sq_dict['drivers_count'] = Driver.query.filter_by(square_id=sq.id).count()

                sq_dict['orders_count'] = Order.query.join(Restaurant).filter(Restaurant.square_id == sq.id).count()

                squares_data.append(sq_dict)

            except Exception as e:

                # Se falhar ao processar uma praça, pula

                logger.error(f"Erro ao processar praça {sq.id}: {e}")

                continue



        return jsonify({'squares': squares_data}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_tenants_squares_bp.route('/squares', methods=['POST'])

@jwt_required()

@admin_required

def create_square():

    """Cria uma nova praça"""

    try:

        from src.models.portal_models import Square

        data = request.get_json()



        if not data.get('name') or not data.get('city') or not data.get('state'):

            return jsonify({'error': 'Nome, cidade e estado são obrigatórios'}), 400



        # Obter tenant_id do admin atual

        tenant_id = get_current_tenant_id()



        square = Square(

            name=data['name'],

            city=data['city'],

            state=data['state'],

            is_active=data.get('is_active', True),

            price_per_km=data.get('price_per_km', 2.95),

            min_distance_km=data.get('min_distance_km', 4.0),

            max_delivery_fee=data.get('max_delivery_fee', 50.00),

            driver_percentage=data.get('driver_percentage', 65.0),

            gamification_percentage=data.get('gamification_percentage', 5.0),

            tenant_id=tenant_id

        )

        db.session.add(square)

        db.session.commit()



        return jsonify({'message': 'Praça criada com sucesso', 'square': square.to_dict()}), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_tenants_squares_bp.route('/squares/<int:square_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_square(square_id):

    """Atualiza uma praça"""

    try:

        from src.models.portal_models import Square

        square = Square.query.get(square_id)

        if not square:

            return jsonify({'error': 'Praça não encontrada'}), 404



        data = request.get_json()

        if data.get('name'):

            square.name = data['name']

        if data.get('city'):

            square.city = data['city']

        if data.get('state'):

            square.state = data['state']

        if 'is_active' in data:

            square.is_active = data['is_active']

        if data.get('price_per_km') is not None:

            square.price_per_km = data['price_per_km']

        if data.get('min_distance_km') is not None:

            square.min_distance_km = data['min_distance_km']

        if data.get('max_delivery_fee') is not None:

            square.max_delivery_fee = data['max_delivery_fee']

        if data.get('driver_percentage') is not None:

            square.driver_percentage = data['driver_percentage']

        if data.get('gamification_percentage') is not None:

            square.gamification_percentage = data['gamification_percentage']



        square.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({'message': 'Praça atualizada com sucesso', 'square': square.to_dict()}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_tenants_squares_bp.route('/squares/<int:square_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_square(square_id):

    """Exclui uma praça"""

    try:

        from src.models.portal_models import Square

        square = Square.query.get(square_id)

        if not square:

            return jsonify({'error': 'Praça não encontrada'}), 404

        force = request.args.get('force', 'false').lower() == 'true'

        has_restaurants = Restaurant.query.filter_by(square_id=square_id).first()
        has_drivers = Driver.query.filter_by(square_id=square_id).first()

        if (has_restaurants or has_drivers) and not force:
            return jsonify({'error': 'Praça tem restaurantes/entregadores vinculados. Use ?force=true para desvincular e excluir'}), 400

        if force:
            Restaurant.query.filter_by(square_id=square_id).update({'square_id': None})
            Driver.query.filter_by(square_id=square_id).update({'square_id': None})

        db.session.delete(square)

        db.session.commit()



        return jsonify({'message': 'Praça excluída com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500


@admin_tenants_squares_bp.route('/squares/<int:square_id>/toggle-active', methods=['PUT'])

@jwt_required()

@admin_required

def toggle_square_active(square_id):

    """Ativa/desativa uma praça"""

    try:

        from src.models.portal_models import Square

        square = Square.query.get(square_id)

        if not square:

            return jsonify({'error': 'Praça não encontrada'}), 404

        data = request.get_json() or {}

        new_status = data.get('is_active')

        if new_status is None:

            new_status = not square.is_active

        square.is_active = bool(new_status)

        db.session.commit()

        return jsonify({

            'message': f'Praça {square.name} agora esta {"ativa" if square.is_active else "inativa"}',

            'is_active': square.is_active

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# CONTROLE DE PAGAMENTOS AOS ENTREGADORES

# ============================================



