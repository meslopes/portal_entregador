"""Módulo exports — extraído de src/routes/admin.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    Address,
    Customer,
    Driver,
    Order,
    OrderStatus,
    PaymentMethod,
    User,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id, get_current_user

admin_exports_bp = Blueprint('admin_exports', __name__)


@admin_exports_bp.route('/export/orders', methods=['GET'])
@jwt_required()
@admin_required
def export_orders_csv():
    """Exporta pedidos em formato CSV (abre no Excel)"""
    try:
        import csv
        import io

        from flask import make_response

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')

        query = Order.query
        if start_date:
            query = query.filter(Order.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Order.created_at <= datetime.fromisoformat(end_date))
        if status:
            query = query.filter(Order.status == OrderStatus(status))

        user = get_current_user()
        if not user.is_super_admin and user.tenant_id:
            query = query.filter(Order.tenant_id == user.tenant_id)

        orders = query.order_by(Order.created_at.desc()).limit(10000).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'Numero', 'Status', 'Restaurante', 'Cliente', 'Telefone',
            'Endereco Entrega', 'Bairro', 'Cidade', 'Taxa Entrega',
            'Total', 'Pagamento', 'Entregador', 'Criado em', 'Entregue em'
        ])

        for o in orders:
            writer.writerow([
                o.order_number,
                o.status.value if o.status else '',
                o.restaurant.name if o.restaurant else '',
                o.customer.name if o.customer else '',
                o.customer.phone if o.customer else '',
                o.delivery_address.street if o.delivery_address else '',
                o.delivery_address.neighborhood if o.delivery_address else '',
                o.delivery_address.city if o.delivery_address else '',
                float(o.delivery_fee or 0),
                float(o.total_amount or 0),
                o.payment_method.value if o.payment_method else '',
                f"{o.driver.user.first_name} {o.driver.user.last_name}" if o.driver and o.driver.user else '',
                o.created_at.strftime('%d/%m/%Y %H:%M') if o.created_at else '',
                o.delivery_time.strftime('%d/%m/%Y %H:%M') if o.delivery_time else ''
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=pedidos.csv'
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_exports_bp.route('/export/drivers', methods=['GET'])
@jwt_required()
@admin_required
def export_drivers_csv():
    """Exporta entregadores em formato CSV (abre no Excel)"""
    try:
        import csv
        import io

        from flask import make_response

        query = Driver.query.join(User)
        user = get_current_user()
        if not user.is_super_admin and user.tenant_id:
            query = query.filter(Driver.tenant_id == user.tenant_id)

        drivers = query.all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'ID', 'Nome', 'Telefone', 'Veiculo', 'Placa',
            'Praça', 'Rating', 'Total Entregas', 'Saldo',
            'Status', 'Online', 'Desde'
        ])

        for d in drivers:
            writer.writerow([
                d.id,
                f"{d.user.first_name} {d.user.last_name}" if d.user else '',
                d.user.phone if d.user else '',
                d.vehicle_type.value if d.vehicle_type else '',
                d.vehicle_plate or '',
                d.square.name if d.square else '',
                float(d.rating or 5.0),
                d.total_deliveries,
                float(d.balance or 0),
                d.user.status.value if d.user and d.user.status else '',
                'Sim' if d.is_online else 'Não',
                d.created_at.strftime('%d/%m/%Y') if d.created_at else ''
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=entregadores.csv'
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_exports_bp.route('/import/orders', methods=['POST'])
@jwt_required()
@admin_required
def import_orders_csv():
    """Importa pedidos em lote a partir de um arquivo CSV.
    Formato esperado do CSV:
    cliente,telefone,endereco,bairro,cidade,itens,valor_total,taxa_entrega,forma_pagamento
    """
    try:
        import csv
        import io

        if 'file' not in request.files:
            return jsonify({'error': 'Envie um arquivo CSV no campo "file"'}), 400

        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Arquivo deve ser .csv'}), 400

        content = file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))

        get_current_user()
        tenant_id = get_current_tenant_id()

        created = 0
        errors = []

        for i, row in enumerate(reader, start=2):
            try:
                customer_name = row.get('cliente', '').strip()
                customer_phone = row.get('telefone', '').strip()
                delivery_address = row.get('endereco', '').strip()

                if not customer_name or not customer_phone or not delivery_address:
                    errors.append(f'Linha {i}: campos obrigatorios ausentes')
                    continue

                customer = Customer.query.filter_by(phone=customer_phone, tenant_id=tenant_id).first()
                if not customer:
                    customer = Customer(name=customer_name, phone=customer_phone, tenant_id=tenant_id)
                    db.session.add(customer)
                    db.session.flush()

                address = Address(
                    customer_id=customer.id,
                    street=delivery_address,
                    neighborhood=row.get('bairro', '').strip(),
                    city=row.get('cidade', '').strip()
                )
                db.session.add(address)
                db.session.flush()

                items_str = row.get('itens', '').strip()
                items = [{'name': items_str, 'quantity': 1}] if items_str else []

                from datetime import datetime as dt
                order = Order(
                    tenant_id=tenant_id,
                    customer_id=customer.id,
                    delivery_address_id=address.id,
                    order_number=f"IMP{dt.now().strftime('%Y%m%d%H%M%S')}{i:04d}",
                    items=items,
                    subtotal=float(row.get('valor_total', 0) or 0),
                    delivery_fee=float(row.get('taxa_entrega', 0) or 0),
                    total_amount=float(row.get('valor_total', 0) or 0) + float(row.get('taxa_entrega', 0) or 0),
                    payment_method=PaymentMethod(row.get('forma_pagamento', 'CASH').strip().upper() or 'CASH'),
                    status=OrderStatus.PENDING
                )
                db.session.add(order)
                created += 1

            except Exception as e:
                errors.append(f'Linha {i}: {str(e)[:80]}')

        db.session.commit()

        return jsonify({
            'message': f'{created} pedidos importados com sucesso',
            'created': created,
            'errors': errors[:20]
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
