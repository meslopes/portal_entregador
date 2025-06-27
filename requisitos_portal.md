# Documento de Requisitos do Sistema "PORTAL"

## 1. Introdução

Este documento detalha os requisitos funcionais e não funcionais para o desenvolvimento do sistema "PORTAL", um website de controle de entregadores de delivery. O objetivo é replicar as principais funcionalidades e a experiência do usuário do aplicativo Uber Eats Driver, adaptando-o para uma plataforma web não-local, com backend em Java e hospedagem em nuvem.

## 2. Visão Geral do Produto

O "PORTAL" será uma ferramenta essencial para empresas de delivery gerenciarem seus entregadores, pedidos e rotas de forma eficiente. Ele fornecerá uma interface intuitiva para os entregadores receberem e gerenciarem suas entregas, acompanharem seus ganhos e interagirem com o suporte. Para os administradores, o sistema oferecerá um painel de controle completo para monitorar a operação em tempo real.

## 3. Requisitos Funcionais

As funcionalidades do "PORTAL" serão inspiradas no Uber Eats Driver, incluindo, mas não se limitando a:

### 3.1. Gerenciamento de Conta do Entregador

*   **Cadastro e Login:** Entregadores devem ser capazes de criar uma conta e fazer login de forma segura.
*   **Perfil do Entregador:** Visualização e edição de informações pessoais, dados do veículo (carro, moto, bicicleta, a pé), e documentos necessários (CNH, comprovante de residência, etc.).
*   **Status Online/Offline:** Entregadores devem poder alternar seu status para indicar disponibilidade para entregas.
*   **Histórico de Entregas:** Visualização de entregas concluídas, incluindo detalhes como data, hora, valor ganho, distância percorrida e avaliações.
*   **Ganhos e Pagamentos:** Acompanhamento detalhado dos ganhos (por entrega, por hora, por distância), visualização de extratos de pagamento e opção de saque (similar ao Instant Pay do Uber Eats).
*   **Suporte:** Acesso a um canal de suporte para dúvidas e problemas.

### 3.2. Gerenciamento de Pedidos e Entregas

*   **Recebimento de Pedidos:** Notificações em tempo real de novos pedidos de entrega disponíveis, com informações claras sobre o valor a ser pago, distância, local de retirada e local de entrega.
*   **Aceite/Recusa de Pedidos:** Entregadores devem poder aceitar ou recusar pedidos com base nas informações fornecidas.
*   **Navegação e Roteamento:** Integração com serviços de mapa para fornecer rotas otimizadas do local de retirada ao local de entrega.
*   **Status da Entrega:** Atualização do status da entrega (a caminho do restaurante, no restaurante, a caminho do cliente, entregue).
*   **Comunicação:** Funcionalidades de chat ou chamada para comunicação com o restaurante e o cliente.
*   **Prova de Entrega:** Opção para o entregador confirmar a entrega (ex: foto, assinatura).

### 3.3. Painel Administrativo (para a empresa de delivery)

*   **Gerenciamento de Entregadores:** Cadastro, edição, exclusão e visualização de entregadores, incluindo seus documentos e status.
*   **Monitoramento em Tempo Real:** Visualização da localização dos entregadores no mapa, status das entregas e pedidos em andamento.
*   **Relatórios e Análises:** Geração de relatórios sobre desempenho dos entregadores, volume de entregas, ganhos, etc.
*   **Gerenciamento de Pedidos:** Visualização e gerenciamento de todos os pedidos, com a possibilidade de atribuir entregadores manualmente, se necessário.
*   **Configurações do Sistema:** Gerenciamento de taxas de entrega, áreas de atuação, etc.

## 4. Requisitos Não Funcionais

*   **Desempenho:** O sistema deve ser rápido e responsivo, mesmo com um grande volume de usuários e dados.
*   **Segurança:** Proteção de dados sensíveis dos usuários e da empresa, com autenticação robusta e criptografia.
*   **Escalabilidade:** Capacidade de lidar com o crescimento futuro do número de entregadores e pedidos.
*   **Disponibilidade:** Alta disponibilidade do sistema para garantir que os entregadores possam trabalhar sem interrupções.
*   **Usabilidade:** Interface intuitiva e fácil de usar para entregadores e administradores.
*   **Compatibilidade:** O website deve ser responsivo e funcionar em diferentes navegadores e dispositivos (desktop, tablet, mobile).
*   **Manutenibilidade:** Código limpo, modular e bem documentado para facilitar futuras manutenções e atualizações.

## 5. Tecnologias Propostas

*   **Backend:** Java com Spring Boot (para agilidade no desenvolvimento e robustez).
*   **Banco de Dados:** PostgreSQL (relacional, escalável e amplamente utilizado).
*   **Frontend:** React (para uma interface de usuário dinâmica e responsiva) ou similar, com HTML/CSS/JavaScript.
*   **Mapeamento:** Integração com APIs de mapas (Google Maps API ou OpenStreetMap).
*   **Hospedagem:** Provedor de nuvem (AWS, Google Cloud Platform ou Azure) para garantir escalabilidade e disponibilidade não-local.

## 6. Arquitetura do Sistema

A arquitetura proposta será baseada em microsserviços, com o backend dividido em módulos lógicos (ex: serviço de usuários, serviço de pedidos, serviço de localização). Isso permitirá maior escalabilidade, flexibilidade e manutenibilidade. O frontend se comunicará com o backend através de APIs RESTful.

## 7. Próximos Passos

Com base neste documento de requisitos, os próximos passos incluem:

1.  Detalhar o design da interface do usuário (UI/UX).
2.  Modelar o banco de dados.
3.  Iniciar o desenvolvimento do backend e frontend.
4.  Realizar testes rigorosos em todas as fases do desenvolvimento.
5.  Preparar o ambiente de deploy em nuvem.

Este documento será atualizado conforme o projeto avança e novos requisitos surgem.

