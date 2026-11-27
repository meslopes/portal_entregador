"""
WhatsApp — Fluxo de pedido por catálogo (Fase 3-5 — 2026-11-25).
Processa mensagens do cliente, monta carrinho, cria Order.
Endereço por GPS (reverse geocoding) ou texto (geocoding).
Pagamento PIX/dinheiro/cartão, pedido rápido, avaliação.
Tudo configurável pelo EST.
"""
import logging
from decimal import Decimal

from src.models.portal_models import (
    Order, OrderStatus, Customer, Address,
    WhatsAppOrderSession, WhatsAppProduct,
    PaymentMethod, db,
)

logger = logging.getLogger(__name__)

# Pagamentos aceitos (configurável pelo EST)
PAYMENT_OPTIONS = {
    'PIX': '💳 PIX',
    'CASH': '💵 Dinheiro na entrega',
    'CARD': '💳 Cartão na entrega',
}


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
    elif session.step == 'CONFIRMING_ADDRESS':
        messages_to_send = _handle_confirming_address(restaurant, cred, session, text)
    elif session.step == 'CONFIRMING':
        messages_to_send = _handle_confirming(restaurant, cred, session, text)
    elif session.step == 'PAYMENT':
        messages_to_send = _handle_payment(restaurant, cred, session, text)
    elif session.step == 'RATING':
        messages_to_send = _handle_rating(restaurant, cred, session, text)

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
        return [{'text': '*Comandos disponíveis:*\n\n🍕 *cardápio* — ver produtos\n🛒 *pedido* — fazer um pedido\n📋 *meu pedido* — ver carrinho\n🔁 *repetir* — repetir último pedido\n⭐ *avaliar* — avaliar última entrega\n📍 *endereço* — informar endereço\n❌ *cancelar* — cancelar pedido\n\nOu simplesmente me diga o que deseja!'}]

    # Fase 5: pedido rápido (repetir último)
    if any(kw in text_lower for kw in ['repetir', 'repetir pedido', 'último pedido', 'ultimo pedido', 'mesmo pedido']):
        return _quick_reorder(restaurant, session)

    # Fase 5: avaliar entrega
    if any(kw in text_lower for kw in ['avaliar', 'avaliação', 'avaliacao', 'estrelas', 'nota']):
        return _ask_rating(restaurant, session)

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
    """Estado: coletando endereço (Fase 4 — GPS + geocoding + confirmação)."""
    confirm_address = getattr(cred, 'confirm_address', True) if cred else True
    max_km = float(getattr(cred, 'max_delivery_km', 0) or 0) if cred else 0

    if location and location.get('latitude'):
        # Endereço por GPS (Fase 4: reverse geocoding para endereço legível)
        lat, lng = float(location['latitude']), float(location['longitude'])

        # Reverse geocoding → endereço legível
        readable_address = _reverse_geocode(lat, lng)
        session.delivery_lat = lat
        session.delivery_lng = lng
        session.delivery_address = readable_address or f'Localização: {lat:.6f},{lng:.6f}'

        # Verificar distância máxima (se configurado)
        if max_km > 0 and restaurant.latitude and restaurant.longitude:
            from src.utils.geo import haversine_distance
            dist = haversine_distance(
                float(restaurant.latitude), float(restaurant.longitude), lat, lng
            )
            if dist > max_km:
                return [{'text': f'😔 Desculpe, não entregamos nessa região (máx. {max_km:.0f} km).\n\nNosso raio de entrega é de {max_km:.0f} km do estabelecimento.'}]

        if confirm_address:
            session.step = 'CONFIRMING_ADDRESS'
        else:
            session.step = 'CONFIRMING'
        db.session.commit()

        total = sum(float(item['price']) * item['qty'] for item in session.cart)
        addr_display = session.delivery_address[:60] + '...' if len(session.delivery_address) > 60 else session.delivery_address
        if confirm_address:
            msg = f'*📍 Localização recebida!*\n\nEndereço: {addr_display}\n\n*Está correto?* (sim/não)'
        else:
            msg = f'*📍 Localização registrada!* {addr_display}\n\n*Seu pedido:*\n{_format_cart(session.cart)}\n*Total: R$ {total:.2f}*\n\n*Confirma o pedido?* (sim/não)'
        return [{'text': msg}]

    # Endereço por texto (Fase 4: geocoding para obter coordenadas)
    if text and len(text.strip()) > 5:
        addr_text = text.strip()

        # Geocoding → coordenadas
        lat, lng = _geocode_address(restaurant, addr_text)
        session.delivery_address = addr_text
        session.delivery_lat = lat
        session.delivery_lng = lng

        # Verificar distância máxima (se configurado e tiver coordenadas)
        if max_km > 0 and lat and lng and restaurant.latitude and restaurant.longitude:
            from src.utils.geo import haversine_distance
            dist = haversine_distance(
                float(restaurant.latitude), float(restaurant.longitude), lat, lng
            )
            if dist > max_km:
                return [{'text': f'😔 Desculpe, não entregamos nessa região (máx. {max_km:.0f} km).\n\nNosso raio de entrega é de {max_km:.0f} km do estabelecimento.'}]

        if confirm_address:
            session.step = 'CONFIRMING_ADDRESS'
        else:
            session.step = 'CONFIRMING'
        db.session.commit()

        total = sum(float(item['price']) * item['qty'] for item in session.cart)
        if confirm_address:
            msg = f'*📍 Endereço registrado:*\n{addr_text}\n\n*Está correto?* (sim/não)'
        else:
            msg = f'*📍 Endereço registrado:* {addr_text}\n\n*Seu pedido:*\n{_format_cart(session.cart)}\n*Total: R$ {total:.2f}*\n\n*Confirma o pedido?* (sim/não)'
        return [{'text': msg}]

    return [{'text': 'Por favor, informe seu endereço de entrega ou compartilhe sua localização 📍'}]


