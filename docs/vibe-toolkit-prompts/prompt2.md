# Quebrar os arquivos gigantes que o teto de linhas revelou

## Atalho: só o link

```
Leia https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/main/docs/prompts/09-file-size-refactor.md
e execute o prompt que está nesse arquivo neste projeto. Use MAX_LINES=350,
BATCH_SIZE=3 e RULE_ID=quality/max-lines. Descubra sozinho os comandos de
lint, teste e typecheck lendo o package.json.
```

## Quando usar

Depois que o teto de tamanho por arquivo já está instalado e o linter já
apontou quais arquivos estouraram — normalmente logo após o prompt 08.

## Por que funciona

O prompt define o corte por responsabilidade, não por linha. As quatro costuras:
- lógica de negócio → serviço de domínio
- bloco de UI repetido → sub-componente
- acesso a dados → repositório ou adaptador
- helpers → módulo utilitário do domínio

Ritmo: **um arquivo por vez, um commit por arquivo**, com testes entre cada um.

## Placeholders

- `[LINT_COMMAND]` — comando do linter
- `[TEST_COMMAND]` — comando de testes
- `[TYPECHECK_COMMAND]` — checagem de tipos (none se JS puro)
- `[MAX_LINES]` — teto de linhas (350)
- `[BATCH_SIZE]` — arquivos por batch (3)
- `[RULE_ID]` — id da regra (quality/max-lines)

## O prompt

```
Split the files that exceed this project's per-file size budget into
smaller, focused modules. This is behavior-preserving refactoring, not a
rewrite and not a feature change.

## 0. Ground truth
Run [LINT_COMMAND] and list every file reported by [RULE_ID], with its
actual line count, sorted largest first.

## 1. Pick the batch
Take the [BATCH_SIZE] largest files. For each, state: responsibility, seams, exports.

## 2. Where to cut
Cut on responsibility, never on line count:
- business logic → domain service
- repeated UI → sub-component
- data access → repository/adapter
- helpers → domain-specific utility

If no seam exists, say so and leave it alone.

## 3. Preserve the interface
Original file's public exports must still exist with same names and signatures.

## 4. One file at a time
For each: split → typecheck → test → lint → commit → next.

## 5. Stop and report
After [BATCH_SIZE] files, stop. Report results.

Codebase: [STACK/FRAMEWORK]. Budget: [MAX_LINES] lines. Rule: [RULE_ID].
```

## Dicas

- BATCH_SIZE=3 mantém diff revisável
- "Sem costura natural" = deixe como está
- Combine com 03-multi-agent-code-review.md

**Fonte:** https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/main/docs/prompts/09-file-size-refactor.md
**Status no projeto:** ✅ Executado (2026-09-20). 39 arquivos refatorados em 13 batches. Todos abaixo de 350 linhas.
