"""
Rotas do painel Super Admin (plataforma)
Acesso restrito a usuários sem tenant_id (nível plataforma)
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    User, Driver, Order, Restaurant, Customer, Tenant, 
    UserType, UserStatus, OrderStatus, db
)
from src.utils.tenant import get_current_user
from datetime import datetime, timedelta
from sqlalchemy import func

platform_bp = Blueprint('platform', __name__)


def platform_admin_required(f):
    """Decorator que exige super admin (usuário sem tenant_id ou email específico)"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Usuário não autenticado'}), 401
        # Super admin: sem tenant_id ou email específico da plataforma
        if user.tenant_id is not None and user.email not in ['admin@muv.log.br', 'muvy.log@gmail.com']:
            return jsonify({'error': 'Acesso restrito ao administrador da plataforma'}), 403
        return f(*args, **kwargs)
    return decorated_function


@platform_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@platform_admin_required
def platform_dashboard():
    """Dashboard geral da plataforma"""
    try:
        # Estatísticas gerais
        total_tenants = Tenant.query.filter_by(is_active=True).count()
        total_users = User.query.count()
        total_drivers = Driver.query.count()
        total_orders = Order.query.count()
        total_restaurants = Restaurant.query.count()

        # Pedidos por status
        orders_by_status = db.session.query(
            Order.status, func.count(Order.id)
        ).group_by(Order.status).all()

        # Pedidos dos últimos 7 dias
        week_ago = datetime.utcnow() - timedelta(days=7)
        week_orders = Order.query.filter(Order.created_at >= week_ago).count()

        # Receita total (delivery_fee)
        total_revenue = db.session.query(
            func.sum(Order.delivery_fee)
        ).filter(Order.status == OrderStatus.DELIVERED).scalar() or 0

        # Top tenants por pedidos
        top_tenants = db.session.query(
            Tenant.id,
            Tenant.name,
            Tenant.slug,
            Tenant.plan,
            func.count(Order.id).label('order_count')
        ).outerjoin(User, User.tenant_id == Tenant.id)\
         .outerjoin(Order, Order.tenant_id == Tenant.id)\
         .group_by(Tenant.id, Tenant.name, Tenant.slug, Tenant.plan)\
         .order_by(func.count(Order.id).desc())\
         .limit(5).all()

        # Tenants recentes
        recent_tenants = Tenant.query.order_by(
            Tenant.created_at.desc()
        ).limit(5).all()

        return jsonify({
            'stats': {
                'total_tenants': total_tenants,
                'total_users': total_users,
                'total_drivers': total_drivers,
                'total_orders': total_orders,
                'total_restaurants': total_restaurants,
                'week_orders': week_orders,
                'total_revenue': float(total_revenue)
            },
            'orders_by_status': {s.value: c for s, c in orders_by_status},
            'top_tenants': [
                {
                    'id': t.id,
                    'name': t.name,
                    'slug': t.slug,
                    'plan': t.plan,
                    'order_count': t.order_count or 0
                }
                for t in top_tenants
            ],
            'recent_tenants': [t.to_dict() for t in recent_tenants]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants', methods=['GET'])
@jwt_required()
@platform_admin_required
def list_all_tenants():
    """Lista todos os tenants com estatísticas"""
    try:
        tenants = Tenant.query.order_by(Tenant.created_at.desc()).all()

        tenants_data = []
        for tenant in tenants:
            t_dict = tenant.to_dict()
            # Estatísticas do tenant
            t_dict['users_count'] = User.query.filter_by(tenant_id=tenant.id).count()
            t_dict['drivers_count'] = Driver.query.filter_by(tenant_id=tenant.id).count()
            t_dict['orders_count'] = Order.query.filter_by(tenant_id=tenant.id).count()
            t_dict['restaurants_count'] = Restaurant.query.filter_by(tenant_id=tenant.id).count()

            # Receita do tenant
            revenue = db.session.query(
                func.sum(Order.delivery_fee)
            ).filter(
                Order.tenant_id == tenant.id,
                Order.status == OrderStatus.DELIVERED
            ).scalar() or 0
            t_dict['revenue'] = float(revenue)

            tenants_data.append(t_dict)

        return jsonify({'tenants': tenants_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants/<int:tenant_id>', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_tenant_details(tenant_id):
    """Obtém detalhes de um tenant específico"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        t_dict = tenant.to_dict()

        # Estatísticas detalhadas
        t_dict['users'] = [
            u.to_dict() for u in User.query.filter_by(tenant_id=tenant.id).limit(10).all()
        ]
        t_dict['drivers_count'] = Driver.query.filter_by(tenant_id=tenant.id).count()
        t_dict['orders_count'] = Order.query.filter_by(tenant_id=tenant.id).count()
        t_dict['restaurants_count'] = Restaurant.query.filter_by(tenant_id=tenant.id).count()

        # Pedidos recentes
        recent_orders = Order.query.filter_by(
            tenant_id=tenant.id
        ).order_by(Order.created_at.desc()).limit(5).all()
        t_dict['recent_orders'] = [o.to_dict() for o in recent_orders]

        return jsonify({'tenant': t_dict}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants/<int:tenant_id>', methods=['PUT'])
@jwt_required()
@platform_admin_required
def update_tenant(tenant_id):
    """Atualiza um tenant"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        data = request.get_json()

        if 'name' in data:
            tenant.name = data['name']
        if 'plan' in data:
            tenant.plan = data['plan']
        if 'max_deliveries_month' in data:
            tenant.max_deliveries_month = data['max_deliveries_month']
        if 'max_drivers' in data:
            tenant.max_drivers = data['max_drivers']
        if 'max_clients' in data:
            tenant.max_clients = data['max_clients']
        if 'is_active' in data:
            tenant.is_active = data['is_active']
        if 'primary_color' in data:
            tenant.primary_color = data['primary_color']
        if 'secondary_color' in data:
            tenant.secondary_color = data['secondary_color']

        tenant.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Tenant atualizado com sucesso',
            'tenant': tenant.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/tenants/<int:tenant_id>/toggle', methods=['POST'])
@jwt_required()
@platform_admin_required
def toggle_tenant(tenant_id):
    """Ativa/desativa um tenant"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        tenant.is_active = not tenant.is_active
        tenant.updated_at = datetime.utcnow()
        db.session.commit()

        status = "ativado" if tenant.is_active else "desativado"
        return jsonify({
            'message': f'Tenant {status} com sucesso',
            'tenant': tenant.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platform_bp.route('/users', methods=['GET'])
@jwt_required()
@platform_admin_required
def list_all_users():
    """Lista todos os usuários da plataforma"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        tenant_id = request.args.get('tenant_id', type=int)
        user_type = request.args.get('type')

        query = User.query

        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        if user_type:
            query = query.filter(User.user_type == UserType(user_type))

        users = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        users_data = []
        for user in users.items:
            u_dict = user.to_dict()
            # Adicionar nome do tenant
            if user.tenant_id:
                tenant = Tenant.query.get(user.tenant_id)
                u_dict['tenant_name'] = tenant.name if tenant else 'Desconhecido'
            else:
                u_dict['tenant_name'] = 'Plataforma'
            users_data.append(u_dict)

        return jsonify({
            'users': users_data,
            'total': users.total,
            'pages': users.pages,
            'current_page': page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