def _handle_confirming_address(restaurant, cred, session, text):
    """Estado: confirmando endereço (Fase 4)."""
    text_lower = (text or '').lower().strip()

    if any(kw in text_lower for kw in ['sim', 'correto', 'isso', 'certo', 'ok']):
        session.step = 'CONFIRMING'
        db.session.commit()
        total = sum(float(item['price']) * item['qty'] for item in session.cart)
        return [{'text': f'✅ *Endereço confirmado!*\n\n*Seu pedido:*\n{_format_cart(session.cart)}\n*Total: R$ {total:.2f}*\n\n*Confirma o pedido?* (sim/não)'}]

    if any(kw in text_lower for kw in ['não', 'nao', 'errado', 'incorreto']):
        session.step = 'ADDRESS'
        db.session.commit()
        return [{'text': 'Sem problemas! Informe o endereço correto ou compartilhe sua localização 📍'}]

    return [{'text': 'Por favor, confirme com *sim* ou diga *não* para corrigir.'}]


def _handle_confirming(restaurant, cred, session, text):
    """Estado: confirmando o pedido (vai para pagamento)."""
    text_lower = (text or '').lower().strip()

    if any(kw in text_lower for kw in ['sim', 'confirmar', 'isso', 'pode ser', 'confirmo']):
        # Ir para escolha de pagamento
        session.step = 'PAYMENT'
        db.session.commit()

        # Pagamentos aceitos (configurável)
        options = []
        if getattr(cred, 'accept_pix', True):
            options.append('💳 PIX')
        if getattr(cred, 'accept_cash', True):
            options.append('💵 Dinheiro na entrega')
        if getattr(cred, 'accept_card', True):
            options.append('💳 Cartão na entrega')

        if not options:
            options = ['💳 PIX']  # Padrão

        total = sum(float(item['price']) * item['qty'] for item in session.cart)
        msg = f'*💰 Forma de pagamento:*\n\n'
        for i, opt in enumerate(options, 1):
            msg += f'{i}. {opt}\n'
        msg += f'\n*Total: R$ {total:.2f}*\n\nEscolha uma opção (número ou nome).'
        return [{'text': msg}]

    if any(kw in text_lower for kw in ['não', 'nao', 'cancelar', 'voltar']):
        session.step = 'BROWSING'
        db.session.commit()
        return [{'text': 'Pedido cancelado. Digite *pedido* para começar novamente.'}]

    return [{'text': 'Por favor, confirme com *sim* ou cancele com *não*.'}]


