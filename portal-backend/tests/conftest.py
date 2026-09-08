"""
Configuração de testes para o Portal Entregador (MuvLog).
"""
import pytest
import os
import sys
import uuid

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.main import app
from src.models.portal_models import db as _db


@pytest.fixture(scope='session')
def app_instance():
    """Cria instância da aplicação para testes."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    app.config['SECRET_KEY'] = 'test-secret-key'
    
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture(autouse=True)
def setup_teardown(app_instance):
    """Limpa o banco antes de cada teste."""
    with app.app_context():
        _db.session.rollback()
        # Limpar tabelas na ordem correta (respeitar FKs)
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
        yield
        _db.session.rollback()


@pytest.fixture
def db(app_instance):
    """Fornece acesso ao banco de dados."""
    with app_instance.app_context():
        yield _db


@pytest.fixture
def client(app_instance):
    """Cliente de teste HTTP."""
    return app_instance.test_client()


def _get_unique_slug():
    """Gera um slug único para evitar conflitos."""
    return f'teste-{uuid.uuid4().hex[:8]}'


@pytest.fixture
def admin_token(client, db):
    """Cria um admin e retorna o token de autenticação."""
    from src.models.portal_models import User, UserType, UserStatus, Tenant
    
    slug = _get_unique_slug()
    tenant = Tenant(name=f'Tenant {slug}', slug=slug, is_active=True)
    db.session.add(tenant)
    db.session.flush()
    
    admin = User(
        email=f'admin-{slug}@teste.com',
        first_name='Admin',
        last_name='Teste',
        user_type=UserType.ADMIN,
        status=UserStatus.ACTIVE,
        tenant_id=tenant.id,
        is_super_admin=False
    )
    admin.set_password('senha123')
    db.session.add(admin)
    db.session.commit()
    
    response = client.post('/api/auth/login', json={
        'email': admin.email,
        'password': 'senha123'
    })
    
    data = response.get_json()
    return data.get('access_token')


@pytest.fixture
def super_admin_token(client, db):
    """Cria um super admin e retorna o token."""
    from src.models.portal_models import User, UserType, UserStatus
    
    slug = _get_unique_slug()
    admin = User(
        email=f'superadmin-{slug}@teste.com',
        first_name='Super',
        last_name='Admin',
        user_type=UserType.ADMIN,
        status=UserStatus.ACTIVE,
        is_super_admin=True
    )
    admin.set_password('senha123')
    db.session.add(admin)
    db.session.commit()
    
    response = client.post('/api/auth/login', json={
        'email': admin.email,
        'password': 'senha123'
    })
    
    data = response.get_json()
    return data.get('access_token')


@pytest.fixture
def driver_token(client, db):
    """Cria um entregador e retorna o token."""
    from src.models.portal_models import User, Driver, UserType, UserStatus, VehicleType, Tenant
    
    slug = _get_unique_slug()
    tenant = Tenant(name=f'Tenant {slug}', slug=slug, is_active=True)
    db.session.add(tenant)
    db.session.flush()
    
    user = User(
        email=f'driver-{slug}@teste.com',
        first_name='João',
        last_name='Entregador',
        user_type=UserType.DRIVER,
        status=UserStatus.ACTIVE,
        tenant_id=tenant.id
    )
    user.set_password('senha123')
    db.session.add(user)
    db.session.flush()
    
    driver = Driver(
        user_id=user.id,
        vehicle_type=VehicleType.MOTORCYCLE,
        vehicle_plate='ABC1234',
        is_online=True,
        tenant_id=tenant.id
    )
    db.session.add(driver)
    db.session.commit()
    
    response = client.post('/api/auth/login', json={
        'email': user.email,
        'password': 'senha123'
    })
    
    data = response.get_json()
    return data.get('access_token')
