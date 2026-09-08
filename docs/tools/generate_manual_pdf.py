"""Convert markdown manual to PDF using fpdf2."""
from fpdf import FPDF
import re

class ManualPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, 'muv.log - Manual do Sistema', 0, 0, 'L')
            self.cell(0, 10, f'Página {self.page_no()}', 0, 1, 'R')
            self.line(10, 15, 200, 15)
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, 'muv.log © 2026 - Todos os direitos reservados', 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(13, 148, 136)
        self.cell(0, 10, title, 0, 1, 'L')
        self.set_draw_color(13, 148, 136)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(15, 118, 110)
        self.cell(0, 8, title, 0, 1, 'L')
        self.ln(2)

    def subsection_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(30, 41, 59)
        self.cell(0, 7, title, 0, 1, 'L')
        self.ln(1)

    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(51, 51, 51)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def bullet_point(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(51, 51, 51)
        x = self.get_x()
        self.cell(5, 5, '-', 0, 0)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def numbered_item(self, number, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(51, 51, 51)
        self.cell(8, 5, f'{number}.', 0, 0)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def table_row(self, cells, is_header=False):
        if is_header:
            self.set_font('Helvetica', 'B', 9)
            self.set_fill_color(248, 250, 252)
        else:
            self.set_font('Helvetica', '', 9)
            self.set_fill_color(255, 255, 255)
        
        self.set_text_color(30, 41, 59)
        self.set_draw_color(226, 232, 240)
        
        col_width = 190 / len(cells)
        for cell in cells:
            self.cell(col_width, 7, str(cell)[:50], 1, 0, 'L', True)
        self.ln()

def create_manual():
    pdf = ManualPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    
    # Cover page
    pdf.add_page()
    pdf.ln(40)
    pdf.set_font('Helvetica', 'B', 32)
    pdf.set_text_color(13, 148, 136)
    pdf.cell(0, 15, 'muv.log', 0, 1, 'C')
    pdf.ln(5)
    pdf.set_font('Helvetica', '', 18)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 10, 'Manual do Sistema', 0, 1, 'C')
    pdf.ln(5)
    pdf.set_font('Helvetica', '', 14)
    pdf.cell(0, 8, 'Guia Completo para Administradores e Estabelecimentos', 0, 1, 'C')
    pdf.ln(20)
    pdf.set_font('Helvetica', '', 12)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 8, 'Versão 1.0', 0, 1, 'C')
    pdf.cell(0, 8, 'Agosto 2026', 0, 1, 'C')
    
    # Table of Contents
    pdf.add_page()
    pdf.chapter_title('Sumário')
    toc = [
        '1. Visão Geral do Sistema',
        '2. Primeiros Passos',
        '3. Painel do Administrador',
        '4. Gerenciamento de Praças',
        '5. Gerenciamento de Estabelecimentos',
        '6. Gerenciamento de Entregadores',
        '7. Gerenciamento de Pedidos',
        '8. Financeiro',
        '9. Configurações',
        '10. Painel do Estabelecimento',
        '11. App do Entregador Próprio',
        '12. Rastreamento em Tempo Real',
        '13. Mapa do Banco de Dados',
        '14. Solução de Problemas',
    ]
    for item in toc:
        pdf.numbered_item(item.split('.')[0], item.split('. ', 1)[1])
    
    # Chapter 1
    pdf.add_page()
    pdf.chapter_title('1. Visão Geral do Sistema')
    pdf.section_title('O que é o muv.log?')
    pdf.body_text('O muv.log é uma plataforma completa de gerenciamento de entregas que conecta administradores, estabelecimentos e entregadores em um único sistema.')
    pdf.body_text('A plataforma permite:')
    pdf.bullet_point('Gerenciar entregadores próprios e da plataforma')
    pdf.bullet_point('Receber e distribuir pedidos automaticamente')
    pdf.bullet_point('Acompanhar entregas em tempo real no mapa')
    pdf.bullet_point('Controlar financeiro de entregadores e estabelecimentos')
    pdf.bullet_point('Configurar preços e tabelas de entrega')
    pdf.bullet_point('Gerar relatórios de desempenho e pagamentos')
    
    pdf.section_title('Hierarquia do Sistema')
    pdf.body_text('muv.log (Plataforma) -> Sua Empresa (Tenant) -> Pracas -> Estabelecimentos -> Entregadores')
    
    pdf.section_title('Tipos de Usuário')
    pdf.table_row(['Tipo', 'O que faz', 'Onde acessa'], True)
    pdf.table_row(['Admin', 'Gerencia tudo', '/admin'])
    pdf.table_row(['Estabelecimento', 'Cria pedidos, gerencia entregadores', '/client'])
    pdf.table_row(['Entregador Próprio', 'Recebe pedidos, atualiza status', '/own-driver'])
    pdf.table_row(['Entregador Plataforma', 'Recebe ofertas, entrega', '/dashboard'])
    
    # Chapter 2
    pdf.add_page()
    pdf.chapter_title('2. Primeiros Passos')
    pdf.section_title('Acessando o Sistema')
    pdf.subsection_title('Como Admin')
    pdf.numbered_item(1, 'Acesse: https://seu-dominio.com/login')
    pdf.numbered_item(2, 'Digite seu email e senha')
    pdf.numbered_item(3, 'Clique em "Entrar"')
    
    pdf.subsection_title('Como Estabelecimento')
    pdf.numbered_item(1, 'Acesse: https://seu-dominio.com/client/login')
    pdf.numbered_item(2, 'Digite o email e senha cadastrados')
    pdf.numbered_item(3, 'Clique em "Entrar"')
    
    pdf.subsection_title('Como Entregador Próprio')
    pdf.numbered_item(1, 'Acesse: https://seu-dominio.com/own-driver/login')
    pdf.numbered_item(2, 'Digite seu telefone e PIN (4 dígitos)')
    pdf.numbered_item(3, 'Clique em "Entrar"')
    
    pdf.section_title('Configuração Inicial (Admin)')
    pdf.subsection_title('Etapa 1: Verificar Praças')
    pdf.numbered_item(1, 'Vá em Praças no menu lateral')
    pdf.numbered_item(2, 'Verifique se as praças da sua região estão cadastradas')
    pdf.numbered_item(3, 'Se não estiverem, clique em "Nova Praça"')
    
    pdf.subsection_title('Etapa 2: Cadastrar Estabelecimentos')
    pdf.numbered_item(1, 'Vá em Estabelecimentos no menu lateral')
    pdf.numbered_item(2, 'Clique em "Novo Estabelecimento"')
    pdf.numbered_item(3, 'Preencha todos os dados obrigatórios')
    
    pdf.subsection_title('Etapa 3: Cadastrar Entregadores')
    pdf.numbered_item(1, 'Vá em Entregadores no menu lateral')
    pdf.numbered_item(2, 'Clique em "Novo Entregador"')
    pdf.numbered_item(3, 'Preencha os dados do entregador')
    
    # Chapter 3
    pdf.add_page()
    pdf.chapter_title('3. Painel do Administrador')
    pdf.section_title('Dashboard')
    pdf.body_text('O Dashboard é a tela principal do Admin e mostra um resumo de todas as atividades:')
    pdf.bullet_point('Total de Pedidos: Quantidade total de pedidos no período')
    pdf.bullet_point('Pedidos Ativos: Pedidos em andamento')
    pdf.bullet_point('Entregadores Online: Quantidade de entregadores disponíveis')
    pdf.bullet_point('Receita Total: Valor total das entregas no período')
    
    pdf.section_title('Menu Lateral')
    pdf.table_row(['Seção', 'O que contém'], True)
    pdf.table_row(['Painel', 'Dashboard com resumo geral'])
    pdf.table_row(['Praças', 'Gerenciamento de regiões'])
    pdf.table_row(['Clientes', 'Lista de estabelecimentos'])
    pdf.table_row(['Entregadores', 'Gerenciamento de entregadores'])
    pdf.table_row(['Pedidos', 'Lista de todos os pedidos'])
    pdf.table_row(['Financeiro', 'Controle financeiro'])
    pdf.table_row(['Configurações', 'Configurações do sistema'])
    
    # Chapter 4
    pdf.add_page()
    pdf.chapter_title('4. Gerenciamento de Praças')
    pdf.section_title('O que é uma Praça?')
    pdf.body_text('Uma Praça é uma região geográfica onde os estabelecimentos e entregadores operam. Cada praça tem preços de entrega próprios, entregadores dedicados e estabelecimentos vinculados.')
    
    pdf.section_title('Criar uma Nova Praça')
    pdf.numbered_item(1, 'Vá em Praças no menu lateral')
    pdf.numbered_item(2, 'Clique em "Nova Praça"')
    pdf.numbered_item(3, 'Preencha: Nome, Cidade, Estado, Preço por km, Distância mínima')
    pdf.numbered_item(4, 'Clique em "Salvar"')
    
    pdf.section_title('Configurações de Preços por Praça')
    pdf.table_row(['Configuração', 'Descrição', 'Exemplo'], True)
    pdf.table_row(['Preço por km', 'Valor cobrado por quilômetro', 'R$ 2,95/km'])
    pdf.table_row(['Distância mínima', 'Distância mínima para cobrança', '4 km'])
    pdf.table_row(['Preço mínimo', 'Valor mínimo do frete', 'R$ 8,00'])
    pdf.table_row(['Preço máximo', 'Valor máximo do frete', 'R$ 50,00'])
    
    # Chapter 5
    pdf.add_page()
    pdf.chapter_title('5. Gerenciamento de Estabelecimentos')
    pdf.section_title('Cadastrar um Estabelecimento')
    pdf.subsection_title('Via Admin (Cadastro Direto)')
    pdf.numbered_item(1, 'Vá em Estabelecimentos no menu lateral')
    pdf.numbered_item(2, 'Clique em "Novo Estabelecimento"')
    pdf.numbered_item(3, 'Preencha: Nome, CNPJ, Telefone, Email, Senha, Endereço, Praça, Tabela de Preços')
    pdf.numbered_item(4, 'Clique em "Salvar"')
    
    pdf.subsection_title('Via Link de Cadastro (Cadastro Público)')
    pdf.numbered_item(1, 'Clique em "Link de Cadastro"')
    pdf.numbered_item(2, 'Copie e envie o link para o estabelecimento')
    pdf.numbered_item(3, 'O estabelecimento preenche o formulário completo')
    pdf.numbered_item(4, 'O cadastro fica pendente até aprovação do Admin')
    
    pdf.section_title('Aprovar um Estabelecimento')
    pdf.numbered_item(1, 'Vá em Estabelecimentos no menu lateral')
    pdf.numbered_item(2, 'Encontre o estabelecimento com status "Pendente"')
    pdf.numbered_item(3, 'Clique em "Aprovar"')
    pdf.numbered_item(4, 'Selecione a Praça e Tabela de Preços')
    pdf.numbered_item(5, 'Clique em "Confirmar"')
    
    # Chapter 6
    pdf.add_page()
    pdf.chapter_title('6. Gerenciamento de Entregadores')
    pdf.section_title('Tipos de Entregadores')
    pdf.table_row(['Tipo', 'Cadastro', 'Login', 'Escopo'], True)
    pdf.table_row(['Plataforma', 'Admin', 'Email + Senha', 'Qualquer estabelecimento'])
    pdf.table_row(['Próprio', 'Estabelecimento', 'Telefone + PIN', 'Um estabelecimento'])
    
    pdf.section_title('Cadastrar Entregador da Plataforma')
    pdf.numbered_item(1, 'Vá em Entregadores no menu lateral')
    pdf.numbered_item(2, 'Clique em "Novo Entregador"')
    pdf.numbered_item(3, 'Preencha: Nome, Email, Senha, Telefone, CPF, Veículo, Placa, CNH, PIX, Praça')
    pdf.numbered_item(4, 'Clique em "Salvar"')
    
    pdf.section_title('Cadastrar Entregador Próprio')
    pdf.numbered_item(1, 'Vá em Meus Entregadores no menu do Estabelecimento')
    pdf.numbered_item(2, 'Clique em "Novo Entregador"')
    pdf.numbered_item(3, 'Preencha: Nome, Telefone, Veículo, Placa, PIN, Frequência de Pagamento')
    pdf.numbered_item(4, 'Clique em "Salvar"')
    
    # Chapter 7
    pdf.add_page()
    pdf.chapter_title('7. Gerenciamento de Pedidos')
    pdf.section_title('Criar um Pedido')
    pdf.numbered_item(1, 'Vá em Novo Pedido no menu do Estabelecimento')
    pdf.numbered_item(2, 'Preencha os dados do cliente e endereço')
    pdf.numbered_item(3, 'Clique em "Calcular Frete" para ver o valor')
    pdf.numbered_item(4, 'Configure o pagamento')
    pdf.numbered_item(5, 'Clique em "Enviar Pedido"')
    
    pdf.section_title('Status dos Pedidos')
    pdf.table_row(['Status', 'Descrição', 'O que fazer'], True)
    pdf.table_row(['Agendado', 'Aguardando tempo de preparo', 'Aguardar'])
    pdf.table_row(['Pendente', 'Pronto para distribuição', 'Atribuir entregador'])
    pdf.table_row(['Oferecido', 'Oferecido a entregador próprio', 'Aguardar aceite'])
    pdf.table_row(['Aceito', 'Aceito por entregador', 'Aguardar coleta'])
    pdf.table_row(['Coletado', 'Coletado pelo entregador', 'Acompanhar entrega'])
    pdf.table_row(['Entregue', 'Entregue ao cliente', 'Concluído'])
    pdf.table_row(['Cancelado', 'Pedido cancelado', '-'])
    
    pdf.section_title('Fluxo de Entrega')
    pdf.subsection_title('Coleta do Pedido')
    pdf.numbered_item(1, 'Entregador chega ao estabelecimento')
    pdf.numbered_item(2, 'Clica em "Iniciar Entrega"')
    pdf.numbered_item(3, 'Digita código de coleta ou tira foto (se configurado)')
    
    pdf.subsection_title('Entrega ao Cliente')
    pdf.numbered_item(1, 'Entregador segue a rota no mapa')
    pdf.numbered_item(2, 'Chega ao endereço de entrega')
    pdf.numbered_item(3, 'Clica em "Entregue"')
    pdf.numbered_item(4, 'Digita código de entrega ou tira foto (se configurado)')
    
    # Chapter 8
    pdf.add_page()
    pdf.chapter_title('8. Financeiro')
    pdf.section_title('Financeiro de Entregadores da Plataforma')
    pdf.bullet_point('Visualizar ganhos por período')
    pdf.bullet_point('Processar pagamentos via PIX')
    pdf.bullet_point('Solicitações de saque')
    
    pdf.section_title('Financeiro de Entregadores Próprios')
    pdf.body_text('Tipos de pagamento disponíveis:')
    pdf.table_row(['Tipo', 'Descrição'], True)
    pdf.table_row(['Por Entrega', 'Valor fixo por entrega'])
    pdf.table_row(['Por Km', 'Valor por quilômetro rodado'])
    pdf.table_row(['Percentual', 'Percentual do frete'])
    pdf.table_row(['Diária', 'Valor fixo por dia'])
    pdf.table_row(['Fixo', 'Valor fixo combinado'])
    pdf.table_row(['Fixo + Entrega', 'Valor fixo + valor por entrega'])
    pdf.table_row(['Fixo (até X) + Extra', 'Fixo até N entregas + extra'])
    
    pdf.section_title('Assinaturas')
    pdf.body_text('Cobrança recorrente pelo uso de entregadores próprios:')
    pdf.bullet_point('Ciclo: Semanal ou Mensal')
    pdf.bullet_point('Preço por entregador por ciclo')
    pdf.bullet_point('Preço fixo por estabelecimento (opcional)')
    pdf.bullet_point('Geração automática de faturas com link PIX')
    
    # Chapter 9
    pdf.add_page()
    pdf.chapter_title('9. Configurações')
    pdf.section_title('Configurações Gerais')
    pdf.bullet_point('Nome da Empresa')
    pdf.bullet_point('Telefone de Contato')
    pdf.bullet_point('Email de Contato')
    pdf.bullet_point('Endereço')
    
    pdf.section_title('Configurações de Entrega')
    pdf.bullet_point('Raio de Coleta: Distância máxima para confirmação de coleta (metros)')
    pdf.bullet_point('Raio de Entrega: Distância máxima para confirmação de entrega (metros)')
    pdf.bullet_point('Tempo de Expiração do Pedido: Tempo para expirar se não aceito (segundos)')
    
    pdf.section_title('Configurações de Pagamento')
    pdf.bullet_point('Chave PIX da empresa para receber pagamentos')
    pdf.bullet_point('Dados Bancários: Banco, Agência, Conta')
    
    # Chapter 10
    pdf.add_page()
    pdf.chapter_title('10. Painel do Estabelecimento')
    pdf.section_title('Funcionalidades')
    pdf.bullet_point('Dashboard com pedidos ativos e mapa')
    pdf.bullet_point('Criar novos pedidos')
    pdf.bullet_point('Visualizar e gerenciar pedidos')
    pdf.bullet_point('Gerenciar entregadores próprios')
    pdf.bullet_point('Financeiro e pagamentos')
    pdf.bullet_point('Integrações com plataformas externas')
    
    # Chapter 11
    pdf.add_page()
    pdf.chapter_title('11. App do Entregador Próprio')
    pdf.section_title('Login')
    pdf.numbered_item(1, 'Acesse: https://seu-dominio.com/own-driver/login')
    pdf.numbered_item(2, 'Digite seu telefone')
    pdf.numbered_item(3, 'Digite seu PIN (4 dígitos)')
    pdf.numbered_item(4, 'Clique em "Entrar"')
    
    pdf.section_title('Funcionalidades')
    pdf.bullet_point('Ficar Online/Offline')
    pdf.bullet_point('Aceitar/Rejeitar pedidos')
    pdf.bullet_point('Fluxo de entrega (coleta -> entrega)')
    pdf.bullet_point('Visualizar ganhos')
    pdf.bullet_point('Solicitar saque')
    pdf.bullet_point('Configurar Chave PIX')
    pdf.bullet_point('Visualizar rotas com múltiplos pedidos')
    
    # Chapter 12
    pdf.add_page()
    pdf.chapter_title('12. Rastreamento em Tempo Real')
    pdf.section_title('Mapa de Rastreamento')
    pdf.body_text('O mapa mostra:')
    pdf.bullet_point('Estabelecimento: Marcador do restaurante')
    pdf.bullet_point('Entregadores: Marcadores dos entregadores online')
    pdf.bullet_point('Destinos: Marcadores dos endereços de entrega')
    pdf.bullet_point('Rotas: Linhas conectando entregadores aos destinos')
    
    pdf.section_title('Rastreamento por Link')
    pdf.body_text('Para cada pedido, é gerado um link de rastreamento:')
    pdf.numbered_item(1, 'O cliente recebe o link por WhatsApp')
    pdf.numbered_item(2, 'O cliente acessa o link e vê a localização do entregador')
    pdf.numbered_item(3, 'O link mostra o status do pedido e a rota')
    
    # Chapter 13
    pdf.add_page()
    pdf.chapter_title('13. Mapa do Banco de Dados')
    pdf.section_title('Funcionalidades')
    pdf.bullet_point('Visualizar todos os dados do sistema')
    pdf.bullet_point('Editar dados diretamente')
    pdf.bullet_point('Excluir dados (com confirmação)')
    pdf.bullet_point('Gerar PDF do relatório')
    pdf.bullet_point('Exportar dados em JSON')
    pdf.bullet_point('Limpar dados de teste')
    
    # Chapter 14
    pdf.add_page()
    pdf.chapter_title('14. Solução de Problemas')
    pdf.section_title('Login não funciona')
    pdf.bullet_point('Verifique email e senha')
    pdf.bullet_point('Verifique se o usuário está ativo')
    pdf.bullet_point('Limpe o cache do navegador (Ctrl+Shift+R)')
    
    pdf.section_title('Pedido não aparece')
    pdf.bullet_point('Verifique se foi criado com sucesso')
    pdf.bullet_point('Atualize a página (F5)')
    pdf.bullet_point('Verifique os filtros de status')
    
    pdf.section_title('Entregador não recebe pedidos')
    pdf.bullet_point('Verifique se está online')
    pdf.bullet_point('Verifique se está na praça correta')
    pdf.bullet_point('Verifique se não está bloqueado')
    
    pdf.section_title('Frete calculado errado')
    pdf.bullet_point('Verifique a tabela de preços')
    pdf.bullet_point('Verifique o preço por km da praça')
    pdf.bullet_point('Use "Calcular Frete" para ver detalhes')
    
    pdf.section_title('Mapa não mostra entregadores')
    pdf.bullet_point('Verifique se o entregador está online')
    pdf.bullet_point('Verifique se permitiu acesso à localização')
    pdf.bullet_point('Aguarde alguns segundos para atualização')
    
    # Glossary
    pdf.add_page()
    pdf.chapter_title('Glossário')
    pdf.table_row(['Termo', 'Definição'], True)
    pdf.table_row(['Praça', 'Região geográfica de operação'])
    pdf.table_row(['Tenant', 'Empresa que usa o sistema'])
    pdf.table_row(['Entregador Próprio', 'Trabalha para um estabelecimento'])
    pdf.table_row(['Entregador Plataforma', 'Recebe pedidos de qualquer um'])
    pdf.table_row(['PIN', 'Código de 4 dígitos para login'])
    pdf.table_row(['Frete', 'Valor cobrado pela entrega'])
    pdf.table_row(['Tabela de Preços', 'Configuração de preços'])
    pdf.table_row(['Roteirização', 'Agrupamento de pedidos em rota'])
    pdf.table_row(['Assinatura', 'Cobrança recorrente'])
    pdf.table_row(['Fatura', 'Documento de cobrança'])
    pdf.table_row(['PIX', 'Sistema de pagamentos instantâneos'])
    
    # Save
    pdf.output('docs/MANUAL_DO_SISTEMA.pdf')
    print('PDF gerado: docs/MANUAL_DO_SISTEMA.pdf')

if __name__ == '__main__':
    create_manual()
