"""
Validação de entrada para requisições da API.
Fornece schemas simples para validar dados de entrada.
Não depende de bibliotecas externas.
"""
import re
from typing import Any


class ValidationError(Exception):
    """Erro de validação de entrada"""
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(', '.join(errors))


class Schema:
    """Schema simples de validação"""

    def __init__(self, fields: dict[str, dict[str, Any]]):
        r"""
        Args:
            fields: dicionário com definição dos campos
                {
                    'nome_campo': {
                        'type': str,           # tipo esperado
                        'required': True,      # obrigatório?
                        'min_length': 1,       # tamanho mínimo (para strings)
                        'max_length': 100,     # tamanho máximo (para strings)
                        'min': 0,              # valor mínimo (para números)
                        'max': 9999,           # valor máximo (para números)
                        'pattern': r'^\d+$',   # regex de validação
                        'allowed': ['a', 'b'], # valores permitidos
                        'default': None,       # valor padrão se ausente
                    }
                }
        """
        self.fields = fields

    def validate(self, data: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
        """Valida os dados contra o schema.

        Returns:
            tuple: (dados_validados, lista_de_erros)
        """
        errors = []
        validated = {}

        for field_name, rules in self.fields.items():
            value = data.get(field_name)

            # Campo obrigatório
            if rules.get('required') and (value is None or value == ''):
                errors.append(f"Campo '{field_name}' é obrigatório")
                continue

            # Valor padrão
            if value is None or value == '':
                if 'default' in rules:
                    validated[field_name] = rules['default']
                continue

            # Validação de tipo
            expected_type = rules.get('type')
            if expected_type and not isinstance(value, expected_type):
                # Tenta conversão para números
                if expected_type in (int, float):
                    try:
                        value = expected_type(value)
                    except (ValueError, TypeError):
                        errors.append(f"Campo '{field_name}' deve ser do tipo {expected_type.__name__}")
                        continue
                elif expected_type is str:
                    value = str(value)
                else:
                    errors.append(f"Campo '{field_name}' deve ser do tipo {expected_type.__name__}")
                    continue

            # Validação de strings
            if isinstance(value, str):
                # Sanitização básica
                value = value.strip()

                if 'min_length' in rules and len(value) < rules['min_length']:
                    errors.append(f"Campo '{field_name}' deve ter pelo menos {rules['min_length']} caracteres")
                    continue

                if 'max_length' in rules and len(value) > rules['max_length']:
                    value = value[:rules['max_length']]

                if 'pattern' in rules and not re.match(rules['pattern'], value):
                    errors.append(f"Campo '{field_name}' tem formato inválido")
                    continue

            # Validação de números
            if isinstance(value, (int, float)):
                if 'min' in rules and value < rules['min']:
                    errors.append(f"Campo '{field_name}' deve ser maior ou igual a {rules['min']}")
                    continue

                if 'max' in rules and value > rules['max']:
                    errors.append(f"Campo '{field_name}' deve ser menor ou igual a {rules['max']}")
                    continue

            # Validação de valores permitidos
            if 'allowed' in rules and value not in rules['allowed']:
                errors.append(f"Campo '{field_name}' deve ser um dos: {', '.join(str(v) for v in rules['allowed'])}")
                continue

            validated[field_name] = value

        return validated, errors


def validate_request(schema: Schema, data: dict[str, Any]) -> dict[str, Any]:
    """Valida dados de requisição e lança ValidationError se inválido.

    Args:
        schema: Schema de validação
        dados: Dados da requisição

    Returns:
        Dados validados e sanitizados

    Raises:
        ValidationError: Se os dados forem inválidos
    """
    validated, errors = schema.validate(data)
    if errors:
        raise ValidationError(errors)
    return validated


# ============================================================
# SCHEMAS PRÉ-DEFINIDOS PARA ENDPOINTS COMUNS
# ============================================================

# Schema para login
LOGIN_SCHEMA = Schema({
    'email': {'type': str, 'required': True, 'max_length': 255},
    'password': {'type': str, 'required': True, 'min_length': 1, 'max_length': 128},
    'tenant_slug': {'type': str, 'required': False, 'max_length': 100},
})

# Schema para registro de entregador
REGISTER_DRIVER_SCHEMA = Schema({
    'email': {'type': str, 'required': True, 'max_length': 255},
    'password': {'type': str, 'required': True, 'min_length': 6, 'max_length': 128},
    'first_name': {'type': str, 'required': True, 'min_length': 1, 'max_length': 100},
    'last_name': {'type': str, 'required': True, 'min_length': 1, 'max_length': 100},
    'phone': {'type': str, 'required': False, 'max_length': 20},
    'cpf': {'type': str, 'required': False, 'max_length': 14},
    'vehicle_type': {'type': str, 'required': False, 'allowed': ['MOTORCYCLE', 'CAR', 'BICYCLE', 'FOOT'], 'default': 'MOTORCYCLE'},
    'vehicle_plate': {'type': str, 'required': False, 'max_length': 10},
    'vehicle_model': {'type': str, 'required': False, 'max_length': 100},
    'vehicle_year': {'type': int, 'required': False, 'min': 1990, 'max': 2030},
    'driver_license': {'type': str, 'required': False, 'max_length': 20},
    'pix_key': {'type': str, 'required': False, 'max_length': 100},
    'bank_account': {'type': str, 'required': False, 'max_length': 50},
    'square_id': {'type': int, 'required': False},
})

# Schema para criação de estabelecimento
CREATE_ESTABLISHMENT_SCHEMA = Schema({
    'name': {'type': str, 'required': True, 'min_length': 1, 'max_length': 200},
    'cnpj': {'type': str, 'required': False, 'max_length': 18},
    'phone': {'type': str, 'required': False, 'max_length': 20},
    'email': {'type': str, 'required': False, 'max_length': 255},
    'password': {'type': str, 'required': False, 'min_length': 6, 'max_length': 128},
    'address': {'type': str, 'required': True, 'min_length': 1, 'max_length': 500},
    'latitude': {'type': float, 'required': False, 'min': -90, 'max': 90},
    'longitude': {'type': float, 'required': False, 'min': -180, 'max': 180},
    'square_id': {'type': int, 'required': False},
    'tenant_id': {'type': int, 'required': False},
    'pricing_table_id': {'type': int, 'required': False},
    'preparation_minutes': {'type': int, 'required': False, 'min': 1, 'max': 120, 'default': 10},
    'pickup_confirmation_type': {'type': str, 'required': False, 'allowed': ['code', 'photo', 'code_and_photo', 'none'], 'default': 'code'},
    'delivery_confirmation_type': {'type': str, 'required': False, 'allowed': ['code', 'photo', 'code_and_photo', 'none'], 'default': 'code'},
})

# Schema para criação de pedido
CREATE_ORDER_SCHEMA = Schema({
    'restaurant_id': {'type': int, 'required': True},
    'pickup_address': {'type': str, 'required': True, 'max_length': 500},
    'delivery_address': {'type': str, 'required': True, 'max_length': 500},
    'customer_name': {'type': str, 'required': True, 'max_length': 200},
    'customer_phone': {'type': str, 'required': True, 'max_length': 20},
    'delivery_fee': {'type': float, 'required': True, 'min': 0, 'max': 9999},
    'notes': {'type': str, 'required': False, 'max_length': 1000},
    'payment_method': {'type': str, 'required': False, 'allowed': ['CASH', 'CARD', 'PIX'], 'default': 'CASH'},
    'scheduled_for': {'type': str, 'required': False},
})

# Schema para atualização de status de pedido
UPDATE_ORDER_STATUS_SCHEMA = Schema({
    'status': {'type': str, 'required': True, 'allowed': ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED']},
    'latitude': {'type': float, 'required': False, 'min': -90, 'max': 90},
    'longitude': {'type': float, 'required': False, 'min': -180, 'max': 180},
    'proof_photo': {'type': str, 'required': False, 'max_length': 500},
    'pickup_code': {'type': str, 'required': False, 'max_length': 10},
    'delivery_code': {'type': str, 'required': False, 'max_length': 10},
})

# Schema para criação de praça
CREATE_SQUARE_SCHEMA = Schema({
    'name': {'type': str, 'required': True, 'min_length': 1, 'max_length': 100},
    'city': {'type': str, 'required': True, 'min_length': 1, 'max_length': 100},
    'state': {'type': str, 'required': True, 'min_length': 2, 'max_length': 2},
    'is_active': {'type': bool, 'required': False, 'default': True},
})

# Schema para criação de entregador
CREATE_DRIVER_SCHEMA = Schema({
    'email': {'type': str, 'required': True, 'max_length': 255},
    'password': {'type': str, 'required': True, 'min_length': 6, 'max_length': 128},
    'first_name': {'type': str, 'required': True, 'min_length': 1, 'max_length': 100},
    'last_name': {'type': str, 'required': True, 'min_length': 1, 'max_length': 100},
    'phone': {'type': str, 'required': False, 'max_length': 20},
    'cpf': {'type': str, 'required': False, 'max_length': 14},
    'vehicle_type': {'type': str, 'required': False, 'allowed': ['MOTORCYCLE', 'CAR', 'BICYCLE', 'FOOT'], 'default': 'MOTORCYCLE'},
    'vehicle_plate': {'type': str, 'required': False, 'max_length': 10},
    'vehicle_model': {'type': str, 'required': False, 'max_length': 100},
    'vehicle_year': {'type': int, 'required': False, 'min': 1990, 'max': 2030},
    'driver_license': {'type': str, 'required': False, 'max_length': 20},
    'pix_key': {'type': str, 'required': False, 'max_length': 100},
    'bank_account': {'type': str, 'required': False, 'max_length': 50},
    'square_id': {'type': int, 'required': False},
    'tenant_id': {'type': int, 'required': False},
    'max_concurrent_orders': {'type': int, 'required': False, 'min': 1, 'max': 10, 'default': 3},
})
