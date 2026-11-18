import contextlib
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from src.models.portal_models import User, UserStatus, UserType, db

logger = logging.getLogger(__name__)

platform_bp = Blueprint('platform', __name__)


def soft_delete_user(user_id, admin_id=None):
    """Marca um usuário como excluído (soft delete) em vez de deletar permanentemente"""
    user = User.query.get(user_id)
    if not user:
        return False
    user.deleted_at = datetime.now(timezone.utc)
    user.deleted_by = admin_id
    db.session.commit()
    return True


def platform_admin_required(f):
    """Decorator para verificar se o usuário é super admin"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Acesso restrito a administradores da plataforma'}), 403
        # Verificar se é super admin (campo is_super_admin)
        if not user.is_super_admin:
            return jsonify({'error': 'Acesso restrito a super administradores'}), 403
        return f(*args, **kwargs)
    return decorated_function


@platform_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_platform_dashboard():
    """Retorna métricas gerais da plataforma"""
    try:
        from datetime import datetime, timedelta, timezone

        from src.models.portal_models import Driver, Order, Tenant

        # Contar tenants ativos
        tenants = Tenant.query.filter_by(is_active=True).count()

        # Contar usuários totais
        users = User.query.count()

        # Contar entregadores
        drivers = Driver.query.count()

        # Contar pedidos
        orders = Order.query.count()

        # Pedidos dos últimos 7 dias
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        week_orders = Order.query.filter(Order.created_at >= week_ago).count()

        # Receita total (soma de delivery_fee de pedidos entregues)
        from src.models.portal_models import OrderStatus
        Order.query.filter(Order.status == OrderStatus.DELIVERED).all()
        total_revenue = db.session.query(func.sum(Order.delivery_fee)).filter(Order.status == OrderStatus.DELIVERED).scalar() or 0

        # Top tenants por pedidos (usando contagem no banco, não em Python)
        top_tenants = []
        all_tenants = Tenant.query.filter_by(is_active=True).all()
        for tenant in all_tenants:
            tenant_orders = db.session.query(func.count(Order.id)).filter(Order.tenant_id == tenant.id).scalar() or 0
            tenant_drivers = db.session.query(func.count(Driver.id)).filter(Driver.tenant_id == tenant.id).scalar() or 0
            top_tenants.append({
                'id': tenant.id,
                'name': tenant.name,
                'orders': tenant_orders,
                'drivers': tenant_drivers
            })

        return jsonify({
            'stats': {
                'total_tenants': tenants,
                'total_users': users,
                'total_drivers': drivers,
                'total_orders': orders,
                'total_revenue': round(total_revenue, 2),
                'week_orders': week_orders
            },
            'top_tenants': sorted(top_tenants, key=lambda x: x['orders'], reverse=True)[:5]
        }), 200

    except Exception as e:
        logger.error(f"Erro no dashboard: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/admins', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_admins():
    """Lista todos os admins da plataforma"""
    try:
        from datetime import datetime, timezone

        from src.models.portal_models import Driver, Order, Restaurant, Tenant

        # Pre-load tenants
        tenants_map = {t.id: t.name for t in Tenant.query.all()}

        # Buscar admins (excluindo super admins e soft-deleted)
        admins = User.query.filter(
            User.user_type == UserType.ADMIN,
            User.is_super_admin == False,  # noqa: E712
            User.deleted_at.is_(None)
        ).all()

        result = []
        for admin in admins:
            establishments = Restaurant.query.filter_by(tenant_id=admin.tenant_id).count()
            drivers = Driver.query.filter_by(tenant_id=admin.tenant_id).count()
            first_day = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            orders_month = Order.query.filter(
                Order.tenant_id == admin.tenant_id,
                Order.created_at >= first_day
            ).count()

            result.append({
                'id': admin.id,
                'email': admin.email,
                'first_name': admin.first_name,
                'last_name': admin.last_name,
                'phone': admin.phone,
                'status': admin.status.value if admin.status else 'UNKNOWN',
                'tenant_id': admin.tenant_id,
                'tenant_name': tenants_map.get(admin.tenant_id),
                'establishments': establishments,
                'drivers': drivers,
                'orders_month': orders_month,
                'created_at': admin.created_at.isoformat() if admin.created_at else None
            })

        return jsonify({'admins': result}), 200

    except Exception as e:
        logger.error(f"Erro ao listar admins: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/admins', methods=['POST'])
@jwt_required()
@platform_admin_required
def create_admin():
    """Cria um novo admin (cliente da plataforma)"""
    try:
        data = request.get_json()

        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        phone = data.get('phone', '')
        company_name = data.get('company_name', '')
        tenant_id = data.get('tenant_id')

        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400

        from src.utils.auth import validate_password
        pwd_err = validate_password(password)
        if pwd_err:
            return jsonify({'error': pwd_err}), 400

        # Verificar se email já existe
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400

        import uuid

        from src.models.portal_models import Tenant

        # Se tenant_id foi fornecido, usar tenant existente
        if tenant_id:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return jsonify({'error': 'Tenant não encontrado'}), 404
        else:
            # Criar novo tenant
            slug = company_name.lower().replace(' ', '-') if company_name else f"tenant-{uuid.uuid4().hex[:8]}"

            # Verificar se slug já existe
            existing_tenant = Tenant.query.filter_by(slug=slug).first()
            if existing_tenant:
                slug = f"{slug}-{uuid.uuid4().hex[:4]}"

            tenant = Tenant(
                name=company_name or f"Empresa de {first_name}",
                slug=slug,
                is_active=True
            )
            db.session.add(tenant)
            db.session.flush()

        # Criar user admin
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            cpf=f"ADMIN{uuid.uuid4().hex[:8].upper()}",
            user_type=UserType.ADMIN,
            status=UserStatus.ACTIVE,
            tenant_id=tenant.id
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return jsonify({
            'message': 'Admin criado com sucesso',
            'admin': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'tenant_id': tenant.id,
                'tenant_name': tenant.name
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar admin: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/admins/<int:admin_id>', methods=['PUT'])
@jwt_required()
@platform_admin_required
def update_admin(admin_id):
    """Atualiza dados de um admin"""
    try:
        admin = User.query.get(admin_id)
        if not admin or admin.user_type != UserType.ADMIN:
            return jsonify({'error': 'Admin não encontrado'}), 404

        # Não permitir editar super admin
        if admin.is_super_admin:
            return jsonify({'error': 'Não é possível editar super admin'}), 400

        data = request.get_json()

        if 'first_name' in data:
            admin.first_name = data['first_name']
        if 'last_name' in data:
            admin.last_name = data['last_name']
        if 'phone' in data:
            admin.phone = data['phone']
        if 'status' in data:
            try:
                admin.status = UserStatus(data['status'])
            except ValueError:
                return jsonify({'error': 'Status inválido'}), 400

        db.session.commit()

        return jsonify({
            'message': 'Admin atualizado com sucesso',
            'admin': {
                'id': admin.id,
                'email': admin.email,
                'first_name': admin.first_name,
                'last_name': admin.last_name,
                'status': admin.status.value if admin.status else 'UNKNOWN'
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar admin: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/admins/<int:admin_id>', methods=['DELETE'])
@jwt_required()
@platform_admin_required
def delete_admin(admin_id):
    """Exclui um admin (soft delete)"""
    try:
        admin = User.query.get(admin_id)
        if not admin or admin.user_type != UserType.ADMIN:
            return jsonify({'error': 'Admin não encontrado'}), 404

        # Não permitir excluir super admin
        if admin.is_super_admin:
            return jsonify({'error': 'Não é possível excluir super admin'}), 400

        # Soft delete - marcar como excluído, manter dados
        current_user_id = int(get_jwt_identity())
        success = soft_delete_user(admin_id, current_user_id)

        if success:
            return jsonify({'message': 'Admin movido para a lixeira'}), 200
        else:
            return jsonify({'error': 'Erro ao excluir admin'}), 500

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao excluir admin: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/setup-super-admin', methods=['POST'])
def setup_super_admin():
    """
    Endpoint para promover um admin a super admin.
    Requer ADMIN_SETUP_TOKEN como secret.
    """
    import os
    try:
        data = request.get_json()
        email = data.get('email')
        secret = data.get('secret')

        # Segurança: usar token do ambiente
        expected_token = os.environ.get('ADMIN_SETUP_TOKEN')
        if not expected_token:
            return jsonify({'error': 'ADMIN_SETUP_TOKEN não configurado no servidor'}), 500

        if secret != expected_token:
            return jsonify({'error': 'Secret inválido'}), 403

        if not email:
            return jsonify({'error': 'Email é obrigatório'}), 400

        # Buscar o admin
        user = User.query.filter_by(email=email, user_type=UserType.ADMIN).first()
        if not user:
            return jsonify({'error': 'Admin não encontrado'}), 404

        # Promover a super admin (remover tenant_id e setar is_super_admin)
        old_tenant_id = user.tenant_id
        user.tenant_id = None
        user.is_super_admin = True
        db.session.commit()

        return jsonify({
            'message': f'Admin {email} promovido a Super Admin com sucesso',
            'old_tenant_id': old_tenant_id,
            'note': 'Agora você pode acessar /platform/login com este email'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao promover admin: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_tenants():
    """Lista todos os tenants"""
    try:
        from src.models.portal_models import Driver, Order, Restaurant, Tenant

        tenants = Tenant.query.all()
        result = []

        # Contagens em lote (evita N+1 — item "Índices + N+1" da auditoria)
        counts = {}
        if tenants:
            t_ids = [t.id for t in tenants]
            for rotulo, campo in (
                ('users_count', User.tenant_id),
                ('drivers_count', Driver.tenant_id),
                ('restaurants_count', Restaurant.tenant_id),
                ('orders_count', Order.tenant_id),
            ):
                for tid, n in db.session.query(campo, func.count()).filter(campo.in_(t_ids)).group_by(campo):
                    counts.setdefault(tid, {})[rotulo] = n

        for tenant in tenants:
            _t = counts.get(tenant.id, {})
            users_count = _t.get('users_count', 0)
            drivers_count = _t.get('drivers_count', 0)
            restaurants_count = _t.get('restaurants_count', 0)
            orders_count = _t.get('orders_count', 0)

            result.append({
                'id': tenant.id,
                'name': tenant.name,
                'slug': tenant.slug,
                'plan': tenant.plan or 'basic',
                'is_active': tenant.is_active,
                'phone': tenant.phone,
                'email': tenant.email,
                'cnpj': tenant.cnpj,
                'address': tenant.address,
                'primary_color': tenant.primary_color,
                'secondary_color': tenant.secondary_color,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                'users_count': users_count,
                'drivers_count': drivers_count,
                'restaurants_count': restaurants_count,
                'orders_count': orders_count
            })

        return jsonify({'tenants': result}), 200

    except Exception as e:
        logger.error(f"Erro ao listar tenants: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants/<int:tenant_id>', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_tenant_details(tenant_id):
    """Retorna detalhes de um tenant"""
    try:
        from src.models.portal_models import Driver, Order, Restaurant, Tenant

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        drivers = Driver.query.filter_by(tenant_id=tenant.id).all()
        restaurants = Restaurant.query.filter_by(tenant_id=tenant.id).all()
        orders = Order.query.filter_by(tenant_id=tenant.id).order_by(Order.created_at.desc()).limit(10).all()

        return jsonify({
            'tenant': {
                'id': tenant.id,
                'name': tenant.name,
                'slug': tenant.slug,
                'plan': tenant.plan or 'basic',
                'is_active': tenant.is_active,
                # Campos de contato e white-label — necessários no modal de edição
                'phone': tenant.phone,
                'email': tenant.email,
                'cnpj': tenant.cnpj,
                'address': tenant.address,
                'primary_color': tenant.primary_color,
                'secondary_color': tenant.secondary_color,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                'users': [{'id': u.id, 'email': u.email, 'first_name': u.first_name} for u in User.query.filter_by(tenant_id=tenant.id).all()],
                'drivers_count': len(drivers),
                'restaurants_count': len(restaurants),
                'orders_count': Order.query.filter_by(tenant_id=tenant.id).count(),
                'recent_orders': [{'id': o.id, 'order_number': o.order_number, 'status': o.status.value if o.status else 'UNKNOWN', 'delivery_fee': float(o.delivery_fee or 0)} for o in orders]
            }
        }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar tenant: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants/<int:tenant_id>/toggle', methods=['POST'])
@jwt_required()
@platform_admin_required
def toggle_tenant(tenant_id):
    """Ativa/desativa um tenant"""
    try:
        from src.models.portal_models import Tenant

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        tenant.is_active = not tenant.is_active
        db.session.commit()

        return jsonify({
            'message': f'Tenant {"ativado" if tenant.is_active else "desativado"} com sucesso',
            'is_active': tenant.is_active
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao alterar tenant: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/users', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_platform_users():
    """Lista todos os usuários (com filtro por tenant)"""
    try:
        tenant_id = request.args.get('tenant_id', type=int)

        query = User.query.filter(User.deleted_at.is_(None))
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)

        users = query.order_by(User.created_at.desc()).all()

        # Pre-load tenants for name lookup
        from src.models.portal_models import Tenant
        tenants_map = {t.id: t.name for t in Tenant.query.all()}

        result = []
        # Classificação Próprio vs Plataforma por telefone (não por nome)
        from src.utils.driver_type import get_driver_subtype_for_user
        for user in users:
            subtype = get_driver_subtype_for_user(user)
            result.append({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': user.phone,
                'cpf': user.cpf,
                'user_type': user.user_type.value if user.user_type else 'UNKNOWN',
                # Para DRIVER: 'OWN' (próprio) ou 'PLATFORM' (plataforma)
                'driver_subtype': subtype,
                'status': user.status.value if user.status else 'UNKNOWN',
                'tenant_id': user.tenant_id,
                'tenant_name': tenants_map.get(user.tenant_id) if user.tenant_id else 'Plataforma (sem tenant)',
                'created_at': user.created_at.isoformat() if user.created_at else None
            })

        return jsonify({'users': result}), 200

    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@platform_admin_required
def update_platform_user(user_id):
    """Atualiza um usuário"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Não permitir editar super admin por esta rota
        if user.is_super_admin:
            return jsonify({'error': 'Não é possível editar super admin por esta rota'}), 400

        data = request.get_json()

        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            # Verificar se email já existe
            existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
            if existing:
                return jsonify({'error': 'Email já cadastrado'}), 400
            user.email = data['email']
        if 'phone' in data:
            old_phone = user.phone
            new_phone = (data.get('phone') or '').strip()
            user.phone = new_phone
            # Sincronizar com cadastro próprio, se existir
            from src.utils.driver_type import sync_user_phone_to_own_driver
            sync_user_phone_to_own_driver(user, old_phone=old_phone, new_phone=new_phone)
        if 'status' in data:
            from src.models.portal_models import UserStatus
            user.status = UserStatus(data['status'])
        if 'tenant_id' in data:
            # Apenas super admins podem alterar tenant_id de admins
            # E não pode remover tenant_id de um admin (para evitar promoção acidental)
            if user.user_type == UserType.ADMIN and data['tenant_id'] is None:
                return jsonify({'error': 'Não é possível remover tenant_id de um admin. Use /setup-super-admin para promover a super admin.'}), 400
            user.tenant_id = data['tenant_id'] if data['tenant_id'] else None
        if 'password' in data and data['password']:
            from src.utils.auth import validate_password
            pwd_err = validate_password(data['password'])
            if pwd_err:
                return jsonify({'error': pwd_err}), 400
            user.set_password(data['password'])

        db.session.commit()

        return jsonify({
            'message': 'Usuário atualizado com sucesso',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar usuário: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@platform_admin_required
def delete_platform_user(user_id):
    """Exclui um usuário (soft delete)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Não permitir excluir super admin
        if user.user_type.value == 'ADMIN' and user.is_super_admin:
            return jsonify({'error': 'Não é possível excluir o super admin'}), 400

        # Soft delete
        current_user_id = int(get_jwt_identity())
        success = soft_delete_user(user_id, current_user_id)

        if success:
            return jsonify({'message': 'Usuário movido para a lixeira'}), 200
        else:
            return jsonify({'error': 'Erro ao excluir usuário'}), 500

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao excluir usuário: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants', methods=['POST'])
@jwt_required()
@platform_admin_required
def create_tenant():
    """Cria um novo tenant (organização)"""
    try:
        import uuid

        from src.models.portal_models import Tenant

        data = request.get_json()

        name = data.get('name')
        slug = data.get('slug')
        plan = data.get('plan', 'basic')

        if not name:
            return jsonify({'error': 'Nome é obrigatório'}), 400

        # Gerar slug se não fornecido
        if not slug:
            slug = name.lower().replace(' ', '-').replace('ã', 'a').replace('ç', 'c').replace('é', 'e').replace('ó', 'o')

        # Verificar se slug já existe
        existing = Tenant.query.filter_by(slug=slug).first()
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"

        tenant = Tenant(
            name=name,
            slug=slug,
            plan=plan,
            is_active=True,
            primary_color=data.get('primary_color', '#6366f1'),
            secondary_color=data.get('secondary_color', '#ffffff'),
            phone=data.get('phone', ''),
            email=data.get('email', ''),
            address=data.get('address', ''),
            cnpj=data.get('cnpj', '')
        )
        db.session.add(tenant)
        db.session.commit()

        return jsonify({
            'message': 'Tenant criado com sucesso',
            'tenant': {
                'id': tenant.id,
                'name': tenant.name,
                'slug': tenant.slug,
                'plan': tenant.plan,
                'is_active': tenant.is_active
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar tenant: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants/<int:tenant_id>', methods=['PUT'])
@jwt_required()
@platform_admin_required
def update_tenant(tenant_id):
    """Atualiza dados de um tenant"""
    try:
        from src.models.portal_models import Tenant

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        data = request.get_json()

        if 'name' in data:
            tenant.name = data['name']
        if 'slug' in data:
            # Verificar se novo slug já existe
            existing = Tenant.query.filter(Tenant.slug == data['slug'], Tenant.id != tenant_id).first()
            if existing:
                return jsonify({'error': 'Slug já em uso'}), 400
            tenant.slug = data['slug']
        if 'plan' in data:
            tenant.plan = data['plan']
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
        if 'max_deliveries_month' in data:
            tenant.max_deliveries_month = data['max_deliveries_month']
        if 'max_drivers' in data:
            tenant.max_drivers = data['max_drivers']
        if 'max_clients' in data:
            tenant.max_clients = data['max_clients']

        db.session.commit()

        return jsonify({
            'message': 'Tenant atualizado com sucesso',
            'tenant': {
                'id': tenant.id,
                'name': tenant.name,
                'slug': tenant.slug,
                'plan': tenant.plan,
                'is_active': tenant.is_active
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar tenant: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants/<int:tenant_id>', methods=['DELETE'])
@jwt_required()
@platform_admin_required
def delete_tenant(tenant_id):
    """Exclui um tenant"""
    try:
        from src.models.portal_models import Driver, Order, Restaurant, Tenant

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        # Verificar se tem dados vinculados
        drivers = Driver.query.filter_by(tenant_id=tenant_id).count()
        restaurants = Restaurant.query.filter_by(tenant_id=tenant_id).count()
        orders = Order.query.filter_by(tenant_id=tenant_id).count()
        users = User.query.filter_by(tenant_id=tenant_id).count()

        force = request.args.get('force', 'false').lower() == 'true'

        if (drivers > 0 or restaurants > 0 or orders > 0 or users > 0) and not force:
            return jsonify({
                'error': 'Tenant possui dados vinculados',
                'drivers': drivers,
                'restaurants': restaurants,
                'orders': orders,
                'users': users,
                'suggestion': 'Use ?force=true para excluir mesmo assim'
            }), 400

        # Excluir dados vinculados se force=true
        # Estratégia genérica: o banco descobre sozinho todas as chaves
        # estrangeiras e apaga os dados que derivam do tenant na ordem certa
        # (filhos antes dos pais). Tabela nova criada no futuro entra
        # automaticamente, sem precisar manter lista aqui.
        if force:
            from collections import defaultdict

            # 1) Mapa de ligações: filho.coluna -> pai (ex.: addresses.customer_id -> customers)
            fks = db.session.execute(db.text("""
                SELECT kcu.table_name, kcu.column_name, ccu.table_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public'
            """)).fetchall()

            # 2) Coletar os IDs de tudo que deriva do tenant (caminhando as ligações)
            ids_por_tabela = defaultdict(set)
            ids_por_tabela['tenants'].add(tenant_id)
            mudou = True
            while mudou:
                mudou = False
                for filho, coluna, pai in fks:
                    if not ids_por_tabela.get(pai) or filho == pai:
                        continue
                    rows = db.session.execute(db.text(
                        f'SELECT id FROM "{filho}" WHERE "{coluna}" = ANY(:pids)'
                    ), {"pids": list(ids_por_tabela[pai])}).fetchall()
                    novos = {r[0] for r in rows} - ids_por_tabela[filho]
                    if novos:
                        ids_por_tabela[filho] |= novos
                        mudou = True

            # 3) Ordem de exclusão: filho antes do pai (ordenação topológica)
            tabelas = {t for t in ids_por_tabela if ids_por_tabela[t] and t != 'users'}
            posteriores = defaultdict(set)
            grau = defaultdict(int)
            for filho, coluna, pai in fks:
                if filho in tabelas and pai in tabelas and filho != pai and pai not in posteriores[filho]:
                    posteriores[filho].add(pai)
                    grau[pai] += 1
            fila = [t for t in tabelas if grau[t] == 0]
            ordem = []
            while fila:
                t = fila.pop()
                ordem.append(t)
                for pai in posteriores[t]:
                    grau[pai] -= 1
                    if grau[pai] == 0:
                        fila.append(pai)
            # Sobras de ciclos (se houver) vão por último
            ordem += [t for t in tabelas if t not in ordem]

            # 4) Apagar na ordem (savepoint: uma falha não derruba as demais)
            for tabela in ordem:
                try:
                    with db.session.begin_nested():
                        db.session.execute(db.text(
                            f'DELETE FROM "{tabela}" WHERE id = ANY(:ids)'
                        ), {"ids": list(ids_por_tabela[tabela])})
                except Exception:
                    pass  # savepoint revertido — as demais exclusões seguem

            # 5) Usuários são mantidos no sistema — apenas desvinculados do tenant
            if ids_por_tabela.get('users'):
                db.session.execute(db.text(
                    "UPDATE users SET tenant_id = NULL WHERE id = ANY(:ids)"
                ), {"ids": list(ids_por_tabela['users'])})

                db.session.delete(tenant)
        db.session.commit()

        return jsonify({'message': 'Tenant excluído com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao excluir tenant: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# CONVITES DE ADMIN (onboarding self-service)
# ============================================

@platform_bp.route('/admin-invites', methods=['POST'])
@jwt_required()
@platform_admin_required
def create_admin_invite():
    """Cria um convite para um futuro admin criar a própria conta.

    Body: tenant_id (obrigatório), email (opcional — se vier, só esse email aceita),
    expires_days (opcional, padrão 7, máximo 30).
    Retorna o token; o link é montado pelo frontend.
    """
    try:
        from datetime import timedelta

        from src.models.portal_models import AdminInvite, Tenant
        from src.utils.validation import Schema, ValidationError, validate_request

        schema = Schema({
            'tenant_id': {'type': int, 'required': True, 'min': 1},
            'email': {'type': str, 'required': False, 'max_length': 255},
            'expires_days': {'type': int, 'required': False, 'min': 1, 'max': 30, 'default': 7},
        })
        try:
            data = validate_request(schema, request.get_json() or {})
        except ValidationError as e:
            return jsonify({'error': '; '.join(e.errors)}), 400

        tenant = Tenant.query.get(data['tenant_id'])
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        email = (data.get('email') or '').strip().lower() or None
        if email:
            # Evitar convite para email que já tem conta
            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Este email já possui cadastro'}), 400

        import secrets

        creator_id = int(get_jwt_identity())
        invite = AdminInvite(
            tenant_id=tenant.id,
            email=email,
            token=secrets.token_urlsafe(32),
            created_by=creator_id,
            expires_at=AdminInvite.now_naive() + timedelta(days=data.get('expires_days', 7)),
        )
        db.session.add(invite)
        db.session.commit()

        return jsonify({
            'message': 'Convite criado com sucesso',
            'invite': invite.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar convite: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/admin-invites', methods=['GET'])
@jwt_required()
@platform_admin_required
def list_admin_invites():
    """Lista convites de admin (mais recentes primeiro) com status derivado."""
    try:
        from src.models.portal_models import AdminInvite

        tenant_id = request.args.get('tenant_id', type=int)
        query = AdminInvite.query
        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        invites = query.order_by(AdminInvite.created_at.desc()).limit(100).all()

        return jsonify({'invites': [i.to_dict() for i in invites]}), 200

    except Exception as e:
        logger.error(f"Erro ao listar convites: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/admin-invites/<int:invite_id>', methods=['DELETE'])
@jwt_required()
@platform_admin_required
def revoke_admin_invite(invite_id):
    """Revoga um convite ainda não utilizado."""
    try:
        from src.models.portal_models import AdminInvite

        invite = AdminInvite.query.get(invite_id)
        if not invite:
            return jsonify({'error': 'Convite não encontrado'}), 404
        if invite.used_at:
            return jsonify({'error': 'Convite já foi utilizado'}), 400
        if invite.revoked_at:
            return jsonify({'message': 'Convite já estava revogado'}), 200

        invite.revoked_at = AdminInvite.now_naive()
        db.session.commit()

        return jsonify({'message': 'Convite revogado com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao revogar convite: {e}")
        return jsonify({'error': str(e)}), 500
