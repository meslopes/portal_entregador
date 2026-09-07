# Tenant x Admin - Por que existem os dois?

## Sua duvida

Voce perguntou: "Criar o Tenant e o Admin nao seria redundancia? Nao seria melhor criar so um?"

## Resposta: Nao e redundancia, sao coisas diferentes

### Tenant = A EMPRESA (organizacao)

O Tenant representa a **empresa** que vai usar a plataforma.

Exemplo:
```
Tenant: "Entregas Porto Alegre Ltda"
  ├── CNPJ: 12.345.678/0001-90
  ├── Plano: premium
  ├── Cor primaria: #6366f1
  ├── Logotipo: logo.png
  ├── Max entregas/mes: 2000
  ├── Max entregadores: 100
  └── Dominio proprio: entregaspoa.com.br
```

### Admin = A PESSOA que gerencia a empresa

O Admin representa a **pessoa** que vai usar o painel de controle.

Exemplo:
```
Admin: "João Silva"
  ├── Email: joao@entregaspoa.com.br
  ├── Senha: *****
  ├── Tipo: ADMIN
  └── Tenant: "Entregas Porto Alegre Ltda"
```

### Por que sao separados?

1. **Uma empresa pode ter varios admins**
   - "Entregas Porto Alegre" pode ter 3 admins:
     - joao@entregaspoa.com.br (dono)
     - maria@entregaspoa.com.br (gerente)
     - pedro@entregaspoa.com.br (operador)

2. **A empresa existe mesmo sem admins**
   - Se todos os admins forem demitidos, a empresa continua existindo
   - Os dados (praças, entregadores, pedidos) continuam la

3. **Configuracoes da empresa sao separadas das configuracoes do usuario**
   - O plano, a marca, os limites sao da EMPRESA (Tenant)
   - A senha, o nome, o telefone sao da PESSOA (Admin)

### Analogia

E como uma **conta bancaria**:
- A **conta** (Tenant) tem um numero, um saldo, um tipo de conta
- O **titular** (Admin) tem um CPF, um nome, uma senha
- Uma conta pode ter varios titulares (conjunta)
- A conta continua existindo mesmo se o titular for trocado

## No seu caso especifico

Voce quer criar: "Entregas Porto Alegre" com as praças "Centro" e "Zona Sul".

O fluxo seria:

```
1. Criar Tenant: "Entregas Porto Alegre"
   └── Configurar plano, cores, logo

2. Criar Admin: "João Silva" (joao@entregaspoa.com.br)
   └── Vincular ao Tenant "Entregas Porto Alegre"

3. Criar Praça: "Porto Alegre Centro"
   └── Vincular ao Tenant "Entregas Porto Alegre"

4. Criar Praça: "Porto Alegre Zona Sul"
   └── Vincular ao Tenant "Entregas Porto Alegre"

5. João faz login em /login
   └── E redirecionado para /admin
   └── La ele ve as duas praças e pode gerencia-las
```

## Resumindo

- **Tenant** = a empresa (organizacao, plano, marca)
- **Admin** = a pessoa que gerencia a empresa
- **Nao e redundancia** porque uma empresa pode ter varias pessoas (admins)
- **Sim**, o admin de Porto Alegre gerenciaria as praças "Centro" e "Zona Sul"
