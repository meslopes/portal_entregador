# Estruturação do Banco de Dados e Arquitetura do Sistema "PORTAL"

## 1. Introdução

Esta seção apresenta a modelagem detalhada do banco de dados e a arquitetura do sistema "PORTAL", considerando os requisitos funcionais e não funcionais identificados anteriormente. O objetivo é criar uma estrutura robusta, escalável e eficiente que suporte todas as funcionalidades necessárias para um sistema de controle de entregadores de delivery.

## 2. Modelagem do Banco de Dados

### 2.1. Entidades Principais

Com base nos requisitos funcionais, foram identificadas as seguintes entidades principais:

#### 2.1.1. Usuário (User)
Representa tanto entregadores quanto administradores do sistema.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único do usuário
- `email` (VARCHAR(255), UNIQUE, NOT NULL): Email do usuário para login
- `password_hash` (VARCHAR(255), NOT NULL): Hash da senha do usuário
- `first_name` (VARCHAR(100), NOT NULL): Primeiro nome
- `last_name` (VARCHAR(100), NOT NULL): Sobrenome
- `phone` (VARCHAR(20), UNIQUE): Número de telefone
- `cpf` (VARCHAR(14), UNIQUE): CPF do usuário
- `birth_date` (DATE): Data de nascimento
- `profile_picture_url` (VARCHAR(500)): URL da foto de perfil
- `user_type` (ENUM('DRIVER', 'ADMIN'), NOT NULL): Tipo de usuário
- `status` (ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'), DEFAULT 'ACTIVE'): Status da conta
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.2. Entregador (Driver)
Extensão da entidade Usuário com informações específicas do entregador.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único do entregador
- `user_id` (BIGINT, FOREIGN KEY REFERENCES User(id)): Referência ao usuário
- `driver_license` (VARCHAR(20), UNIQUE): Número da CNH
- `license_expiry_date` (DATE): Data de vencimento da CNH
- `vehicle_type` (ENUM('CAR', 'MOTORCYCLE', 'BICYCLE', 'FOOT'), NOT NULL): Tipo de veículo
- `vehicle_plate` (VARCHAR(10)): Placa do veículo (se aplicável)
- `vehicle_model` (VARCHAR(100)): Modelo do veículo
- `vehicle_year` (INT): Ano do veículo
- `bank_account` (VARCHAR(50)): Conta bancária para pagamentos
- `pix_key` (VARCHAR(100)): Chave PIX
- `is_online` (BOOLEAN, DEFAULT FALSE): Status online/offline
- `current_latitude` (DECIMAL(10,8)): Latitude atual
- `current_longitude` (DECIMAL(11,8)): Longitude atual
- `last_location_update` (TIMESTAMP): Última atualização de localização
- `rating` (DECIMAL(3,2), DEFAULT 5.00): Avaliação média do entregador
- `total_deliveries` (INT, DEFAULT 0): Total de entregas realizadas
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.3. Restaurante (Restaurant)
Representa os estabelecimentos que fazem pedidos de entrega.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único do restaurante
- `name` (VARCHAR(200), NOT NULL): Nome do restaurante
- `cnpj` (VARCHAR(18), UNIQUE): CNPJ do estabelecimento
- `phone` (VARCHAR(20)): Telefone de contato
- `email` (VARCHAR(255)): Email de contato
- `address` (VARCHAR(500), NOT NULL): Endereço completo
- `latitude` (DECIMAL(10,8), NOT NULL): Latitude do restaurante
- `longitude` (DECIMAL(11,8), NOT NULL): Longitude do restaurante
- `opening_hours` (JSON): Horários de funcionamento
- `is_active` (BOOLEAN, DEFAULT TRUE): Status ativo/inativo
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.4. Cliente (Customer)
Representa os clientes que recebem as entregas.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único do cliente
- `name` (VARCHAR(200), NOT NULL): Nome do cliente
- `phone` (VARCHAR(20), NOT NULL): Telefone de contato
- `email` (VARCHAR(255)): Email do cliente
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.5. Endereço (Address)
Representa os endereços de entrega dos clientes.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único do endereço
- `customer_id` (BIGINT, FOREIGN KEY REFERENCES Customer(id)): Referência ao cliente
- `street` (VARCHAR(300), NOT NULL): Rua e número
- `complement` (VARCHAR(100)): Complemento
- `neighborhood` (VARCHAR(100), NOT NULL): Bairro
- `city` (VARCHAR(100), NOT NULL): Cidade
- `state` (VARCHAR(2), NOT NULL): Estado (sigla)
- `zip_code` (VARCHAR(10), NOT NULL): CEP
- `latitude` (DECIMAL(10,8)): Latitude do endereço
- `longitude` (DECIMAL(11,8)): Longitude do endereço
- `is_default` (BOOLEAN, DEFAULT FALSE): Endereço padrão do cliente
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.6. Pedido (Order)
Representa os pedidos de entrega.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único do pedido
- `restaurant_id` (BIGINT, FOREIGN KEY REFERENCES Restaurant(id)): Restaurante de origem
- `customer_id` (BIGINT, FOREIGN KEY REFERENCES Customer(id)): Cliente destinatário
- `delivery_address_id` (BIGINT, FOREIGN KEY REFERENCES Address(id)): Endereço de entrega
- `driver_id` (BIGINT, FOREIGN KEY REFERENCES Driver(id), NULL): Entregador atribuído
- `order_number` (VARCHAR(50), UNIQUE, NOT NULL): Número do pedido
- `items` (JSON, NOT NULL): Itens do pedido em formato JSON
- `subtotal` (DECIMAL(10,2), NOT NULL): Subtotal do pedido
- `delivery_fee` (DECIMAL(10,2), NOT NULL): Taxa de entrega
- `total_amount` (DECIMAL(10,2), NOT NULL): Valor total
- `payment_method` (ENUM('CASH', 'CARD', 'PIX'), NOT NULL): Método de pagamento
- `status` (ENUM('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'), DEFAULT 'PENDING'): Status do pedido
- `estimated_delivery_time` (TIMESTAMP): Tempo estimado de entrega
- `pickup_time` (TIMESTAMP): Horário de retirada no restaurante
- `delivery_time` (TIMESTAMP): Horário de entrega ao cliente
- `special_instructions` (TEXT): Instruções especiais
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.7. Entrega (Delivery)
Representa o processo de entrega de um pedido.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único da entrega
- `order_id` (BIGINT, FOREIGN KEY REFERENCES Order(id)): Referência ao pedido
- `driver_id` (BIGINT, FOREIGN KEY REFERENCES Driver(id)): Entregador responsável
- `pickup_latitude` (DECIMAL(10,8)): Latitude do local de retirada
- `pickup_longitude` (DECIMAL(11,8)): Longitude do local de retirada
- `delivery_latitude` (DECIMAL(10,8)): Latitude do local de entrega
- `delivery_longitude` (DECIMAL(11,8)): Longitude do local de entrega
- `distance_km` (DECIMAL(8,2)): Distância percorrida em quilômetros
- `estimated_duration_minutes` (INT): Duração estimada em minutos
- `actual_duration_minutes` (INT): Duração real em minutos
- `driver_earnings` (DECIMAL(10,2)): Ganhos do entregador
- `proof_of_delivery_url` (VARCHAR(500)): URL da prova de entrega (foto)
- `customer_rating` (INT): Avaliação do cliente (1-5)
- `customer_feedback` (TEXT): Comentário do cliente
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.8. Pagamento (Payment)
Representa os pagamentos realizados aos entregadores.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único do pagamento
- `driver_id` (BIGINT, FOREIGN KEY REFERENCES Driver(id)): Entregador beneficiário
- `amount` (DECIMAL(10,2), NOT NULL): Valor do pagamento
- `payment_type` (ENUM('DELIVERY_EARNING', 'BONUS', 'ADJUSTMENT'), NOT NULL): Tipo de pagamento
- `reference_id` (BIGINT): ID de referência (ex: delivery_id)
- `payment_method` (ENUM('BANK_TRANSFER', 'PIX', 'CASH'), NOT NULL): Método de pagamento
- `status` (ENUM('PENDING', 'PROCESSED', 'FAILED'), DEFAULT 'PENDING'): Status do pagamento
- `processed_at` (TIMESTAMP): Data de processamento
- `transaction_id` (VARCHAR(100)): ID da transação externa
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

#### 2.1.9. Notificação (Notification)
Representa as notificações enviadas aos usuários.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único da notificação
- `user_id` (BIGINT, FOREIGN KEY REFERENCES User(id)): Usuário destinatário
- `title` (VARCHAR(200), NOT NULL): Título da notificação
- `message` (TEXT, NOT NULL): Conteúdo da notificação
- `type` (ENUM('ORDER_AVAILABLE', 'ORDER_UPDATE', 'PAYMENT', 'SYSTEM'), NOT NULL): Tipo de notificação
- `is_read` (BOOLEAN, DEFAULT FALSE): Status de leitura
- `related_id` (BIGINT): ID relacionado (ex: order_id)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação

#### 2.1.10. Configuração do Sistema (SystemConfig)
Armazena configurações gerais do sistema.

**Atributos:**
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Identificador único
- `config_key` (VARCHAR(100), UNIQUE, NOT NULL): Chave da configuração
- `config_value` (TEXT, NOT NULL): Valor da configuração
- `description` (VARCHAR(500)): Descrição da configuração
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Data de atualização

### 2.2. Relacionamentos Entre Entidades

Os relacionamentos entre as entidades foram definidos considerando a integridade referencial e as regras de negócio:

1. **User → Driver**: Relacionamento 1:1 (um usuário pode ser um entregador)
2. **Customer → Address**: Relacionamento 1:N (um cliente pode ter múltiplos endereços)
3. **Restaurant → Order**: Relacionamento 1:N (um restaurante pode ter múltiplos pedidos)
4. **Customer → Order**: Relacionamento 1:N (um cliente pode fazer múltiplos pedidos)
5. **Driver → Order**: Relacionamento 1:N (um entregador pode ter múltiplos pedidos atribuídos)
6. **Order → Delivery**: Relacionamento 1:1 (cada pedido tem uma entrega)
7. **Driver → Payment**: Relacionamento 1:N (um entregador pode receber múltiplos pagamentos)
8. **User → Notification**: Relacionamento 1:N (um usuário pode receber múltiplas notificações)

### 2.3. Índices e Otimizações

Para garantir performance adequada, serão criados os seguintes índices:

- **Índices únicos**: email, phone, cpf (User), driver_license (Driver), cnpj (Restaurant)
- **Índices compostos**: 
  - (driver_id, status) em Order para consultas de pedidos por entregador
  - (restaurant_id, status) em Order para consultas de pedidos por restaurante
  - (customer_id, created_at) em Order para histórico de pedidos
  - (driver_id, created_at) em Payment para histórico de pagamentos
- **Índices geoespaciais**: (latitude, longitude) em Driver, Restaurant e Address para consultas de proximidade



## 3. Arquitetura do Sistema

### 3.1. Visão Geral da Arquitetura

O sistema "PORTAL" será desenvolvido seguindo uma arquitetura de microsserviços, proporcionando escalabilidade, manutenibilidade e flexibilidade. A arquitetura será composta pelos seguintes componentes principais:

#### 3.1.1. Camada de Apresentação (Frontend)
- **Tecnologia**: React.js com TypeScript
- **Responsabilidades**: Interface do usuário, experiência do usuário, validação de formulários no lado cliente
- **Comunicação**: APIs RESTful com o backend via HTTP/HTTPS

#### 3.1.2. Camada de API Gateway
- **Tecnologia**: Spring Cloud Gateway ou Nginx
- **Responsabilidades**: Roteamento de requisições, autenticação, autorização, rate limiting, logging
- **Funcionalidades**: Balanceamento de carga, cache de respostas, transformação de requisições

#### 3.1.3. Camada de Microsserviços (Backend)
Dividida em serviços especializados:

**a) Serviço de Autenticação e Autorização**
- **Tecnologia**: Spring Boot + Spring Security + JWT
- **Responsabilidades**: Login, logout, gerenciamento de tokens, controle de acesso
- **Banco de Dados**: PostgreSQL (tabelas User, Driver)

