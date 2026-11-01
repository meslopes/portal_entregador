"""Webhooks e processamento do iFood.

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from src.models.portal_models import (
    Address,
    Customer,
    Order,
    OrderStatus,
    PaymentMethod,
    Restaurant,
    db,
)

logger = logging.getLogger(__name__)


webhooks_ifood_bp = Blueprint('ifood', __name__)


@webhooks_ifood_bp.route('/ifood', methods=['POST'])
def ifood_webhook():
    """
    Webhook para receber pedidos do iFood.
    Suporta formato real do iFood (Open Delivery) e formato adaptado.
    """
    try:
        # Verificar autenticação do webhook (apenas headers, não query string por segurança)
        from src.models.portal_models import SystemConfig
        ifood_token_config = SystemConfig.query.filter_by(config_key='ifood_webhook_token').first()
        if ifood_token_config and ifood_token_config.config_value:
            # Verificar token no header Authorization ou X-Webhook-Token (NÃO query string)
            auth_header = request.headers.get('Authorization', '')
            webhook_token = request.headers.get('X-Webhook-Token', '')

            expected_token = ifood_token_config.config_value
            token_provided = auth_header.replace('Bearer ', '') or webhook_token

            if not token_provided or token_provided != expected_token:
                logger.warning("iFood webhook: token de autenticação inválido ou ausente")
                return jsonify({'error': 'Não autorizado'}), 401

        # Log raw body for debugging
        raw_body = request.get_data(as_text=True)
        logger.info(f"iFood webhook RAW: {raw_body}")

        data = request.get_json(silent=True)
        if not data:
            logger.warning(f"iFood webhook: JSON parse falhou. Raw: {raw_body}")
            return jsonify({'error': 'Dados não fornecidos ou JSON inválido'}), 400

        logger.info(f"iFood webhook JSON: {data}")

        # Handle array of events (iFood sends arrays)
        if isinstance(data, list):
            logger.info(f"iFood webhook: array com {len(data)} eventos")
            results = []
            for event in data:
                result = process_ifood_event(event)
                results.append(result)
            return jsonify({'status': 'ok', 'results': results}), 200

        # Handle single event
        if isinstance(data, dict):
            # Check for iFood event format with 'type' field
            if 'type' in data:
                event_type = data.get('type', '').upper()
                logger.info(f"iFood webhook: evento tipo={event_type}")

                if event_type in ['PLACED', 'ORDER_PLACED']:
                    # Try to get order data from event, or fetch from API
                    order_data = data.get('order', {})
                    if isinstance(order_data, dict) and order_data.get('id'):
                        # We have order data in the event
                        return process_ifood_order_real(order_data)
                    else:
                        # Need to fetch from API
                        order_id = data.get('orderId') or data.get('id')
                        if order_id:
                            fetch_and_process_ifood_order(order_id)
                            return jsonify({'message': 'Pedido sendo processado'}), 200
                        else:
                            logger.error("Evento PLACED sem order_id")
                            return jsonify({'error': 'Evento sem order_id'}), 200

                elif event_type in ['CANCELLED', 'ORDER_CANCELLED', 'CANCELLATION_REQUESTED']:
                    order_id = data.get('orderId') or data.get('id')
                    if order_id:
                        process_ifood_cancellation_by_id(order_id)
                    return jsonify({'message': 'Cancelamento processado'}), 200

                elif event_type in ['CONFIRMED', 'DISPATCHED', 'DELIVERED']:
                    order_id = data.get('orderId') or data.get('id')
                    if order_id:
                        update_order_from_ifood_status_by_id(order_id, event_type)
                    return jsonify({'message': f'Evento {event_type} processado'}), 200

                else:
                    logger.warning(f"iFood webhook: tipo não reconhecido: {event_type}")
                    return jsonify({'message': f'Evento {event_type} ignorado'}), 200

            # Check for 'event' field (legacy format)
            if 'event' in data:
                event = data.get('event')
                order_data = data.get('data', {})
                if event == 'order_placed':
                    return process_ifood_order(order_data)
                elif event == 'order_cancelled':
                    return process_ifood_cancellation(order_data)
                return jsonify({'message': f'Evento {event} ignorado'}), 200

            # Check for order data directly
            if 'id' in data and 'merchant' in data:
                return process_ifood_order_real(data)

            # Check for orderId field
            if 'orderId' in data or 'order_id' in data:
                order_id = data.get('orderId') or data.get('order_id')
                fetch_and_process_ifood_order(order_id)
                return jsonify({'message': 'Pedido sendo processado'}), 200

            # Last resort: try to process as order
            logger.warning("iFood webhook: formato não reconhecido, tentando processar como pedido")
            try:
                return process_ifood_order_real(data)
            except Exception as e:
                logger.error(f"iFood webhook: falhou ao processar como pedido: {e}")
                return jsonify({'message': 'Evento recebido'}), 200

        return jsonify({'message': 'Evento recebido'}), 200

    except Exception as e:
        logger.error(f"Erro no webhook iFood: {e}")
        return jsonify({'error': str(e)}), 200


@webhooks_ifood_bp.route('/ifood/test', methods=['POST'])
def ifood_test_webhook():
    """Endpoint de teste para simular pedidos iFood (requer autenticação)"""
    try:
        # Verificar autenticação

        # Verificar token no header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token de autenticação necessário'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        logger.info(f"iFood TEST webhook: {data}")

        # Processar como pedido direto
        result = process_ifood_order_real(data)
        return result

    except Exception as e:
        logger.error(f"Erro no webhook iFood TEST: {e}")
        return jsonify({'error': str(e)}), 500


@webhooks_ifood_bp.route('/ifood/sandbox/generate', methods=['POST'])
def ifood_sandbox_generate():
    """
    Gera e processa um pedido de teste do iFood sandbox.

    Não requer credenciais reais do iFood — gera o pedido localmente
    no formato Open Delivery e processa como se viesse do webhook.

    Body (opcional):
        {
            "order_number": "123456",  // auto-gerado se omitido
            "restaurant_id": 7,        // ID do restaurante no sistema local
            "tenant_id": 2             // ID do tenant (para vincular o pedido)
        }
    """
    try:
        from src.services.ifood_service import IFOOD_SANDBOX_MERCHANT, generate_sandbox_order

        data = request.get_json() or {}
        order_number = data.get('order_number')
        restaurant_id = data.get('restaurant_id')
        tenant_id = data.get('tenant_id')

        # Gerar pedido de teste
        test_order = generate_sandbox_order(order_number)

        logger.info(f"iFood SANDBOX: Pedido gerado - {test_order['order']}")
        logger.info(f"iFood SANDBOX: Merchant ID = {IFOOD_SANDBOX_MERCHANT['id']}")

        # Buscar restaurante específico ou criar um para o tenant
        restaurant = None
        if restaurant_id:
            restaurant = Restaurant.query.get(restaurant_id)

        if not restaurant:
            # Buscar restaurante iFood existente pelo nome
            restaurant = Restaurant.query.filter_by(
                name=IFOOD_SANDBOX_MERCHANT['name']
            ).first()

            if not restaurant:
                # Criar restaurante iFood de teste vinculado ao tenant
                restaurant = Restaurant(
                    name=IFOOD_SANDBOX_MERCHANT['name'],
                    address='Rua Teste iFood, 100 - Canoas RS',
                    latitude=-29.9150,
                    longitude=-51.1780,
                    tenant_id=tenant_id,
                    is_active=True,
                )
                db.session.add(restaurant)
                db.session.flush()
                logger.info(f"iFood SANDBOX: Restaurante criado - {restaurant.name} (tenant: {tenant_id})")
            elif tenant_id and not restaurant.tenant_id:
                # Atualizar tenant do restaurante existente
                restaurant.tenant_id = tenant_id
                db.session.flush()

        # Processar o pedido (vai criar Customer, Address e Order)
        result = process_ifood_order_real(test_order)

        # Atualizar tenant_id do pedido criado
        if tenant_id:
            order = Order.query.filter_by(
                external_id=test_order['id'],
                platform_source='IFOOD'
            ).first()
            if order:
                order.tenant_id = tenant_id
                if not order.restaurant.tenant_id:
                    order.restaurant.tenant_id = tenant_id
                db.session.commit()
                logger.info(f"iFood SANDBOX: Pedido {order.order_number} vinculado ao tenant {tenant_id}")

        return jsonify({
            'success': True,
            'message': 'Pedido sandbox gerado e processado',
            'order_data': test_order,
            'restaurant_id': restaurant.id if restaurant else None,
            'tenant_id': tenant_id,
            'process_result': result.get_json() if hasattr(result, 'get_json') else str(result)
        }), 200

    except Exception as e:
        logger.error(f"Erro ao gerar pedido sandbox: {e}")
        return jsonify({'error': str(e)}), 500


@webhooks_ifood_bp.route('/ifood/sandbox/config', methods=['GET'])
def ifood_sandbox_config():
    """
    Retorna a configuração atual do ambiente iFood (sandbox/produção).
    Útil para verificar se o sandbox está configurado corretamente.
    """
    try:
        from src.services.ifood_service import IFOOD_SANDBOX_MERCHANT, get_environment_info

        env_info = get_environment_info()

        # Verificar se há credenciais configuradas
        creds = get_ifood_credentials()
        has_credentials = creds is not None

        return jsonify({
            'environment': env_info,
            'sandbox_merchant': IFOOD_SANDBOX_MERCHANT,
            'credentials_configured': has_credentials,
            'webhook_url': f"{request.host_url}api/webhooks/ifood",
            'test_url': f"{request.host_url}api/webhooks/ifood/sandbox/generate"
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_ifood_credentials(merchant_id=None):
    """Obtém credenciais do iFood do banco de dados"""
    from src.models.portal_models import SystemConfig
    try:
        # Buscar credenciais do iFood (suporta ambos os formatos de chave)
        api_key_config = SystemConfig.query.filter_by(config_key='ifood_api_key').first()
        client_id_config = SystemConfig.query.filter_by(config_key='ifood_client_id').first()
        client_secret_config = SystemConfig.query.filter_by(config_key='ifood_client_secret').first()

        # Priorizar ifood_api_key (formato do frontend)
        if api_key_config and api_key_config.config_value:
            # Se tem api_key, usar como client_id (para sandbox/teste)
            return {
                'client_id': api_key_config.config_value,
                'client_secret': api_key_config.config_value  # Em sandbox, mesmo valor
            }

        # Fallback para credenciais separadas
        if client_id_config and client_secret_config:
            return {
                'client_id': client_id_config.config_value,
                'client_secret': client_secret_config.config_value
            }

        # Sem credenciais configuradas
        logger.warning("Credenciais iFood não configuradas")
        return None
    except Exception as e:
        logger.error(f"Erro ao obter credenciais iFood: {e}")
        return None


def get_ifood_access_token():
    """Obtém access token do iFood"""
    from src.services.ifood_service import authenticate
    creds = get_ifood_credentials()
    if not creds:
        return None

    result = authenticate(creds['client_id'], creds['client_secret'])
    if result.get('success'):
        return result.get('access_token')
    else:
        logger.error(f"Erro ao autenticar com iFood: {result.get('error')}")
        return None


def process_ifood_event(event_data):
    """Processa um evento individual do iFood (formato Open Delivery)"""
    try:
        logger.info(f"Processando evento iFood: {event_data}")
        event_type = event_data.get('type', '').upper()

        # Extrair order data - pode estar em 'order' ou ser o próprio event_data
        order_ref = event_data.get('order', {})
        if isinstance(order_ref, str):
            # Se 'order' for uma string, é apenas o ID do pedido
            order_id = order_ref
        elif isinstance(order_ref, dict):
            order_id = order_ref.get('id')
        else:
            order_id = event_data.get('id')

        logger.info(f"Evento iFood: tipo={event_type}, order_id={order_id}")

        if event_type in ['PLACED', 'ORDER_PLACED']:
            # Buscar detalhes completos do pedido na API do iFood
            if order_id:
                fetch_and_process_ifood_order(order_id)
            else:
                logger.error("Evento PLACED sem order_id")
        elif event_type in ['CANCELLED', 'ORDER_CANCELLED', 'CANCELLATION_REQUESTED']:
            if order_id:
                process_ifood_cancellation_by_id(order_id)
        elif event_type in ['CONFIRMED', 'DISPATCHED', 'DELIVERED']:
            if order_id:
                update_order_from_ifood_status_by_id(order_id, event_type)
        else:
            logger.warning(f"Tipo de evento iFood não reconhecido: {event_type}")
    except Exception as e:
        logger.error(f"Erro ao processar evento iFood: {e}")


def fetch_and_process_ifood_order(order_id):
    """Busca detalhes do pedido no iFood e processa"""
    try:
        from src.services.ifood_service import get_order_details

        # Obter access token
        access_token = get_ifood_access_token()
        if not access_token:
            logger.error("Não foi possível obter access token do iFood")
            return

        # Buscar detalhes do pedido
        result = get_order_details(access_token, order_id)
        if not result.get('success'):
            logger.error(f"Erro ao buscar detalhes do pedido iFood {order_id}: {result.get('error')}")
            return

        order_data = result.get('data', {})
        logger.info(f"Detalhes do pedido iFood {order_id}: {order_data}")

        # Processar o pedido
        process_ifood_order_real(order_data)

    except Exception as e:
        logger.error(f"Erro ao buscar/processar pedido iFood {order_id}: {e}")


def process_ifood_cancellation_by_id(order_id):
    """Processa cancelamento de pedido iFood por ID"""
    try:
        # Buscar pedido no banco de dados
        order = Order.query.filter_by(external_id=order_id, platform_source='IFOOD').first()
        if not order:
            logger.warning(f"Pedido iFood {order_id} não encontrado para cancelamento")
            return

        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.now(timezone.utc)
        if order.driver_id:
            order.driver_id = None
        db.session.commit()
        logger.info(f"Pedido iFood {order.order_number} cancelado")

    except Exception as e:
        logger.error(f"Erro ao cancelar pedido iFood {order_id}: {e}")
        db.session.rollback()


def update_order_from_ifood_status_by_id(order_id, ifood_status):
    """Atualiza status de um pedido iFood por ID"""
    try:
        IFOOD_STATUS_MAP = {
            'CONFIRMED': 'ACCEPTED',
            'PREPARING': 'PREPARING',
            'READY': 'READY',
            'DISPATCHED': 'PICKED_UP',
            'DELIVERED': 'DELIVERED'
        }

        order = Order.query.filter_by(external_id=order_id, platform_source='IFOOD').first()
        if not order:
            logger.warning(f"Pedido iFood {order_id} não encontrado para atualização de status")
            return

        new_status = IFOOD_STATUS_MAP.get(ifood_status)
        if new_status and hasattr(OrderStatus, new_status):
            order.status = OrderStatus[new_status]
            order.updated_at = datetime.now(timezone.utc)
            db.session.commit()
            logger.info(f"Status do pedido iFood {order.order_number} atualizado para {new_status}")

    except Exception as e:
        logger.error(f"Erro ao atualizar status do pedido iFood {order_id}: {e}")
        db.session.rollback()


def process_ifood_order_real(order_data):
    """Processa um pedido no formato real do iFood (Open Delivery)"""
    try:
        from src.services.ifood_service import parse_ifood_order

        parsed = parse_ifood_order(order_data)
        if not parsed:
            logger.error(f"Erro ao parsear pedido iFood: {order_data}")
            return jsonify({'error': 'Erro ao processar pedido'}), 400

        logger.info(f"Pedido iFood parseado: {parsed}")

        # Buscar restaurante por nome (case-insensitive)
        restaurant = None
        if parsed.get('restaurant_name'):
            # Tentar busca exata primeiro
            restaurant = Restaurant.query.filter_by(name=parsed['restaurant_name']).first()

            # Se não encontrar, tentar case-insensitive
            if not restaurant:
                restaurant = Restaurant.query.filter(
                    Restaurant.name.ilike(parsed['restaurant_name'])
                ).first()

        if not restaurant:
            logger.warning(f"Restaurante não encontrado, criando novo: {parsed['restaurant_name']}")
            # Tentar encontrar tenant pelo merchant ID (iFood)
            tenant_id = None
            merchant_id = order_data.get('merchant', {}).get('id')
            if merchant_id:
                # Buscar restaurante existente com mesmo merchant_id para pegar o tenant
                existing = Restaurant.query.filter_by(external_merchant_id=merchant_id).first()
                if existing and existing.tenant_id:
                    tenant_id = existing.tenant_id

            restaurant = Restaurant(
                name=parsed['restaurant_name'],
                address=parsed['delivery_address'].get('street', 'Endereço não informado'),
                latitude=parsed['delivery_address'].get('latitude') or -29.95,
                longitude=parsed['delivery_address'].get('longitude') or -50.45,
                tenant_id=tenant_id
            )
            db.session.add(restaurant)
            db.session.flush()

        logger.info(f"Restaurante encontrado/criado: {restaurant.name} (ID: {restaurant.id})")

        # Buscar ou criar cliente
        customer = None
        if parsed['customer'].get('phone'):
            customer = Customer.query.filter_by(phone=parsed['customer']['phone']).first()
        if not customer:
            customer = Customer(
                name=parsed['customer']['name'],
                phone=parsed['customer']['phone'] or '00000000000'
            )
            db.session.add(customer)
            db.session.flush()

        # Criar endereço
        addr = Address(
            customer_id=customer.id,
            street=parsed['delivery_address'].get('street', ''),
            neighborhood=parsed['delivery_address'].get('neighborhood', ''),
            city=parsed['delivery_address'].get('city', ''),
            state=parsed['delivery_address'].get('state', ''),
            zip_code=parsed['delivery_address'].get('zip_code', ''),
            latitude=parsed['delivery_address'].get('latitude') or -29.95,
            longitude=parsed['delivery_address'].get('longitude') or -50.45
        )
        db.session.add(addr)
        db.session.flush()

        # Mapear pagamento
        payment_methods = {'CASH': PaymentMethod.CASH, 'CARD': PaymentMethod.CARD, 'PIX': PaymentMethod.PIX}
        payment_method = payment_methods.get(parsed['payment_method'], PaymentMethod.CASH)

        # Criar pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=addr.id,
            order_number=parsed['order_number'],
            external_id=parsed['external_id'],
            platform_source='IFOOD',
            items=parsed['items'],
            subtotal=parsed['subtotal'],
            delivery_fee=parsed['delivery_fee'],
            total_amount=parsed['total_amount'],
            payment_method=payment_method,
            special_instructions=parsed.get('special_instructions'),
            status=OrderStatus.PENDING,
            tenant_id=restaurant.tenant_id
        )
        db.session.add(order)
        db.session.commit()

        logger.info(f"Pedido iFood {order.order_number} criado (ID externo: {order.external_id})")
        return jsonify({
            'message': 'Pedido iFood processado com sucesso',
            'order_id': order.id,
            'order_number': order.order_number,
            'external_id': order.external_id,
            'status': 'PENDING'
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao processar pedido iFood real: {e}")
        return jsonify({'error': str(e)}), 500


def process_ifood_cancellation_real(order_data):
    """Processa cancelamento no formato real do iFood"""
    try:
        external_id = order_data.get('id')
        if not external_id:
            return

        order = Order.query.filter_by(external_id=external_id, platform_source='IFOOD').first()
        if not order:
            order = Order.query.filter(Order.order_number.like(f'%{external_id}%')).first()

        if order and order.status not in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            order.status = OrderStatus.CANCELLED
            order.updated_at = datetime.now(timezone.utc)
            if order.delivery:
                db.session.delete(order.delivery)
            db.session.commit()
            logger.info(f"Pedido iFood {order.order_number} cancelado via webhook")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao cancelar pedido iFood: {e}")


def update_order_from_ifood_status(order_data, ifood_status):
    """Atualiza status de um pedido baseado em callback do iFood"""
    try:
        from src.services.ifood_service import IFOOD_STATUS_MAP

        external_id = order_data.get('id')
        if not external_id:
            return

        order = Order.query.filter_by(external_id=external_id, platform_source='IFOOD').first()
        if not order:
            return

        new_status = IFOOD_STATUS_MAP.get(ifood_status)
        if new_status and hasattr(OrderStatus, new_status):
            order.status = OrderStatus[new_status]
            order.updated_at = datetime.now(timezone.utc)
            db.session.commit()
            logger.info(f"Status do pedido iFood {order.order_number} atualizado para {new_status}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar status do pedido iFood: {e}")


def process_ifood_order(order_data):
    """Processa um pedido recebido do iFood"""
    try:
        # Busca o restaurante pelo nome ou ID externo
        restaurant_name = order_data.get('restaurant_name')
        restaurant = None

        if restaurant_name:
            restaurant = Restaurant.query.filter_by(name=restaurant_name).first()

        if not restaurant:
            # Cria restaurante automaticamente se nao existir
            restaurant = Restaurant(
                name=restaurant_name or 'Estabelecimento iFood',
                address=order_data.get('delivery_address', {}).get('street', 'Endereço não informado'),
                latitude=order_data.get('delivery_address', {}).get('latitude', -29.95),
                longitude=order_data.get('delivery_address', {}).get('longitude', -50.45),
                phone=order_data.get('restaurant_phone')
            )
            db.session.add(restaurant)
            db.session.flush()

        # Busca ou cria cliente final
        customer_data = order_data.get('customer', {})
        customer = None
        if customer_data.get('phone'):
            customer = Customer.query.filter_by(phone=customer_data['phone']).first()

        if not customer:
            customer = Customer(
                name=customer_data.get('name', 'Cliente iFood'),
                phone=customer_data.get('phone', ''),
                email=customer_data.get('email')
            )
            db.session.add(customer)
            db.session.flush()

        # Cria endereco de entrega
        addr_data = order_data.get('delivery_address', {})
        address = Address(
            customer_id=customer.id,
            street=addr_data.get('street', ''),
            complement=addr_data.get('complement', ''),
            neighborhood=addr_data.get('neighborhood', ''),
            city=addr_data.get('city', ''),
            state=addr_data.get('state', ''),
            zip_code=addr_data.get('zip_code', ''),
            latitude=addr_data.get('latitude'),
            longitude=addr_data.get('longitude')
        )
        db.session.add(address)
        db.session.flush()

        # Mapeia metodo de pagamento
        payment_methods = {
            'CASH': PaymentMethod.CASH,
            'CARD': PaymentMethod.CARD,
            'PIX': PaymentMethod.PIX
        }
        payment_method = payment_methods.get(
            order_data.get('payment_method', 'CASH'),
            PaymentMethod.CASH
        )

        # Cria o pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=address.id,
            order_number=f"IFOOD{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            items=order_data.get('items', []),
            subtotal=order_data.get('subtotal', 0),
            delivery_fee=order_data.get('delivery_fee', 0),
            total_amount=order_data.get('total_amount', 0),
            payment_method=payment_method,
            special_instructions=order_data.get('special_instructions'),
            status=OrderStatus.PENDING
        )

        db.session.add(order)
        db.session.commit()

        # Notifica o estabelecimento
        # (o polling do frontend ja vai pegar o novo pedido)

        return jsonify({
            'message': 'Pedido iFood processado com sucesso',
            'order_id': order.id,
            'order_number': order.order_number,
            'status': 'PENDING'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def process_ifood_cancellation(order_data):
    """Processa cancelamento de pedido iFood"""
    try:
        external_id = order_data.get('order_id')
        if not external_id:
            return jsonify({'error': 'ID do pedido ausente'}), 400

        # Busca pedido pelo numero (iFood prefix)
        order = Order.query.filter(
            Order.order_number.like(f'IFOOD%{external_id}%')
        ).first()

        if not order:
            # Tenta buscar por restaurante
            restaurant_name = order_data.get('restaurant_name')
            if restaurant_name:
                restaurant = Restaurant.query.filter_by(name=restaurant_name).first()
                if restaurant:
                    order = Order.query.filter(
                        Order.restaurant_id == restaurant.id,
                        Order.status.in_([OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING])
                    ).order_by(Order.created_at.desc()).first()

        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            return jsonify({'error': 'Pedido já finalizado'}), 400

        # Cancela
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.now(timezone.utc)
        order.driver_id = None

        if order.delivery:
            db.session.delete(order.delivery)

        db.session.commit()

        return jsonify({
            'message': 'Pedido cancelado via iFood',
            'order_number': order.order_number
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# WEBHOOK GENERICo (para outras plataformas)
# ============================================

