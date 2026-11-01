"""Módulo est_drivers_crud — extraído de src/routes/admin_establishment_drivers.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
import contextlib
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from src.models.portal_models import (
    Customer,
    Driver,
    EstablishmentDriver,
    Order,
    OrderStatus,
    OwnDriverRoute,
    Restaurant,
    UserType,
    db,
)
from src.utils.auth import client_or_admin_required
from src.utils.restaurant import find_restaurant_by_name
from src.utils.tenant import get_current_user

logger = logging.getLogger(__name__)


admin_est_drivers_crud_bp = Blueprint('admin_est_drivers_crud', __name__)


@admin_est_drivers_crud_bp.route('/establishment-drivers', methods=['GET'])

@jwt_required()

@client_or_admin_required

def list_establishment_drivers():

    """Lista entregadores próprios de um estabelecimento"""

    try:

        restaurant_id = request.args.get('restaurant_id')

        if not restaurant_id:

            return jsonify({'error': 'restaurant_id é obrigatório'}), 400

        # Verificação de ownership: CLIENT só pode ver drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and int(restaurant_id) != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode ver entregadores do seu próprio estabelecimento'}), 403

        drivers = EstablishmentDriver.query.filter_by(

            restaurant_id=int(restaurant_id),

            is_active=True

        ).all()



        return jsonify({'drivers': [d.to_dict() for d in drivers]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500


@admin_est_drivers_crud_bp.route('/establishment/orders', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_establishment_orders():
    """Lista pedidos do estabelecimento (para CLIENT e ADMIN)"""
    try:
        restaurant_id = request.args.get('restaurant_id')
        status_filter = request.args.get('status', '')

        if not restaurant_id:
            return jsonify({'error': 'restaurant_id é obrigatório'}), 400

        query = Order.query.filter_by(restaurant_id=int(restaurant_id))

        # Filtrar por status se fornecido
        if status_filter:
            statuses = [s.strip().upper() for s in status_filter.split(',')]
            status_enums = []
            for s in statuses:
                with contextlib.suppress(KeyError):
                    status_enums.append(OrderStatus[s])
            if status_enums:
                query = query.filter(Order.status.in_(status_enums))

        # Excluir pedidos que já estão em rotas ativas (CREATED, PENDING, ACTIVE)
        # Incluir pedidos sem rota (NULL) OU com rota não ativa
        active_route_ids = db.session.query(OwnDriverRoute.id).filter(
            OwnDriverRoute.status.in_(['CREATED', 'PENDING', 'ACTIVE'])
        )
        query = query.filter(
            or_(
                Order.own_driver_route_id.is_(None),
                ~Order.own_driver_route_id.in_(active_route_ids)
            )
        )

        orders = query.order_by(Order.created_at.desc()).limit(100).all()

        # Carregar relacionamentos
        result = []
        for order in orders:
            order_dict = order.to_dict()
            # Adicionar informações do cliente
            if order.customer:
                order_dict['customer'] = {
                    'id': order.customer.id,
                    'name': order.customer.name,
                    'phone': order.customer.phone
                }
            # Adicionar endereço de entrega
            if order.delivery_address:
                order_dict['delivery_address'] = {
                    'street': order.delivery_address.street,
                    'neighborhood': order.delivery_address.neighborhood,
                    'city': order.delivery_address.city,
                    'state': order.delivery_address.state,
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None
                }
            # Adicionar informações do entregador da plataforma
            if order.driver_id:
                driver = Driver.query.get(order.driver_id)
                if driver:
                    order_dict['driver'] = {
                        'id': driver.id,
                        'name': f"{driver.user.first_name} {driver.user.last_name}" if driver.user else 'N/A',
                        'phone': driver.user.phone if driver.user else None
                    }
            result.append(order_dict)

        return jsonify({
            'orders': result,
            'total': len(result)
        }), 200

    except Exception as e:
        logger.error(f"Erro ao listar pedidos do estabelecimento: {e}")
        return jsonify({'error': str(e)}), 500


@admin_est_drivers_crud_bp.route('/establishment-drivers', methods=['POST'])

@jwt_required()

@client_or_admin_required

def create_establishment_driver():

    """Cadastra entregador próprio para um estabelecimento"""

    try:

        data = request.get_json()

        if not data or not data.get('restaurant_id') or not data.get('name'):

            return jsonify({'error': 'Estabelecimento e nome são obrigatórios'}), 400

        # Verificação de ownership: CLIENT só pode criar drivers no seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and int(data['restaurant_id']) != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode cadastrar entregadores no seu próprio estabelecimento'}), 403

        # Telefone é OBRIGATÓRIO para login do próprio
        phone_raw = (data.get('phone') or '').strip()
        if not phone_raw or not ''.join(filter(str.isdigit, phone_raw)):
            return jsonify({'error': 'Telefone é obrigatório (login do entregador próprio)'}), 400

        # Telefone único entre cadastros ativos
        from src.utils.driver_type import find_phone_conflict
        conflict = find_phone_conflict(phone_raw)
        if conflict:
            return jsonify({
                'error': f"Telefone já cadastrado para: {conflict['label']}. "
                         'Cada pessoa deve ter um telefone único.'
            }), 400

        driver = EstablishmentDriver(

            restaurant_id=data['restaurant_id'],

            name=data['name'],

            phone=phone_raw,

            vehicle_type=data.get('vehicle_type', 'MOTO'),

            vehicle_plate=data.get('vehicle_plate'),

            vehicle_model=data.get('vehicle_model'),

            payment_frequency=data.get('payment_frequency', 'WEEKLY'),

            is_active=True

        )

        # PIN opcional no cadastro — se vier, já grava (evita login bloqueado)
        pin = (data.get('pin') or '').strip()
        if pin:
            if len(pin) != 4 or not pin.isdigit():
                return jsonify({'error': 'PIN deve ter 4 dígitos numéricos'}), 400
            driver.set_pin(pin)

        db.session.add(driver)



        # Marcar estabelecimento como tendo entregadores próprios

        restaurant = Restaurant.query.get(data['restaurant_id'])

        if restaurant:

            restaurant.has_own_drivers = True

        # Se o telefone já existir como entregador da plataforma, marcar como convertido
        # para NÃO aparecer nas duas listas (identidade = telefone, não nome)
        from src.utils.driver_type import mark_driver_converted_by_phone
        mark_driver_converted_by_phone(data.get('phone'))



        db.session.commit()



        return jsonify({

            'message': 'Entregador cadastrado com sucesso',

            'driver': driver.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500


@admin_est_drivers_crud_bp.route('/establishment-drivers/<int:driver_id>/pin', methods=['POST'])
@jwt_required()
@client_or_admin_required
def set_establishment_driver_pin(driver_id):
    """Define ou reseta o PIN de 4 dígitos de um entregador próprio (admin/estabelecimento)."""
    try:
        driver = EstablishmentDriver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        data = request.get_json() or {}
        pin = (data.get('pin') or '').strip()
        if len(pin) != 4 or not pin.isdigit():
            return jsonify({'error': 'PIN deve ter 4 dígitos numéricos'}), 400

        driver.set_pin(pin)
        db.session.commit()
        return jsonify({'message': 'PIN definido com sucesso', 'has_pin': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_est_drivers_crud_bp.route('/establishment-drivers/<int:driver_id>', methods=['PUT'])

@jwt_required()

@client_or_admin_required

def update_establishment_driver(driver_id):

    """Atualiza entregador próprio"""

    try:

        driver = EstablishmentDriver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404

        # Verificação de ownership: CLIENT só pode editar drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and driver.restaurant_id != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode editar entregadores do seu próprio estabelecimento'}), 403

        data = request.get_json()

        if 'name' in data:

            driver.name = data['name']

        if 'phone' in data:

            new_phone = (data.get('phone') or '').strip()
            from src.utils.driver_type import find_phone_conflict, normalize_phone, sync_own_phone_to_user
            if not normalize_phone(new_phone):
                return jsonify({'error': 'Telefone é obrigatório e não pode ficar vazio'}), 400
            conflict = find_phone_conflict(new_phone, exclude_own_driver_id=driver.id)
            if conflict:
                return jsonify({
                    'error': f"Telefone já cadastrado para: {conflict['label']}. "
                             'Cada pessoa deve ter um telefone único.'
                }), 400
            old_phone = driver.phone
            driver.phone = new_phone
            # Refletir no User (se for a mesma pessoa)
            sync_own_phone_to_user(driver, old_phone=old_phone, new_phone=new_phone)

        if 'vehicle_type' in data:

            # Mapear valores legados e normalizar
            vt = data['vehicle_type'].upper().strip()
            vehicle_map = {'MOTO': 'MOTORCYCLE', 'MOTORCYCLE': 'MOTORCYCLE', 'CAR': 'CAR', 'BICYCLE': 'BICYCLE', 'BIKE': 'BICYCLE', 'FOOT': 'FOOT'}
            vt = vehicle_map.get(vt, vt)
            if vt not in ('CAR', 'MOTORCYCLE', 'BICYCLE', 'FOOT'):
                return jsonify({'error': 'Tipo de veículo inválido'}), 400
            driver.vehicle_type = vt

        if 'vehicle_plate' in data:

            driver.vehicle_plate = data['vehicle_plate']

        if 'vehicle_model' in data:

            driver.vehicle_model = data['vehicle_model']

        if 'payment_frequency' in data:

            driver.payment_frequency = data['payment_frequency']

        if 'is_active' in data:

            driver.is_active = data['is_active']



        db.session.commit()



        return jsonify({

            'message': 'Entregador atualizado',

            'driver': driver.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_crud_bp.route('/establishment-drivers/<int:driver_id>', methods=['DELETE'])

@jwt_required()

@client_or_admin_required

def delete_establishment_driver(driver_id):

    """Remove entregador próprio"""

    try:

        driver = EstablishmentDriver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404

        # Verificação de ownership: CLIENT só pode deletar drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and driver.restaurant_id != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode remover entregadores do seu próprio estabelecimento'}), 403

        driver.is_active = False

        db.session.commit()



        return jsonify({'message': 'Entregador removido'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_crud_bp.route('/establishment-drivers/<int:driver_id>/toggle-online', methods=['PUT'])

@jwt_required()

@client_or_admin_required

def toggle_establishment_driver_online(driver_id):

    """Ativa/desativa status online do entregador próprio"""

    try:

        driver = EstablishmentDriver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        data = request.get_json() or {}

        driver.is_online = data.get('is_online', not driver.is_online)



        if 'latitude' in data:

            driver.current_latitude = data['latitude']

        if 'longitude' in data:

            driver.current_longitude = data['longitude']



        db.session.commit()



        return jsonify({

            'message': f'Entregador {"online" if driver.is_online else "offline"}',

            'driver': driver.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500


