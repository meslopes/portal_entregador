# Soft Delete — Proteção contra Exclusões Acidentais

## Problema Atual

Quando um admin exclui um usuário (admin, entregador, estabelecimento), os dados são **deletados permanentemente** do banco de dados. Se for um erro, não há como recuperar.

```
Exclusão atual (DESTRUTIVA):
  Admin clica "Excluir" → DELETE FROM users → DADOS PERDIDOS PARA SEMPRE
```

## Solução Proposta

Em vez de deletar, marcamos o registro como "excluído" mas mantemos no banco. Após 90 dias (configurável), o sistema avisa que registros antigos podem ser limpos. O admin escolhe quem fica e quem vai.

```
Exclusão com Soft Delete:
  Admin clica "Excluir" → UPDATE users SET deleted_at = NOW() → DADOS PRESERVADOS
  Após 90 dias → Sistema notifica admin → Admin escolhe quem limpar
```

---

## 1. Alterações no Banco de Dados

### Modelo `User` — novos campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `deleted_at` | DateTime, nullable | Data/hora da exclusão (NULL = ativo) |
| `deleted_by` | Integer, nullable | ID do admin que excluiu |

### Migration (Supabase)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
```

---

## 2. Endpoints Novos (Backend)

### Listar usuários excluídos (Lixeira)

```
GET /api/admin/deleted-users?days=90&user_type=DRIVER
```

**Parâmetros opcionais:**
- `days` — filtrar por dias desde a exclusão (padrão: todos)
- `user_type` — filtrar por tipo (ADMIN, DRIVER, CLIENT)
- Admin comum vê apenas do seu tenant; Super Admin vê todos

**Resposta:**
```json
{
  "users": [
    {
      "id": 15,
      "email": "entregador@teste.com",
      "first_name": "João",
      "last_name": "Silva",
      "user_type": "DRIVER",
      "deleted_at": "2026-09-01T10:30:00",
      "deleted_by_name": "Mauro Lopes",
      "days_deleted": 18
    }
  ],
  "total": 1,
  "config": {
    "retention_days": 90,
    "pending_cleanup": 0
  }
}
```

---

### Restaurar usuário excluído

```
POST /api/admin/users/:id/restore
```

**O que faz:**
```sql
UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = :id
```

**Resposta:**
```json
{
  "message": "Usuário restaurado com sucesso",
  "user": { ... }
}
```

---

### Exclusão permanente (individual)

```
DELETE /api/admin/users/:id/permanent
```

**O que faz:** Remove o usuário permanentemente do banco (ação irreversível).

**Resposta:**
```json
{
  "message": "Usuário excluído permanentemente"
}
```

---

### Exclusão permanente em lote

```
POST /api/admin/cleanup-deleted
Body: { "user_ids": [15, 22, 33] }
```

**O que faz:** Remove permanentemente apenas os usuários selecionados.

**Resposta:**
```json
{
  "message": "3 usuários excluídos permanentemente",
  "deleted_count": 3
}
```

---

### Configurar tempo de retenção

```
PUT /api/admin/retention-config
Body: { "retention_days": 90 }
```

**Valores aceitos:** 30, 60, 90 (padrão: 90)

**O que faz:** Salva a configuração no `SystemConfig`.

---

## 3. Alterações nos Endpoints Existentes

### Exclusão normal (soft delete)

Todos os endpoints de exclusão passam a fazer soft delete em vez de hard delete:

| Endpoint | Antes (destrutivo) | Depois (soft delete) |
|----------|--------------------|-----------------------|
| `DELETE /api/platform/admins/:id` | `DELETE FROM users` | `UPDATE users SET deleted_at=NOW()` |
| `DELETE /api/platform/users/:id` | `DELETE FROM users` | `UPDATE users SET deleted_at=NOW()` |
| `DELETE /api/admin/users/:id` | `DELETE FROM users` | `UPDATE users SET deleted_at=NOW()` |
| `DELETE /api/admin/drivers/:id` | `DELETE FROM users` | `UPDATE users SET deleted_at=NOW()` |
| `DELETE /api/admin/establishments/:id` | `DELETE FROM users` | `UPDATE users SET deleted_at=NOW()` |

**Importante:** Dados vinculados (pedidos, entregadores, restaurantes) **NÃO** são excluídos. O usuário apenas "some" da listagem.

---

### Queries filtram excluídos

Todas as queries de listagem passam a filtrar:

```python
# Antes
User.query.filter_by(tenant_id=tenant_id).all()

# Depois
User.query.filter_by(tenant_id=tenant_id).filter(User.deleted_at.is_(None)).all()
```

---

## 4. Frontend

### Botão "Lixeira" na página de Usuários

Localização: Página de Usuários (Admin) e Página de Admins (Super Admin)

```
[Novo Usuário]  [🗑️ Lixeira (3)]
```

O número entre parênteses mostra quantos usuários estão excluídos.

---

### Modal da Lixeira

```
┌─────────────────────────────────────────────────────────┐
│  🗑️ Lixeira — Usuários Excluídos                    × │
├─────────────────────────────────────────────────────────┤
│  Filtro: [Todos ▼] [30 dias ▼] [60 dias ▼] [90 dias ▼] │
│                                                         │
│  ☐ João Silva (DRIVER) — excluído há 15 dias           │
│    por: Mauro Lopes                                     │
│    [Restaurar]                                          │
│                                                         │
│  ☐ Maria Santos (CLIENT) — excluído há 45 dias         │
│    por: Mauro Lopes                                     │
│    [Restaurar]                                          │
│                                                         │
│  ☐ Pedro Souza (DRIVER) — excluído há 92 dias          │
│    por: Éverton Lopes                                   │
│    ⚠️ Apto para limpeza permanente                      │
│    [Restaurar]  [Excluir Permanentemente]               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ☐ Selecionar todos os antigos (90+ dias)              │
│                                                         │
│  [Restaurar Selecionados]  [Limpar Selecionados]       │
│                                                         │
│  ⚠️ Registros com mais de 90 dias podem ser limpos     │
│     para liberar espaço no banco de dados.              │
└─────────────────────────────────────────────────────────┘
```

---

### Notificação no Sistema

Quando existem registros com mais de X dias (configurável), o admin vê um aviso:

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Existem 5 usuários excluídos há mais de 90 dias.   │
│     Clique aqui para revisar e limpar.                  │
└─────────────────────────────────────────────────────────┘
```

