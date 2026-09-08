"""
Testes para endpoints de pedidos (F-01 - Aceite atômico).
"""
import pytest


class TestAtomicOrderAcceptance:
    """Testes para F-01 - Aceite atômico de pedidos."""
    
    def _criar_pedido_pendente(self, db, tenant_id=None, restaurant_id=None):
        """Helper para criar um pedido pendente de teste."""
        from src.models.portal_models import (
            Order, OrderStatus, Restaurant, Address, Customer, Tenant
        )
        
        # Criar tenant se necessário
        if not tenant_id:
            tenant = Tenant(name='Tenant Pedido', slug='pedido', is_active=True)
            db.session.add(tenant)
            db.session.flush()
            tenant_id = tenant.id
        
        # Criar restaurante se necessário
        if not restaurant_id:
            restaurant = Restaurant(
                name='Restaurante Teste',
                address='Rua Teste, 123',
                latitude=-29.95,
                longitude=-50.45,
                tenant_id=tenant_id
            )
            db.session.add(restaurant)
            db.session.flush()
            restaurant_id = restaurant.id
        
        # Criar endereço de entrega
        addr = Address(
            street='Rua Entrega',
            number='456',
            neighborhood='Centro',
            city='Porto Alegre',
            state='RS',
            latitude=-29.96,
            longitude=-50.46
        )
        db.session.add(addr)
        db.session.flush()
        
        # Criar pedido pendente
        order = Order(
            restaurant_id=restaurant_id,
            delivery_address_id=addr.id,
            status=OrderStatus.PENDING,
            delivery_fee=10.0,
            tenant_id=tenant_id
        )
        db.session.add(order)
        db.session.commit()
        
        return order
    
    def test_aceitar_pedido_sucesso(self, client, driver_token, db):
        """Entregador online deve conseguir aceitar pedido pendente."""
        order = self._criar_pedido_pendente(db)
        
        response = client.post(
            f'/api/orders/{order.id}/accept',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        
        assert response.status_code == 200
        
        # Verificar se o pedido foi aceito
        from src.models.portal_models import Order, OrderStatus
        updated_order = db.session.get(Order, order.id)
        assert updated_order.status == OrderStatus.ACCEPTED
        assert updated_order.driver_id is not None
    
    def test_aceitar_pedido_ja_aceito(self, client, driver_token, db):
        """Não deve aceitar pedido já aceito por outro entregador."""
        from src.models.portal_models import User, Driver, UserType, VehicleType, Tenant
        
        order = self._criar_pedido_pendente(db)
        
        # Criar segundo entregador
        tenant = Tenant.query.first()
        user2 = User(
            email='driver2@teste.com',
            first_name='Maria',
            last_name='Entregadora',
            user_type=UserType.DRIVER,
            status='ACTIVE',
            tenant_id=tenant.id
        )
        user2.set_password('senha123')
        db.session.add(user2)
        db.session.flush()
        
        driver2 = Driver(
            user_id=user2.id,
            vehicle_type=VehicleType.MOTORCYCLE,
            is_online=True,
            tenant_id=tenant.id
        )
        db.session.add(driver2)
        db.session.commit()
        
        # Primeiro entregador aceita
        response1 = client.post(
            f'/api/orders/{order.id}/accept',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        assert response1.status_code == 200
        
        # Login do segundo entregador
        login2 = client.post('/api/auth/login', json={
            'email': 'driver2@teste.com',
            'password': 'senha123'
        })
        token2 = login2.get_json().get('access_token')
        
        # Segundo entregador tenta aceitar o mesmo pedido
        response2 = client.post(
            f'/api/orders/{order.id}/accept',
            headers={'Authorization': f'Bearer {token2}'}
        )
        
        # Deve retornar 409 (Conflict) - pedido não disponível
        assert response2.status_code == 409
    
    def test_aceitar_pedido_cancelado(self, client, driver_token, db):
        """Não deve aceitar pedido cancelado."""
        order = self._criar_pedido_pendente(db)
        
        # Cancelar o pedido
        from src.models.portal_models import OrderStatus
        order.status = OrderStatus.CANCELLED
        db.session.commit()
        
        response = client.post(
            f'/api/orders/{order.id}/accept',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        
        # Deve retornar erro (400 ou 409)
        assert response.status_code in [400, 409]
    
    def test_aceitar_pedido_inexistente(self, client, driver_token, db):
        """Não deve aceitar pedido que não existe."""
        response = client.post(
            '/api/orders/99999/accept',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        
        assert response.status_code == 404
    
    def test_aceitar_sem_autenticacao(self, client, db):
        """Não deve aceitar pedido sem token."""
        order = self._criar_pedido_pendente(db)
        
        response = client.post(f'/api/orders/{order.id}/accept')
        assert response.status_code == 401


class TestOrderStatusTransitions:
    """Testes para F-10 - Máquina de estados."""
    
    def test_transicao_pendente_para_aceito(self, client, driver_token, db):
        """Transição PENDING -> ACCEPTED deve ser válida."""
        from src.models.portal_models import (
            Order, OrderStatus, Restaurant, Address, Tenant
        )
        
        # Criar pedido pendente
        tenant = Tenant(name='Tenant Transição', slug='transicao', is_active=True)
        db.session.add(tenant)
        db.session.flush()
        
        restaurant = Restaurant(
            name='Restaurante Transição',
            address='Rua Teste',
            latitude=-29.95,
            longitude=-50.45,
            tenant_id=tenant.id
        )
        db.session.add(restaurant)
        db.session.flush()
        
        addr = Address(
            street='Rua Entrega',
            number='123',
            neighborhood='Centro',
            city='Porto Alegre',
            state='RS',
            latitude=-29.96,
            longitude=-50.46
        )
        db.session.add(addr)
        db.session.flush()
        
        order = Order(
            restaurant_id=restaurant.id,
            delivery_address_id=addr.id,
            status=OrderStatus.PENDING,
            delivery_fee=10.0,
            tenant_id=tenant.id
        )
        db.session.add(order)
        db.session.commit()
        
        # Aceitar pedido
        response = client.post(
            f'/api/orders/{order.id}/accept',
            headers={'Authorization': f'Bearer {driver_token}'}
        )
        assert response.status_code == 200
