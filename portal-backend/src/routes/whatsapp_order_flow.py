"""
WhatsApp — Fluxo de pedido por catálogo (Fase 3 — 2026-11-25).
Processa mensagens do cliente, monta carrinho, cria Order.
Tudo configurável pelo EST (auto_confirm, accept_orders, etc.).
"""
import logging
from decimal import Decimal

from src.models.portal_models import (
    Order, OrderStatus, Customer, Address,
    WhatsAppOrderSession, WhatsAppProduct,
    PaymentMethod, db,
)

logger = logging.getLogger(__name__)


def process_customer_message(restaurant, cred, phone, text, msg_type='text', location=None):
    """
    Processa mensagem do cliente e avança o fluxo do pedido.
    Retorna lista de mensagens para enviar de volta.
    """
    messages_to_send = []

    # Buscar ou criar sessão ativa
    session = WhatsAppOrderSession.query.filter_by(
        restaurant_id=restaurant.id,
        customer_phone=phone,
        is_active=True,
    ).first()

    if not session:
        session = WhatsAppOrderSession(
            restaurant_id=restaurant.id,
            customer_phone=phone,
            step='BROWSING',
            cart=[],
        )
        db.session.add(session)
        db.session.commit()

    # Processar conforme o passo atual
    if session.step == 'BROWSING':
        messages_to_send = _handle_browsing(restaurant, cred, session, text, msg_type)
    elif session.step == 'CART':
        messages_to_send = _handle_cart(restaurant, cred, session, text, msg_type)
    elif session.step == 'ADDRESS':
        messages_to_send = _handle_address(restaurant, cred, session, text, location)
    elif session.step == 'CONFIRMING':
        messages_to_send = _handle_confirming(restaurant, cred, session, text)

    return messages_to_send


def _handle_browsing(restaurant, cred, session, text, msg_type):
    """Estado: cliente navegando o cardápio."""
    text_lower = (text or '').lower().strip()

    # Comando: ver cardápio
    if any(kw in text_lower for kw in ['cardápio', 'cardapio', 'menu', 'produtos', 'opções']):
        return _show_catalog(restaurant)

    # Comando: fazer pedido / começar
    if any(kw in text_lower for kw in ['pedido', 'pedir', 'quero', 'comprar']):
        categories = _get_categories(restaurant)
        if not categories:
            return [{'text': 'Desculpe, ainda não temos produtos cadastrados. 😕'}]
        session.step = 'CART'
        db.session.commit()
        msg = '*Como posso ajudar?* 🍕\n\nEscolha uma categoria:\n'
        for i, cat in enumerate(categories, 1):
            msg += f'\n{i️}. {cat}'
        msg += '\n\nOu digite o nome do produto que deseja.'
        return [{'text': msg}]

    # Comando: meu pedido
    if any(kw in text_lower for kw in ['meu pedido', 'carrinho', 'resumo']):
        return _show_cart(session)

    # Comando: ajuda
    if any(kw in text_lower for kw in ['ajuda', 'help', 'comandos']):
        return [{'text': '*Comandos disponíveis:*\n\n🍕 *cardápio* — ver produtos\n🛒 *pedido* — fazer um pedido\n📋 *meu pedido* — ver carrinho\n📍 *endereço* — informar endereço\n❌ *cancelar* — cancelar pedido\n\nOu simplesmente me diga o que deseja!'}]

    # Boas-vindas
    welcome = cred.welcome_message if cred and cred.welcome_message else 'Bem-vindo! Como posso ajudar? 🍕'
    return [{'text': f'{welcome}\n\nDigite *cardápio* para ver nossos produtos ou *pedido* para começar.'}]


