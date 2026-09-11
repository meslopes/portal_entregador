# -*- coding: utf-8 -*-
"""Gera o PDF do Plano MuvScore - Sistema de Ranking e Gamificação"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Cores do projeto
PRIMARY = colors.HexColor("#2563eb")
DARK = colors.HexColor("#1e293b")
GRAY = colors.HexColor("#64748b")
LIGHT_BG = colors.HexColor("#f8fafc")
GREEN = colors.HexColor("#16a34a")
AMBER = colors.HexColor("#d97706")
RED = colors.HexColor("#dc2626")

def build_pdf(output_path="Plano_MuvScore.pdf"):
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="Plano MuvScore - Sistema de Ranking e Gamificação",
        author="MuvLog - Portal Entregador"
    )

    styles = getSampleStyleSheet()

    # Estilos customizados
    title_style = ParagraphStyle("CustomTitle", parent=styles["Title"],
        fontSize=22, textColor=PRIMARY, spaceAfter=6*mm, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"],
        fontSize=11, textColor=GRAY, alignment=TA_CENTER, spaceAfter=8*mm)
    h1_style = ParagraphStyle("H1", parent=styles["Heading1"],
        fontSize=16, textColor=PRIMARY, spaceBefore=8*mm, spaceAfter=4*mm)
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"],
        fontSize=13, textColor=DARK, spaceBefore=6*mm, spaceAfter=3*mm)
    body_style = ParagraphStyle("Body", parent=styles["BodyText"],
        fontSize=10, leading=14, textColor=DARK, spaceAfter=3*mm)
    bullet_style = ParagraphStyle("Bullet", parent=body_style,
        leftIndent=8*mm, bulletIndent=3*mm, spaceAfter=2*mm)
    small_style = ParagraphStyle("Small", parent=body_style,
        fontSize=9, textColor=GRAY)

    story = []

    # === CAPA ===
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph("MUVLOG", ParagraphStyle("Logo", parent=title_style,
        fontSize=28, textColor=PRIMARY)))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph("Plano MuvScore", title_style))
    story.append(Paragraph("Sistema de Ranking e Gamificação para Entregadores", subtitle_style))
    story.append(HRFlowable(width="60%", thickness=2, color=PRIMARY, spaceAfter=8*mm))
    story.append(Paragraph("Versão 1.1 — Setembro 2026", small_style))
    story.append(Paragraph("Portal Entregador (MuvLog) — Delivery SaaS Multi-tenant", small_style))
    story.append(Spacer(1, 20*mm))

    # Sumário
    story.append(Paragraph("Sumário", h2_style))
    sumario = [
        "1. Contexto e Problema",
        "2. Referências do Mercado",
        "3. Modelo MuvScore — Eixos de Pontuação",
        "4. Níveis e Benefícios",
        "5. Configurações do Admin",
        "6. Modelo de Dados",
        "7. Fluxo de Cálculo",
        "8. Telas Propostas",
        "9. Sistema de Premiação Semanal",
        "10. Plano de Implementação",
    ]
    for item in sumario:
        story.append(Paragraph(item, bullet_style))
    story.append(PageBreak())

    # === 1. CONTEXTO ===
    story.append(Paragraph("1. Contexto e Problema", h1_style))
    story.append(Paragraph(
        "O sistema atual de avaliação dos entregadores apresenta dois problemas fundamentais:",
        body_style))
    story.append(Paragraph(
        "<b>Injustiça na nota inicial:</b> Entregadores começam com rating 5.0 (default). "
        "Um entregador sem nenhuma entrega aparece com a mesma nota de um entregador veterano "
        "com centenas de entregas e avaliação 4.8. Se um entregador fizer uma entrega e for mal "
        "avaliado, ele ficará abaixo no ranking de quem nunca entregou.",
        bullet_style))
    story.append(Paragraph(
        "<b>Ranking unidimensional:</b> O ranking atual ordena apenas por volume de entregas "
        "(últimos 30 dias), ignorando completamente a qualidade do serviço. Um entregador com "
        "50 entregas e nota 2.0 fica na frente de um com 40 entregas e nota 5.0.",
        bullet_style))
    story.append(Paragraph(
        "Este plano propõe um sistema abrangente de pontuação que reconhece múltiplos "
        "aspectos da performance do entregador, criando uma competição saudável e justa.",
        body_style))

    # === 2. REFERÊNCIAS ===
    story.append(Paragraph("2. Referências do Mercado", h1_style))
    ref_data = [
        ["Plataforma", "Sistema", "Critérios principais"],
        ["iFood", "Níveis (Bronze→Diamante)", "Taxa de aceite, conclusão, avaliação, horários de pico, dias especiais"],
        ["Uber", "Status (Blue→Diamond)", "Avaliação, taxa de aceite, cancelamento, pontos por corrida"],
        ["99", "Níveis + Missões", "Entregas por período, bônus em horários de pico"],
        ["Rappi", "Níveis + Desafios", "Entregas concluídas, avaliação, presença em horários"],
    ]
    ref_table = Table(ref_data, colWidths=[3*cm, 4*cm, 9*cm])
    ref_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ref_table)
    story.append(PageBreak())

    # === 3. EIXOS DE PONTUAÇÃO ===
    story.append(Paragraph("3. Modelo MuvScore — Eixos de Pontuação", h1_style))
    story.append(Paragraph(
        "O sistema utiliza <b>10 eixos</b> de pontuação que avaliam diferentes aspectos "
        "da performance do entregador. Cada eixo pode ser configurado pelo admin.",
        body_style))

    pts_data = [
        ["#", "Eixo", "Descrição", "Exemplo"],
        ["1", "Entregas concluídas", "Pontos por entrega finalizada", "+10 pts/entrega"],
        ["2", "Avaliação recebida", "Bônus proporcional à nota do estabelecimento",
         "5★=+20 | 4★=+10 | 3★=+5\n2★=-5 | 1★=-15"],
        ["3", "Dia especial", "Admin marca dia (chuva, feriado, alta demanda)", "+15 pts/entrega (bônus)"],
        ["4", "Horário de pico", "Faixas horárias configuráveis pelo admin", "+8 pts/entrega"],
        ["5", "Tempo online", "Horas logado e disponível para entregas", "+2 pts/hora"],
        ["6", "Taxa de aceite", "% de pedidos aceitos vs ofertados",
         ">90%=+30/dia | <70%=-20/dia"],
        ["7", "Taxa de conclusão", "% de entregas concluídas sem cancelar",
         ">95%=+25/dia | <80%=-30/dia"],
        ["8", "Pontualidade", "Entregas dentro do prazo estimado", "+5 pts/entrega no prazo"],
        ["9", "Sequência (streak)", "Dias consecutivos trabalhando",
         "+5/dia | streak 7d=+50 bônus"],
        ["10", "Multi-entrega", "Rotas com mais de 1 pedido", "+3 pts por pedido extra"],
    ]
    pts_table = Table(pts_data, colWidths=[0.8*cm, 3*cm, 5.5*cm, 6.5*cm])
    pts_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(pts_table)
    story.append(PageBreak())

    # === 4. NÍVEIS ===
    story.append(Paragraph("4. Níveis e Benefícios", h1_style))
    story.append(Paragraph(
        "Os entregadores são classificados em 4 níveis com base nos pontos acumulados "
        "na semana. Cada nível desbloqueia benefícios progressivos.",
        body_style))

    lvl_data = [
        ["Nível", "Pontos/semana", "Benefícios"],
        ["Bronze", "0 — 99", "Acesso básico ao sistema"],
        ["Prata", "100 — 499", "Prioridade em pedidos de maior valor"],
        ["Ouro", "500 — 999", "Prioridade em alguns estabelecimentos, prioridade em pedidos de maior valor, badge dourado"],
        ["Diamante", "1.000+", "Prioridade máxima, badge especial"],
    ]
    lvl_colors = [None, colors.HexColor("#CD7F32"), colors.HexColor("#C0C0C0"),
                  colors.HexColor("#FFD700"), colors.HexColor("#B9F2FF")]
    lvl_table = Table(lvl_data, colWidths=[3*cm, 3*cm, 9.5*cm])
    lvl_style = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]
    for i, c in enumerate(lvl_colors[1:], 1):
        if c:
            lvl_style.append(("BACKGROUND", (0, i), (0, i), c))
            lvl_style.append(("TEXTCOLOR", (0, i), (0, i), colors.white))
            lvl_style.append(("FONTNAME", (0, i), (0, i), "Helvetica-Bold"))
    lvl_table.setStyle(TableStyle(lvl_style))
    story.append(lvl_table)

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Observação: o percentual de pagamento do entregador pode ser "
        "individual, determinado pelo admin. O driver_percentage pode variar entre "
        "entregadores dentro da mesma praça/tenant.", small_style))
    story.append(PageBreak())

    # === 5. CONFIGURAÇÕES DO ADMIN ===
    story.append(Paragraph("5. Configurações do Admin", h1_style))
    story.append(Paragraph(
        "Todos os parâmetros do sistema de pontos são configuráveis pelo admin "
        "na página de Configurações > Ranking.",
        body_style))

    cfg_data = [
        ["Configuração", "Campo", "Default", "Descrição"],
        ["Pontos por entrega", "points_per_delivery", "10", "Base de pontos por entrega concluída"],
        ["Multiplicador dia especial", "special_day_multiplier", "1.5x", "Bônus em dias marcados como especiais"],
        ["Multiplicador horário de pico", "peak_hour_multiplier", "1.3x", "Bônus em faixas horárias de pico"],
        ["Pontos por hora online", "points_per_hour_online", "2", "Pontos por hora logado e disponível"],
        ["Bônus streak 7 dias", "streak_bonus_7_days", "50", "Bônus por 7 dias consecutivos trabalhando"],
        ["Faixas de pico", "peak_hours", "11-14h, 18-21h", "Horários com pontuação diferenciada"],
        ["Avaliação mínima bônus", "min_rating_for_bonus", "3.0", "Nota mínima para receber bônus de avaliação"],
        ["Entregas mínimas ranking", "min_deliveries_ranking", "5", "Mínimo de entregas para aparecer no ranking"],
    ]
    cfg_table = Table(cfg_data, colWidths=[3.8*cm, 4*cm, 2.2*cm, 5.5*cm])
    cfg_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(cfg_table)

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Dias Especiais", h2_style))
    story.append(Paragraph(
        "O admin pode marcar dias como especiais (chuva, feriado, alta demanda, evento). "
        "Cada dia especial tem um multiplicador de pontos. Entregadores que trabalharem "
        "nesses dias recebem bônus proporcional.",
        body_style))
    story.append(Paragraph("Exemplo: Dia de chuva (1.5x) → entrega vale 15 pts em vez de 10.", bullet_style))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Horários de Pico", h2_style))
    story.append(Paragraph(
        "Faixas horárias configuráveis onde a demanda é maior. Entregas realizadas "
        "dentro desses horários recebem multiplicador de pontos.",
        body_style))
    story.append(Paragraph("Exemplo: 11h-14h (1.3x) e 18h-21h (1.5x).", bullet_style))
    story.append(PageBreak())

    # === 6. MODELO DE DADOS ===
    story.append(Paragraph("6. Modelo de Dados", h1_style))
    story.append(Paragraph(
        "Novas tabelas necessárias no banco de dados:",
        body_style))

    story.append(Paragraph("driver_points_log", h2_style))
    db1 = [
        ["Campo", "Tipo", "Descrição"],
        ["id", "INTEGER PK", "Auto-incremento"],
        ["driver_id", "INTEGER FK", "Referência ao entregador"],
        ["points", "INTEGER", "Pontos ganhos (positivo) ou perdidos (negativo)"],
        ["reason", "VARCHAR(50)", "Tipo: delivery, rating, special_day, peak_hour, streak, etc."],
        ["order_id", "INTEGER FK (null)", "Referência ao pedido, se aplicável"],
        ["created_at", "TIMESTAMP", "Data/hora do registro"],
    ]
    t1 = Table(db1, colWidths=[3*cm, 3.5*cm, 9*cm])
    t1.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t1)

    story.append(Paragraph("special_days", h2_style))
    db2 = [
        ["Campo", "Tipo", "Descrição"],
        ["id", "INTEGER PK", "Auto-incremento"],
        ["tenant_id", "INTEGER FK", "Organização"],
        ["date", "DATE", "Data do dia especial"],
        ["reason", "VARCHAR(100)", "Motivo: chuva, feriado, alta_demand, evento"],
        ["multiplier", "NUMERIC(3,2)", "Multiplicador de pontos (ex: 1.50)"],
    ]
    t2 = Table(db2, colWidths=[3*cm, 3.5*cm, 9*cm])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t2)

    story.append(Paragraph("peak_hours", h2_style))
    db3 = [
        ["Campo", "Tipo", "Descrição"],
        ["id", "INTEGER PK", "Auto-incremento"],
        ["tenant_id", "INTEGER FK", "Organização"],
        ["start_time", "TIME", "Início do horário de pico"],
        ["end_time", "TIME", "Fim do horário de pico"],
        ["multiplier", "NUMERIC(3,2)", "Multiplicador (ex: 1.30)"],
        ["is_active", "BOOLEAN", "Se está ativo"],
    ]
    t3 = Table(db3, colWidths=[3*cm, 3.5*cm, 9*cm])
    t3.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t3)
    story.append(PageBreak())

    # === 7. FLUXO DE CÁLCULO ===
    story.append(Paragraph("7. Fluxo de Cálculo", h1_style))
    story.append(Paragraph(
        "Quando uma entrega é concluída, o sistema calcula os pontos seguindo este fluxo:",
        body_style))
    steps = [
        "Entrega concluída → calcula pontos base (configurável, default 10)",
        "Verifica se é dia especial → aplica multiplicador (ex: 1.5x em dia de chuva)",
        "Verifica se é horário de pico → aplica multiplicador (ex: 1.3x entre 11h-14h)",
        "Multiplicadores são acumulativos (dia especial + pico = 1.5 × 1.3 = 1.95x)",
        "Quando estabelecimento avalia → ajusta pontos (5★=+20, 1★=-15)",
        "Registra em driver_points_log com reason detalhada",
        "Atualiza total mensal do entregador",
        "Recalcula nível (Bronze/Prata/Ouro/Diamante)",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"<b>{i}.</b> {step}", bullet_style))

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Exemplo prático:", h2_style))
    ex_data = [
        ["Ação", "Cálculo", "Pontos"],
        ["Entrega concluída", "Base", "+10"],
        ["Dia de chuva (1.5x)", "10 × 1.5", "+15"],
        ["Horário de pico (1.3x)", "10 × 1.3", "+13"],
        ["Avaliação 5★ do estabelecimento", "Bônus fixo", "+20"],
        ["No prazo", "Bônus fixo", "+5"],
        ["TOTAL", "", "63 pts"],
    ]
    ex_table = Table(ex_data, colWidths=[5*cm, 4*cm, 3*cm])
    ex_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#dcfce7")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ex_table)
    story.append(PageBreak())

    # === 8. TELAS PROPOSTAS ===
    story.append(Paragraph("8. Telas Propostas", h1_style))

    story.append(Paragraph("8.1 Dashboard do Entregador", h2_style))
    story.append(Paragraph(
        "O entregador visualiza seu MuvScore, nível atual, ranking na praça e "
        "detalhamento dos pontos do dia/mês.",
        body_style))
    dash_items = [
        "MuvScore atual com barra de progresso para próximo nível",
        "Nível atual (Bronze/Prata/Ouro/Diamante) com badge visual",
        "Posição no ranking da praça",
        "Pontos do dia detalhados por eixo",
        "Histórico semanal de pontos",
        "Dias especiais e horários de pico ativos",
        "Premiação semanal recebida e posição no ranking",
    ]
    for item in dash_items:
        story.append(Paragraph(f"• {item}", bullet_style))

    story.append(Paragraph("8.2 Painel do Admin — Ranking", h2_style))
    admin_items = [
        "Lista de entregadores ordenada por MuvScore",
        "Filtros por período, praça, nível",
        "Botão para marcar dia especial (com data, motivo e multiplicador)",
        "Configuração de horários de pico",
        "Gráfico de distribuição de níveis",
        "Exportação de relatório de ranking",
    ]
    for item in admin_items:
        story.append(Paragraph(f"• {item}", bullet_style))

    story.append(Paragraph("8.3 Página de Ranking (Entregador)", h2_style))
    rank_items = [
        "Top 10 da praça com avatar, nome, pontos e nível",
        "Posição do entregador logado destacada",
        "Filtro por período (semana/mês)",
        "Conquistas e badges desbloqueados",
    ]
    for item in rank_items:
        story.append(Paragraph(f"• {item}", bullet_style))
    story.append(PageBreak())

    # === 9. SISTEMA DE PREMIAÇÃO SEMANAL ===
    story.append(Paragraph("9. Sistema de Premiação Semanal", h1_style))
    story.append(Paragraph(
        "Os 5% destinados à gamificação formam um <b>pool de premiação semanal</b> "
        "que é distribuído aos entregadores melhor rankeados. O sistema é auto-sustentável: "
        "nunca paga mais do que arrecada.",
        body_style))

    story.append(Paragraph("9.1 Como o Pool é Formado", h2_style))
    story.append(Paragraph(
        "A cada entrega concluída, 5% do valor do frete é reservado para o pool de gamificação. "
        "No domingo à noite, o pool da semana é calculado e distribuído proporcionalmente.",
        body_style))

    pool_ex = [
        ["Exemplo Semanal", "Valor"],
        ["Total de fretes da semana", "R$ 10.000,00"],
        ["5% destinado à gamificação", "R$ 500,00"],
        ["Pool disponível para premiação", "R$ 500,00"],
    ]
    pool_tbl = Table(pool_ex, colWidths=[8*cm, 5*cm])
    pool_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AMBER),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#fef3c7")),
    ]))
    story.append(pool_tbl)

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("9.2 Distribuição por Posição no Ranking", h2_style))
    story.append(Paragraph(
        "O pool é dividido em percentuais fixos por posição. Os percentuais são aplicados "
        "sobre o total do pool — se houver menos entregadores elegíveis, o valor restante "
        "acumula para a semana seguinte.",
        body_style))

    dist_data = [
        ["Posição", "% do Pool", "Exemplo (pool R$500)", "Condição"],
        ["1º lugar", "15%", "R$ 75,00", "Mín. 5 entregas na semana"],
        ["2º lugar", "10%", "R$ 50,00", "Mín. 5 entregas na semana"],
        ["3º lugar", "8%", "R$ 40,00", "Mín. 5 entregas na semana"],
        ["4º ao 5º", "6% cada (12% total)", "R$ 30,00 cada", "Mín. 5 entregas na semana"],
        ["6º ao 10º", "4% cada (20% total)", "R$ 20,00 cada", "Mín. 5 entregas na semana"],
        ["11º ao 20º", "2% cada (20% total)", "R$ 10,00 cada", "Mín. 5 entregas na semana"],
        ["21º ao 30º", "1% cada (10% total)", "R$ 5,00 cada", "Mín. 5 entregas na semana"],
        ["Bônus streak", "5% (reservado)", "R$ 25,00", "7+ dias consecutivos"],
    ]
    dist_tbl = Table(dist_data, colWidths=[2.5*cm, 3.5*cm, 3.5*cm, 5*cm])
    dist_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#fef3c7")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    story.append(dist_tbl)

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("9.3 Regras de Distribuição", h2_style))
    rules = [
        "<b>Percentual fixo por posição:</b> os percentuais são fixos e aplicados sobre o pool total. "
        "Nunca extrapolam o valor arrecadado.",
        "<b>Mínimo de entregas:</b> entregador precisa de pelo menos 5 entregas na semana para ser elegível.",
        "<b>Acúmulo:</b> se uma posição não for preenchida (ex: não há30 entregadores com5+ entregas), "
        "o valor acumula para o pool da próxima semana.",
        "<b>Bônus streak:</b>5% reservado para entregadores com7+ dias consecutivos trabalhando. "
        "Distribuído igualmente entre todos os elegíveis.",
        "<b>Pagamento:</b> valores são creditados na carteira do entregador automaticamente todo domingo à noite.",
        "<b>Transparência:</b> entregador vê no dashboard quanto ganhou, de onde veio (posição, streak), "
        "e o valor total do pool da semana.",
    ]
    for rule in rules:
        story.append(Paragraph(f"• {rule}", bullet_style))

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("9.4 Exemplo Completo de Distribuição", h2_style))
    story.append(Paragraph(
        "Cenário: pool de R$500,00 com15 entregadores elegíveis (5+ entregas na semana).",
        body_style))

    ex_dist = [
        ["Entregador", "Posição", "Pontos", "Entregas", "Prêmio"],
        ["João", "1º", "2.340", "42", "R$ 75,00"],
        ["Maria", "2º", "2.100", "38", "R$ 50,00"],
        ["Pedro", "3º", "1.890", "35", "R$ 40,00"],
        ["Ana", "4º", "1.750", "31", "R$ 30,00"],
        ["Carlos", "5º", "1.600", "28", "R$ 30,00"],
        ["Lucas", "6º", "1.450", "25", "R$ 20,00"],
        ["Julia", "7º", "1.300", "22", "R$ 20,00"],
        ["Marcos", "8º", "1.200", "20", "R$ 20,00"],
        ["Fernanda", "9º", "1.100", "18", "R$ 20,00"],
        ["Rafael", "10º", "1.000", "15", "R$ 20,00"],
        ["11º ao 15º", "—", "—", "—", "R$ 50,00 (5×R$10)"],
        ["Bônus streak", "—", "—", "7+ dias", "R$ 25,00"],
        ["TOTAL DISTRIBUÍDO", "", "", "", "R$ 400,00"],
        ["ACUMULA PRÓXIMA SEMANA", "", "", "", "R$ 100,00"],
    ]
    ex_tbl = Table(ex_dist, colWidths=[3*cm, 2*cm, 2*cm, 2.5*cm, 3.5*cm])
    ex_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -3), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("BACKGROUND", (0, -2), (-1, -2), colors.HexColor("#dcfce7")),
        ("FONTNAME", (0, -2), (-1, -2), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#fef3c7")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    story.append(ex_tbl)

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("9.5 Modelo de Dados — Premiação", h2_style))
    db_premio = [
        ["Campo", "Tipo", "Descrição"],
        ["id", "INTEGER PK", "Auto-incremento"],
        ["tenant_id", "INTEGER FK", "Organização"],
        ["week_start", "DATE", "Início da semana (segunda-feira)"],
        ["week_end", "DATE", "Fim da semana (domingo)"],
        ["total_pool", "NUMERIC(10,2)", "Total arrecadado com os5% na semana"],
        ["total_distributed", "NUMERIC(10,2)", "Total efetivamente distribuído"],
        ["carried_over", "NUMERIC(10,2)", "Valor acumulado para próxima semana"],
        ["driver_count", "INTEGER", "Quantidade de entregadores elegíveis"],
        ["status", "VARCHAR(20)", "pending / processing / completed"],
        ["processed_at", "TIMESTAMP", "Data/hora do processamento"],
    ]
    db_tbl = Table(db_premio, colWidths=[3*cm, 3.5*cm, 9*cm])
    db_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(db_tbl)

    story.append(Spacer(1, 4*mm))
    db_premio2 = [
        ["Campo", "Tipo", "Descrição"],
        ["id", "INTEGER PK", "Auto-incremento"],
        ["weekly_reward_id", "INTEGER FK", "Referência ao reward semanal"],
        ["driver_id", "INTEGER FK", "Referência ao entregador"],
        ["position", "INTEGER", "Posição no ranking da semana"],
        ["points", "INTEGER", "MuvScore da semana"],
        ["deliveries", "INTEGER", "Entregas realizadas na semana"],
        ["reward_amount", "NUMERIC(10,2)", "Valor do prêmio em R$"],
        ["reward_type", "VARCHAR(20)", "ranking / streak_bonus"],
        ["paid", "BOOLEAN", "Se já foi creditado na carteira"],
        ["paid_at", "TIMESTAMP", "Data/hora do crédito"],
    ]
    db_tbl2 = Table(db_premio2, colWidths=[3*cm, 3.5*cm, 9*cm])
    db_tbl2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(Paragraph("weekly_rewards (controle do pool semanal)", ParagraphStyle("TblLabel",
        parent=body_style, fontSize=9, textColor=GRAY, spaceBefore=3*mm, spaceAfter=1*mm)))
    story.append(db_tbl)
    story.append(Paragraph("weekly_reward_details (prêmios individuais)", ParagraphStyle("TblLabel",
        parent=body_style, fontSize=9, textColor=GRAY, spaceBefore=3*mm, spaceAfter=1*mm)))
    story.append(db_tbl2)
    story.append(PageBreak())

    # === 10. PLANO DE IMPLEMENTAÇÃO ===
    story.append(Paragraph("10. Plano de Implementação", h1_style))

    impl_data = [
        ["Fase", "Escopo", "Complexidade", "Estimativa"],
        ["Fase 1", "Pontos base (entregas + avaliação) + modelo de dados + níveis", "Baixa", "2-3 sessões"],
        ["Fase 2", "Dias especiais + horários de pico + configurações admin", "Média", "3-4 sessões"],
        ["Fase 3", "Taxa de aceite/conclusão + tempo online + streak", "Média", "3-4 sessões"],
        ["Fase 4", "Dashboard entregador + ranking visual + pool de premiação semanal", "Média", "4-5 sessões"],
        ["Fase 5", "Benefícios reais (prioridade pedidos, badges, estabelecimentos)", "Alta", "5+ sessões"],
    ]
    impl_table = Table(impl_data, colWidths=[2*cm, 8*cm, 2.5*cm, 3*cm])
    impl_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BG, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(impl_table)

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("Observações Importantes", h2_style))
    obs = [
        "A nota inicial dos entregadores existentes será migrada para NULL (sem nota) "
        "e calculada retroativamente com base nas avaliações já registradas no sistema.",
        "O ranking só exibe entregadores com mínimo de entregas configurável (default: 5).",
        "O percentual de pagamento do entregador pode ser individual, definido pelo admin.",
        "Todos os multiplicadores e parâmetros são configuráveis por tenant.",
        "O sistema é compatível com a arquitetura multi-tenant existente.",
    ]
    for item in obs:
        story.append(Paragraph(f"• {item}", bullet_style))

    story.append(Spacer(1, 15*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY))
    story.append(Paragraph(
        "Documento gerado automaticamente — MuvLog Portal Entregador — Setembro 2026",
        ParagraphStyle("Footer", parent=small_style, alignment=TA_CENTER, spaceBefore=3*mm)))

    doc.build(story)
    print(f"PDF gerado: {output_path}")

if __name__ == "__main__":
    build_pdf(r"C:\Users\Dell\portal_entregador\portal_entregador\docs\Plano_MuvScore.pdf")
