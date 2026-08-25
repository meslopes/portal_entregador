"""Fix cleanup - batch deletion to avoid Render timeout."""
with open('src/routes/admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "@admin_bp.route('/cleanup-test-data', methods=['POST'])"
end_marker = "return jsonify({'error': str(e)}), 500"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)
end_idx += len(end_marker)

new_endpoint = '''@admin_bp.route('/cleanup-test-data', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_test_data():
    """Limpa dados em lotes para evitar timeout."""
    try:
        user = get_current_user()
        if not user or user.tenant_id is not None:
            return jsonify({'error': 'Apenas super admin'}), 403

        deleted = {}

        # Deletar em ordem de dependencia (filhos primeiro)
        # Lotes de 5000 para evitar timeout
        batch = 5000

        tables = [
            'own_driver_earnings', 'deliveries', 'payments',
            'driver_scores', 'driver_bonuses', 'driver_achievements',
            'driver_penalties', 'driver_restaurants',
            'orders', 'addresses', 'notifications',
            'platform_credentials', 'invoices',
            'establishment_drivers', 'drivers',
            'customers', 'system_configs', 'dynamic_pricing',
        ]

        for tbl in tables:
            try:
                total = 0
                while True:
                    r = db.session.execute(db.text(f"DELETE FROM {tbl} WHERE id IN (SELECT id FROM {tbl} LIMIT {batch})"))
                    db.session.commit()
                    total += r.rowcount
                    if r.rowcount < batch:
                        break
                deleted[tbl] = total
            except Exception as e:
                db.session.rollback()
                deleted[tbl] = f'erro: {str(e)[:60]}'

        # Users nao-admin
        try:
            r = db.session.execute(db.text("DELETE FROM users WHERE user_type != 'ADMIN'"))
            db.session.commit()
            deleted['non_admin_users'] = r.rowcount
        except Exception as e:
            db.session.rollback()
            deleted['non_admin_users'] = f'erro: {str(e)[:60]}'

        # Restaurantes
        try:
            r = db.session.execute(db.text("DELETE FROM restaurants"))
            db.session.commit()
            deleted['restaurants'] = r.rowcount
        except Exception as e:
            db.session.rollback()
            deleted['restaurants'] = f'erro: {str(e)[:60]}'

        # Tramandai
        try:
            r = db.session.execute(db.text("DELETE FROM squares WHERE city = 'Tramandai'"))
            db.session.commit()
            deleted['tramandai'] = r.rowcount
        except Exception as e:
            db.session.rollback()
            deleted['tramandai'] = f'erro: {str(e)[:60]}'

        return jsonify({'message': 'Limpeza concluida', 'deleted': deleted}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500'''

content = content[:start_idx] + new_endpoint + content[end_idx:]

with open('src/routes/admin.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleanup fixed with batch deletion')