def _show_catalog(restaurant):
    """Mostra o cardálogo organizado por categoria."""
    products = WhatsAppProduct.query.filter_by(
        restaurant_id=restaurant.id, is_active=True
    ).order_by(WhatsAppProduct.category, WhatsAppProduct.sort_order).all()

    if not products:
        return [{'text': 'Desculpe, ainda não temos produtos cadastrados. 😕'}]

    categories = {}
    for p in products:
        cat = p.category or 'Geral'
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(p)

    msg = '*Nosso Cardápio* 🍕\n'
    for cat, items in categories.items():
        msg += f'\n*{cat.upper()}*\n'
        for p in items:
            desc = f' — {p.description}' if p.description else ''
            msg += f'• {p.name}{desc} — R$ {float(p.price):.2f}\n'

    msg += '\nPara pedir, digite *pedido* ou me diga o que deseja!'
    return [{'text': msg}]


def _get_categories(restaurant):
    """Retorna lista de categorias únicas."""
    products = WhatsAppProduct.query.filter_by(
        restaurant_id=restaurant.id, is_active=True
    ).all()
    seen = []
    for p in products:
        cat = p.category or 'Geral'
        if cat not in seen:
            seen.append(cat)
    return seen


def _handle_cart(restaurant, cred, session, text, msg_type):
    """Estado: cliente montando o carrinho."""
    text_lower = (text or '').lower().strip()

    # Comando: finalizar / ir para endereço
    if any(kw in text_lower for kw in ['finalizar', 'pronto', 'endereço', 'endereco', 'continuar']):
        if not session.cart:
            return [{'text': 'Seu carrinho está vazio. Adicione produtos primeiro! 🛒'}]
        session.step = 'ADDRESS'
        db.session.commit()
        total = sum(float(item['price']) * item['qty'] for item in session.cart)
        msg = f'*Seu pedido:*\n{_format_cart(session.cart)}\n*Total: R$ {total:.2f}*\n\n📍 Agora me informe seu *endereço de entrega* ou compartilhe sua *localização*.'
        return [{'text': msg}]

    # Comando: limpar carrinho
    if any(kw in text_lower for kw in ['limpar', 'cancelar', 'esvaziar']):
        session.cart = []
        db.session.commit()
        return [{'text': 'Carrinho limpo. 🧹\n\nDigite *cardápio* para ver nossos produtos.'}]

    # Tentar adicionar produto
    product = _find_product(restaurant, text)
    if product:
        cart = session.cart or []
        # Verificar se já existe
        existing = None
        for item in cart:
            if item['product_id'] == product.id:
                existing = item
                break
        if existing:
            existing['qty'] += 1
        else:
            cart.append({
                'product_id': product.id,
                'name': product.name,
                'price': float(product.price),
                'qty': 1,
            })
        session.cart = cart
        db.session.commit()

        total = sum(float(item['price']) * item['qty'] for item in cart)
        msg = f'✅ *{product.name}* adicionado!\n\n*Seu carrinho:*\n{_format_cart(cart)}\n*Total: R$ {total:.2f}*\n\nAdicione mais produtos ou digite *finalizar*.'
        return [{'text': msg}]

    # Não entendeu — mostrar opções
    return [{'text': 'Não encontrei esse produto. 🤔\n\nDigite *cardápio* para ver os produtos ou *finalizar* para encerrar.'}]


def _find_product(restaurant, text):
    """Busca produto por nome (parcial, case-insensitive)."""
    if not text:
        return None
    text_lower = text.lower().strip()

    # Busca exata
    product = WhatsAppProduct.query.filter_by(
        restaurant_id=restaurant.id, is_active=True
    ).filter(WhatsAppProduct.name.ilike(text_lower)).first()
    if product:
        return product

    # Busca parcial
    product = WhatsAppProduct.query.filter_by(
        restaurant_id=restaurant.id, is_active=True
    ).filter(WhatsAppProduct.name.ilike(f'%{text_lower}%')).first()
    return product


