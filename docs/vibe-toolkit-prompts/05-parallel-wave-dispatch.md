# Parallel Wave Dispatch

## Quando usar

Quando você tem uma lista de tarefas e quer executar em ondas paralelas
seguras (sem dependência entre tarefas, sem sobreposição de arquivos).

## O prompt

```
Break [FEATURE/PLAN/TASK LIST] into parallel execution waves.

## 1. List every task
For each: ID, Description, Files, Depends-on, Owner.

## 2. Group into waves
Two tasks in same wave ONLY if:
1. Neither depends on the other
2. File sets are completely disjoint

## 3. Execute each wave
1. Dispatch implementers in single batch
2. Implementers do NOT commit
3. Orchestrator commits (one task at a time, fresh HEAD each time)
4. Reviewers run together after all commits
5. Only then move to next wave

Plan/task list: [FEATURE/PLAN/TASK LIST].
```

## Dicas

- `Depends-on: everything already listed` = safe default
- Fixed commit order per wave
- Two tasks touching same files = merge into one task

**Fonte:** https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/main/docs/prompts/05-parallel-wave-dispatch.md