Esta notificação aparece como um banner no topo da página de Usuários, não como email.

---

### Botão de Confirmação (antes de excluir)

Ao clicar "Excluir" em um usuário, o modal mostra:

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Confirmar Exclusão                                × │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tem certeza que deseja excluir este usuário?           │
│                                                         │
│  👤 João Silva (joao@teste.com)                        │
│  Tipo: Entregador                                       │
│  Pedidos: 45                                            │
│                                                         │
│  ℹ️ O usuário será movido para a lixeira e poderá      │
│     ser restaurado dentro de 90 dias.                   │
│                                                         │
│  [Cancelar]  [Excluir]                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Configuração de Retenção

### Onde configurar

Página de Configurações (Admin) → seção "Sistema":

```
Tempo de retenção na lixeira:
[30 dias] [60 dias] [90 dias (padrão)]
```

### Onde é salvo

`SystemConfig` no banco de dados:
- `config_key`: `retention_days`
- `config_value`: `90`

---

## 6. Fluxos de Trabalho

### Fluxo 1: Exclusão Normal

```
1. Admin clica "Excluir" no usuário
2. Modal mostra confirmação com dados do usuário
3. Admin confirma
4. Backend: UPDATE users SET deleted_at=NOW(), deleted_by=admin_id
5. Usuário some da listagem
6. Usuário aparece na "Lixeira"
```

### Fluxo 2: Restauração

```
1. Admin clica "Lixeira" na página de Usuários
2. Modal mostra lista de usuários excluídos
3. Admin clica "Restaurar" ao lado do usuário
4. Backend: UPDATE users SET deleted_at=NULL, deleted_by=NULL
5. Usuário volta para a listagem normal
```

### Fluxo 3: Limpeza Permanente

```
1. Sistema mostra aviso: "Existem X usuários excluídos há mais de 90 dias"
2. Admin clica no aviso (ou no botão "Lixeira")
3. Modal mostra lista com checkbox em cada registro
4. Admin seleciona quais registros quer limpar permanentemente
5. Admin clica "Limpar Selecionados"
6. Modal: "Isso excluirá permanentemente 3 registros. Continuar?"
7. Admin confirma
8. Backend: DELETE FROM users WHERE id IN (...)
```

### Fluxo 4: Restaurar Vários de Uma Vez

```
1. Admin abre a Lixeira
2. Marca checkbox nos usuários que quer restaurar
3. Clica "Restaurar Selecionados"
4. Todos são restaurados de uma vez
```

---

## 7. Regras de Visibilidade

| Quem | Vê o quê |
|------|----------|
| **Super Admin** | Todos os usuários excluídos de todos os tenants |
| **Admin** | Apenas usuários excluídos do seu tenant |

---

## 8. Arquivos que Precisam ser Alterados

### Backend

| Arquivo | O que muda |
|---------|------------|
| `portal_models.py` | Adicionar `deleted_at` e `deleted_by` no modelo User |
| `main_production.py` | Adicionar migration SQL para os novos campos |
| `platform.py` | Alterar `delete_admin`, `delete_platform_user`, `delete_tenant` para soft delete |
| `admin.py` | Alterar `delete_user`, `reject_user`, `delete_establishment`, `delete_driver` para soft delete |
| `admin.py` | Adicionar endpoints: `deleted-users`, `restore`, `permanent`, `cleanup-deleted`, `retention-config` |

### Frontend

| Arquivo | O que muda |
|---------|------------|
| `AdminUsersPage.jsx` | Adicionar botão "Lixeira", modal de confirmação, banner de aviso |
| `PlatformDashboardPage.jsx` | Adicionar botão "Lixeira" na aba de Admins/Usuários |
| `AdminSettingsPage.jsx` | Adicionar configuração de retenção |
| `api.js` | Adicionar funções: `getDeletedUsers`, `restoreUser`, `deletePermanent`, `cleanupDeleted` |

---

## 9. Estimativa de Trabalho

| Fase | Tempo |
|------|-------|
| Migration (banco) | 15 min |
| Backend: modelo + endpoints | 1.5 horas |
| Frontend: lixeira + confirmação | 1.5 horas |
| Frontend: configuração retenção | 30 min |
| Testes | 30 min |
| **Total** | **~4 horas** |

---

## 10. Exemplo de Código (Backend)

### Alteração no endpoint de exclusão (exemplo)

**ANTES:**
```python
@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get(user_id)
    # ... exclusão permanente
    db.session.delete(user)
    db.session.commit()
```

**DEPOIS:**
```python
@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get(user_id)
    # ... validações
    
    # Soft delete
    user.deleted_at = datetime.now(timezone.utc)
    user.deleted_by = get_current_user().id
    db.session.commit()
    
    return jsonify({'message': 'Usuário movido para a lixeira'}), 200
```

### Query com filtro de soft delete

**ANTES:**
```python
users = User.query.filter_by(tenant_id=tenant_id).all()
```

**DEPOIS:**
```python
users = User.query.filter_by(tenant_id=tenant_id).filter(User.deleted_at.is_(None)).all()
```