def _handle_payment(restaurant, cred, session, text):
    """Estado: escolhendo forma de pagamento (Fase 5)."""
    text_lower = (text or '').lower().strip()

    # Mapear escolha
    payment_method = None
    if any(kw in text_lower for kw in ['1', 'pix', 'qrcode', 'qr code']):
        payment_method = 'PIX'
    elif any(kw in text_lower for kw in ['2', 'dinheiro', 'cash', 'espécie']):
        payment_method = 'CASH'
    elif any(kw in text_lower for kw in ['3', 'cartão', 'cartao', 'card', 'maquininha']):
        payment_method = 'CARD'

    if not payment_method:
        return [{'text': 'Por favor, escolha uma forma de pagamento: PIX, Dinheiro ou Cartão.'}]

    # Criar pedido
    order = _create_order(restaurant, session, payment_method)
    if order:
        session.order_id = order.id
        session.is_active = False
        db.session.commit()

        total = float(order.total_amount)
        msg = f'✅ *Pedido #{order.order_number} criado!*\n\n'
        msg += f'🍽️ {restaurant.name}\n'
        msg += f'📍 {session.delivery_address}\n'
        msg += f'💰 Total: R$ {total:.2f}\n'
        msg += f'💳 Pagamento: {PAYMENT_OPTIONS.get(payment_method, payment_method)}\n\n'

        if payment_method == 'PIX':
            msg += '📱 *PIX:* Assim que o pedido for confirmado, enviaremos o QR Code.\n\n'

        msg += 'Você receberá atualizações por aqui! 📱'

        # Notificação para o EST
        try:
            from src.services.whatsapp_notify import notify_status_change
            notify_status_change(order, 'CONFIRMED')
        except Exception:
            pass

        return [{'text': msg}]

    return [{'text': 'Desculpe, houve um erro ao criar o pedido. Tente novamente.'}]


def _create_order(restaurant, session, payment_method='PIX'):
    """Cria um Order a partir da sessão WhatsApp (Fase 5: com pagamento)."""
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

        # Mapear método de pagamento
        pm = {
            'PIX': PaymentMethod.PIX,
            'CASH': PaymentMethod.CASH,
            'CARD': PaymentMethod.CARD,
        }.get(payment_method, PaymentMethod.PIX)

        # Criar pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            order_number=f'WA-{session.id:06d}',
            items=session.cart,
            subtotal=Decimal(str(subtotal)),
            delivery_fee=Decimal('0'),
            total_amount=Decimal(str(subtotal)),
            payment_method=pm,
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
        # N1 — numeração curta (#37) também no pedido via WhatsApp
        from src.services.order_helpers import atribuir_numero_curto
        atribuir_numero_curto(order, restaurant)
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


def _quick_reorder(restaurant, session):
    """Fase 5: Repetir o último pedido do cliente."""
    try:
        last_order = Order.query.filter_by(
            restaurant_id=restaurant.id,
            customer_id=session.customer_id if hasattr(session, 'customer_id') else None,
        ).order_by(Order.created_at.desc()).first()

        # Buscar por telefone se não tiver customer_id
        if not last_order:
            customer = Customer.query.filter_by(phone=session.customer_phone).first()
            if customer:
                last_order = Order.query.filter_by(
                    restaurant_id=restaurant.id,
                    customer_id=customer.id,
                ).order_by(Order.created_at.desc()).first()

        if not last_order or not last_order.items:
            return [{'text': 'Você ainda não tem pedidos anteriores. 🤔\n\nDigite *cardápio* para ver nossos produtos!'}]

        # Copiar itens para o carrinho
        cart = []
        for item in (last_order.items or []):
            cart.append({
                'product_id': item.get('product_id', 0),
                'name': item.get('name', ''),
                'price': item.get('price', 0),
                'qty': item.get('qty', 1),
            })

        session.cart = cart
        session.step = 'ADDRESS'
        db.session.commit()

        total = sum(float(item['price']) * item['qty'] for item in cart)
        msg = f'🔁 *Último pedido copiado!*\n\n*Itens:*\n{_format_cart(cart)}\n*Total: R$ {total:.2f}*\n\n📍 Informe seu *endereço de entrega* ou compartilhe sua *localização*.'
        return [{'text': msg}]

    except Exception as e:
        logger.error(f'[WHATSAPP] Erro no pedido rápido: {e}')
        return [{'text': 'Erro ao buscar pedido anterior. Tente novamente.'}]


