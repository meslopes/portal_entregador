"""Add comprehensive cleanup endpoint to admin.py"""

endpoint = '''

@admin_bp.route('/cleanup-test-data', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_test_data():
    """Limpa dados de teste do banco. Apenas super admin."""
    try:
        user = get_current_user()
        if not user or user.tenant_id is not None:
            return jsonify({'error': 'Apenas super admin pode executar limpeza'}), 403

        data = request.get_json() or {}
        action = data.get('action', 'all')
        deleted = {}

        # 1. Limpar pedidos de teste (iFood e sem restaurante valido)
        if action in ('all', 'orders'):
            from src.models.portal_models import Delivery, OwnDriverEarning
            # Deletar deliveries de pedidos que serao excluidos
            test_order_ids = [o.id for o in Order.query.filter(
                (Order.restaurant_id == 1) | (Order.restaurant_id == 2) |
                (Order.restaurant_id == 7) | (Order.restaurant_id == 8)
            ).all()]
            if test_order_ids:
                Delivery.query.filter(Delivery.order_id.in_(test_order_ids)).delete(synchronize_session=False)
                OwnDriverEarning.query.filter(OwnDriverEarning.order_id.in_(test_order_ids)).delete(synchronize_session=False)
                Order.query.filter(Order.id.in_(test_order_ids)).delete(synchronize_session=False)
            # Pedidos sem restaurante
            orphan_orders = Order.query.filter(Order.restaurant_id.notin_([r.id for r in Restaurant.query.all()])).all()
            for o in orphan_orders:
                Delivery.query.filter_by(order_id=o.id).delete()
                db.session.delete(o)
            deleted['orders'] = len(test_order_ids) + len(orphan_orders)

        # 2. Excluir restaurantes de teste
        if action in ('all', 'restaurants'):
            test_rest_ids = [1, 2, 7, 8]  # Restaurante iFood, Emmanuel Boes, A PIPOQUEIRA, A PANQUEQUEIRA
            for rid in test_rest_ids:
                rest = Restaurant.query.get(rid)
                if rest:
                    # Limpar entregadores proprios
                    EstablishmentDriver.query.filter_by(restaurant_id=rid).delete()
                    OwnDriverEarning.query.filter_by(restaurant_id=rid).delete()
                    # Limpar pedidos restantes
                    Order.query.filter_by(restaurant_id=rid).update({'restaurant_id': None})
                    db.session.delete(rest)
            deleted['restaurants'] = len(test_rest_ids)

        # 3. Excluir usuarios de teste
        if action in ('all', 'users'):
            test_user_ids = [
                8,   # Gabriel entregador
                16,  # Enilton (sem tenant)
            ]
            for uid in test_user_ids:
                u = User.query.get(uid)
                if u and not (u.user_type == UserType.ADMIN and not u.tenant_id):
                    # Limpar driver
                    driver = Driver.query.filter_by(user_id=uid).first()
                    if driver:
                        Payment.query.filter_by(driver_id=driver.id).delete()
                        Delivery.query.filter_by(driver_id=driver.id).update({'driver_id': None})
                        from src.models.portal_models import DriverScore, DriverBonus, DriverAchievement, DriverPenalty, DriverRestaurant
                        DriverScore.query.filter_by(driver_id=driver.id).delete()
                        DriverBonus.query.filter_by(driver_id=driver.id).delete()
                        DriverAchievement.query.filter_by(driver_id=driver.id).delete()
                        DriverPenalty.query.filter_by(driver_id=driver.id).delete()
                        DriverRestaurant.query.filter_by(driver_id=driver.id).delete()
                        Order.query.filter_by(driver_id=driver.id).update({'driver_id': None})
                        db.session.delete(driver)
                    Notification.query.filter_by(user_id=uid).delete()
                    db.session.delete(u)
            deleted['users'] = len(test_user_ids)

        # 4. Limpar customers iFood (genéricos)
        if action in ('all', 'customers'):
            ifood_customers = Customer.query.filter(
                Customer.name == 'Cliente iFood',
                Customer.user_id.is_(None)
            ).all()
            count = len(ifood_customers)
            for c in ifood_customers:
                Address.query.filter_by(customer_id=c.id).delete()
                db.session.delete(c)
            # Outros customers de teste
            test_customers = Customer.query.filter(Customer.name.in_([
                'jair bolsonaro', 'aquela cliente', 'Pamela', 'claudete boes',
                'cliente capao', 'seu joaquim nabuco donossor', 'luis inacio ladrao',
                'codigo e foto', 'opiniao'
            ])).all()
            for c in test_customers:
                Address.query.filter_by(customer_id=c.id).delete()
                db.session.delete(c)
            deleted['customers'] = count + len(test_customers)

        # 5. Limpar faturas e invoices
        if action in ('all', 'invoices'):
            Invoice.query.delete()
            deleted['invoices'] = 'all'

        # 6. Limpar platform credentials de teste
        if action in ('all', 'credentials'):
            PlatformCredential.query.filter_by(restaurant_id=1).delete()
            deleted['credentials'] = 'test entries'

        db.session.commit()
        return jsonify({'message': 'Limpeza concluida', 'deleted': deleted}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
'''

with open('src/routes/admin.py', 'a', encoding='utf-8') as f:
    f.write(endpoint)
print('Cleanup endpoint added')