**b) Serviço de Gerenciamento de Usuários**
- **Tecnologia**: Spring Boot + Spring Data JPA
- **Responsabilidades**: CRUD de usuários, perfis de entregadores, upload de documentos
- **Banco de Dados**: PostgreSQL (tabelas User, Driver)

**c) Serviço de Pedidos**
- **Tecnologia**: Spring Boot + Spring Data JPA
- **Responsabilidades**: Criação, atualização e consulta de pedidos, atribuição de entregadores
- **Banco de Dados**: PostgreSQL (tabelas Order, Restaurant, Customer, Address)

**d) Serviço de Entregas**
- **Tecnologia**: Spring Boot + Spring Data JPA
- **Responsabilidades**: Gerenciamento do processo de entrega, tracking em tempo real, cálculo de rotas
- **Banco de Dados**: PostgreSQL (tabela Delivery)
- **Integrações**: APIs de mapas (Google Maps ou OpenStreetMap)

**e) Serviço de Pagamentos**
- **Tecnologia**: Spring Boot + Spring Data JPA
- **Responsabilidades**: Cálculo de ganhos, processamento de pagamentos, histórico financeiro
- **Banco de Dados**: PostgreSQL (tabela Payment)
- **Integrações**: APIs de pagamento (PIX, transferências bancárias)

