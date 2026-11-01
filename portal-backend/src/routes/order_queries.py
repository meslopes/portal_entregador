"""Consultas de pedidos (leitura).

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import (
    Customer,
    Order,
    OrderStatus,
    Restaurant,
    User,
    UserType,
)
from src.utils.restaurant import find_restaurant_by_name

logger = logging.getLogger(__name__)


order_queries_bp = Blueprint('order_queries', __name__)


@order_queries_bp.route('/current', methods=['GET'])
@jwt_required()
def get_current_order():
    """Obtém o pedido atual do entregador"""
    try:
        user_id = int(get_jwt_identity())
        # Verificar se entregador foi convertido para próprio
        from src.routes.driver import _check_driver_conversion
        conv = _check_driver_conversion(user_id)
        if conv:
            return conv
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver

        # Busca pedido em andamento
        current_order = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status.in_([
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ])
        ).first()

        if not current_order:
            return jsonify({'message': 'Nenhum pedido em andamento'}), 200

        order_dict = current_order.to_dict()
        order_dict['restaurant'] = current_order.restaurant.to_dict() if current_order.restaurant else None
        order_dict['customer'] = current_order.customer.to_dict() if current_order.customer else None
        order_dict['delivery_address'] = current_order.delivery_address.to_dict() if current_order.delivery_address else None

        if current_order.delivery:
            order_dict['delivery'] = current_order.delivery.to_dict()

        return jsonify({
            'order': order_dict
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_queries_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_orders():
    """Obtém todos os pedidos ativos do entregador (aceitos, preparando, pronto, coletado)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver

        # Busca todos os pedidos ativos
        active_orders = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status.in_([
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ])
        ).order_by(Order.created_at.desc()).all()

        orders_data = []
        for order in active_orders:
            order_dict = order.to_dict()
            order_dict['restaurant'] = order.restaurant.to_dict() if order.restaurant else None
            order_dict['customer'] = order.customer.to_dict() if order.customer else None
            order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None
            if order.delivery:
                order_dict['delivery'] = order.delivery.to_dict()
            orders_data.append(order_dict)

        return jsonify({
            'orders': orders_data,
            'count': len(orders_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_queries_bp.route('/estimate-fee', methods=['POST'])
@jwt_required()
def estimate_fee():
    """Estima o frete de entrega sem criar o pedido"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        delivery_address = data.get('delivery_address')
        if not delivery_address:
            return jsonify({'error': 'Endereço de entrega é obrigatório'}), 400

        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        # Buscar restaurante
        restaurant = None
        if data.get('restaurant_id'):
            restaurant = Restaurant.query.get(data['restaurant_id'])
        elif user and user.user_type == UserType.CLIENT:
            customer_profile = Customer.query.filter_by(user_id=user.id).first()
            if customer_profile:
                restaurant = find_restaurant_by_name(customer_profile.name)

        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 400

        # Geocodificar endereço de entrega
        from src.services.geocoding import geocode_address, get_route_distance_with_fallback
        city_hint = None
        if restaurant.square_id:
            from src.models.portal_models import Square
            square = Square.query.get(restaurant.square_id)
            if square:
                city_hint = square.city

        # Se não tem city_hint do restaurante, usar cidade do endereço
        if not city_hint:
            city_hint = data.get('delivery_city')

        # Permitir coordenadas manuais (quando usuário ajusta pino no mapa)
        manual_lat = data.get('latitude')
        manual_lng = data.get('longitude')

        if manual_lat and manual_lng:
            # Usuário forneceu coordenadas do pino no mapa
            del_lat = float(manual_lat)
            del_lng = float(manual_lng)
            is_approximate = False
        else:
            # Tentar geocodificar o endereço
            geo_del = geocode_address(delivery_address, city_hint=city_hint)
            del_lat = geo_del['latitude'] if geo_del else None
            del_lng = geo_del['longitude'] if geo_del else None
            is_approximate = geo_del.get('is_approximate', False) if geo_del else False

        # Calcular distância REAL (rota) com fallback para Haversine
        distance_km = 0
        duration_min = 0
        distance_source = 'none'

        if del_lat and del_lng and restaurant.latitude and restaurant.longitude:
            route_info = get_route_distance_with_fallback(
                float(restaurant.latitude), float(restaurant.longitude),
                float(del_lat), float(del_lng)
            )
            distance_km = route_info['distance_km']
            duration_min = route_info['duration_min']
            distance_source = route_info['source']

        # Calcular frete
        delivery_fee = 0
        price_per_km = 2.95
        fixed_fee = 0
        min_km = 4.0

        logger.info(f"[FRETE] Distancia OSRM: {distance_km} km")

        if restaurant.pricing_table_id:
            from src.models.portal_models import PricingTable
            pt = PricingTable.query.get(restaurant.pricing_table_id)
            if pt:
                fixed_fee = float(pt.fixed_fee or 0)
                if fixed_fee > 0:
                    # Tarifa fixa: valor independente da distância
                    delivery_fee = fixed_fee
                    logger.info(f"[FRETE] Tarifa fixa (pricing table): R${fixed_fee}")
                elif pt.price_per_km:
                    price_per_km = float(pt.price_per_km)
                    min_km = float(pt.min_distance_km or 4.0)
                    km_total = max(distance_km, min_km)
                    delivery_fee = round(km_total * price_per_km, 2)
                    logger.info(f"[FRETE] Pricing table: price_per_km={price_per_km}, min_km={min_km}, km_total={km_total}, fee={delivery_fee}")
                    if pt.min_delivery_fee:
                        delivery_fee = max(delivery_fee, float(pt.min_delivery_fee))
                    if pt.max_delivery_fee:
                        delivery_fee = min(delivery_fee, float(pt.max_delivery_fee))
        elif restaurant.square_id:
            from src.models.portal_models import Square
            sq = Square.query.get(restaurant.square_id)
            if sq:
                fixed_fee = float(sq.fixed_fee or 0)
                if fixed_fee > 0:
                    delivery_fee = fixed_fee
                    logger.info(f"[FRETE] Tarifa fixa (square): R${fixed_fee}")
                elif sq.price_per_km:
                    price_per_km = float(sq.price_per_km)
                    min_km = float(sq.min_distance_km or 4.0)
                    km_total = max(distance_km, min_km)
                    delivery_fee = round(km_total * price_per_km, 2)
                    logger.info(f"[FRETE] Square: price_per_km={price_per_km}, min_km={min_km}, km_total={km_total}, fee={delivery_fee}")
        else:
            logger.info(f"[FRETE] Usando padrao: price_per_km={price_per_km}, min_km={min_km}")
            km_total = max(distance_km, min_km)
            delivery_fee = round(km_total * price_per_km, 2)

        # Aplicar taxas dinâmicas (chuva, demanda alta, feriado)
        if restaurant.square_id:
            from src.models.portal_models import DynamicPricing
            dp = DynamicPricing.query.filter_by(square_id=restaurant.square_id).first()
            if dp:
                extras = []
                if dp.rainy_day_active:
                    delivery_fee += float(dp.rainy_day_bonus or 0)
                    extras.append(f"chuva +R${dp.rainy_day_bonus}")
                if dp.high_demand_active:
                    delivery_fee += float(dp.high_demand_bonus or 0)
                    extras.append(f"alta demanda +R${dp.high_demand_bonus}")
                if dp.holiday_active:
                    delivery_fee += float(dp.holiday_bonus or 0)
                    extras.append(f"feriado +R${dp.holiday_bonus}")
                if extras:
                    logger.info(f"[FRETE] Taxas dinâmicas: {', '.join(extras)}")

        response_data = {
            'distance_km': round(distance_km, 2),
            'duration_min': round(duration_min, 1),
            'delivery_fee': delivery_fee,
            'price_per_km': price_per_km,
            'min_distance_km': min_km,
            'distance_source': distance_source,
            'is_approximate': is_approximate,
            'latitude': del_lat,
            'longitude': del_lng
        }

        if is_approximate:
            response_data['needs_pin_adjustment'] = True
            response_data['warning'] = 'Endereço não encontrado com precisão. Ajuste o pino no mapa para o local exato da entrega.'

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_queries_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_details(order_id):
    """Obtém detalhes de um pedido específico"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verifica permissão
        if user.user_type == UserType.DRIVER and (not user.driver or order.driver_id != user.driver.id):
            return jsonify({'error': 'Acesso negado'}), 403

        order_dict = order.to_dict()
        order_dict['restaurant'] = order.restaurant.to_dict() if order.restaurant else None
        order_dict['customer'] = order.customer.to_dict() if order.customer else None
        order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None

        if order.delivery:
            order_dict['delivery'] = order.delivery.to_dict()

        if order.driver:
            order_dict['driver'] = {
                'id': order.driver.id,
                'name': f"{order.driver.user.first_name} {order.driver.user.last_name}" if order.driver.user else 'N/A',
                'phone': order.driver.user.phone if order.driver.user else None,
                'vehicle_type': order.driver.vehicle_type.value if order.driver.vehicle_type else None,
                'vehicle_plate': order.driver.vehicle_plate,
                'rating': float(order.driver.rating)
            }

        return jsonify(order_dict), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


