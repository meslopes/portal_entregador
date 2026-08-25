"""Fix force delete for squares and add restaurant delete endpoint."""
with open('src/routes/admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix delete_square to support force=true
old_square = '''        # Verificar se tem estabelecimentos ou entregadores

        has_restaurants = Restaurant.query.filter_by(square_id=square_id).first()

        has_drivers = Driver.query.filter_by(square_id=square_id).first()

        if has_restaurants or has_drivers:

            return jsonify({'error': 'Nao e possivel excluir praca com estabelecimentos ou entregadores'}), 400



        db.session.delete(square)

        db.session.commit()'''

new_square = '''        force = request.args.get('force', 'false').lower() == 'true'

        has_restaurants = Restaurant.query.filter_by(square_id=square_id).first()
        has_drivers = Driver.query.filter_by(square_id=square_id).first()

        if (has_restaurants or has_drivers) and not force:
            rest_count = Restaurant.query.filter_by(square_id=square_id).count()
            drv_count = Driver.query.filter_by(square_id=square_id).count()
            return jsonify({'error': f'Praca tem {rest_count} restaurante(s) e {drv_count} entregador(es) vinculados', 'has_data': True, 'suggestion': 'Use ?force=true para desvincular e excluir'}), 400

        if force:
            Restaurant.query.filter_by(square_id=square_id).update({'square_id': None})
            Driver.query.filter_by(square_id=square_id).update({'square_id': None})

        db.session.delete(square)
        db.session.commit()'''

content = content.replace(old_square, new_square)

# Add delete_restaurant endpoint
restaurant_delete = '''

@admin_bp.route('/restaurants/<int:restaurant_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_restaurant(restaurant_id):
    """Exclui um restaurante"""
    try:
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Restaurante nao encontrado'}), 404

        force = request.args.get('force', 'false').lower() == 'true'

        has_orders = Order.query.filter_by(restaurant_id=restaurant_id).first()
        has_drivers = EstablishmentDriver.query.filter_by(restaurant_id=restaurant_id).first()

        if (has_orders or has_drivers) and not force:
            order_count = Order.query.filter_by(restaurant_id=restaurant_id).count()
            drv_count = EstablishmentDriver.query.filter_by(restaurant_id=restaurant_id).count()
            return jsonify({'error': f'Restaurante tem {order_count} pedido(s) e {drv_count} entregador(es) proprio(s)', 'has_data': True, 'suggestion': 'Use ?force=true para desvincular e excluir'}), 400

        if force:
            Order.query.filter_by(restaurant_id=restaurant_id).update({'restaurant_id': None})
            EstablishmentDriver.query.filter_by(restaurant_id=restaurant_id).delete()
            from src.models.portal_models import OwnDriverEarning, PlatformCredential
            OwnDriverEarning.query.filter_by(restaurant_id=restaurant_id).delete()
            PlatformCredential.query.filter_by(restaurant_id=restaurant_id).delete()

        db.session.delete(restaurant)
        db.session.commit()
        return jsonify({'message': 'Restaurante excluido com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

'''

marker = "@admin_bp.route('/tenants/<int:tenant_id>/toggle-active'"
content = content.replace(marker, restaurant_delete + marker)

with open('src/routes/admin.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fix applied')
