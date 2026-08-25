"""Update cleanup endpoint to delete ALL drivers and Tramandaí square."""
with open('src/routes/admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the cleanup endpoint's user deletion section
old = '''        # 3. Excluir usuarios de teste
        if action in ('all', 'users'):
            test_user_ids = [
                8,   # Gabriel entregador
                16,  # Enilton (sem tenant)
            ]'''

new = '''        # 3. Excluir TODOS os usuarios exceto admins e super admin
        if action in ('all', 'users'):
            all_users = User.query.all()
            test_user_ids = []
            for u in all_users:
                # Manter admins e super admin
                if u.user_type == UserType.ADMIN:
                    continue
                # Manter o proprio usuario logado
                if u.id == user.id:
                    continue
                test_user_ids.append(u.id)'''

content = content.replace(old, new)

# Add Tramandaí square deletion before the cleanup commit
old_commit = "        db.session.commit()"
new_commit = '''        # 5. Excluir praça Tramandaí (ID:3)
        if action in ('all', 'squares'):
            tramandai = Square.query.get(3)
            if tramandai:
                Restaurant.query.filter_by(square_id=3).update({'square_id': None})
                Driver.query.filter_by(square_id=3).update({'square_id': None})
                db.session.delete(tramandai)
                deleted['squares'] = 'Tramandaí excluída'

        db.session.commit()'''

content = content.replace(old_commit, new_commit, 1)  # Only first occurrence

with open('src/routes/admin.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleanup endpoint updated')