**f) Serviço de Notificações**
- **Tecnologia**: Spring Boot + WebSocket + Firebase Cloud Messaging
- **Responsabilidades**: Envio de notificações push, email, SMS
- **Banco de Dados**: PostgreSQL (tabela Notification)

**g) Serviço de Localização**
- **Tecnologia**: Spring Boot + Redis (cache de localizações)
- **Responsabilidades**: Tracking de entregadores, cálculo de proximidade, otimização de rotas
- **Banco de Dados**: Redis para cache, PostgreSQL para persistência

**h) Serviço de Relatórios e Analytics**
- **Tecnologia**: Spring Boot + Apache Kafka + Elasticsearch
- **Responsabilidades**: Geração de relatórios, métricas de performance, dashboards administrativos
- **Banco de Dados**: Elasticsearch para analytics, PostgreSQL para dados transacionais

#### 3.1.4. Camada de Dados
- **Banco Principal**: PostgreSQL para dados transacionais
- **Cache**: Redis para sessões, localizações em tempo real e cache de consultas frequentes
- **Message Broker**: Apache Kafka para comunicação assíncrona entre serviços
- **Storage**: Amazon S3 ou similar para armazenamento de arquivos (fotos, documentos)

#### 3.1.5. Camada de Infraestrutura
- **Containerização**: Docker para todos os serviços
- **Orquestração**: Kubernetes ou Docker Compose para desenvolvimento
- **Monitoramento**: Prometheus + Grafana para métricas, ELK Stack para logs
- **CI/CD**: Jenkins ou GitHub Actions para automação de deploy

