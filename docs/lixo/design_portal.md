# Design do Portal muv.log

**Aperfeiçoado por:** MiMo 2.5 | **Atualizado:** 25/07/2026

---

## 1. Paleta de Cores

### Cores Principais
| Cor | Hex | Uso |
|-----|-----|-----|
| Azul Primário | #2563eb | Botões, links, destaques |
| Azul Escuro | #1e40af | Fundo de branding |
| Verde | #22c55e | Sucesso, entregues, online |
| Amarelo | #f59e0b | Avisos, pendente, estabelecimentos |
| Vermelho | #dc2626 | Erros, cancelados, offline |
| Roxo | #8b5cf6 | Preparando |

### Cores Neutras
| Cor | Hex | Uso |
|-----|-----|-----|
| Texto Escuro | #1e293b | Títulos, textos principais |
| Texto Médio | #475569 | Textos secundários |
| Texto Claro | #94a3b8 | Placeholders, labels |
| Fundo Claro | #f1f5f9 | Fundo da página |
| Borda | #e2e8f0 | Bordas, separadores |

---

## 2. Tipografia

- **Fonte Principal:** Sistema (Inter, Segoe UI, etc)
- **Títulos:** 700 (bold)
- **Textos:** 400 (regular)
- **Labels:** 500 (medium)
- **Tamanhos:** 0.625rem a 2rem

---

## 3. Layout

### Split-Screen (Login/Cadastro)
- Lado esquerdo: 45% - Fundo azul escuro com branding
- Lado direito: 55% - Fundo claro com formulário

### Dashboard
- Header sticky com navegação
- Cards de estatísticas em grid
- Seções com cards brancos e sombra sutil

### Mapa
- Container branco com bordas arredondadas
- Marcadores coloridos por tipo:
  - 🔵 Azul = Entregador em entrega
  - 🟢 Verde = Entregador livre / Local de entrega
  - 🟡 Amarelo = Estabelecimento
  - 🟣 Roxo = Preparando

---

## 4. Componentes

### Botões
- **Primário:** Azul (#2563eb) com hover escuro
- **Secundário:** Fundo transparente com borda
- **Perigo:** Vermelho (#dc2626)
- **Sucesso:** Verde (#22c55e)

### Cards
- Fundo branco
- Border-radius: 0.75rem
- Sombra: 0 1px 3px rgba(0,0,0,0.05)
- Padding: 1.25rem

### Inputs
- Borda: 1.5px solid #e2e8f0
- Border-radius: 0.5rem
- Focus: Borda azul (#3b82f6) com ring

---

## 5. Ícones

Biblioteca: Lucide React
Tamanhos: 12px, 14px, 16px, 18px, 20px, 22px

---

## 6. Responsividade

- Mobile: Stack vertical
- Tablet: Grid adaptativo
- Desktop: Layout completo

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
