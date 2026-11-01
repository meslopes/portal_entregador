"""Gestão de estabelecimentos (CRUD e geocoding).

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, or_

from src.models.portal_models import (
    Customer,
    Delivery,
    DriverRestaurant,
    EstablishmentDriver,
    Invoice,
    Notification,
    Order,
    OwnDriverEarning,
    Payment,
    PlatformCredential,
    Restaurant,
    User,
    UserStatus,
    UserType,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id, get_current_user

logger = logging.getLogger(__name__)


admin_establishments_bp = Blueprint('establishments', __name__)


@admin_establishments_bp.route('/establishments', methods=['GET'])

@jwt_required()

@admin_required

def get_establishments():

    """Lista todos os estabelecimentos"""

    try:

        page = request.args.get('page', 1, type=int)

        per_page = request.args.get('per_page', 20, type=int)

        search = request.args.get('search', '')

        search_escaped = search.replace('%', '\\%').replace('_', '\\_') if search else ''

        square_id = request.args.get('square_id', type=int)

        tenant_id = get_current_tenant_id()



        query = Restaurant.query



        # Filtrar por tenant (incluir sem tenant = pendentes de aprovação)

        if tenant_id:

            query = query.filter((Restaurant.tenant_id == tenant_id) | (Restaurant.tenant_id.is_(None)))

        # Filtrar por praça (incluir sem praça = pendentes de definição)

        if square_id:

            query = query.filter((Restaurant.square_id == square_id) | (Restaurant.square_id.is_(None)))



        if search:

            query = query.filter(or_(

                Restaurant.name.ilike(f'%{search_escaped}%'),

                Restaurant.address.ilike(f'%{search_escaped}%'),

                Restaurant.cnpj.ilike(f'%{search_escaped}%'),

                Restaurant.phone.ilike(f'%{search_escaped}%')

            ))



        establishments = query.order_by(Restaurant.name).paginate(

            page=page, per_page=per_page, error_out=False

        )



        establishments_data = []

        for est in establishments.items:

            est_dict = est.to_dict(include_sensitive=True)



            # Estatísticas do estabelecimento

            total_orders = Order.query.filter_by(restaurant_id=est.id).count()

            total_revenue = db.session.query(func.sum(Order.total_amount)).filter_by(

                restaurant_id=est.id

            ).scalar() or 0



            # Pedidos esta semana

            week_ago = datetime.now(timezone.utc) - timedelta(days=7)

            week_orders = Order.query.filter(

                Order.restaurant_id == est.id,

                Order.created_at >= week_ago

            ).count()



            # Pedidos hoje

            today = datetime.now(timezone.utc).date()

            today_orders = Order.query.filter(

                Order.restaurant_id == est.id,

                func.date(Order.created_at) == today

            ).count()



            # Ranking (baseado em total de pedidos)

            est_dict['total_orders'] = total_orders

            est_dict['total_revenue'] = float(total_revenue)

            est_dict['week_orders'] = week_orders

            est_dict['today_orders'] = today_orders

            establishments_data.append(est_dict)



        return jsonify({

            'establishments': establishments_data,

            'total': establishments.total,

            'pages': establishments.pages,

            'current_page': page,

            'per_page': per_page

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_establishments_bp.route('/establishments/<int:establishment_id>', methods=['GET'])

@jwt_required()

@admin_required

def get_establishment_details(establishment_id):

    """Obtém detalhes de um estabelecimento"""

    try:

        est = Restaurant.query.get(establishment_id)

        if not est:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404



        est_dict = est.to_dict(include_sensitive=True)



        # Estatísticas

        total_orders = Order.query.filter_by(restaurant_id=est.id).count()

        total_revenue = db.session.query(func.sum(Order.total_amount)).filter_by(

            restaurant_id=est.id

        ).scalar() or 0



        # Pedidos por status

        orders_by_status = db.session.query(

            Order.status, func.count(Order.id)

        ).filter_by(restaurant_id=est.id).group_by(Order.status).all()



        # Últimos pedidos

        recent_orders = Order.query.filter_by(restaurant_id=est.id).order_by(

            Order.created_at.desc()

        ).limit(10).all()



        est_dict['total_orders'] = total_orders

        est_dict['total_revenue'] = float(total_revenue)

        est_dict['orders_by_status'] = {status.value: count for status, count in orders_by_status}

        est_dict['recent_orders'] = [order.to_dict() for order in recent_orders]



        return jsonify(est_dict), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_establishments_bp.route('/establishments', methods=['POST'])

@jwt_required()

@admin_required

def create_establishment():

    """Cria um novo estabelecimento com usuario de login"""

    try:

        data = request.get_json()



        if not data.get('name') or not data.get('address'):

            return jsonify({'error': 'Nome e endereço são obrigatórios'}), 400


        # Obter tenant_id do admin atual
        # Super admin pode especificar tenant_id no body; admin normal usa o seu próprio
        current_user = get_current_user()
        is_super_admin = current_user and current_user.user_type and current_user.user_type.value == 'ADMIN' and current_user.is_super_admin

        if is_super_admin and data.get('tenant_id'):
            # Super admin pode criar em qualquer tenant
            tenant_id = data['tenant_id']
        else:
            # Admin normal: usa o seu próprio tenant
            tenant_id = get_current_tenant_id()



        # Verificar CNPJ se fornecido

        if data.get('cnpj'):

            existing = Restaurant.query.filter_by(cnpj=data['cnpj']).first()

            if existing:

                return jsonify({'error': 'CNPJ já cadastrado'}), 400



        # Cria usuario CLIENT para login

        user = None

        email = data.get('email')

        password = data.get('password')  # Senha obrigatória se email fornecido

        if email and not password:

            return jsonify({'error': 'Senha é obrigatória quando email é fornecido'}), 400



        if email:

            if User.query.filter_by(email=email).first():

                return jsonify({'error': 'Email já cadastrado'}), 400



            user = User(

                email=email,

                first_name=data.get('first_name', data['name']),

                last_name=data.get('last_name', ''),

                phone=data.get('phone'),

                user_type=UserType.CLIENT,

                status=UserStatus.ACTIVE,

                tenant_id=tenant_id

            )

            user.set_password(password)

            db.session.add(user)

            db.session.flush()



            # Cria Customer record (necessario para criar pedidos)

            customer = Customer(

                user_id=user.id,

                name=data['name'],

                phone=data.get('phone', ''),

                email=email,

                tenant_id=tenant_id

            )

            db.session.add(customer)

            db.session.flush()



        establishment = Restaurant(

            name=data['name'],

            cnpj=data.get('cnpj'),

            phone=data.get('phone'),

            email=email,

            address=data['address'],

            latitude=data.get('latitude'),

            longitude=data.get('longitude'),

            opening_hours=data.get('opening_hours'),

            is_active=data.get('is_active', True),

            square_id=data.get('square_id') or None,

            bank_name=data.get('bank_name') or None,

            bank_agency=data.get('bank_agency') or None,

            bank_account=data.get('bank_account') or None,

            bank_pix_key=data.get('bank_pix_key') or None,

            pickup_confirmation_type=data.get('pickup_confirmation_type', 'code'),

            delivery_confirmation_type=data.get('delivery_confirmation_type', 'code'),

            tenant_id=tenant_id

        )



        # Geocodifica endereco se nao tem coordenadas

        if not establishment.latitude or not establishment.longitude:

            from src.services.geocoding import geocode_address

            # Usa cidade do endereço se disponível

            city_hint = None

            if establishment.address:

                # Tenta extrair cidade do endereço (formato: "Rua, Bairro, Cidade, Estado")

                parts = establishment.address.split(',')

                if len(parts) >= 3:

                    city_hint = parts[-2].strip()

            geo = geocode_address(establishment.address, city_hint=city_hint)

            if geo:

                establishment.latitude = geo['latitude']

                establishment.longitude = geo['longitude']

            else:

                establishment.latitude = -29.95

                establishment.longitude = -50.45



        db.session.add(establishment)

        db.session.commit()



        result = establishment.to_dict()

        if user:

            result['login_email'] = email

            # Não retornar senha por segurança



        return jsonify({

            'message': 'Estabelecimento criado com sucesso',

            'establishment': result

        }), 201



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_establishments_bp.route('/establishments/<int:establishment_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_establishment(establishment_id):

    """Atualiza um estabelecimento"""

    try:

        est = Restaurant.query.get(establishment_id)

        if not est:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404



        data = request.get_json()



        if data.get('name'):

            est.name = data['name']

        if data.get('cnpj'):

            existing = Restaurant.query.filter(

                Restaurant.cnpj == data['cnpj'],

                Restaurant.id != establishment_id

            ).first()

            if existing:

                return jsonify({'error': 'CNPJ já cadastrado'}), 400

            est.cnpj = data['cnpj']

        if 'phone' in data:

            est.phone = data['phone']

        if 'email' in data:

            est.email = data['email']

        if data.get('address'):

            est.address = data['address']

            # Geocodifica endereco se mudou

            try:

                from src.services.geocoding import geocode_address

                geo = geocode_address(est.address)

                if geo:

                    est.latitude = geo['latitude']

                    est.longitude = geo['longitude']

            except Exception:

                pass

        if data.get('latitude') is not None:

            est.latitude = data['latitude']

        if data.get('longitude') is not None:

            est.longitude = data['longitude']

        if 'opening_hours' in data:

            est.opening_hours = data['opening_hours']

        if 'is_active' in data:

            est.is_active = data['is_active']

        if 'square_id' in data:

            est.square_id = data['square_id']

        # Super admin pode alterar o tenant do estabelecimento
        current_user = get_current_user()
        is_super_admin = current_user and current_user.user_type and current_user.user_type.value == 'ADMIN' and current_user.is_super_admin
        if is_super_admin and 'tenant_id' in data:
            est.tenant_id = data['tenant_id'] if data['tenant_id'] else None

        if 'pricing_table_id' in data:

            est.pricing_table_id = data['pricing_table_id'] if data['pricing_table_id'] else None

        if 'preparation_minutes' in data:

            est.preparation_minutes = int(data['preparation_minutes']) if data['preparation_minutes'] else 10

        if 'pickup_confirmation_type' in data:

            est.pickup_confirmation_type = data['pickup_confirmation_type']

        if 'delivery_confirmation_type' in data:

            est.delivery_confirmation_type = data['delivery_confirmation_type']

        if 'external_merchant_id' in data:

            est.external_merchant_id = data['external_merchant_id']



        est.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Estabelecimento atualizado com sucesso',

            'establishment': est.to_dict(include_sensitive=True)

        }), 200



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_establishments_bp.route('/establishments/geocode', methods=['POST'])

@jwt_required()

@admin_required

def geocode_address_only():

    """Geocodifica um endereco sem salvar"""

    try:

        data = request.get_json()

        address = data.get('address')

        if not address:

            return jsonify({'error': 'Endereco obrigatorio'}), 400



        from src.services.geocoding import geocode_address

        geo = geocode_address(address)



        if geo:

            return jsonify({

                'latitude': geo['latitude'],

                'longitude': geo['longitude']

            }), 200

        else:

            return jsonify({'error': 'Nao foi possivel geocodificar o endereco'}), 400



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_establishments_bp.route('/establishments/<int:establishment_id>/geocode', methods=['POST'])

@jwt_required()

@admin_required

def re_geocode_establishment(establishment_id):

    """Re-geocodifica o endereco de um estabelecimento"""

    try:

        est = Restaurant.query.get(establishment_id)

        if not est:

            return jsonify({'error': 'Estabelecimento nao encontrado'}), 404

        if not est.address:

            return jsonify({'error': 'Estabelecimento não possui endereço cadastrado'}), 400



        from src.services.geocoding import geocode_address

        # Extrair cidade do endereço se disponível
        city_hint = None
        if est.address:
            parts = est.address.split(',')
            if len(parts) >= 3:
                city_hint = parts[-2].strip()

        logger.info(f"Re-geocodificando estabelecimento {est.id}: '{est.address}' (city_hint: {city_hint})")

        geo = geocode_address(est.address, city_hint=city_hint)



        if geo:

            est.latitude = geo['latitude']

            est.longitude = geo['longitude']

            est.updated_at = datetime.now(timezone.utc)

            db.session.commit()

            return jsonify({

                'message': 'Geocodificacao realizada com sucesso',

                'latitude': est.latitude,

                'longitude': est.longitude

            }), 200

        else:

            return jsonify({'error': 'Nao foi possivel geocodificar o endereco. Verifique se o endereco esta correto.'}), 400



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_establishments_bp.route('/establishments/<int:establishment_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_establishment(establishment_id):

    """Exclui um estabelecimento (com opção de forçar exclusão mesmo com pedidos)"""

    try:

        est = Restaurant.query.get(establishment_id)

        if not est:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404



        # Verificar se tem pedidos

        has_orders = Order.query.filter_by(restaurant_id=establishment_id).first()

        if has_orders:

            # Verificar se é exclusão forçada

            force = request.args.get('force', 'false').lower() == 'true'

            if not force:

                return jsonify({'error': 'Estabelecimento tem pedidos vinculados. Use ?force=true para excluir mesmo assim'}), 400



            # Exclusão forçada: deletar pedidos e entregas vinculados

            orders = Order.query.filter_by(restaurant_id=establishment_id).all()

            for order in orders:

                # Deletar entregas vinculadas

                Delivery.query.filter_by(order_id=order.id).delete()

                # Deletar pagamentos vinculados (usa reference_id, não order_id)

                Payment.query.filter_by(reference_id=order.id).delete()

                # Deletar notificações vinculadas (usa related_id, não order_id)

                Notification.query.filter_by(related_id=order.id).delete()

            # Deletar pedidos

            Order.query.filter_by(restaurant_id=establishment_id).delete()

            # Deletar faturas vinculadas ao estabelecimento

            Invoice.query.filter_by(restaurant_id=establishment_id).delete()

            # Deletar ganhos de entregadores próprios vinculados

            OwnDriverEarning.query.filter_by(restaurant_id=establishment_id).delete()

            # Deletar entregadores próprios do estabelecimento

            EstablishmentDriver.query.filter_by(restaurant_id=establishment_id).delete()

            # Deletar vinculações entregador-estabelecimento

            DriverRestaurant.query.filter_by(restaurant_id=establishment_id).delete()

            # Deletar credenciais de plataformas vinculadas

            PlatformCredential.query.filter_by(restaurant_id=establishment_id).delete()



        # Deletar cliente vinculado (se existir)
        # Buscar customer pelo email do restaurante ou pelo nome
        customer = None
        if est.email:
            customer = Customer.query.filter_by(email=est.email).first()
        if not customer:
            customer = Customer.query.filter_by(name=est.name).first()
        if customer:
            # Deletar User associado ao Customer (para liberar o email)
            if customer.user_id:
                user = User.query.get(customer.user_id)
                if user and user.user_type == UserType.CLIENT:
                    # Deletar notificações do user
                    Notification.query.filter_by(user_id=user.id).delete()
                    db.session.delete(user)
            db.session.delete(customer)



        db.session.delete(est)

        db.session.commit()



        return jsonify({'message': 'Estabelecimento excluído com sucesso'}), 200



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# RELATTÓRIOS

# ============================================



