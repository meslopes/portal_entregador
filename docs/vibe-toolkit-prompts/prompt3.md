# ESLint Warning Burndown

## Atalho: só o link

```
Leia https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/main/docs/prompts/02-eslint-warning-burndown.md
e execute o prompt que está nesse arquivo neste projeto, para o conjunto
inteiro de avisos restantes. Descubra sozinho os comandos de lint, teste,
typecheck e build lendo o package.json.
```

## Quando usar

Quando warnings de uma configuração já existente acumularam e é hora de
zerá-los. Não para tamanho de arquivo (use prompt 09 para isso).

## Por que funciona

Transforma decisão implícita em explícita. Exige contagem real de warnings.
Portão de decisão com opções e trade-offs. Trabalho em ondas paralelas.

## Placeholders

- `[RULE_NAME]` — regra específica ou "full warning set"
- `[LINT_COMMAND]` — comando do linter
- `[TYPECHECK_COMMAND]` — checagem de tipos
- `[TEST_COMMAND]` — testes
- `[BUILD_COMMAND]` — build
- `[STACK/FRAMEWORK]` — stack do projeto

## O prompt

```
You are planning and executing a lint warning burn-down for [RULE_NAME] (or
the full warning set) in this repo.

## 0. Ground truth
Run [LINT_COMMAND] and report actual current count — total warnings,
broken down by rule and by file.

## 1. 🔴 Decision gate
Find the riskiest part. Present options:
- (A) Fix every violation fully
- (B) Fix most, track rest as debt
- (C) Re-scope or loosen the rule

## 2. Success criteria
- [LINT_COMMAND] shows 0 warnings
- [TYPECHECK_COMMAND] clean
- [TEST_COMMAND] green
- Zero behavior change

## 3. Break into waves
Group violations into file-disjoint waves.

## 4. Pitfalls
List every gotcha specific to this rule and codebase.

## 5. Reviewer sign-off
Name reviewers per wave.

## 6. Final checklist
Mark only by re-running commands.

Codebase: [STACK/FRAMEWORK]. Rule(s) in scope: [RULE_NAME].
```

## Dicas

- Portão de decisão é onde o trabalho real acontece
- Combine com 05-parallel-wave-dispatch.md para paralelismo
- Pegadinhas da onda 2 valem para onda 3+

**Fonte:** https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/main/docs/prompts/02-eslint-warning-burndown.md
**Status no projeto:** ✅ Executado (2026-09-20). 408→0 violations. Todas as regras zeradas.