### 3.2. Padrões Arquiteturais Utilizados

#### 3.2.1. Domain-Driven Design (DDD)
Cada microsserviço será organizado seguindo os princípios do DDD:
- **Entities**: Objetos com identidade única (User, Order, Delivery)
- **Value Objects**: Objetos imutáveis sem identidade (Address, Money)
- **Aggregates**: Conjuntos de entidades tratadas como uma unidade (Order + OrderItems)
- **Repositories**: Abstração para acesso aos dados
- **Services**: Lógica de negócio que não pertence a uma entidade específica

#### 3.2.2. CQRS (Command Query Responsibility Segregation)
Separação entre operações de escrita (Commands) e leitura (Queries):
- **Commands**: Operações que modificam o estado (criar pedido, atualizar status)
- **Queries**: Operações de consulta (listar pedidos, relatórios)
- **Event Sourcing**: Para auditoria e rastreabilidade de mudanças críticas

#### 3.2.3. Event-Driven Architecture
Comunicação entre serviços através de eventos:
- **Domain Events**: Eventos de negócio (PedidoCriado, EntregaIniciada, PagamentoProcessado)
- **Integration Events**: Eventos para comunicação entre bounded contexts
- **Event Store**: Armazenamento de eventos para auditoria e replay

### 3.3. Segurança

#### 3.3.1. Autenticação e Autorização
- **JWT (JSON Web Tokens)**: Para autenticação stateless
- **OAuth 2.0**: Para integração com provedores externos
- **RBAC (Role-Based Access Control)**: Controle de acesso baseado em papéis
- **Rate Limiting**: Proteção contra ataques de força bruta

#### 3.3.2. Proteção de Dados
- **Criptografia**: HTTPS para comunicação, bcrypt para senhas
- **Validação de Entrada**: Sanitização e validação de todos os inputs
- **CORS**: Configuração adequada para requisições cross-origin
- **SQL Injection Prevention**: Uso de prepared statements e ORM

