"""Ferramentas de banco e limpeza de dados (painel admin).

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    Customer,
    Driver,
    EstablishmentDriver,
    Order,
    Restaurant,
    Tenant,
    User,
    UserStatus,
    UserType,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_user

logger = logging.getLogger(__name__)


admin_database_bp = Blueprint('database', __name__)


@admin_database_bp.route('/cleanup-clients-drivers', methods=['DELETE'])
@jwt_required()
@admin_required
def cleanup_clients_drivers():
    try:
        # Exigir super admin para operação destrutiva
        user = get_current_user()
        if not user or not user.is_super_admin:
            return jsonify({'error': 'Apenas super admin pode executar limpeza em massa'}), 403

        # Confirmar via header (proteção contra execução acidental)
        from flask import request as req
        if req.headers.get('X-Confirm-Delete') != 'true':
            return jsonify({'error': 'Header X-Confirm-Delete: true obrigatório'}), 400

        # Deletar na ordem correta para respeitar foreign keys
        # 1. Tabelas sem dependencias diretas
        db.session.execute(db.text("DELETE FROM deliveries"))
        db.session.execute(db.text("DELETE FROM payments"))
        db.session.execute(db.text("DELETE FROM notifications"))
        db.session.execute(db.text("DELETE FROM own_driver_earnings"))
        db.session.execute(db.text("DELETE FROM driver_restaurants"))
        db.session.execute(db.text("DELETE FROM platform_credentials"))
        db.session.execute(db.text("DELETE FROM establishment_drivers"))
        db.session.execute(db.text("DELETE FROM invoices"))

        # 2. Orders (referencia restaurants, customers, addresses)
        db.session.execute(db.text("DELETE FROM orders"))

        # 3. Addresses (referencia customers)
        db.session.execute(db.text("DELETE FROM addresses"))

        # 4. Customers e Drivers (referenciam users)
        db.session.execute(db.text("DELETE FROM customers"))
        db.session.execute(db.text("DELETE FROM drivers"))

        # 5. Users que nao sao admins
        result = db.session.execute(db.text("DELETE FROM users WHERE user_type != 'ADMIN'"))
        deleted_count = result.rowcount

        db.session.commit()

        return jsonify({
            'message': 'Limpeza concluida com sucesso',
            'users_deleted': deleted_count,
            'note': 'Todos os CLIENTs e DRIVERs foram removidos. Apenas ADMINs permanecem.'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_database_bp.route('/database-map', methods=['GET'])
@jwt_required()
@admin_required
def database_map():
    """Retorna mapa completo de todos os cadastros e relacionamentos"""
    try:
        result = {}

        # Tenants
        tenants = Tenant.query.order_by(Tenant.id).all()
        result['tenants'] = [{'id': t.id, 'name': t.name, 'slug': t.slug, 'plan': t.plan, 'is_active': t.is_active} for t in tenants]

        # Squares
        from src.models.portal_models import Square
        squares = Square.query.order_by(Square.id).all()
        tenants_map = {t.id: t.name for t in tenants}
        result['squares'] = [{'id': s.id, 'name': s.name, 'city': s.city, 'state': s.state, 'tenant_id': s.tenant_id, 'tenant_name': tenants_map.get(s.tenant_id), 'is_active': s.is_active} for s in squares]

        # Users (limitar a 500 para performance) — sem soft-deleted
        users = User.query.filter(User.deleted_at.is_(None)).order_by(User.id).limit(500).all()
        result['users'] = []
        for u in users:
            user_data = {
                'id': u.id, 'email': u.email, 'first_name': u.first_name, 'last_name': u.last_name,
                'user_type': u.user_type.value if u.user_type else None,
                'status': u.status.value if u.status else None,
                'tenant_id': u.tenant_id, 'tenant_name': tenants_map.get(u.tenant_id), 'phone': u.phone, 'cpf': u.cpf,
                'birth_date': u.birth_date.isoformat() if u.birth_date else None,
                'square_id': None, 'square_name': None, 'linked_name': None,
                # Driver fields
                'driver_id': None, 'vehicle_type': None, 'vehicle_plate': None,
                'vehicle_model': None, 'vehicle_year': None, 'driver_license': None,
                'pix_key': None, 'bank_account': None, 'max_concurrent_orders': None,
                'is_online': None, 'is_blocked': None, 'rating': None, 'total_deliveries': None,
                # Client fields
                'customer_id': None, 'restaurant_id': None, 'restaurant_name': None
            }
            # DRIVER: todos os campos do driver
            if u.user_type and u.user_type.value == 'DRIVER' and u.driver:
                d = u.driver
                user_data['driver_id'] = d.id
                user_data['vehicle_type'] = d.vehicle_type.value if d.vehicle_type else None
                user_data['vehicle_plate'] = d.vehicle_plate
                user_data['vehicle_model'] = d.vehicle_model
                user_data['vehicle_year'] = d.vehicle_year
                user_data['driver_license'] = d.driver_license
                user_data['pix_key'] = d.pix_key
                user_data['bank_account'] = d.bank_account
                user_data['max_concurrent_orders'] = d.max_concurrent_orders
                user_data['is_online'] = d.is_online
                user_data['is_blocked'] = d.is_blocked
                user_data['rating'] = float(d.rating) if d.rating else None
                user_data['total_deliveries'] = d.total_deliveries
                user_data['square_id'] = d.square_id
                if d.square_id:
                    sq = Square.query.get(d.square_id)
                    if sq: user_data['square_name'] = sq.name
            # CLIENT: campos do customer + restaurante
            elif u.user_type and u.user_type.value == 'CLIENT':
                cust = Customer.query.filter_by(user_id=u.id).first()
                if cust:
                    user_data['customer_id'] = cust.id
                    user_data['linked_name'] = cust.name
                    rest = Restaurant.query.filter_by(name=cust.name).first()
                    if rest:
                        user_data['restaurant_id'] = rest.id
                        user_data['restaurant_name'] = rest.name
                        user_data['square_id'] = rest.square_id
                        if rest.square_id:
                            sq = Square.query.get(rest.square_id)
                            if sq: user_data['square_name'] = sq.name
            result['users'].append(user_data)

        # Restaurants (limitar a 200) — com nomes de tenant e praça
        restaurants = Restaurant.query.order_by(Restaurant.id).limit(200).all()
        squares_map = {s.id: s.name for s in squares}
        result['restaurants'] = [{
            'id': r.id, 'name': r.name, 'address': r.address,
            'tenant_id': r.tenant_id, 'tenant_name': tenants_map.get(r.tenant_id),
            'square_id': r.square_id, 'square_name': squares_map.get(r.square_id),
            'has_own_drivers': r.has_own_drivers, 'is_active': r.is_active
        } for r in restaurants]

        # Customers (limitar a 500)
        customers = Customer.query.order_by(Customer.id).all()
        result['customers'] = [{'id': c.id, 'name': c.name, 'phone': c.phone, 'user_id': c.user_id, 'tenant_id': c.tenant_id, 'tenant_name': tenants_map.get(c.tenant_id)} for c in customers]

        # Own Drivers (carregar antes — serve de referência para excluir da lista de plataforma)
        own_drivers = EstablishmentDriver.query.order_by(EstablishmentDriver.id).all()
        result['own_drivers'] = []
        for od in own_drivers:
            restaurant = Restaurant.query.get(od.restaurant_id)
            square = restaurant.square if restaurant else None
            result['own_drivers'].append({
                'id': od.id, 'name': od.name, 'phone': od.phone,
                'vehicle_type': od.vehicle_type, 'vehicle_plate': od.vehicle_plate,
                'restaurant_id': od.restaurant_id, 'restaurant_name': restaurant.name if restaurant else None,
                'square_id': restaurant.square_id if restaurant else None,
                'square_name': square.name if square else None,
                'tenant_id': restaurant.tenant_id if restaurant else None,
                'tenant_name': tenants_map.get(restaurant.tenant_id) if restaurant else None,
                'is_online': od.is_online, 'is_active': od.is_active,
                'has_pin': bool(od.pin_hash), 'total_deliveries': od.total_deliveries
            })

        # Platform Drivers — EXCLUIR próprios (converted_to_own OU telefone de own driver ativo)
        from src.utils.driver_type import normalize_phone
        drivers = Driver.query.filter(
            db.or_(Driver.converted_to_own.is_(False), Driver.converted_to_own.is_(None))
        ).order_by(Driver.id).all()
        own_phones = {
            normalize_phone(od.phone)
            for od in own_drivers if od.is_active and normalize_phone(od.phone)
        }
        drivers_data = []
        for d in drivers:
            user = User.query.get(d.user_id) if d.user_id else None
            # Pular se o telefone do User já é de um own driver ativo (evita 2 listas)
            if user and normalize_phone(user.phone) in own_phones:
                continue
            drivers_data.append({
                'id': d.id, 'user_id': d.user_id,
                'name': f"{user.first_name} {user.last_name}" if user else 'SEM USER',
                'email': user.email if user else None,
                'vehicle_type': d.vehicle_type.value if d.vehicle_type else None,
                'vehicle_plate': d.vehicle_plate,
                'square_id': d.square_id, 'square_name': squares_map.get(d.square_id),
                'tenant_id': d.tenant_id, 'tenant_name': tenants_map.get(d.tenant_id),
                'is_online': d.is_online, 'is_blocked': d.is_blocked,
                'total_deliveries': d.total_deliveries, 'rating': float(d.rating) if d.rating else None
            })
        result['platform_drivers'] = drivers_data

        # Orders summary
        from sqlalchemy import func as sqlfunc
        order_stats = db.session.query(Order.status, sqlfunc.count(Order.id)).group_by(Order.status).all()
        result['order_summary'] = [{'status': s[0].value if hasattr(s[0], 'value') else str(s[0]), 'count': s[1]} for s in order_stats]

        # Last 15 orders
        last_orders = Order.query.order_by(Order.id.desc()).limit(15).all()
        result['recent_orders'] = []
        for o in last_orders:
            restaurant = Restaurant.query.get(o.restaurant_id)
            customer = Customer.query.get(o.customer_id)
            if o.assigned_to_own_driver:
                driver_type = 'OWN'
                est_driver = EstablishmentDriver.query.get(o.establishment_driver_id) if o.establishment_driver_id else None
                driver_name = est_driver.name if est_driver else None
            elif o.driver_id:
                driver_type = 'PLATFORM'
                drv = Driver.query.get(o.driver_id)
                usr = User.query.get(drv.user_id) if drv else None
                driver_name = f"{usr.first_name} {usr.last_name}" if usr else None
            else:
                driver_type = 'NONE'
                driver_name = None
            result['recent_orders'].append({'id': o.id, 'order_number': o.order_number, 'status': o.status.value if o.status else None, 'restaurant_name': restaurant.name if restaurant else None, 'customer_name': customer.name if customer else None, 'driver_type': driver_type, 'driver_name': driver_name, 'created_at': o.created_at.isoformat() if o.created_at else None})

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_database_bp.route('/database-restore', methods=['POST'])
@jwt_required()
@admin_required
def database_restore():
    """Restaura dados de um backup JSON (cria/atualiza tenants, squares, users, restaurants)"""
    try:
        # Exigir super admin para operação de restore
        user = get_current_user()
        if not user or not user.is_super_admin:
            return jsonify({'error': 'Apenas super admin pode restaurar dados'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados de backup não fornecidos'}), 400

        results = {'created': 0, 'updated': 0, 'errors': []}

        # Restaurar Tenants
        for t in data.get('tenants', []):
            existing = Tenant.query.get(t['id']) or Tenant.query.filter_by(slug=t.get('slug')).first()
            if existing:
                existing.name = t.get('name', existing.name)
                existing.is_active = t.get('is_active', existing.is_active)
                results['updated'] += 1
            else:
                tenant = Tenant(id=t['id'], name=t['name'], slug=t['slug'], is_active=t.get('is_active', True))
                db.session.add(tenant)
                results['created'] += 1

        # Restaurar Squares
        from src.models.portal_models import Square
        for s in data.get('squares', []):
            existing = Square.query.get(s['id'])
            if existing:
                existing.name = s.get('name', existing.name)
                existing.city = s.get('city', existing.city)
                existing.state = s.get('state', existing.state)
                existing.tenant_id = s.get('tenant_id', existing.tenant_id)
                existing.is_active = s.get('is_active', existing.is_active)
                results['updated'] += 1
            else:
                square = Square(id=s['id'], name=s['name'], city=s['city'], state=s['state'],
                               tenant_id=s.get('tenant_id'), is_active=s.get('is_active', True))
                db.session.add(square)
                results['created'] += 1

        # Restaurar Users (apenas se não existirem)
        for u in data.get('users', []):
            existing = User.query.filter_by(email=u['email']).first()
            if existing:
                results['updated'] += 1
                continue
            try:
                user = User(
                    id=u['id'], email=u['email'],
                    first_name=u.get('first_name', ''),
                    last_name=u.get('last_name', ''),
                    user_type=UserType(u['user_type']),
                    status=UserStatus(u.get('status', 'ACTIVE')),
                    tenant_id=u.get('tenant_id'),
                    phone=u.get('phone'),
                    cpf=u.get('cpf')
                )
                import secrets as _secrets
                temp_password = _secrets.token_urlsafe(16)
                user.set_password(temp_password)  # Senha aleatória — usuário deve redefinir
                db.session.add(user)
                results['created'] += 1
            except Exception as e:
                results['errors'].append(f"User {u.get('email')}: {str(e)}")

        # Restaurar Restaurants (apenas se não existirem)
        for r in data.get('restaurants', []):
            existing = Restaurant.query.get(r['id'])
            if existing:
                results['updated'] += 1
                continue
            try:
                restaurant = Restaurant(
                    id=r['id'], name=r['name'],
                    address=r.get('address', ''),
                    latitude=-29.95, longitude=-50.45,
                    tenant_id=r.get('tenant_id'),
                    square_id=r.get('square_id'),
                    has_own_drivers=r.get('has_own_drivers', False),
                    is_active=r.get('is_active', True)
                )
                db.session.add(restaurant)
                results['created'] += 1
            except Exception as e:
                results['errors'].append(f"Restaurant {r.get('name')}: {str(e)}")

        db.session.commit()
        return jsonify({
            'message': 'Restauração concluída',
            'created': results['created'],
            'updated': results['updated'],
            'errors': results['errors']
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_database_bp.route('/cleanup-test-data', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_test_data():
    """Remove SOMENTE dados de teste identificados por padrão (não apaga dados reais).

    Critérios de "teste":
      - email/name contendo: teste, test@, test., exemplo, sandbox, ifood, demo, qa, 99food
      - restaurantes com nome de teste
      - pedidos de restaurantes de teste / sandbox

    Body: { "action": "all" | "preview", "confirm": true }
      - preview: retorna o que seria apagado sem apagar
      - confirm=true: executa a limpeza (exige super admin)
    """
    try:
        user = get_current_user()
        if not user or not user.is_super_admin:
            return jsonify({'error': 'Apenas super admin'}), 403

        data = request.get_json() or {}
        action = data.get('action', 'preview')
        # Palavras que marcam registro como teste
        tokens = ('teste', 'test@', 'test.', 'exemplo', 'sandbox', 'ifood', 'demo', 'qa', '99food')

        def is_test_text(val):
            if not val:
                return False
            v = val.lower()
            return any(t in v for t in tokens)

        # Coletar IDs de usuários de teste (NUNCA admins)
        test_user_ids = []
        for u in User.query.filter(User.user_type != UserType.ADMIN).all():
            if is_test_text(u.email) or is_test_text(u.first_name) or is_test_text(u.last_name):
                test_user_ids.append(u.id)

        # Restaurantes de teste
        test_rest_ids = []
        for r in Restaurant.query.all():
            if is_test_text(r.name) or is_test_text(r.address or '') or (r.cnpj and is_test_text(r.cnpj)):
                test_rest_ids.append(r.id)

        deleted = {
            'criterio': list(tokens),
            'usuarios_teste': len(test_user_ids),
            'restaurantes_teste': len(test_rest_ids),
        }

        if action == 'preview':
            deleted['mode'] = 'preview'
            deleted['aviso'] = 'Nada foi apagado. Envie action=all + confirm=true para executar.'
            return jsonify({'message': 'Prévia da limpeza', 'deleted': deleted}), 200

        if not data.get('confirm'):
            return jsonify({'error': 'Envie confirm=true para executar a limpeza'}), 400

        # Limpeza real — só registros de teste, na ordem de dependência
        batch = 5000

        def delete_where(sql, params=None):
            total = 0
            while True:
                r = db.session.execute(db.text(sql), params or {})
                db.session.commit()
                total += r.rowcount
                if r.rowcount < batch:
                    break
            return total

        if test_user_ids:
            ph = ','.join([f':u{i}' for i in range(len(test_user_ids))])
            pmap = {f'u{i}': v for i, v in enumerate(test_user_ids)}
            rest_ph = ''
            if test_rest_ids:
                rest_ph = ' OR restaurant_id IN (' + ','.join([f':r{i}' for i in range(len(test_rest_ids))]) + ')'
                pmap.update({f'r{i}': v for i, v in enumerate(test_rest_ids)})
            deleted['orders'] = delete_where(
                f"DELETE FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE user_id IN ({ph})){rest_ph}",
                pmap
            )
            deleted['customers'] = delete_where(f"DELETE FROM customers WHERE user_id IN ({ph})", pmap)
            deleted['notifications'] = delete_where(f"DELETE FROM notifications WHERE user_id IN ({ph})", pmap)
            deleted['users'] = delete_where(f"DELETE FROM users WHERE id IN ({ph}) AND user_type != 'ADMIN'", pmap)

        if test_rest_ids:
            ph = ','.join([f':r{i}' for i in range(len(test_rest_ids))])
            pmap = {f'r{i}': v for i, v in enumerate(test_rest_ids)}
            deleted['establishment_drivers'] = delete_where(f"DELETE FROM establishment_drivers WHERE restaurant_id IN ({ph})", pmap)
            deleted['restaurants'] = delete_where(f"DELETE FROM restaurants WHERE id IN ({ph})", pmap)

        deleted['mode'] = 'cleaned'
        return jsonify({'message': 'Limpeza de dados de teste concluída', 'deleted': deleted}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro na limpeza de teste: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================
# EXPORTAÇÃO CSV (abre no Excel)
# ============================================================

