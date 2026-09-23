"""
Modifica o logo: substitui 'muvy' por 'muv.log'
Preserva fundo roxo e ícone dourado.
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Caminhos
INPUT = r'C:\Users\Dell\Downloads\logo muvy1.jpg'
OUTPUT_DIR = r'C:\Users\Dell\portal_entregador\portal_entregador\portal-frontend\public'
OUTPUT = os.path.join(OUTPUT_DIR, 'logo-muvlog.jpg')

# Abrir imagem original
img = Image.open(INPUT).convert('RGB')
draw = ImageDraw.Draw(img)
w, h = img.size  # 150x150

# Coletar cor de fundo das bordas (média de pixels das bordas)
bg_samples = []
for x in range(w):
    bg_samples.append(img.getpixel((x, 0)))       # topo
    bg_samples.append(img.getpixel((x, h-1)))      # baixo
for y in range(h):
    bg_samples.append(img.getpixel((0, y)))         # esquerda
    bg_samples.append(img.getpixel((w-1, y)))       # direita

bg_r = sum(p[0] for p in bg_samples) // len(bg_samples)
bg_g = sum(p[1] for p in bg_samples) // len(bg_samples)
bg_b = sum(p[2] for p in bg_samples) // len(bg_samples)
bg_color = (bg_r, bg_g, bg_b)
print(f"Cor de fundo detectada: RGB({bg_r}, {bg_g}, {bg_b})")

# Área do texto "muvy" (lado direito da imagem, baseado na análise)
# O texto está aproximadamente na região x=95-145, y=45-95
# Vamos cobrir uma área maior para garantir limpeza completa
text_area = (80, 25, 148, 115)
draw.rectangle(text_area, fill=bg_color)
print(f"Área do texto coberta: {text_area}")

# Desenhar "muv.log" em duas linhas para caber melhor
text_line1 = "muv."
text_line2 = "log"
area_w = text_area[2] - text_area[0]
area_h = text_area[3] - text_area[1]

# Tentar carregar fontes do sistema
font_paths = [
    r'C:\Windows\Fonts\arialbd.ttf',
    r'C:\Windows\Fonts\arial.ttf',
    r'C:\Windows\Fonts\calibrib.ttf',
    r'C:\Windows\Fonts\segoeui.ttf',
]

font = None
for fp in font_paths:
    if os.path.exists(fp):
        # Encontrar tamanho ideal para2 linhas
        for size in range(50, 15, -1):
            try:
                test_font = ImageFont.truetype(fp, size)
                bbox1 = test_font.getbbox(text_line1)
                bbox2 = test_font.getbbox(text_line2)
                tw1 = bbox1[2] - bbox1[0]
                th1 = bbox1[3] - bbox1[1]
                tw2 = bbox2[2] - bbox2[0]
                th2 = bbox2[3] - bbox2[1]
                max_tw = max(tw1, tw2)
                total_th = th1 + th2 + 4  # 4px gap entre linhas
                if max_tw <= area_w - 4 and total_th <= area_h - 4:
                    font = test_font
                    print(f"Fonte: {os.path.basename(fp)}, tamanho: {size}")
                    print(f"Linha1: {tw1}x{th1}px, Linha2: {tw2}x{th2}px")
                    print(f"Total: {max_tw}x{total_th}px, Área: {area_w}x{area_h}px")
                    break
            except Exception:
                continue
        if font:
            break

if font is None:
    font = ImageFont.load_default()
    print("Usando fonte padrão (fallback)")

# Calcular posição centralizada na área para2 linhas
bbox1 = font.getbbox(text_line1)
bbox2 = font.getbbox(text_line2)
tw1 = bbox1[2] - bbox1[0]
th1 = bbox1[3] - bbox1[1]
tw2 = bbox2[2] - bbox2[0]
th2 = bbox2[3] - bbox2[1]
gap = 4

# Centralizar horizontalmente (usar a linha mais larga)
max_tw = max(tw1, tw2)
total_th = th1 + th2 + gap
start_y = text_area[1] + (area_h - total_th) // 2

tx1 = text_area[0] + (area_w - tw1) // 2
ty1 = start_y - bbox1[1]

tx2 = text_area[0] + (area_w - tw2) // 2
ty2 = start_y + th1 + gap - bbox2[1]

# Cor do texto: dourado/amarelo (similar ao ícone)
# Vamos amostrar a cor do ícone dourado (área do ícone, lado esquerdo)
gold_samples = []
for y in range(45, 90):
    for x in range(20, 80):
        r, g, b = img.getpixel((x, y))
        # Filtrar pixels dourados (R alto, G médio, B baixo)
        if r > 140 and g > 70 and b < 80:
            gold_samples.append((r, g, b))

if gold_samples:
    gold_r = sum(p[0] for p in gold_samples) // len(gold_samples)
    gold_g = sum(p[1] for p in gold_samples) // len(gold_samples)
    gold_b = sum(p[2] for p in gold_samples) // len(gold_samples)
    text_color = (gold_r, gold_g, gold_b)
else:
    text_color = (220, 180, 50)  # Dourado padrão

print(f"Cor do texto: RGB{text_color}")

# Desenhar o texto (2 linhas)
draw.text((tx1, ty1), text_line1, fill=text_color, font=font)
draw.text((tx2, ty2), text_line2, fill=text_color, font=font)
print(f"Texto desenhado: '{text_line1}' + '{text_line2}'")

# Salvar
img.save(OUTPUT, 'JPEG', quality=95)
print(f"\nLogo salvo em: {OUTPUT}")
print(f"Tamanho: {os.path.getsize(OUTPUT)} bytes")

# Também salvar em Downloads para o iFood
ifood_output = r'C:\Users\Dell\Downloads\logo-muvlog-ifood.jpg'
img.save(ifood_output, 'JPEG', quality=95)
print(f"Cópia para iFood: {ifood_output}")