def _handle_address(restaurant, cred, session, text, location):
    """Estado: coletando endereço."""
    if location and location.get('latitude'):
        # Endereço por GPS
        session.delivery_lat = location['latitude']
        session.delivery_lng = location['longitude']
        session.delivery_address = f"Localização: {location['latitude']},{location['longitude']}"
        session.step = 'CONFIRMING'
        db.session.commit()
        total = sum(float(item['price']) * item['qty'] for item in session.cart)
        msg = f'*Localização recebida!* 📍\n\n*Seu pedido:*\n{_format_cart(session.cart)}\n*Total: R$ {total:.2f}*\n\n*Confirma o pedido?* (sim/não)'
        return [{'text': msg}]

    # Endereço por texto
    if text and len(text.strip()) > 5:
        session.delivery_address = text.strip()
        session.step = 'CONFIRMING'
        db.session.commit()
        total = sum(float(item['price']) * item['qty'] for item in session.cart)
        msg = f'*Endereço registrado:* {text.strip()}\n\n*Seu pedido:*\n{_format_cart(session.cart)}\n*Total: R$ {total:.2f}*\n\n*Confirma o pedido?* (sim/não)'
        return [{'text': msg}]

    return [{'text': 'Por favor, informe seu endereço de entrega ou compartilhe sua localização 📍'}]


def _handle_confirming(restaurant, cred, session, text):
    """Estado: confirmando o pedido."""
    text_lower = (text or '').lower().strip()

    if any(kw in text_lower for kw in ['sim', 'confirmar', 'isso', 'pode ser', 'confirmo']):
        # Criar pedido
        order = _create_order(restaurant, session)
        if order:
            session.order_id = order.id
            session.is_active = False
            db.session.commit()
            return [{
                'text': f'✅ *Pedido #{order.order_number} criado!*\n\n'
                        f'🍽️ {restaurant.name}\n'
                        f'📍 {session.delivery_address}\n'
                        f'💰 Total: R$ {float(order.total_amount):.2f}\n\n'
                        f'Você receberá atualizações por aqui! 📱'
            }]
        return [{'text': 'Desculpe, houve um erro ao criar o pedido. Tente novamente.'}]

    if any(kw in text_lower for kw in ['não', 'nao', 'cancelar', 'voltar']):
        session.step = 'BROWSING'
        db.session.commit()
        return [{'text': 'Pedido cancelado. Digite *pedido* para começar novamente.'}]

    return [{'text': 'Por favor, confirme com *sim* ou cancele com *não*.'}]


def _create_order(restaurant, session):
    """Cria um Order a partir da sessão WhatsApp."""
    try:
        # Buscar ou criar Customer
        customer = Customer.query.filter_by(phone=session.customer_phone).first()
        if not customer:
            customer = Customer(
                name=f'WhatsApp {session.customer_phone[-4:]}',
                phone=session.customer_phone,
            )
            db.session.add(customer)
            db.session.flush()

        # Calcular total
        subtotal = sum(float(item['price']) * item['qty'] for item in session.cart)

        # Criar pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            order_number=f'WA-{session.id:06d}',
            items=session.cart,
            subtotal=Decimal(str(subtotal)),
            delivery_fee=Decimal('0'),  # Frete calculado depois
            total_amount=Decimal(str(subtotal)),
            payment_method=PaymentMethod.PIX,
            status=OrderStatus.PENDING,
            special_instructions=session.notes or '',
        )

        # Endereço
        if session.delivery_address:
            addr = Address(
                customer_id=customer.id,
                street=session.delivery_address,
                neighborhood='',
                city='',
                state='',
                zip_code='',
                latitude=session.delivery_lat,
                longitude=session.delivery_lng,
            )
            db.session.add(addr)
            db.session.flush()
            order.delivery_address_id = addr.id

        db.session.add(order)
        db.session.commit()

        logger.info(f'[WHATSAPP ORDER] Pedido {order.order_number} criado para {session.customer_phone}')
        return order

    except Exception as e:
        logger.error(f'[WHATSAPP ORDER] Erro: {e}')
        db.session.rollback()
        return None


def _format_cart(cart):
    """Formata o carrinho para exibição."""
    lines = []
    for item in cart:
        qty = item['qty']
        name = item['name']
        price = float(item['price']) * qty
        lines.append(f'{qty}x {name} — R$ {price:.2f}')
    return '\n'.join(lines)
