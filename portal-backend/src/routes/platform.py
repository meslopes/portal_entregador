from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    User, UserType, UserStatus, db
)
from werkzeug.security import generate_password_hash
import logging

logger = logging.getLogger(__name__)

platform_bp = Blueprint('platform', __name__)


def platform_admin_required(f):
    """Decorator para verificar se o usuário é super admin"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Acesso restrito a administradores da plataforma'}), 403
        # Verificar se é super admin (sem tenant_id)
        if user.tenant_id is not None:
            return jsonify({'error': 'Acesso restrito a super administradores'}), 403
        return f(*args, **kwargs)
    return decorated_function


@platform_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_platform_dashboard():
    """Retorna métricas gerais da plataforma"""
    try:
        from src.models.portal_models import Driver, Restaurant, Order, Tenant
        from datetime import datetime, timedelta
        
        # Contar tenants ativos
        tenants = Tenant.query.filter_by(is_active=True).count()
        
        # Contar usuários totais
        users = User.query.count()
        
        # Contar entregadores
        drivers = Driver.query.count()
        
        # Contar pedidos
        orders = Order.query.count()
        
        # Pedidos dos últimos 7 dias
        week_ago = datetime.utcnow() - timedelta(days=7)
        week_orders = Order.query.filter(Order.created_at >= week_ago).count()
        
        # Receita total (soma de delivery_fee de pedidos entregues)
        delivered_orders = Order.query.filter_by(status='DELIVERED').all()
        total_revenue = sum(float(o.delivery_fee or 0) for o in delivered_orders)
        
        # Top tenants por pedidos
        top_tenants = []
        all_tenants = Tenant.query.filter_by(is_active=True).all()
        for tenant in all_tenants[:5]:
            tenant_orders = Order.query.filter_by(tenant_id=tenant.id).count()
            tenant_drivers = Driver.query.filter_by(tenant_id=tenant.id).count()
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
            'top_tenants': sorted(top_tenants, key=lambda x: x['orders'], reverse=True)
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
        from src.models.portal_models import Tenant, Restaurant, Driver, Order
        from datetime import datetime

        # Pre-load tenants
        tenants_map = {t.id: t.name for t in Tenant.query.all()}

        # Buscar admins com tenant_id (clientes da plataforma)
        admins = User.query.filter(
            User.user_type == UserType.ADMIN,
            User.tenant_id.isnot(None)
        ).all()
        
        result = []
        for admin in admins:
            establishments = Restaurant.query.filter_by(tenant_id=admin.tenant_id).count()
            drivers = Driver.query.filter_by(tenant_id=admin.tenant_id).count()
            first_day = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
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
        
        if len(password) < 6:
            return jsonify({'error': 'Senha deve ter pelo menos 6 caracteres'}), 400
        
        # Verificar se email já existe
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400
        
        from src.models.portal_models import Tenant
        import uuid
        
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
        if admin.tenant_id is None:
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
    """Exclui um admin"""
    try:
        admin = User.query.get(admin_id)
        if not admin or admin.user_type != UserType.ADMIN:
            return jsonify({'error': 'Admin não encontrado'}), 404
        
        # Não permitir excluir super admin
        if admin.tenant_id is None:
            return jsonify({'error': 'Não é possível excluir super admin'}), 400
        
        # Verificar se tem dados vinculados
        from src.models.portal_models import Restaurant, Driver, Order
        
        establishments = Restaurant.query.filter_by(tenant_id=admin.tenant_id).count()
        drivers = Driver.query.filter_by(tenant_id=admin.tenant_id).count()
        orders = Order.query.filter_by(tenant_id=admin.tenant_id).count()
        
        force = request.args.get('force', 'false').lower() == 'true'
        
        if (establishments > 0 or drivers > 0 or orders > 0) and not force:
            return jsonify({
                'error': 'Admin possui dados vinculados',
                'establishments': establishments,
                'drivers': drivers,
                'orders': orders,
                'suggestion': 'Use ?force=true para excluir mesmo assim'
            }), 400
        
        # Excluir dados vinculados se force=true
        if force:
            # Usar SQL direto com parâmetros nomeados para evitar SQL injection
            db.session.execute(db.text("DELETE FROM orders WHERE tenant_id = :tid"), {"tid": admin.tenant_id})
            db.session.execute(db.text("DELETE FROM drivers WHERE tenant_id = :tid"), {"tid": admin.tenant_id})
            db.session.execute(db.text("DELETE FROM restaurants WHERE tenant_id = :tid"), {"tid": admin.tenant_id})
        
        # Excluir tenant
        from src.models.portal_models import Tenant
        tenant = Tenant.query.get(admin.tenant_id)
        if tenant:
            db.session.delete(tenant)
        
        # Excluir user
        db.session.delete(admin)
        db.session.commit()
        
        return jsonify({'message': 'Admin excluído com sucesso'}), 200
        
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
        
        # Promover a super admin (remover tenant_id)
        old_tenant_id = user.tenant_id
        user.tenant_id = None
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
        from src.models.portal_models import Tenant, Driver, Restaurant, Order
        
        tenants = Tenant.query.all()
        result = []
        
        for tenant in tenants:
            drivers_count = Driver.query.filter_by(tenant_id=tenant.id).count()
            restaurants_count = Restaurant.query.filter_by(tenant_id=tenant.id).count()
            orders_count = Order.query.filter_by(tenant_id=tenant.id).count()
            
            result.append({
                'id': tenant.id,
                'name': tenant.name,
                'slug': tenant.slug,
                'plan': tenant.plan or 'basic',
                'is_active': tenant.is_active,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
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
        from src.models.portal_models import Tenant, Driver, Restaurant, Order
        
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
        
        query = User.query
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        
        users = query.order_by(User.created_at.desc()).all()
        
        # Pre-load tenants for name lookup
        from src.models.portal_models import Tenant
        tenants_map = {t.id: t.name for t in Tenant.query.all()}
        
        result = []
        for user in users:
            result.append({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.user_type.value if user.user_type else 'UNKNOWN',
                'status': user.status.value if user.status else 'UNKNOWN',
                'tenant_id': user.tenant_id,
                'tenant_name': tenants_map.get(user.tenant_id) if user.tenant_id else None,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        return jsonify({'users': result}), 200
        
    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}")
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants', methods=['POST'])
@jwt_required()
@platform_admin_required
def create_tenant():
    """Cria um novo tenant (organização)"""
    try:
        from src.models.portal_models import Tenant
        import uuid
        
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
        from src.models.portal_models import Tenant, Driver, Restaurant, Order
        
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
        if force:
            db.session.execute(db.text("DELETE FROM orders WHERE tenant_id = :tid"), {"tid": tenant_id})
            db.session.execute(db.text("DELETE FROM drivers WHERE tenant_id = :tid"), {"tid": tenant_id})
            db.session.execute(db.text("DELETE FROM restaurants WHERE tenant_id = :tid"), {"tid": tenant_id})
            db.session.execute(db.text("UPDATE users SET tenant_id = NULL WHERE tenant_id = :tid"), {"tid": tenant_id})
        
        db.session.delete(tenant)
        db.session.commit()
        
        return jsonify({'message': 'Tenant excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao excluir tenant: {e}")
        return jsonify({'error': str(e)}), 500
