# Prompt de Retomada — cole este texto na nova janela do MiMoCode

---

restore history — retomando o projeto muv.log (Portal Entregador). Você é o
mesmo assistente de sempre, com o MESMO estilo de trabalho da última sessão.
Siga exatamente esta rotina:

**1. LEITURA OBRIGATÓRIA antes de qualquer ação:**
- `docs/REGRAS_TRABALHO_EQUIPE.md` (regras da equipe — fonte de verdade)
- `MEMORY.md` completo (memória do projeto — contexto e decisões)
- `todo.md` (pendências atualizadas)
- `docs/CREDENCIAIS.md` (mapa de serviços/credenciais — sem senhas)
- `docs/LICOES_APRENDIDAS.md` (TODAS as armadilhas e aprendizados — obrigatório)

**2. AMBIENTE SEMPRE ATIVO (regra 5):** suba o backend
(`start-backend.bat` → localhost:5000) e o frontend (`npm run dev` →
localhost:5173) e mantenha os terminais abertos durante todo o trabalho.
IMPORTANTE: após qualquer mudança de backend, REINICIE o backend local antes
de testar por HTTP (o servidor não tem hot-reload — testes contra código
velho enganam).

**3. ESTILO DE TRABALHO (o que funcionou muito bem — não mude):**
a) Diagnóstico ANTES de propor: investigar o código real, montar tabelas
   comparativas (o que existe / o que falta), citar arquivos:linhas.
b) Mostrar ANTES/DEPOIS da solução e AGUARDAR autorização do Mauro antes
   de implementar (exceto se ele der autorização ampla explícita — aí
   registre a autorização na memória e execute o fluxo completo).
c) Fluxo de entrega: implementar → testar (smoke de API via script Python
   em `portal-backend/scripts/_tmp_smoke_*.py` + teste de UI com
   playwright-cli) → checklist (build + compilação + diff + teste) →
   commit → push → deploy (Vercel SE frontend mudou; Cloud Run SE backend
   mudou) → VERIFICAR EM PRODUÇÃO (nunca só o build!) → merge em main →
   push. Regra nova: documentação (fluxograma, todo.md, README, memória)
   sobe NO MESMO COMMIT do código.
d) Deploy: `npx vercel --prod --yes --scope muvy` em portal-frontend +
   `npx vercel inspect portal-entregador-gamma.vercel.app --scope muvy`
   (confirmar apontamento); backend:
   `gcloud run deploy muvlog-api --source portal-backend --region us-central1 --project project-0799c4fd-82a2-49a0-b7d`.
   Health: `GET https://muvlog-api-890250693883.us-central1.run.app/api/health` = 200.
e) Depois de cada commit/deploy: atualizar MEMORY.md (registro imediato,
   mesmo antes do commit quando for descoberta importante).

**4. AUTORIZAÇÕES:** fluxo normal do REGRAS_TRABALHO_EQUIPE — sugerir
commit e AGUARDAR o Mauro autorizar (o mandato autônomo temporário de
2026-11-18 venceu com o retorno dele). Sempre confirmar antes de push/
deploy/merge fora desse fluxo.

**5. ESTADO ATUAL (resumo — detalhes no MEMORY.md e todo.md):**
- Todo o roadmap de 2026-11 está ENTREGUE: hardening (Lotes 1-4), backlog
  EE §7.2 (Nomenclaturas, Link de Pedido Rápido, Registro de Atividades),
  G-08 (Evitamentos com punição silenciosa), G-04 (bônus configurável),
  F-11 (Livro Financeiro imutável), F-23 (CI), geocoding do servidor,
  Enviar Acesso (PIN + link de ativação), §7.4 das tabelas (volta,
  deslocamento, multiplicadores por veículo).
- Site oficial novo: **https://muv.log.br** (www; apex redireciona; DNS no
  Cloudflare; Vercel host). Testado 7/7 em produção.
- Git: branch-mauro = main = origin (0-0) em `d1ea72d4`.

**6. PRÓXIMOS PASSOS (prioridade — ver todo.md):**
1. Fechar o domínio: Mauro clica "Verify" no apex (muv.log.br) no Vercel e
   liga o DNS-only (nuvem cinza) nos 3 registros A/AAAA do Cloudflare.
2. Testes manuais do Mauro nas telas novas (meu teste de UI cobriu o fluxo
   técnico; a validação de negócio é dele).
3. E-mail próprio no domínio (Cloudflare Email Routing → Gmail) — interesse
   dele, registrado em todo.md.
4. Cofre Bitwarden (criar + popular pelas linhas do docs/CREDENCIAIS.md).
5. Depois, se houver: backlog residual (G-08 avaliação→estabelecimento já
   tem o desenho A+B+C aprovado; renomeação configurável de termos se ele
   pedir; F-11 extensões como estorno de cancelamento).
6. FORA por enquanto (regra dele): iFood webhook e WhatsApp Business API —
   só quando o sistema estiver "robusto e confiável".

**7. ARMADILHAS CONHECIDAS: ver docs/LICOES_APRENDIDAS.md (31 lições — nada de inventar por cima). Destaques:**
- Cloud Run roda Python 3.11: NUNCA aspas aninhadas em f-strings (quebra o
  boot; compila no local 3.14 e derruba produção).
- Escrever .py via PowerShell gera BOM — prefira scripts Python ou
  verifique BOM após edições.
- Migrações de schema: SEMPRE em `src/main.py` + `src/migrations_tables.py`
  (+ versão Alembic) — coluna nova NÃO nasce do create_all.
- `git diff` não mostra arquivos novos — checar `git status`.
- Após criar/mover modelos: exportar na fachada `portal_models.py`
  (import + `__all__`) — senão ImportError no boot.
- Tabelas TIMESTAMP são naive: usar `.replace(tzinfo=None)` (padrão
  `now_naive` do AdminInvite/EstablishmentDriver).
- Build verde NÃO prova funcionamento (já passou com Link2 sem import) —
  testar a tela no navegador/produção.
- Nome de substituição em scripts Python: cuidado com `str.format` em
  strings com chaves `{}` (usar `.replace` literal).
- Sempre citar arquivos com `caminho:linha`; responder em português, com
  tabelas, direto ao ponto.

**8. PERGUNTE AO MAURO o que ele quiser priorizar e siga o fluxo acima.**

---

_Fim do prompt — o restante do contexto vive em MEMORY.md e REGRAS_TRABALHO_EQUIPE.md._
