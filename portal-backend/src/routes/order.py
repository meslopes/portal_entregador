from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    Order, Restaurant, Customer, Address, Driver, User, UserType, 
    OrderStatus, PaymentMethod, Delivery, Notification, NotificationType, db
)
from sqlalchemy import func
from datetime import datetime, timedelta
import uuid
import os
import base64

order_bp = Blueprint('order', __name__)

@order_bp.route('/available', methods=['GET'])
@jwt_required()
def get_available_orders():
    """Obtém pedidos disponíveis para o entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver or not driver.is_online:
            return jsonify({'error': 'Entregador deve estar online'}), 400
        
        # Busca pedidos pendentes próximos ao entregador
        available_orders = Order.query.filter(
            Order.status == OrderStatus.PENDING,
            Order.driver_id.is_(None)
        ).join(Restaurant).all()
        
        orders_data = []
        for order in available_orders:
            # Calcula distância aproximada do entregador ao restaurante
            if driver.current_latitude and driver.current_longitude:
                lat_diff = abs(float(order.restaurant.latitude) - float(driver.current_latitude))
                lng_diff = abs(float(order.restaurant.longitude) - float(driver.current_longitude))
                distance_to_restaurant = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111
                
                # Só mostra pedidos dentro de um raio de 200km
                if distance_to_restaurant > 200:
                    continue
            else:
                distance_to_restaurant = 0
            
            order_dict = order.to_dict()
            order_dict['restaurant'] = order.restaurant.to_dict()
            order_dict['customer'] = order.customer.to_dict()
            order_dict['delivery_address'] = order.delivery_address.to_dict()
            order_dict['distance_to_restaurant_km'] = round(distance_to_restaurant, 2)
            
            # Calcula distância do restaurante ao cliente
            if order.restaurant.latitude and order.delivery_address.latitude:
                lat_diff = abs(float(order.restaurant.latitude) - float(order.delivery_address.latitude))
                lng_diff = abs(float(order.restaurant.longitude) - float(order.delivery_address.longitude))
                delivery_distance = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111
                order_dict['delivery_distance_km'] = round(delivery_distance, 2)
                
                # Estima tempo de entrega (assumindo 30 km/h de velocidade média)
                estimated_time = (delivery_distance / 30) * 60  # em minutos
                order_dict['estimated_delivery_time_minutes'] = round(estimated_time, 0)
            
            orders_data.append(order_dict)
        
        # Ordena por proximidade
        orders_data.sort(key=lambda x: x.get('distance_to_restaurant_km', 999))
        
        return jsonify({
            'orders': orders_data,
            'count': len(orders_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_bp.route('/<int:order_id>/accept', methods=['POST'])
@jwt_required()
def accept_order(order_id):
    """Aceita um pedido"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver or not driver.is_online:
            return jsonify({'error': 'Entregador deve estar online'}), 400
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        if order.status != OrderStatus.PENDING or order.driver_id:
            return jsonify({'error': 'Pedido não está disponível'}), 400
        
        # Atribui o pedido ao entregador
        order.driver_id = driver.id
        order.status = OrderStatus.ACCEPTED
        order.updated_at = datetime.utcnow()
        
        # Cria registro de entrega
        delivery = Delivery(
            order_id=order.id,
            driver_id=driver.id,
            pickup_latitude=order.restaurant.latitude,
            pickup_longitude=order.restaurant.longitude,
            delivery_latitude=order.delivery_address.latitude,
            delivery_longitude=order.delivery_address.longitude
        )
        
        # Calcula ganhos estimados do entregador (70% da taxa de entrega + bônus por distância)
        base_earning = float(order.delivery_fee) * 0.7
        if delivery.delivery_latitude and delivery.pickup_latitude:
            lat_diff = abs(float(delivery.delivery_latitude) - float(delivery.pickup_latitude))
            lng_diff = abs(float(delivery.delivery_longitude) - float(delivery.pickup_longitude))
            distance = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111
            delivery.distance_km = distance
            delivery.driver_earnings = base_earning + (distance * 0.5)  # R$ 0.50 por km
        else:
            delivery.driver_earnings = base_earning
        
        db.session.add(delivery)

        # Cria notificação para o cliente (usa user_id do customer, não o customer_id)
        customer_user_id = order.customer.user_id if order.customer and order.customer.user_id else None
        if customer_user_id:
            notification = Notification(
                user_id=customer_user_id,
                title="Pedido aceito",
                message=f"Seu pedido #{order.order_number} foi aceito por um entregador",
                type=NotificationType.ORDER_UPDATE,
                related_id=order.id
            )
            db.session.add(notification)

        db.session.commit()
        
        order_dict = order.to_dict()
        order_dict['restaurant'] = order.restaurant.to_dict()
        order_dict['customer'] = order.customer.to_dict()
        order_dict['delivery_address'] = order.delivery_address.to_dict()
        order_dict['delivery'] = delivery.to_dict()
        
        return jsonify({
            'message': 'Pedido aceito com sucesso',
            'order': order_dict
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@order_bp.route('/<int:order_id>/reject', methods=['POST'])
@jwt_required()
def reject_order(order_id):
    """Recusa um pedido - envia para o proximo entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        if order.status != OrderStatus.PENDING:
            return jsonify({'error': 'Pedido não está pendente'}), 400

        # Busca proximo entregador disponivel (excluindo o que recusou)
        from src.models.portal_models import SystemConfig
        
        # Registra que este entregador recusou (usa special_instructions como flag)
        reject_log = f"REJECTED_BY_{user_id}"
        current_log = order.special_instructions or ''
        if reject_log not in current_log:
            order.special_instructions = f"{current_log}|{reject_log}" if current_log else reject_log

        # Busca proximo entregador
        next_driver = find_nearest_available_driver(order, exclude_driver_ids=[user_id])
        
        if next_driver:
            # Notifica o proximo entregador
            try:
                from src.services.whatsapp import whatsapp_service
                if whatsapp_service.is_configured() and next_driver.user.phone:
                    restaurant = order.restaurant
                    whatsapp_service.send_new_order_to_driver(
                        next_driver.user.phone,
                        {
                            'order_number': order.order_number,
                            'restaurant': restaurant.name,
                            'total_amount': float(order.total_amount),
                            'delivery_fee': float(order.delivery_fee)
                        }
                    )
            except Exception:
                pass
            
            db.session.commit()
            return jsonify({
                'message': 'Pedido recusado. Enviado para o próximo entregador.',
                'next_driver': next_driver.user.first_name
            }), 200
        else:
            # Nenhum entregador disponivel - notifica admin
            db.session.commit()
            notify_admin_no_drivers(order)
            return jsonify({
                'message': 'Pedido recusado. Nenhum entregador disponível no momento.',
                'notify_admin': True
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def notify_admin_no_drivers(order):
    """Notifica admin quando nenhum entregador aceita o pedido"""
    try:
        from src.models.portal_models import SystemConfig
        
        # Conta quantas vezes o pedido foi recusado
        reject_count = 0
        if order.special_instructions:
            reject_count = order.special_instructions.count('REJECTED_BY_')
        
        # Notifica via WhatsApp se configurado
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured():
                admin_phone_config = SystemConfig.query.filter_by(config_key='admin_phone').first()
                if admin_phone_config:
                    whatsapp_service.send_message(
                        admin_phone_config.config_value,
                        f"⚠️ *ALERTA: Pedido sem entregador*\n\n"
                        f"Pedido: #{order.order_number}\n"
                        f"Restaurante: {order.restaurant.name}\n"
                        f"Recusado por: {reject_count} entregador(es)\n\n"
                        f"Ação necessária: Atribuir entregador manualmente."
                    )
        except Exception:
            pass

        # Notifica via sistema
        admin_users = User.query.filter_by(user_type=UserType.ADMIN).all()
        for admin in admin_users:
            notification = Notification(
                user_id=admin.id,
                title="Pedido sem entregador",
                message=f"Pedido #{order.order_number} foi recusado por {reject_count} entregadores. Ação necessária.",
                type=NotificationType.SYSTEM,
                related_id=order.id
            )
            db.session.add(notification)
        
        db.session.commit()
    except Exception as e:
        print(f"Erro ao notificar admin: {e}")

@order_bp.route('/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    """Atualiza o status do pedido"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        if order.driver_id != driver.id:
            return jsonify({'error': 'Pedido não pertence a este entregador'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status é obrigatório'}), 400
        
        try:
            new_status_enum = OrderStatus(new_status)
        except ValueError:
            return jsonify({'error': 'Status inválido'}), 400
        
        # Validações de transição de status
        valid_transitions = {
            OrderStatus.PENDING: [OrderStatus.CANCELLED],
            OrderStatus.ACCEPTED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
            OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
            OrderStatus.READY: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
            OrderStatus.PICKED_UP: [OrderStatus.DELIVERED]
        }
        
        if order.status not in valid_transitions or new_status_enum not in valid_transitions[order.status]:
            return jsonify({'error': 'Transição de status inválida'}), 400
        
        # Atualiza o status
        order.status = new_status_enum
        order.updated_at = datetime.utcnow()
        
        # Registra timestamps específicos
        if new_status_enum == OrderStatus.PICKED_UP:
            order.pickup_time = datetime.utcnow()
        elif new_status_enum == OrderStatus.DELIVERED:
            order.delivery_time = datetime.utcnow()
            
            # Atualiza estatísticas do entregador
            driver.total_deliveries += 1
            
            # Salva prova de entrega (foto) se fornecida
            proof_url = None
            proof_data = data.get('proof_of_delivery')
            if proof_data and order.delivery:
                try:
                    # Cria pasta de uploads se nao existir
                    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'proofs')
                    os.makedirs(uploads_dir, exist_ok=True)
                    
                    # Decodifica base64 e salva
                    if ',' in proof_data:
                        proof_data = proof_data.split(',')[1]
                    
                    filename = f"proof_{order.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                    filepath = os.path.join(uploads_dir, filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(base64.b64decode(proof_data))
                    
                    proof_url = f"/uploads/proofs/{filename}"
                    order.delivery.proof_of_delivery_url = proof_url
                except Exception as e:
                    print(f"Erro ao salvar prova de entrega: {e}")
            
            # Cria pagamento para o entregador
            if order.delivery:
                from src.models.portal_models import Payment, PaymentType, PaymentStatus
                payment = Payment(
                    driver_id=driver.id,
                    amount=order.delivery.driver_earnings,
                    payment_type=PaymentType.DELIVERY_EARNING,
                    reference_id=order.delivery.id,
                    payment_method=PaymentMethod.PIX,
                    status=PaymentStatus.PENDING
                )
                db.session.add(payment)
        
        # Cria notificação
        status_messages = {
            OrderStatus.PREPARING: "Seu pedido está sendo preparado",
            OrderStatus.READY: "Seu pedido está pronto para retirada",
            OrderStatus.PICKED_UP: "Seu pedido foi coletado e está a caminho",
            OrderStatus.DELIVERED: "Seu pedido foi entregue",
            OrderStatus.CANCELLED: "Seu pedido foi cancelado"
        }

        if new_status_enum in status_messages:
            # Busca o user_id do customer (não o customer_id)
            customer_user_id = None
            if order.customer and hasattr(order.customer, 'user_id'):
                customer_user_id = order.customer.user_id

            if customer_user_id:
                notification = Notification(
                    user_id=customer_user_id,
                    title="Atualização do pedido",
                    message=status_messages[new_status_enum],
                    type=NotificationType.ORDER_UPDATE,
                    related_id=order.id
                )
                db.session.add(notification)

        # Logica de cancelamento
        if new_status_enum == OrderStatus.CANCELLED:
            if order.driver_id:
                order.driver_id = None
            if order.delivery:
                db.session.delete(order.delivery)

        db.session.commit()
        
        # Envia notificacao WhatsApp (se configurado)
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and order.customer and order.customer.phone:
                whatsapp_service.send_order_notification(
                    order.customer.phone, order.order_number, new_status_enum.value
                )
        except Exception:
            pass

        return jsonify({
            'message': 'Status atualizado com sucesso',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@order_bp.route('/<int:order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_id):
    """Cancela um pedido (pelo estabelecimento ou admin)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verifica permissao
        if user.user_type == UserType.CLIENT:
            customer_profile = Customer.query.filter_by(user_id=user.id).first()
            if not customer_profile:
                return jsonify({'error': 'Perfil não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
            if not restaurant or order.restaurant_id != restaurant.id:
                return jsonify({'error': 'Pedido não pertence a este estabelecimento'}), 403
        elif user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Sem permissão para cancelar'}), 403

        # Verifica se pode cancelar
        cancelable_statuses = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]
        if order.status not in cancelable_statuses:
            return jsonify({'error': f'Não é possível cancelar pedido com status {order.status.value}'}), 400

        # Cancela
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        order.driver_id = None

        if order.delivery:
            db.session.delete(order.delivery)

        # Notifica
        if order.customer and order.customer.user_id:
            notification = Notification(
                user_id=order.customer.user_id,
                title="Pedido cancelado",
                message=f"O pedido #{order.order_number} foi cancelado",
                type=NotificationType.ORDER_UPDATE,
                related_id=order.id
            )
            db.session.add(notification)

        db.session.commit()

        return jsonify({
            'message': 'Pedido cancelado com sucesso',
            'order': order.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@order_bp.route('/current', methods=['GET'])
@jwt_required()
def get_current_order():
    """Obtém o pedido atual do entregador"""
    try:
        user_id = int(get_jwt_identity())
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
        order_dict['restaurant'] = current_order.restaurant.to_dict()
        order_dict['customer'] = current_order.customer.to_dict()
        order_dict['delivery_address'] = current_order.delivery_address.to_dict()
        
        if current_order.delivery:
            order_dict['delivery'] = current_order.delivery.to_dict()
        
        return jsonify({
            'order': order_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    """Cria um novo pedido"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        data = request.get_json()

        # Se for estabelecimento (CLIENT), usa o restaurante vinculado ao seu customer profile
        if user and user.user_type == UserType.CLIENT:
            customer_profile = Customer.query.filter_by(user_id=user.id).first()
            if not customer_profile:
                return jsonify({'error': 'Perfil de estabelecimento não encontrado'}), 400

            # Busca ou cria restaurante para este estabelecimento
            restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
            if not restaurant:
                restaurant = Restaurant(
                    name=customer_profile.name,
                    address=data.get('establishment_address', 'Endereço não informado'),
                    latitude=data.get('establishment_latitude', -29.95),
                    longitude=data.get('establishment_longitude', -50.45),
                    phone=customer_profile.phone
                )
                db.session.add(restaurant)
                db.session.flush()
        else:
            # Admin criando pedido (para testes)
            restaurant = Restaurant.query.filter_by(name=data['restaurant_name']).first()
            if not restaurant:
                restaurant = Restaurant(
                    name=data['restaurant_name'],
                    address=data['restaurant_address'],
                    latitude=data['restaurant_latitude'],
                    longitude=data['restaurant_longitude'],
                    phone=data.get('restaurant_phone', '(11) 99999-9999')
                )
                db.session.add(restaurant)
                db.session.flush()

        # Busca ou cria cliente final
        customer = Customer.query.filter_by(phone=data['customer_phone']).first()
        if not customer:
            customer = Customer(
                name=data['customer_name'],
                phone=data['customer_phone'],
                email=data.get('customer_email')
            )
            db.session.add(customer)
            db.session.flush()

        # Cria endereço de entrega
        address = Address(
            customer_id=customer.id,
            street=data['delivery_address'],
            neighborhood=data['delivery_neighborhood'],
            city=data.get('delivery_city', 'Porto Alegre'),
            state=data.get('delivery_state', 'RS'),
            zip_code=data.get('delivery_zip_code', '90000-000'),
            latitude=data.get('delivery_latitude'),
            longitude=data.get('delivery_longitude')
        )
        db.session.add(address)
        db.session.flush()

        # Cria o pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=address.id,
            order_number=f"PED{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            items=data['items'],
            subtotal=data['subtotal'],
            delivery_fee=data.get('delivery_fee', 0),
            total_amount=data['total_amount'],
            payment_method=PaymentMethod(data['payment_method']),
            special_instructions=data.get('special_instructions')
        )

        db.session.add(order)
        db.session.flush()

        # Atribuicao inteligente: notifica o entregador mais proximo (NAO aceita automaticamente)
        notified_driver = find_nearest_available_driver(order)
        if notified_driver:
            # Notifica o entregador selecionado (pedido continua PENDING)
            try:
                from src.services.whatsapp import whatsapp_service
                if whatsapp_service.is_configured() and notified_driver.user.phone:
                    whatsapp_service.send_new_order_to_driver(
                        notified_driver.user.phone,
                        {
                            'order_number': order.order_number,
                            'restaurant': restaurant.name,
                            'total_amount': float(order.total_amount),
                            'delivery_fee': float(order.delivery_fee)
                        }
                    )
            except Exception:
                pass

        db.session.commit()

        # Envia notificacao WhatsApp ao cliente (se configurado)
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and customer.phone:
                whatsapp_service.send_order_notification(
                    customer.phone, order.order_number, order.status.value
                )
        except Exception:
            pass  # Nao falha o pedido se WhatsApp falhar

        return jsonify({
            'message': 'Pedido criado com sucesso',
            'order': order.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@order_bp.route('/<int:order_id>', methods=['GET'])
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
        if user.user_type == UserType.DRIVER:
            if order.driver_id != user.driver.id:
                return jsonify({'error': 'Acesso negado'}), 403
        
        order_dict = order.to_dict()
        order_dict['restaurant'] = order.restaurant.to_dict()
        order_dict['customer'] = order.customer.to_dict()
        order_dict['delivery_address'] = order.delivery_address.to_dict()
        
        if order.delivery:
            order_dict['delivery'] = order.delivery.to_dict()
        
        if order.driver:
            order_dict['driver'] = {
                'id': order.driver.id,
                'name': f"{order.driver.user.first_name} {order.driver.user.last_name}",
                'phone': order.driver.user.phone,
                'vehicle_type': order.driver.vehicle_type.value,
                'vehicle_plate': order.driver.vehicle_plate,
                'rating': float(order.driver.rating)
            }
        
        return jsonify(order_dict), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# ROTAS DO ESTABELECIMENTO
# ============================================

@order_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_orders():
    """Obtém pedidos do estabelecimento logado"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        # Busca o customer profile vinculado ao user
        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'orders': [], 'total': 0}), 200

        # Busca o restaurante vinculado ao estabelecimento
        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            return jsonify({'orders': [], 'total': 0}), 200

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status_filter = request.args.get('status')

        query = Order.query.filter_by(restaurant_id=restaurant.id)

        if status_filter:
            try:
                status_enum = OrderStatus(status_filter)
                query = query.filter(Order.status == status_enum)
            except ValueError:
                pass

        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        orders_data = []
        for order in orders.items:
            order_dict = order.to_dict()
            order_dict['customer'] = order.customer.to_dict()
            order_dict['delivery_address'] = order.delivery_address.to_dict()
            if order.driver:
                order_dict['driver'] = {
                    'id': order.driver.id,
                    'name': f"{order.driver.user.first_name} {order.driver.user.last_name}",
                    'phone': order.driver.user.phone
                }
            if order.delivery:
                order_dict['delivery'] = order.delivery.to_dict()
            orders_data.append(order_dict)

        return jsonify({
            'orders': orders_data,
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/my/stats', methods=['GET'])
@jwt_required()
def get_my_stats():
    """Obtém estatísticas do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'today_orders': 0, 'week_orders': 0, 'total_orders': 0, 'total_revenue': 0}), 200

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            return jsonify({'today_orders': 0, 'week_orders': 0, 'total_orders': 0, 'total_revenue': 0}), 200

        today = datetime.utcnow().date()
        week_ago = datetime.utcnow() - timedelta(days=7)

        today_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            func.date(Order.created_at) == today
        ).count()

        week_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= week_ago
        ).count()

        total_orders = Order.query.filter_by(restaurant_id=restaurant.id).count()

        total_revenue = db.session.query(func.sum(Order.total_amount)).filter_by(
            restaurant_id=restaurant.id
        ).scalar() or 0

        # Pedidos em andamento
        active_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status.in_([
                OrderStatus.PENDING,
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ])
        ).count()

        return jsonify({
            'today_orders': today_orders,
            'week_orders': week_orders,
            'total_orders': total_orders,
            'total_revenue': float(total_revenue),
            'active_orders': active_orders
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# RASTREAMENTO DE ENTREGADORES (ESTABELECIMENTO)
# ============================================

@order_bp.route('/my/tracking', methods=['GET'])
@jwt_required()
def get_my_tracking():
    """Obtém localização dos entregadores com pedidos ativos do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'drivers': []}), 200

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            return jsonify({'drivers': []}), 200

        # Busca pedidos ativos (ACCEPTED ate PICKED_UP)
        active_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status.in_([
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ]),
            Order.driver_id.isnot(None)
        ).all()

        drivers_data = []
        seen_drivers = set()

        for order in active_orders:
            driver = order.driver
            if not driver or driver.id in seen_drivers:
                continue
            seen_drivers.add(driver.id)

            if driver.current_latitude and driver.current_longitude:
                drivers_data.append({
                    'driver_id': driver.id,
                    'name': f"{driver.user.first_name} {driver.user.last_name}",
                    'phone': driver.user.phone,
                    'vehicle_type': driver.vehicle_type.value,
                    'latitude': float(driver.current_latitude),
                    'longitude': float(driver.current_longitude),
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'order_status': order.status.value,
                    'last_update': driver.last_location_update.isoformat() if driver.last_location_update else None
                })

        return jsonify({'drivers': drivers_data}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# FINANCEIRO DO ESTABELECIMENTO
# ============================================

@order_bp.route('/my/financial', methods=['GET'])
@jwt_required()
def get_my_financial():
    """Financeiro do estabelecimento: o que deve ao admin"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'error': 'Perfil não encontrado'}), 404

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        now = datetime.utcnow()

        # Total de frete acumulado (o que deve ao admin)
        total_owed = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED
        ).scalar() or 0

        # Frete desta semana (segunda a domingo)
        days_since_monday = now.weekday()
        week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        week_owed = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= week_start
        ).scalar() or 0

        # Frete do mes
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_owed = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= month_start
        ).scalar() or 0

        # Total de entregas
        total_deliveries = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED
        ).count()

        # Entregas esta semana
        week_deliveries = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= week_start
        ).count()

        # Historico semanal (ultimas 4 semanas)
        weekly_history = []
        for i in range(4):
            w_start = week_start - timedelta(weeks=i)
            w_end = w_start + timedelta(days=7)
            w_fee = db.session.query(func.sum(Order.delivery_fee)).filter(
                Order.restaurant_id == restaurant.id,
                Order.status == OrderStatus.DELIVERED,
                Order.created_at >= w_start,
                Order.created_at < w_end
            ).scalar() or 0
            w_orders = Order.query.filter(
                Order.restaurant_id == restaurant.id,
                Order.status == OrderStatus.DELIVERED,
                Order.created_at >= w_start,
                Order.created_at < w_end
            ).count()
            weekly_history.append({
                'week_start': w_start.date().isoformat(),
                'week_end': w_end.date().isoformat(),
                'delivery_fees': float(w_fee),
                'orders': w_orders
            })

        return jsonify({
            'total_owed': float(total_owed),
            'week_owed': float(week_owed),
            'month_owed': float(month_owed),
            'total_deliveries': total_deliveries,
            'week_deliveries': week_deliveries,
            'weekly_history': weekly_history
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# AVALIACAO DE ENTREGA
# ============================================

@order_bp.route('/<int:order_id>/rate', methods=['POST'])
@jwt_required()
def rate_delivery(order_id):
    """Avalia a entrega de um pedido (pelo estabelecimento)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Apenas estabelecimentos podem avaliar'}), 403

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verifica se o pedido pertence ao estabelecimento
        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'error': 'Perfil não encontrado'}), 404

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant or order.restaurant_id != restaurant.id:
            return jsonify({'error': 'Pedido não pertence a este estabelecimento'}), 403

        # Verifica se ja foi avaliado
        if order.delivery and order.delivery.customer_rating:
            return jsonify({'error': 'Pedido já foi avaliado'}), 400

        # Verifica se esta entregue
        if order.status != OrderStatus.DELIVERED:
            return jsonify({'error': 'Apenas pedidos entregues podem ser avaliados'}), 400

        data = request.get_json()
        rating = data.get('rating')
        feedback = data.get('feedback', '')

        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Avaliação deve ser um número de 1 a 5'}), 400

        # Atualiza a avaliacao na entrega
        if order.delivery:
            order.delivery.customer_rating = rating
            order.delivery.customer_feedback = feedback
            order.delivery.updated_at = datetime.utcnow()

            # Atualiza a media de avaliacao do entregador
            driver = order.delivery.driver
            if driver:
                avg_rating = db.session.query(func.avg(Delivery.customer_rating)).filter(
                    Delivery.driver_id == driver.id,
                    Delivery.customer_rating.isnot(None)
                ).scalar()
                if avg_rating:
                    driver.rating = round(float(avg_rating), 2)
                driver.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': 'Avaliação registrada com sucesso',
            'rating': rating,
            'feedback': feedback
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# ATRIBUICAO INTELIGENTE DE PEDIDOS
# ============================================

def find_nearest_available_driver(order, exclude_driver_ids=None):
    """
    Busca o entregador mais proximo que esteja disponivel.
    
    Logica:
    1. Busca todos os entregadores online
    2. Filtra por: distancia maxima e pedidos ativos < max_concurrent_orders
    3. Exclui entregadores que ja recusaram (exclude_driver_ids)
    4. Ordena por distancia ate o restaurante
    5. Retorna o mais proximo
    """
    try:
        from src.models.portal_models import SystemConfig

        if exclude_driver_ids is None:
            exclude_driver_ids = []

        # Busca configuracao de raio maximo
        config = SystemConfig.query.filter_by(config_key='delivery_radius').first()
        max_radius = float(config.config_value) if config else 200.0

        # Coordenadas do restaurante
        rest_lat = float(order.restaurant.latitude) if order.restaurant.latitude else None
        rest_lng = float(order.restaurant.longitude) if order.restaurant.longitude else None

        if not rest_lat or not rest_lng:
            return None

        # Busca entregadores online
        online_drivers = Driver.query.filter(
            Driver.is_online == True,
            Driver.current_latitude.isnot(None),
            Driver.current_longitude.isnot(None)
        ).all()

        available_drivers = []

        for driver in online_drivers:
            # Pula entregadores que ja recusaram
            if driver.id in exclude_driver_ids:
                continue

            # Calcula distancia ate o restaurante
            driver_lat = float(driver.current_latitude)
            driver_lng = float(driver.current_longitude)

            lat_diff = abs(driver_lat - rest_lat)
            lng_diff = abs(driver_lng - rest_lng)
            distance = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111

            if distance > max_radius:
                continue

            # Conta pedidos ativos do entregador
            active_orders = Order.query.filter(
                Order.driver_id == driver.id,
                Order.status.in_([
                    OrderStatus.ACCEPTED,
                    OrderStatus.PREPARING,
                    OrderStatus.READY,
                    OrderStatus.PICKED_UP
                ])
            ).count()

            # Verifica se tem capacidade
            max_concurrent = driver.max_concurrent_orders or 3
            if active_orders >= max_concurrent:
                continue

            available_drivers.append({
                'driver': driver,
                'distance': distance,
                'active_orders': active_orders
            })

        if not available_drivers:
            return None

        # Ordena por distancia (mais proximo primeiro)
        available_drivers.sort(key=lambda x: x['distance'])

        return available_drivers[0]['driver']

    except Exception as e:
        print(f"Erro na atribuicao inteligente: {e}")
        return None