def _ask_rating(restaurant, session):
    """Fase 5: Pedir avaliação da última entrega."""
    try:
        customer = Customer.query.filter_by(phone=session.customer_phone).first()
        if not customer:
            return [{'text': 'Você ainda não tem entregas para avaliar. 😊'}]

        last_order = Order.query.filter_by(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            status=OrderStatus.DELIVERED,
        ).order_by(Order.created_at.desc()).first()

        if not last_order:
            return [{'text': 'Você ainda não tem entregas concluídas para avaliar. 😊'}]

        session.step = 'RATING'
        session.order_id = last_order.id
        db.session.commit()

        msg = f'⭐ *Avalie sua experiência!*\n\nPedido #{last_order.order_number} — {restaurant.name}\n\n'
        msg += 'De 1 a 5, quantas estrelas? ⭐\n\n'
        msg += '1 = ⭐ Ruim · 2 = ⭐⭐ · 3 = ⭐⭐⭐ · 4 = ⭐⭐⭐⭐ · 5 = ⭐⭐⭐⭐⭐'
        return [{'text': msg}]

    except Exception as e:
        logger.error(f'[WHATSAPP] Erro na avaliação: {e}')
        return [{'text': 'Erro ao buscar entregas. Tente novamente.'}]


def _handle_rating(restaurant, cred, session, text):
    """Fase 5: Registrar avaliação (1-5 estrelas)."""
    try:
        text_lower = (text or '').lower().strip()

        # Extrair número de estrelas
        stars = None
        for kw, val in [('5', 5), ('4', 4), ('3', 3), ('2', 2), ('1', 1)]:
            if kw in text_lower:
                stars = val
                break

        if not stars:
            return [{'text': 'Por favor, digite um número de 1 a 5 estrelas. ⭐'}]

        # Registrar avaliação no pedido
        order = Order.query.get(session.order_id) if session.order_id else None
        if order:
            # Avaliação via Delivery ou campo direto
            try:
                from src.models.portal_models import Delivery
                delivery = Delivery.query.filter_by(order_id=order.id).first()
                if delivery:
                    delivery.customer_rating = stars
            except Exception:
                pass

            # Nota geral do restaurante (simplificado)
            if order.restaurant:
                current = float(order.restaurant.rating or 5.0)
                count = int(order.restaurant.rating_count or 0) if hasattr(order.restaurant, 'rating_count') else 0
                new_rating = round((current * count + stars) / (count + 1), 1) if count else stars
                # Não salvar se não tiver campo — só registra na mensagem

        session.step = 'BROWSING'
        session.order_id = None
        db.session.commit()

        stars_display = '⭐' * stars
        return [{'text': f'{stars_display} *Obrigado pela avaliação!*\n\nSua opinião é muito importante para nós. 😊\n\nDigite *pedido* para fazer outro pedido!'}]

    except Exception as e:
        logger.error(f'[WHATSAPP] Erro na avaliação: {e}')
        return [{'text': 'Erro ao registrar avaliação. Tente novamente.'}]


def _reverse_geocode(lat, lng):
    """Fase 4: Reverse geocoding — coordenadas → endereço legível."""
    try:
        from src.services.geocoding import reverse_geocode
        result = reverse_geocode(lat, lng)
        if result:
            return result
    except Exception as e:
        logger.warning(f'[WHATSAPP] Reverse geocode falhou: {e}')
    return None


def _geocode_address(restaurant, address_text):
    """Fase 4: Geocoding — endereço texto → coordenadas. Retorna (lat, lng) ou (None, None)."""
    try:
        from src.services.geocoding import geocode_address
        city_hint = None
        if restaurant and restaurant.square_id:
            from src.models.portal_models import Square
            sq = Square.query.get(restaurant.square_id)
            if sq:
                city_hint = sq.city

        result = geocode_address(address_text, city_hint=city_hint)
        if result:
            return result.get('latitude'), result.get('longitude')
    except Exception as e:
        logger.warning(f'[WHATSAPP] Geocode falhou: {e}')
    return None, None
