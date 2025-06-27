# PORTAL - Sistema de Controle de Entregadores

![PORTAL Logo](https://via.placeholder.com/200x80/4F46E5/FFFFFF?text=PORTAL)

**🚀 Sistema completo de delivery similar ao Uber Eats Driver**  
**🇧🇷 Desenvolvido especificamente para o mercado brasileiro**  
**⚡ Tecnologias modernas: React + Flask + PostgreSQL**

---

## 📋 Visão Geral

O PORTAL é uma plataforma completa de controle de entregadores de delivery, desenvolvida para replicar e aprimorar as funcionalidades do Uber Eats Driver. O sistema oferece uma solução robusta, escalável e adaptada às necessidades específicas do mercado brasileiro.

### ✨ Principais Características

- **🎯 Interface Moderna**: Design responsivo com cores modernas (azul/índigo)
- **🔐 Segurança Avançada**: Autenticação JWT, criptografia de dados, conformidade LGPD
- **📱 Totalmente Responsivo**: Funciona perfeitamente em desktop e mobile
- **🌐 Pronto para Nuvem**: Configurado para deploy em produção
- **🇧🇷 Localizado**: Interface em português, integração PIX, validação CPF

### 🛠️ Tecnologias Utilizadas

**Frontend:**
- React 18.2.0
- Tailwind CSS 3.4.0
- React Router DOM 6.8.0
- Axios 1.6.0
- Shadcn/ui (componentes)

**Backend:**
- Flask 3.0.0
- SQLAlchemy 2.0.0
- Flask-JWT-Extended 4.6.0
- PostgreSQL (produção) / SQLite (desenvolvimento)

**Deploy:**
- Vercel (frontend)
- Railway (backend)
- GitHub (repositório)

---

## 🚀 Início Rápido

### Pré-requisitos

- Python 3.11+
- Node.js 18+
- Git

### Instalação Local

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/portal-delivery.git
cd portal-delivery
```

2. **Configure o Backend**
```bash
cd portal-backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt
python src/main.py
```

3. **Configure o Frontend**
```bash
cd portal-frontend
pnpm install
pnpm run dev
```

4. **Acesse a aplicação**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Credenciais de Teste

- **Email:** admin@portal.com
- **Senha:** admin123

---

## 📁 Estrutura do Projeto

```
portal-delivery/
├── portal-frontend/          # Frontend React
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── contexts/        # Contextos React
│   │   ├── lib/            # Utilitários e API
│   │   └── App.jsx         # Componente principal
│   ├── dist/               # Build de produção
│   └── package.json
├── portal-backend/           # Backend Flask
│   ├── src/
│   │   ├── models/         # Modelos do banco de dados
│   │   ├── routes/         # Rotas da API
│   │   ├── config.py       # Configurações
│   │   └── main.py         # Aplicação principal
│   ├── requirements.txt
│   └── Procfile           # Configuração para deploy
├── docs/                   # Documentação
└── README.md
```

---

## 🎯 Funcionalidades

### Para Entregadores
- ✅ **Dashboard Completo**: Estatísticas, ganhos, avaliações
- ✅ **Controle Online/Offline**: Status de disponibilidade
- ✅ **Gerenciamento de Pedidos**: Aceitar, acompanhar, finalizar
- ✅ **Histórico de Entregas**: Registro completo de atividades
- ✅ **Sistema de Pagamentos**: Integração PIX, transparência total
- ✅ **Perfil Personalizado**: Dados pessoais, veículo, documentos

### Para Administradores
- ✅ **Dashboard Administrativo**: Métricas em tempo real
- ✅ **Gestão de Entregadores**: Aprovação, suspensão, comunicação
- ✅ **Análise de Operações**: Relatórios detalhados, insights
- ✅ **Monitoramento**: Logs, alertas, auditoria
- ✅ **Configurações**: Parâmetros do sistema, integrações

### Recursos Técnicos
- ✅ **API RESTful**: Endpoints completos e documentados
- ✅ **Autenticação JWT**: Segurança robusta
- ✅ **Banco de Dados**: Modelagem otimizada
- ✅ **Logs e Monitoramento**: Observabilidade completa
- ✅ **Testes**: Cobertura de funcionalidades críticas

---

## 🌐 Deploy em Produção

### Opção 1: Vercel + Railway (Recomendado)

**Vantagens:**
- ✅ Gratuito para começar
- ✅ Deploy automático via GitHub
- ✅ Escalabilidade automática
- ✅ URLs profissionais

**Passos:**
1. Fazer push do código para GitHub
2. Conectar Vercel ao repositório (frontend)
3. Conectar Railway ao repositório (backend)
4. Configurar variáveis de ambiente
5. Deploy automático!

### Opção 2: Heroku

**Configuração:**
- Tudo em uma plataforma
- Mais simples, mas pago (~$7-25/mês)

### Opção 3: VPS Próprio

**Para usuários avançados:**
- Controle total
- DigitalOcean, AWS, etc.
- Requer conhecimento técnico

---

## 📚 Documentação

### Documentos Disponíveis

- 📖 **[Documentação Completa](docs/documentacao_completa.md)** - Guia técnico detalhado
- 🚀 **[Guia de Deploy](docs/guia_deploy.md)** - Instruções de publicação
- 🎨 **[Design e UX](docs/design_portal.md)** - Especificações visuais
- 🏗️ **[Arquitetura](docs/arquitetura_portal.md)** - Estrutura técnica
- 📋 **[Requisitos](docs/requisitos_portal.md)** - Especificações funcionais

### API Reference

A API oferece endpoints completos para todas as operações:

- **Autenticação**: `/api/auth/*`
- **Entregadores**: `/api/driver/*`
- **Pedidos**: `/api/orders/*`
- **Administração**: `/api/admin/*`

Documentação completa com exemplos disponível em `docs/api-reference.md`

---

## 🔒 Segurança

- **🛡️ Autenticação JWT**: Tokens seguros com expiração
- **🔐 Criptografia**: Senhas com scrypt, dados sensíveis protegidos
- **🌐 HTTPS**: Comunicação criptografada em produção
- **📋 LGPD**: Conformidade total com lei brasileira
- **🔍 Auditoria**: Logs completos de todas as operações

---

## 🤝 Contribuição

### Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- **Frontend**: ESLint + Prettier
- **Backend**: Black + Flake8
- **Commits**: Conventional Commits
- **Testes**: Jest (frontend) + Pytest (backend)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Suporte

### Contato

- **Email**: suporte@portal-delivery.com
- **Documentação**: [docs.portal-delivery.com](https://docs.portal-delivery.com)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/portal-delivery/issues)

### Status do Projeto

- ✅ **Desenvolvimento**: Completo
- ✅ **Testes**: Aprovado
- ✅ **Documentação**: Completa
- 🔄 **Deploy**: Pronto (aguardando decisão)

---

## 🎉 Agradecimentos

Desenvolvido com ❤️ por **Manus AI** para revolucionar o mercado brasileiro de delivery.

**Tecnologias que tornaram este projeto possível:**
- React Team pela excelente biblioteca
- Flask Community pelo framework robusto
- Tailwind CSS pela flexibilidade de design
- Vercel e Railway pela infraestrutura de nuvem

---

**🚀 O PORTAL está pronto para transformar o delivery no Brasil!**

