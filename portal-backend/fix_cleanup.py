"""Replace cleanup endpoint with efficient bulk SQL deletion."""
with open('src/routes/admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the entire cleanup endpoint and replace it
start_marker = "@admin_bp.route('/cleanup-test-data', methods=['POST'])"
end_marker = "return jsonify({'error': str(e)}), 500"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print(f'ERROR: Could not find markers. start={start_idx}, end={end_idx}')
    exit(1)

end_idx += len(end_marker)

new_endpoint = '''@admin_bp.route('/cleanup-test-data', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_test_data():
    """Limpa TODOS os dados exceto admins. Usa SQL direto para velocidade."""
    try:
        user = get_current_user()
        if not user or user.tenant_id is not None:
            return jsonify({'error': 'Apenas super admin pode executar limpeza'}), 403

        admin_ids = [u.id for u in User.query.filter_by(user_type=UserType.ADMIN).all()]
        admin_ids_str = ','.join(str(i) for i in admin_ids) if admin_ids else '0'

        deleted = {}

        # 1. Deletar deliveries
        r = db.session.execute(db.text("DELETE FROM deliveries"))
        deleted['deliveries'] = r.rowcount

        # 2. Deletar own_driver_earnings
        r = db.session.execute(db.text("DELETE FROM own_driver_earnings"))
        deleted['own_driver_earnings'] = r.rowcount

        # 3. Deletar payments
        r = db.session.execute(db.text("DELETE FROM payments"))
        deleted['payments'] = r.rowcount

        # 4. Deletar orders
        r = db.session.execute(db.text("DELETE FROM orders"))
        deleted['orders'] = r.rowcount

        # 5. Deletar addresses
        r = db.session.execute(db.text("DELETE FROM addresses"))
        deleted['addresses'] = r.rowcount

        # 6. Deletar notifications
        r = db.session.execute(db.text("DELETE FROM notifications"))
        deleted['notifications'] = r.rowcount

        # 7. Deletar driver_scores, driver_bonuses, driver_achievements, driver_penalties
        for tbl in ['driver_scores', 'driver_bonuses', 'driver_achievements', 'driver_penalties', 'driver_restaurants']:
            r = db.session.execute(db.text(f"DELETE FROM {tbl}"))
            deleted[tbl] = r.rowcount

        # 8. Deletar platform_credentials
        r = db.session.execute(db.text("DELETE FROM platform_credentials"))
        deleted['platform_credentials'] = r.rowcount

        # 9. Deletar invoices
        r = db.session.execute(db.text("DELETE FROM invoices"))
        deleted['invoices'] = r.rowcount

        # 10. Deletar establishment_drivers
        r = db.session.execute(db.text("DELETE FROM establishment_drivers"))
        deleted['establishment_drivers'] = r.rowcount

        # 11. Deletar drivers
        r = db.session.execute(db.text("DELETE FROM drivers"))
        deleted['drivers'] = r.rowcount

        # 12. Deletar customers (exceto os que são users admins)
        r = db.session.execute(db.text("DELETE FROM customers"))
        deleted['customers'] = r.rowcount

        # 13. Deletar users que não são admins
        r = db.session.execute(db.text(f"DELETE FROM users WHERE user_type != 'ADMIN'"))
        deleted['non_admin_users'] = r.rowcount

        # 14. Deletar restaurantes
        r = db.session.execute(db.text("DELETE FROM restaurants"))
        deleted['restaurants'] = r.rowcount

        # 15. Deletar praça Tramandaí (se existir)
        r = db.session.execute(db.text("DELETE FROM squares WHERE name = 'Tramandai' OR city = 'Tramandai'"))
        deleted['tramandai_square'] = r.rowcount

        # 16. Limpar system_configs de teste
        r = db.session.execute(db.text("DELETE FROM system_configs"))
        deleted['system_configs'] = r.rowcount

        db.session.commit()

        return jsonify({'message': 'Limpeza massiva concluida', 'deleted': deleted}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500'''

content = content[:start_idx] + new_endpoint + content[end_idx:]

with open('src/routes/admin.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleanup endpoint replaced with bulk SQL version')
