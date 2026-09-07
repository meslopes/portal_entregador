import os

# Caminhos
memory_path = r'C:\Users\Dell\.local\share\mimocode\memory\projects\3540bcb2-b21b-47b0-a39b-534960fe4aa3\MEMORY.md'
regras_path = r'C:\Users\Dell\portal_entregador\portal_entregador\docs\REGRAS_TRABALHO_EQUIPE.md'
output_dir = r'C:\Users\Dell\portal_entregador\portal_entregador\docs'

# Ler conteúdo
with open(memory_path, 'r', encoding='utf-8') as f:
    memory_content = f.read()

with open(regras_path, 'r', encoding='utf-8') as f:
    regras_content = f.read()

# Template HTML
def create_html(title, content):
    escaped = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
body {{ font-family: 'Segoe UI', system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; background: #f8fafc; color: #1e293b; line-height: 1.6; }}
h1 {{ color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }}
h2 {{ color: #1e40af; margin-top: 2rem; }}
h3 {{ color: #475569; }}
pre {{ background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.875rem; white-space: pre-wrap; }}
code {{ background: #e2e8f0; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875rem; }}
ul, ol {{ padding-left: 1.5rem; }}
li {{ margin-bottom: 0.25rem; }}
table {{ border-collapse: collapse; width: 100%; margin: 1rem 0; }}
th, td {{ border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }}
th {{ background: #f1f5f9; font-weight: 600; }}
tr:hover {{ background: #f8fafc; }}
</style>
</head>
<body>
<pre>{escaped}</pre>
</body>
</html>'''

# Salvar arquivos
with open(os.path.join(output_dir, 'MEMORY.html'), 'w', encoding='utf-8') as f:
    f.write(create_html('MEMORY.md - Projeto MuvLog', memory_content))

with open(os.path.join(output_dir, 'REGRAS.html'), 'w', encoding='utf-8') as f:
    f.write(create_html('Regras de Trabalho - MuvLog', regras_content))

print('Arquivos HTML criados com sucesso!')
print(f'  - {os.path.join(output_dir, "MEMORY.html")}')
print(f'  - {os.path.join(output_dir, "REGRAS.html")}')