#### 3.3.3. Compliance e Privacidade
- **LGPD**: Conformidade com a Lei Geral de Proteção de Dados
- **Anonimização**: Técnicas para proteção de dados sensíveis
- **Auditoria**: Log de todas as operações críticas
- **Backup e Recovery**: Estratégias de backup e recuperação de dados

### 3.4. Escalabilidade e Performance

#### 3.4.1. Estratégias de Escalabilidade
- **Horizontal Scaling**: Múltiplas instâncias de cada microsserviço
- **Database Sharding**: Particionamento de dados por região ou tipo
- **Load Balancing**: Distribuição de carga entre instâncias
- **Auto-scaling**: Escalabilidade automática baseada em métricas

#### 3.4.2. Otimizações de Performance
- **Caching**: Redis para cache de dados frequentemente acessados
- **Connection Pooling**: Pool de conexões com banco de dados
- **Lazy Loading**: Carregamento sob demanda de dados relacionados
- **CDN**: Content Delivery Network para assets estáticos

#### 3.4.3. Monitoramento e Observabilidade
- **Health Checks**: Verificação de saúde de cada serviço
- **Metrics**: Coleta de métricas de performance e negócio
- **Distributed Tracing**: Rastreamento de requisições entre serviços
- **Alerting**: Alertas automáticos para problemas críticos

### 3.5. Integração com Serviços Externos

#### 3.5.1. APIs de Mapas e Geolocalização
- **Google Maps API**: Para geocodificação, cálculo de rotas e mapas
- **OpenStreetMap**: Alternativa open-source para mapas
- **Geolocation API**: Para tracking em tempo real dos entregadores

#### 3.5.2. Serviços de Pagamento
- **PIX**: Integração com APIs do Banco Central para pagamentos instantâneos
- **Transferências Bancárias**: APIs bancárias para transferências TED/DOC
- **Gateways de Pagamento**: Integração com provedores como PagSeguro, Mercado Pago

#### 3.5.3. Serviços de Comunicação
- **Firebase Cloud Messaging**: Para notificações push
- **Twilio**: Para SMS e chamadas telefônicas
- **SendGrid**: Para envio de emails transacionais

### 3.6. Ambiente de Desenvolvimento e Deploy

#### 3.6.1. Ambiente Local
- **Docker Compose**: Para execução local de todos os serviços
- **Hot Reload**: Desenvolvimento com recarga automática
- **Mock Services**: Simulação de serviços externos para testes

#### 3.6.2. Ambientes de Staging e Produção
- **Kubernetes**: Orquestração de containers em produção
- **Helm Charts**: Templates para deploy no Kubernetes
- **Blue-Green Deployment**: Deploy sem downtime
- **Canary Releases**: Deploy gradual de novas versões

#### 3.6.3. Provedores de Nuvem
- **AWS**: Amazon Web Services como provedor principal
  - **EKS**: Elastic Kubernetes Service
  - **RDS**: Relational Database Service para PostgreSQL
  - **ElastiCache**: Para Redis
  - **S3**: Para armazenamento de arquivos
  - **CloudFront**: CDN para assets estáticos
- **Alternativas**: Google Cloud Platform ou Microsoft Azure

## 4. Considerações de Implementação

### 4.1. Fases de Desenvolvimento
O desenvolvimento será realizado em fases incrementais:

**Fase 1**: Serviços básicos (Autenticação, Usuários, Pedidos)
**Fase 2**: Serviços de entrega e localização
**Fase 3**: Serviços de pagamento e notificações
**Fase 4**: Analytics e relatórios
**Fase 5**: Otimizações e features avançadas

### 4.2. Estratégia de Testes
- **Testes Unitários**: Cobertura mínima de 80% para cada serviço
- **Testes de Integração**: Validação da comunicação entre serviços
- **Testes End-to-End**: Simulação de fluxos completos de usuário
- **Testes de Performance**: Load testing e stress testing
- **Testes de Segurança**: Penetration testing e vulnerability scanning

### 4.3. Documentação
- **API Documentation**: OpenAPI/Swagger para todas as APIs
- **Architecture Decision Records**: Documentação de decisões arquiteturais
- **Runbooks**: Procedimentos operacionais para produção
- **User Manuals**: Manuais para entregadores e administradores

Esta arquitetura fornece uma base sólida para o desenvolvimento do sistema "PORTAL", garantindo escalabilidade, manutenibilidade e performance adequadas para um sistema de delivery de grande escala.

