"""
Testes para webhooks (F-03 - Webhook secret obrigatório).
"""
import pytest


class TestWebhookSecurity:
    """Testes para F-03 - Webhook secret seguro."""
    
    def test_ifood_webhook_sem_token(self, client, db):
        """Webhook iFood sem token deve retornar 401 se configurado."""
        from src.models.portal_models import SystemConfig
        
        # Configurar token de webhook
        config = SystemConfig(
            config_key='ifood_webhook_token',
            config_value='token-secreto-teste'
        )
        db.session.add(config)
        db.session.commit()
        
        # Tentar enviar webhook sem token
        response = client.post('/api/webhooks/ifood', json={
            'orderId': 'test-123',
            'status': 'PLACED'
        })
        
        # Deve retornar 401
        assert response.status_code == 401
    
    def test_ifood_webhook_com_token_valido(self, client, db):
        """Webhook iFood com token válido deve ser aceito."""
        from src.models.portal_models import SystemConfig
        
        # Configurar token de webhook
        config = SystemConfig(
            config_key='ifood_webhook_token',
            config_value='token-secreto-teste'
        )
        db.session.add(config)
        db.session.commit()
        
        # Enviar webhook com token
        response = client.post(
            '/api/webhooks/ifood',
            json={'orderId': 'test-123', 'status': 'PLACED'},
            headers={'X-Webhook-Token': 'token-secreto-teste'}
        )
        
        # Não deve retornar 401 (pode retornar 200 ou outro código de sucesso/processamento)
        assert response.status_code != 401
    
    def test_ifood_webhook_com_token_invalido(self, client, db):
        """Webhook iFood com token inválido deve retornar 401."""
        from src.models.portal_models import SystemConfig
        
        config = SystemConfig(
            config_key='ifood_webhook_token',
            config_value='token-secreto-teste'
        )
        db.session.add(config)
        db.session.commit()
        
        response = client.post(
            '/api/webhooks/ifood',
            json={'orderId': 'test-123', 'status': 'PLACED'},
            headers={'X-Webhook-Token': 'token-errado'}
        )
        
        assert response.status_code == 401
    
    def test_webhook_via_query_string_rejeitado(self, client, db):
        """Webhook não deve aceitar token via query string (segurança)."""
        from src.models.portal_models import SystemConfig
        
        config = SystemConfig(
            config_key='ifood_webhook_token',
            config_value='token-secreto-teste'
        )
        db.session.add(config)
        db.session.commit()
        
        # Tentar enviar token via query string
        response = client.post(
            '/api/webhooks/ifood?token=token-secreto-teste',
            json={'orderId': 'test-123', 'status': 'PLACED'}
        )
        
        # Deve retornar 401 (token via query string não é aceito)
        assert response.status_code == 401
