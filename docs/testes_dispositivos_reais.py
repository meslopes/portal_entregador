"""Gera PDF com testes que exigem dispositivos reais — Portal Entregador (MuvLog)"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)

W, H = A4

doc = SimpleDocTemplate(
    "TESTES_DISPOSITIVOS_REAIS.pdf",
    pagesize=A4,
    leftMargin=15 * mm,
    rightMargin=15 * mm,
    topMargin=20 * mm,
    bottomMargin=20 * mm,
    title="Testes que Exigem Dispositivos Reais — Portal Entregador",
    author="MuvLog",
)

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "CustomTitle",
    parent=styles["Title"],
    fontSize=18,
    leading=22,
    spaceAfter=6 * mm,
    textColor=colors.HexColor("#1e293b"),
)
subtitle_style = ParagraphStyle(
    "CustomSubtitle",
    parent=styles["BodyText"],
    fontSize=11,
    leading=14,
    spaceAfter=8 * mm,
    textColor=colors.HexColor("#475569"),
)
section_style = ParagraphStyle(
    "SectionTitle",
    parent=styles["Heading2"],
    fontSize=14,
    leading=18,
    spaceBefore=8 * mm,
    spaceAfter=4 * mm,
    textColor=colors.HexColor("#1e40af"),
)
body_style = ParagraphStyle(
    "CustomBody",
    parent=styles["BodyText"],
    fontSize=10,
    leading=14,
    spaceAfter=3 * mm,
)
note_style = ParagraphStyle(
    "Note",
    parent=styles["BodyText"],
    fontSize=9,
    leading=12,
    textColor=colors.HexColor("#64748b"),
    spaceAfter=2 * mm,
)

story = []

# Título
story.append(Paragraph("Testes que Exigem Dispositivos Reais", title_style))
story.append(Paragraph(
    "Portal Entregador (muv.log) — Roteiro de Testes Manuais<br/>"
    "Data: 20/09/2026 &nbsp;|&nbsp; Ambiente: Produção (portal-entregador-gamma.vercel.app)",
    subtitle_style,
))
story.append(Paragraph(
    "Os testes abaixo NÃO podem ser executados via automação de API ou browser desktop. "
    "Requerem dispositivos físicos (smartphones Android/iOS) para validar corretamente.",
    body_style,
))
story.append(Spacer(1, 4 * mm))

# Helper para criar tabela
def make_table(data, col_widths=None):
    if col_widths is None:
        col_widths = [12 * mm, 55 * mm, 80 * mm, 33 * mm]
    tbl = Table(data, hAlign="LEFT", colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tbl

header = ["#", "Teste", "Passos", "Dispositivo"]

# Seção 10 — PWA e Offline
story.append(Paragraph("10. PWA e Offline", section_style))
story.append(Paragraph(
    "Testam a instalação do PWA, modo offline e sincronização. "
    "Requerem navegadores mobile reais (Chrome Android, Safari iOS).",
    note_style,
))

data10 = [
    header,
    ["10.1", "Instalar como app (Android)",
     "Chrome → menu (⋮) → 'Adicionar à tela inicial' → confirmar. "
     "Verificar se o ícone aparece na home screen e abre sem a barra do navegador.",
     "Android"],
    ["10.2", "Instalar como app (iPhone)",
     "Safari → compartilhar (□↑) → 'Adicionar à Tela de Início' → confirmar. "
     "Verificar se o ícone aparece e abre em tela cheia.",
     "iPhone"],
    ["10.3", "Instalar como app (Desktop)",
     "Chrome → ícone de instalar na barra de endereço → confirmar. "
     "Verificar se abre em janela separada.",
     "Desktop"],
    ["10.4", "App abre sem barra do navegador",
     "Abra o app instalado (não o navegador). "
     "Verificar que NÃO mostra barra de URL/navegação do browser.",
     "Todos"],
    ["10.5", "Modo avião — ver pedidos",
     "Abra o app → ative modo avião no celular → navegue até pedidos. "
     "Deve mostrar pedidos já carregados (cache).",
     "Android/iOS"],
    ["10.6", "Modo avião — aceitar pedido",
     "Com modo avião ativo → tente aceitar um pedido. "
     "Deve salvar localmente e sincronizar quando voltar a internet.",
     "Android/iOS"],
    ["10.7", "Internet volta — sincronize",
     "Desative modo avião. O app deve sincronizar automaticamente "
     "as ações feitas offline (aceitar pedido, atualizar status).",
     "Android/iOS"],
]
story.append(make_table(data10))

# Seção 11 — Responsividade Mobile
story.append(Paragraph("11. Responsividade Mobile", section_style))
story.append(Paragraph(
    "Testam a adaptação da interface para telas pequenas. "
    "Requerem smartphones reais ou DevTools com emulação precisa.",
    note_style,
))

data11 = [
    header,
    ["11.1", "Login cabe na tela",
     "Abra a página de login no celular. "
     "Verificar que NÃO aparece scroll horizontal e todos os campos são visíveis.",
     "Android/iOS"],
    ["11.2", "Dashboard admin mobile",
     "Abra o dashboard admin no celular. "
     "A sidebar deve colapsar automaticamente e o conteúdo deve se adaptar.",
     "Android/iOS"],
    ["11.3", "Toggle sidebar",
     "Toque no botão de filtro/Menu no mobile. "
     "A sidebar deve abrir e fechar corretamente.",
     "Android/iOS"],
    ["11.4", "Menu mobile",
     "Toque no menu hamburguer (☰). "
     "Deve mostrar TODOS os itens de navegação acessíveis.",
     "Android/iOS"],
    ["11.5", "Mapa interativo",
     "Dê zoom (pinça) e pan (arraste) no mapa. "
     "Deve funcionar suavemente sem travar.",
     "Android/iOS"],
    ["11.6", "Formulários",
     "Preencha um formulário de pedido no celular. "
     "Campos NÃO devem sobrepor uns aos outros.",
     "Android/iOS"],
    ["11.7", "Botões clicáveis",
     "Toque em todos os botões visíveis. "
     "Devem ser grandes o suficiente para toque (mínimo 44×44px).",
     "Android/iOS"],
]
story.append(make_table(data11))

# Seção 5.2 — GPS e Localização
story.append(Paragraph("5.2. Status Online/Offline + GPS", section_style))
story.append(Paragraph(
    "Testam o GPS real do dispositivo e a atualização de posição. "
    "Requerem smartphone com GPS ativo.",
    note_style,
))

data52 = [
    header,
    ["5.2.2", "Atualizar GPS em movimento",
     "Com o app aberto e online → ande ou dirija com o celular. "
     "A posição no mapa do admin deve atualizar em tempo real.",
     "Android/iOS"],
    ["5.2.4", "Admin vê entregador no mapa",
     "Em outro dispositivo (desktop), abra o dashboard admin. "
     "O marcador do entregador deve aparecer e se mover no mapa.",
     "2 dispositivos"],
    ["5.4.4", "Confirmar coleta (foto)",
     "No app do entregador → tire foto da embalagem ao coletar. "
     "A foto deve ser salva e visível no pedido.",
     "Android/iOS"],
    ["5.4.7", "Confirmar entrega (foto)",
     "No app do entregador → tire foto de prova de entrega. "
     "A foto deve ser salva e visível para o estabelecimento.",
     "Android/iOS"],
    ["5.4.8", "Foto de prova visível",
     "No app do estabelecimento → abra o pedido entregue. "
     "A foto de prova de entrega deve aparecer na tela.",
     "Android/iOS"],
]
story.append(make_table(data52))

# Seção 5.3 — Notificações Push
story.append(Paragraph("5.3 / 7. Notificações Push", section_style))
story.append(Paragraph(
    "Testam notificações push reais (vibração, som, exibição). "
    "Requerem smartphone com permissões de notificação concedidas.",
    note_style,
))

data7 = [
    header,
    ["5.3.1", "Receber oferta de pedido",
     "Admin crie um pedido e chame entregadores. "
     "O entregador deve receber notificação push com vibração e som de sirene.",
     "Android/iOS"],
    ["5.3.5", "Som de sirene",
     "Ao receber oferta de pedido, o som da sirene deve tocar alto "
     "mesmo com o celular em modo silencioso (se permitido).",
     "Android/iOS"],
    ["7.1", "Push de novo pedido",
     "Admin crie pedido → entregador online deve receber push notification. "
     "Deve vibrar e mostrar na barra de status.",
     "Android/iOS"],
    ["7.2", "Push com app fechado",
     "Feche o app completamente → admin crie pedido → verifique. "
     "A notificação deve aparecer na barra de status do sistema.",
     "Android/iOS"],
    ["7.6", "Push cadastro pendente",
     "Novo entregador se cadastre → admin deve receber push "
     "notificando sobre cadastro pendente de aprovação.",
     "Android/iOS"],
]
story.append(make_table(data7))

# Seção 5.4 — Navegação externa
story.append(Paragraph("5.4. Navegação Externa", section_style))
story.append(Paragraph(
    "Testam a abertura de apps de navegação (Google Maps, Waze). "
    "Requerem smartphone com esses apps instalados.",
    note_style,
))

data54 = [
    header,
    ["5.4.1", "Navegar até restaurante",
     "Com pedido aceito → toque em 'Navegar'. "
     "Deve abrir Google Maps ou Waze com a rota até o restaurante.",
     "Android/iOS"],
    ["5.4.5", "Navegar até cliente",
     "Após coleta → toque em 'Navegar'. "
     "Deve abrir Google Maps ou Waze com a rota até o cliente.",
     "Android/iOS"],
]
story.append(make_table(data54))

# Seção 5.7 — Testes de esforço mobile
story.append(Paragraph("5.7. Testes de Esforço — Entregador (Mobile)", section_style))

data57 = [
    header,
    ["5.7.1", "Aceitar sem internet",
     "Desconecte Wi-Fi/dados → tente aceitar pedido. "
     "Deve salvar offline e sincronizar quando voltar.",
     "Android/iOS"],
    ["5.7.2", "Internet volta",
     "Reconecte Wi-Fi/dados. "
     "O app deve sincronizar automaticamente as ações pendentes.",
     "Android/iOS"],
    ["5.7.4", "GPS desligado",
     "Desligue GPS nas configurações → tente atualizar posição. "
     "Deve tratar sem crashar, mostrando mensagem amigável.",
     "Android/iOS"],
    ["5.7.5", "Confirmar entrega sem estar no local",
     "Tente confirmar entrega de longe (sem estar no endereço). "
     "Deve bloquear se raio de validação estiver ativo.",
     "Android/iOS"],
]
story.append(make_table(data57))

# Seção 12 — Multi-tenant (isolamento)
story.append(Paragraph("12. Multi-Tenant — Isolamento (Multi-dispositivo)", section_style))
story.append(Paragraph(
    "Testam o isolamento de dados entre tenants. "
    "Requerem pelo menos 2 dispositivos com logins diferentes.",
    note_style,
))

data12 = [
    header,
    ["12.1", "Admin vê só seus dados",
     "Dispositivo A: login como admin do Tenant A. "
     "Deve ver APENAS dados do Tenant A, nada do Tenant B.",
     "2 dispositivos"],
    ["12.2", "Entregador vê pedidos do seu tenant",
     "Dispositivo B: login como entregador do Tenant A. "
     "Deve ver APENAS pedidos do Tenant A.",
     "2 dispositivos"],
    ["12.3", "Estabelecimento vê seus pedidos",
     "Dispositivo C: login como estabelecimento do Tenant B. "
     "Deve ver APENAS pedidos do Tenant B.",
     "2 dispositivos"],
    ["12.4", "Cross-tenant (tentar acessar)",
     "Dispositivo A: tente acessar pedido do Tenant B via URL direta. "
     "Deve bloquear ou redirecionar.",
     "2 dispositivos"],
]
story.append(make_table(data12))

# Seção 13 — Performance
story.append(Paragraph("13. Performance e Estabilidade (Multi-dispositivo)", section_style))

data13 = [
    header,
    ["13.1", "50 pedidos de uma vez",
     "Crie 50 pedidos rapidamente (script ou manual). "
     "O sistema deve aguentar sem crashar ou travar.",
     "Desktop + Mobile"],
    ["13.2", "20 entregadores online",
     "Coloque 20 entregadores online simultaneamente. "
     "O mapa do admin deve aguentar todos os marcadores.",
     "20 dispositivos"],
    ["13.5", "Aba aberta por 1h",
     "Deixe o app aberto por 1 hora sem interação. "
     "Deve continuar funcionando (sem crash de memória).",
     "Android/iOS"],
    ["13.6", "Múltiplas abas",
     "Abra o sistema em 3 abas/dispositivos diferentes. "
     "Todas devem funcionar independentemente.",
     "3 dispositivos"],
]
story.append(make_table(data13))

# Rodapé
story.append(Spacer(1, 10 * mm))
story.append(Paragraph(
    "Total de testes que exigem dispositivos reais: <b>35 testes</b>",
    ParagraphStyle("FooterBold", parent=body_style, fontSize=11, textColor=colors.HexColor("#1e40af")),
))
story.append(Spacer(1, 4 * mm))
story.append(Paragraph(
    "Dispositivos mínimos recomendados: 1 Android + 1 iPhone + 1 Desktop (Chrome). "
    "Para testes de multi-tenant e performance: mínimo 3 dispositivos.",
    note_style,
))

doc.build(story)
print("PDF gerado: TESTES_DISPOSITIVOS_REAIS.pdf")
