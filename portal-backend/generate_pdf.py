"""Gera PDF com o mapa do banco de dados muv.log"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from datetime import datetime

# Colors
C_PRIMARY = HexColor('#0d9488')
C_ADMIN = HexColor('#7c3aed')
C_CLIENT = HexColor('#0d9488')
C_DRIVER = HexColor('#2563eb')
C_OWN = HexColor('#92400e')
C_BG_LIGHT = HexColor('#f8fafc')
C_BG_HEADER = HexColor('#f1f5f9')
C_BORDER = HexColor('#e2e8f0')
C_GREEN = HexColor('#166534')
C_RED = HexColor('#dc2626')
C_TEXT = HexColor('#1e293b')
C_MUTED = HexColor('#64748b')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle('Title2', parent=styles['Title'], fontSize=18, textColor=C_PRIMARY, spaceAfter=4*mm))
styles.add(ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=9, textColor=C_MUTED, spaceAfter=8*mm))
styles.add(ParagraphStyle('Section', parent=styles['Heading2'], fontSize=13, textColor=C_PRIMARY, spaceBefore=6*mm, spaceAfter=3*mm))
styles.add(ParagraphStyle('CellText', parent=styles['Normal'], fontSize=8, leading=10, textColor=C_TEXT))
styles.add(ParagraphStyle('CellBold', parent=styles['Normal'], fontSize=8, leading=10, textColor=C_TEXT, fontName='Helvetica-Bold'))
styles.add(ParagraphStyle('CellMuted', parent=styles['Normal'], fontSize=7, leading=9, textColor=C_MUTED))
styles.add(ParagraphStyle('FlowTitle', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', textColor=C_PRIMARY))
styles.add(ParagraphStyle('FlowItem', parent=styles['Normal'], fontSize=8, leading=11, textColor=C_TEXT, leftIndent=8*mm))
styles.add(ParagraphStyle('FlowSub', parent=styles['Normal'], fontSize=8, leading=11, textColor=C_TEXT, leftIndent=16*mm))
styles.add(ParagraphStyle('FlowSub2', parent=styles['Normal'], fontSize=8, leading=11, textColor=C_TEXT, leftIndent=24*mm))

def badge(text, color):
    return f'<font color="{color}"><b>[{text}]</b></font>'

def status_badge(active):
    return badge('ATIVO', '#166534') if active else badge('INATIVO', '#dc2626')

def online_badge(online):
    return badge('ONLINE', '#166534') if online else badge('OFFLINE', '#64748b')

def build_pdf(data, output_path='muvlog_database_map.pdf'):
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    story = []
    now = datetime.now().strftime('%d/%m/%Y %H:%M')

    # Title
    story.append(Paragraph('Mapa do Banco de Dados — muv.log', styles['Title2']))
    story.append(Paragraph(f'Gerado em {now} | Dados do sistema em produção', styles['Subtitle']))

    # === TENANTS ===
    tenants = data.get('tenants', [])
    story.append(Paragraph(f'Tenants ({len(tenants)})', styles['Section']))
    if tenants:
        tdata = [[Paragraph('<b>ID</b>', styles['CellBold']), Paragraph('<b>Nome</b>', styles['CellBold']),
                  Paragraph('<b>Slug</b>', styles['CellBold']), Paragraph('<b>Plano</b>', styles['CellBold']),
                  Paragraph('<b>Status</b>', styles['CellBold'])]]
        for t in tenants:
            tdata.append([
                Paragraph(str(t['id']), styles['CellText']),
                Paragraph(f"<b>{t['name']}</b>", styles['CellBold']),
                Paragraph(t.get('slug', ''), styles['CellText']),
                Paragraph(t.get('plan', ''), styles['CellText']),
                Paragraph(status_badge(t.get('is_active', True)), styles['CellText'])
            ])
        tbl = Table(tdata, colWidths=[12*mm, 50*mm, 35*mm, 25*mm, 25*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_BG_HEADER),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(tbl)
    else:
        story.append(Paragraph('Nenhum tenant cadastrado.', styles['CellMuted']))

    # === PRAÇAS ===
    squares = data.get('squares', [])
    story.append(Paragraph(f'Praças ({len(squares)})', styles['Section']))
    if squares:
        tdata = [[Paragraph('<b>ID</b>', styles['CellBold']), Paragraph('<b>Nome</b>', styles['CellBold']),
                  Paragraph('<b>Cidade/UF</b>', styles['CellBold']), Paragraph('<b>Tenant</b>', styles['CellBold']),
                  Paragraph('<b>Status</b>', styles['CellBold'])]]
        for s in squares:
            tdata.append([
                Paragraph(str(s['id']), styles['CellText']),
                Paragraph(f"<b>{s['name']}</b>", styles['CellBold']),
                Paragraph(f"{s.get('city', '')}/{s.get('state', '')}", styles['CellText']),
                Paragraph(str(s.get('tenant_id', '-')), styles['CellText']),
                Paragraph(status_badge(s.get('is_active', True)), styles['CellText'])
            ])
        tbl = Table(tdata, colWidths=[12*mm, 45*mm, 35*mm, 25*mm, 25*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_BG_HEADER),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(tbl)

    # === USUÁRIOS ===
    users = data.get('users', [])
    story.append(Paragraph(f'Usuários ({len(users)})', styles['Section']))
    if users:
        tdata = [[Paragraph('<b>ID</b>', styles['CellBold']), Paragraph('<b>Nome</b>', styles['CellBold']),
                  Paragraph('<b>Tipo</b>', styles['CellBold']), Paragraph('<b>Email</b>', styles['CellBold']),
                  Paragraph('<b>Tenant</b>', styles['CellBold']), Paragraph('<b>Praça</b>', styles['CellBold']),
                  Paragraph('<b>Status</b>', styles['CellBold'])]]
        for u in users:
            is_super = u.get('user_type') == 'ADMIN' and not u.get('tenant_id')
            type_text = u.get('user_type', '-')
            if is_super:
                type_text += ' (SUPER)'
            tdata.append([
                Paragraph(str(u['id']), styles['CellText']),
                Paragraph(f"<b>{u.get('first_name', '')} {u.get('last_name', '')}</b>", styles['CellBold']),
                Paragraph(type_text, styles['CellText']),
                Paragraph(u.get('email', ''), styles['CellText']),
                Paragraph(str(u.get('tenant_id', '-')), styles['CellText']),
                Paragraph(u.get('square_name', '-') or '-', styles['CellText']),
                Paragraph(status_badge(u.get('status') == 'ACTIVE'), styles['CellText'])
            ])
        tbl = Table(tdata, colWidths=[10*mm, 35*mm, 22*mm, 40*mm, 18*mm, 22*mm, 18*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_BG_HEADER),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(tbl)

    story.append(PageBreak())

    # === RESTAURANTES ===
    restaurants = data.get('restaurants', [])
    story.append(Paragraph(f'Restaurantes ({len(restaurants)})', styles['Section']))
    if restaurants:
        tdata = [[Paragraph('<b>ID</b>', styles['CellBold']), Paragraph('<b>Nome</b>', styles['CellBold']),
                  Paragraph('<b>Tenant</b>', styles['CellBold']), Paragraph('<b>Praça</b>', styles['CellBold']),
                  Paragraph('<b>Próprios</b>', styles['CellBold']), Paragraph('<b>Status</b>', styles['CellBold'])]]
        for r in restaurants:
            tdata.append([
                Paragraph(str(r['id']), styles['CellText']),
                Paragraph(f"<b>{r['name']}</b>", styles['CellBold']),
                Paragraph(str(r.get('tenant_id', '-')), styles['CellText']),
                Paragraph(str(r.get('square_id', '-')), styles['CellText']),
                Paragraph(badge('SIM', '#92400e') if r.get('has_own_drivers') else 'Não', styles['CellText']),
                Paragraph(status_badge(r.get('is_active', True)), styles['CellText'])
            ])
        tbl = Table(tdata, colWidths=[12*mm, 50*mm, 22*mm, 22*mm, 22*mm, 22*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_BG_HEADER),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(tbl)

    # === ENTREGADORES PLATAFORMA ===
    pdrivers = data.get('platform_drivers', [])
    story.append(Paragraph(f'Entregadores da Plataforma ({len(pdrivers)})', styles['Section']))
    if pdrivers:
        tdata = [[Paragraph('<b>ID</b>', styles['CellBold']), Paragraph('<b>Nome</b>', styles['CellBold']),
                  Paragraph('<b>Veículo</b>', styles['CellBold']), Paragraph('<b>Placa</b>', styles['CellBold']),
                  Paragraph('<b>Praça</b>', styles['CellBold']), Paragraph('<b>Online</b>', styles['CellBold']),
                  Paragraph('<b>Entregas</b>', styles['CellBold'])]]
        for d in pdrivers:
            tdata.append([
                Paragraph(str(d['id']), styles['CellText']),
                Paragraph(f"<b>{d['name']}</b>", styles['CellBold']),
                Paragraph(d.get('vehicle_type', '-'), styles['CellText']),
                Paragraph(d.get('vehicle_plate', '-'), styles['CellText']),
                Paragraph(d.get('square_name', '-') or str(d.get('square_id', '-')), styles['CellText']),
                Paragraph(online_badge(d.get('is_online', False)), styles['CellText']),
                Paragraph(str(d.get('total_deliveries', 0)), styles['CellText'])
            ])
        tbl = Table(tdata, colWidths=[12*mm, 40*mm, 22*mm, 20*mm, 25*mm, 20*mm, 18*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_BG_HEADER),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(tbl)

    # === ENTREGADORES PRÓPRIOS ===
    odrivers = data.get('own_drivers', [])
    story.append(Paragraph(f'Entregadores Próprios ({len(odrivers)})', styles['Section']))
    if odrivers:
        tdata = [[Paragraph('<b>ID</b>', styles['CellBold']), Paragraph('<b>Nome</b>', styles['CellBold']),
                  Paragraph('<b>Veículo</b>', styles['CellBold']), Paragraph('<b>Restaurante</b>', styles['CellBold']),
                  Paragraph('<b>Praça</b>', styles['CellBold']), Paragraph('<b>Online</b>', styles['CellBold']),
                  Paragraph('<b>PIN</b>', styles['CellBold']), Paragraph('<b>Entregas</b>', styles['CellBold'])]]
        for o in odrivers:
            tdata.append([
                Paragraph(str(o['id']), styles['CellText']),
                Paragraph(f"<b>{o['name']}</b>", styles['CellBold']),
                Paragraph(o.get('vehicle_type', '-'), styles['CellText']),
                Paragraph(f"{o.get('restaurant_name', '?')} (ID:{o.get('restaurant_id', '?')})", styles['CellText']),
                Paragraph(o.get('square_name', '-') or '-', styles['CellText']),
                Paragraph(online_badge(o.get('is_online', False)), styles['CellText']),
                Paragraph(badge('SIM', '#1d4ed8') if o.get('has_pin') else badge('NAO', '#dc2626'), styles['CellText']),
                Paragraph(str(o.get('total_deliveries', 0)), styles['CellText'])
            ])
        tbl = Table(tdata, colWidths=[10*mm, 30*mm, 18*mm, 38*mm, 22*mm, 18*mm, 14*mm, 16*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_BG_HEADER),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(tbl)

    story.append(PageBreak())

    # === FLUXOGRAMA DE RELACIONAMENTOS ===
    story.append(Paragraph('Fluxograma de Relacionamentos', styles['Section']))
    story.append(Spacer(1, 3*mm))

    # Build lookup maps
    tenant_map = {t['id']: t['name'] for t in tenants}
    square_map = {s['id']: s['name'] for s in squares}

    story.append(Paragraph('muv.log (Plataforma SaaS)', styles['FlowTitle']))
    story.append(Spacer(1, 2*mm))

    for t in tenants:
        story.append(Paragraph(f'TENANT: {t["name"]} [{t.get("plan", "")}] {status_badge(t.get("is_active", True))}', styles['FlowItem']))

        tenant_squares = [s for s in squares if s.get('tenant_id') == t['id']]
        for s in tenant_squares:
            story.append(Paragraph(f'PRACA: {s["name"]} ({s.get("city", "")}/{s.get("state", "")})', styles['FlowSub']))

            sq_restaurants = [r for r in restaurants if r.get('square_id') == s['id']]
            for r in sq_restaurants:
                own_flag = ' [TEM PROPRIOS]' if r.get('has_own_drivers') else ''
                story.append(Paragraph(f'RESTAURANTE: {r["name"]}{own_flag} {status_badge(r.get("is_active", True))}', styles['FlowSub2']))

                # Platform drivers for this square
                sq_drivers = [d for d in pdrivers if d.get('square_id') == s['id']]
                if sq_drivers:
                    for dr in sq_drivers:
                        story.append(Paragraph(f'Plataforma: {dr["name"]} ({dr.get("vehicle_type", "-")}) {online_badge(dr.get("is_online", False))} | {dr.get("total_deliveries", 0)} entregas', styles['FlowSub2']))

                # Own drivers for this restaurant
                r_own = [o for o in odrivers if o.get('restaurant_id') == r['id']]
                if r_own:
                    for od in r_own:
                        pin_txt = 'PIN:OK' if od.get('has_pin') else 'PIN:NAO'
                        story.append(Paragraph(f'Proprio: {od["name"]} ({od.get("vehicle_type", "-")}) {online_badge(od.get("is_online", False))} {pin_txt} | {od.get("total_deliveries", 0)} entregas', styles['FlowSub2']))

            # Users without restaurant but linked to square
            sq_users = [u for u in users if u.get('square_id') == s['id'] and u.get('user_type') == 'DRIVER']
            if sq_users and not sq_restaurants:
                for u in sq_users:
                    story.append(Paragraph(f'Entregador: {u["first_name"]} {u["last_name"]} ({u.get("email", "")}) {status_badge(u.get("status") == "ACTIVE")}', styles['FlowSub2']))

        # Users without square but with this tenant
        tenant_no_sq = [u for u in users if u.get('tenant_id') == t['id'] and not u.get('square_id')]
        if tenant_no_sq:
            story.append(Paragraph('Usuarios sem praca:', styles['FlowSub']))
            for u in tenant_no_sq:
                story.append(Paragraph(f'{u["first_name"]} {u["last_name"]} [{u.get("user_type", "-")}]', styles['FlowSub2']))

    # Users without tenant
    no_tenant = [u for u in users if not u.get('tenant_id')]
    if no_tenant:
        story.append(Paragraph('Sem Tenant:', styles['FlowItem']))
        for u in no_tenant:
            is_super = u.get('user_type') == 'ADMIN'
            extra = ' [SUPER ADMIN]' if is_super else ''
            sq = u.get('square_name', '')
            sq_txt = f' (Praca: {sq})' if sq else ''
            story.append(Paragraph(f'{u["first_name"]} {u["last_name"]} [{u.get("user_type", "-")}]{extra}{sq_txt}', styles['FlowSub']))

    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(f'Fim do relatorio — muv.log Database Map — {now}', styles['CellMuted']))

    doc.build(story)
    return output_path

if __name__ == '__main__':
    import json
    import sys

    # Try to read from stdin or use sample data
    if not sys.stdin.isatty():
        data = json.load(sys.stdin)
    else:
        print('Uso: python generate_pdf.py < database_map.json')
        print('Ou: curl -H "Authorization: Bearer TOKEN" https://muvlog-api.onrender.com/api/admin/database-map | python generate_pdf.py')
        sys.exit(1)

    path = build_pdf(data)
    print(f'PDF gerado: {path}')
