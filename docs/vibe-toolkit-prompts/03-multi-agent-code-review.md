# Code Review Multi-Agente

## Quando usar

Antes de merge de qualquer mudança não-trivial. Vários revisores
especializados em paralelo encontram mais problemas que uma revisão única.

## O prompt

```
Review [DIFF/PR/BRANCH] using a panel of independent specialist reviewers,
then synthesize their findings into one ranked report.

## 1. Dispatch the panel (in parallel)
- General code quality
- Security (OWASP Top 10)
- [LANGUAGE] type-safety
- [FRAMEWORK]-specific

Each reports: file:line — severity — claim — concrete failure scenario.

## 2. Synthesize
1. Dedupe (same issue from multiple reviewers = one entry)
2. Filter (drop without failure scenario)
3. Rank: CRITICAL → HIGH → MEDIUM → LOW

## 3. Present
One report, most severe first.

Target: [DIFF/PR/BRANCH]. Stack: [LANGUAGE] / [FRAMEWORK].
```

**Fonte:** https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/main/docs/prompts/03-multi-agent-code-review.md
