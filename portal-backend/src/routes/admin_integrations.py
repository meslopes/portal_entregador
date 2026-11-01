"""Módulo integrations — extraído de src/routes/admin.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    DriverRestaurant,
    PlatformCredential,
    Restaurant,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

admin_integrations_bp = Blueprint('admin_integrations', __name__)


@admin_integrations_bp.route('/platform-credentials', methods=['GET'])

@jwt_required()

@admin_required

def list_platform_credentials():

    """Lista credenciais de plataformas por estabelecimento"""

    try:

        tenant_id = get_current_tenant_id()

        restaurant_id = request.args.get('restaurant_id')



        query = PlatformCredential.query.join(Restaurant)

        if tenant_id:

            query = query.filter(Restaurant.tenant_id == tenant_id)

        if restaurant_id:

            query = query.filter(PlatformCredential.restaurant_id == int(restaurant_id))



        credentials = query.all()

        return jsonify({'credentials': [c.to_dict() for c in credentials]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_integrations_bp.route('/platform-credentials', methods=['POST'])

@jwt_required()

@admin_required

def create_platform_credential():

    """Cria ou atualiza credencial de plataforma para um estabelecimento"""

    try:

        data = request.get_json()

        if not data or not data.get('restaurant_id') or not data.get('platform'):

            return jsonify({'error': 'Estabelecimento e plataforma são obrigatórios'}), 400



        restaurant_id = data['restaurant_id']

        platform = data['platform'].upper()



        # Verificar se já existe credencial para este restaurante/plataforma

        existing = PlatformCredential.query.filter_by(

            restaurant_id=restaurant_id,

            platform=platform

        ).first()



        if existing:

            # Atualizar existente

            if 'client_id' in data:

                existing.client_id = data['client_id']

            if 'client_secret' in data:

                existing.client_secret = data['client_secret']

            if 'access_token' in data:

                existing.access_token = data['access_token']

            if 'refresh_token' in data:

                existing.refresh_token = data['refresh_token']

            if 'is_active' in data:

                existing.is_active = data['is_active']

            existing.updated_at = datetime.now(timezone.utc)

            db.session.commit()

            return jsonify({

                'message': 'Credencial atualizada com sucesso',

                'credential': existing.to_dict()

            }), 200

        else:

            # Criar nova

            credential = PlatformCredential(

                restaurant_id=restaurant_id,

                platform=platform,

                client_id=data.get('client_id'),

                client_secret=data.get('client_secret'),

                access_token=data.get('access_token'),

                refresh_token=data.get('refresh_token'),

                is_active=data.get('is_active', True)

            )

            db.session.add(credential)

            db.session.commit()

            return jsonify({

                'message': 'Credencial criada com sucesso',

                'credential': credential.to_dict()

            }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_integrations_bp.route('/platform-credentials/<int:cred_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_platform_credential(cred_id):

    """Exclui credencial de plataforma"""

    try:

        cred = PlatformCredential.query.get(cred_id)

        if not cred:

            return jsonify({'error': 'Credencial não encontrada'}), 404



        db.session.delete(cred)

        db.session.commit()

        return jsonify({'message': 'Credencial excluída com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_integrations_bp.route('/platform-credentials/<int:cred_id>/test', methods=['POST'])

@jwt_required()

@admin_required

def test_platform_credential(cred_id):

    """Testa conexão com a plataforma"""

    try:

        cred = PlatformCredential.query.get(cred_id)

        if not cred:

            return jsonify({'error': 'Credencial não encontrada'}), 404



        if cred.platform == 'IFOOD':

            from src.services.ifood_service import authenticate



            if not cred.client_id or not cred.client_secret:

                return jsonify({'success': False, 'error': 'Client ID e Client Secret são obrigatórios'}), 400



            result = authenticate(cred.client_id, cred.client_secret)



            if result.get('success'):

                # Salvar tokens

                cred.access_token = result.get('access_token')

                cred.refresh_token = result.get('refresh_token')

                from datetime import timedelta

                cred.expires_at = datetime.now(timezone.utc) + timedelta(seconds=result.get('expires_in', 3600))

                cred.is_active = True

                db.session.commit()



                return jsonify({

                    'success': True,

                    'message': 'Conexão com iFood estabelecida com sucesso'

                }), 200

            else:

                return jsonify({

                    'success': False,

                    'error': result.get('error', 'Erro ao conectar com iFood')

                }), 400

        else:

            return jsonify({'success': False, 'error': f'Plataforma {cred.platform} não suportada para teste'}), 400



    except Exception as e:

        return jsonify({'success': False, 'error': str(e)}), 500





# ============================================

# VINCULAÇÃO ENTREGADOR-ESTABELECIMENTO

# ============================================



@admin_integrations_bp.route('/driver-assignments', methods=['GET'])

@jwt_required()

@admin_required

def list_driver_assignments():

    """Lista vinculações entregador-estabelecimento"""

    try:

        tenant_id = get_current_tenant_id()

        restaurant_id = request.args.get('restaurant_id')

        driver_id = request.args.get('driver_id')



        query = DriverRestaurant.query

        if tenant_id:

            query = query.join(Restaurant).filter(Restaurant.tenant_id == tenant_id)

        if restaurant_id:

            query = query.filter(DriverRestaurant.restaurant_id == int(restaurant_id))

        if driver_id:

            query = query.filter(DriverRestaurant.driver_id == int(driver_id))



        assignments = query.all()

        return jsonify({'assignments': [a.to_dict() for a in assignments]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_integrations_bp.route('/driver-assignments', methods=['POST'])

@jwt_required()

@admin_required

def create_driver_assignment():

    """Vincula entregador a estabelecimento"""

    try:

        data = request.get_json()

        if not data or not data.get('driver_id') or not data.get('restaurant_id'):

            return jsonify({'error': 'Entregador e estabelecimento são obrigatórios'}), 400



        driver_id = data['driver_id']

        restaurant_id = data['restaurant_id']



        # Verificar se já existe

        existing = DriverRestaurant.query.filter_by(

            driver_id=driver_id,

            restaurant_id=restaurant_id

        ).first()



        if existing:

            return jsonify({'error': 'Vinculação já existe'}), 400



        assignment = DriverRestaurant(

            driver_id=driver_id,

            restaurant_id=restaurant_id,

            is_priority=data.get('is_priority', False)

        )

        db.session.add(assignment)

        db.session.commit()



        return jsonify({

            'message': 'Vinculação criada com sucesso',

            'assignment': assignment.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_integrations_bp.route('/driver-assignments/<int:assignment_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_driver_assignment(assignment_id):

    """Remove vinculação entregador-estabelecimento"""

    try:

        assignment = DriverRestaurant.query.get(assignment_id)

        if not assignment:

            return jsonify({'error': 'Vinculação não encontrada'}), 404



        db.session.delete(assignment)

        db.session.commit()



        return jsonify({'message': 'Vinculação removida com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_integrations_bp.route('/driver-assignments/<int:assignment_id>/priority', methods=['PUT'])

@jwt_required()

@admin_required

def toggle_driver_priority(assignment_id):

    """Ativa/desativa prioridade do entregador no estabelecimento"""

    try:

        assignment = DriverRestaurant.query.get(assignment_id)

        if not assignment:

            return jsonify({'error': 'Vinculação não encontrada'}), 404



        data = request.get_json()

        assignment.is_priority = data.get('is_priority', not assignment.is_priority)

        db.session.commit()



        return jsonify({

            'message': 'Prioridade atualizada',

            'assignment': assignment.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# ENTREGADORES PRÓPRIOS DO ESTABELECIMENTO

# ============================================



@admin_integrations_bp.route('/establishments/<int:restaurant_id>/subscription', methods=['PUT'])

@jwt_required()

@admin_required

def update_restaurant_subscription(restaurant_id):

    """Configura assinatura do estabelecimento"""

    try:

        restaurant = Restaurant.query.get(restaurant_id)

        if not restaurant:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404



        data = request.get_json()

        if 'subscription_type' in data:

            restaurant.subscription_type = data['subscription_type']

        if 'subscription_expires_at' in data:

            restaurant.subscription_expires_at = datetime.fromisoformat(data['subscription_expires_at']) if data['subscription_expires_at'] else None

        if 'platform_pricing_table_id' in data:

            restaurant.platform_pricing_table_id = data['platform_pricing_table_id']

        if 'has_own_drivers' in data:

            restaurant.has_own_drivers = data['has_own_drivers']



        db.session.commit()



        return jsonify({

            'message': 'Assinatura atualizada',

            'restaurant': restaurant.to_dict(include_sensitive=True)

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# CONFIGURAÇÃO DE PAGAMENTO - ENTREGADORES PRÓPRIOS

# ============================================



