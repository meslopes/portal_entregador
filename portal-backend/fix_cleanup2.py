"""Fix cleanup endpoint - correct deletion order for foreign keys."""
with open('src/routes/admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the cleanup endpoint
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
    """Limpa TODOS os dados exceto admins. SQL direto, ordem correta de FK."""
    try:
        user = get_current_user()
        if not user or user.tenant_id is not None:
            return jsonify({'error': 'Apenas super admin pode executar limpeza'}), 403

        deleted = {}

        # Ordem: tabelas filhas primeiro, pais depois
        tables_in_order = [
            'own_driver_earnings',
            'deliveries',
            'payments',
            'driver_scores',
            'driver_bonuses',
            'driver_achievements',
            'driver_penalties',
            'driver_restaurants',
            'orders',
            'addresses',
            'notifications',
            'platform_credentials',
            'invoices',
            'establishment_drivers',
            'drivers',
            'customers',
            'system_configs',
            'dynamic_pricing',
        ]

        for tbl in tables_in_order:
            try:
                r = db.session.execute(db.text(f"DELETE FROM {tbl}"))
                deleted[tbl] = r.rowcount
            except Exception as e:
                deleted[tbl] = f'erro: {str(e)[:80]}'

        # Deletar users que nao sao admins
        try:
            r = db.session.execute(db.text("DELETE FROM users WHERE user_type != 'ADMIN'"))
            deleted['non_admin_users'] = r.rowcount
        except Exception as e:
            deleted['non_admin_users'] = f'erro: {str(e)[:80]}'

        # Deletar restaurantes
        try:
            r = db.session.execute(db.text("DELETE FROM restaurants"))
            deleted['restaurants'] = r.rowcount
        except Exception as e:
            deleted['restaurants'] = f'erro: {str(e)[:80]}'

        # Deletar praça Tramandaí
        try:
            r = db.session.execute(db.text("DELETE FROM squares WHERE city = 'Tramandai'"))
            deleted['tramandai_square'] = r.rowcount
        except Exception as e:
            deleted['tramandai_square'] = f'erro: {str(e)[:80]}'

        db.session.commit()
        return jsonify({'message': 'Limpeza concluida', 'deleted': deleted}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500'''

content = content[:start_idx] + new_endpoint + content[end_idx:]

with open('src/routes/admin.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleanup endpoint fixed with correct FK order')
