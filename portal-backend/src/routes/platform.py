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
        # Contar admins (users com tenant_id != null e user_type = ADMIN)
        admins = User.query.filter(
            User.user_type == UserType.ADMIN,
            User.tenant_id.isnot(None)
        ).count()
        
        # Contar entregadores
        from src.models.portal_models import Driver
        drivers = Driver.query.count()
        
        # Contar estabelecimentos
        from src.models.portal_models import Restaurant
        establishments = Restaurant.query.count()
        
        # Contar pedidos
        from src.models.portal_models import Order
        orders = Order.query.count()
        
        # Pedidos do mês atual
        from datetime import datetime, timedelta
        first_day = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        orders_this_month = Order.query.filter(Order.created_at >= first_day).count()
        
        # Receita total (soma de delivery_fee de pedidos entregues)
        delivered_orders = Order.query.filter_by(status='DELIVERED').all()
        total_revenue = sum(float(o.delivery_fee or 0) for o in delivered_orders)
        
        # Receita do mês
        monthly_orders = Order.query.filter(
            Order.status == 'DELIVERED',
            Order.created_at >= first_day
        ).all()
        monthly_revenue = sum(float(o.delivery_fee or 0) for o in monthly_orders)
        
        return jsonify({
            'admins': admins,
            'drivers': drivers,
            'establishments': establishments,
            'orders_total': orders,
            'orders_month': orders_this_month,
            'revenue_total': round(total_revenue, 2),
            'revenue_month': round(monthly_revenue, 2),
            'mrr': admins * 199.00  # MRR estimado
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
        # Buscar admins com tenant_id (clientes da plataforma)
        admins = User.query.filter(
            User.user_type == UserType.ADMIN,
            User.tenant_id.isnot(None)
        ).all()
        
        result = []
        for admin in admins:
            # Contar estabelecimentos do admin
            from src.models.portal_models import Restaurant
            establishments = Restaurant.query.filter_by(tenant_id=admin.tenant_id).count()
            
            # Contar entregadores do admin
            from src.models.portal_models import Driver
            drivers = Driver.query.filter_by(tenant_id=admin.tenant_id).count()
            
            # Contar pedidos do mês
            from src.models.portal_models import Order
            from datetime import datetime
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
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Senha deve ter pelo menos 6 caracteres'}), 400
        
        # Verificar se email já existe
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400
        
        # Criar tenant para o admin
        from src.models.portal_models import Tenant
        import uuid
        
        # Gerar slug único para o tenant
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
            # Usar SQL direto para evitar problemas de cascade
            db.session.execute(db.text(f"DELETE FROM orders WHERE tenant_id = {admin.tenant_id}"))
            db.session.execute(db.text(f"DELETE FROM drivers WHERE tenant_id = {admin.tenant_id}"))
            db.session.execute(db.text(f"DELETE FROM restaurants WHERE tenant_id = {admin.tenant_id}"))
        
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
    Endpoint temporário para promover um admin a super admin.
    ⚠️ USE APENAS UMA VEZ - depois remova este endpoint
    """
    try:
        data = request.get_json()
        email = data.get('email')
        secret = data.get('secret')
        
        # Segurança: só funciona com o secret correto
        if secret != 'muvlog-setup-2024':
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
