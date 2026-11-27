---
id: max-concurrent-agents-rule
title: No more than 3 agents run at once per worker
status: active
date: 2026-11-23
tags: [practice-packs, agent-roles, guardrail]
governed-by: 0054-max-concurrent-agents
grounded-in: [0054-max-concurrent-agents]
derivation-note: Given the limit, each extra agent adds a cold cache and a merge.
go-getter:
  enforcement:
    - tier: 1
      check: Instruction; worktree creation is refused beyond the limit
  generated-by: orchestration@0.1.5
  pack-answer: max-concurrent
  pack-option: "3"
---

## Guardrail

Each worker runs at most 3 agents at once; the limit is per worker, not per project (decision 0169 item 2). `go-getter worktree new` refuses more than that many worktrees. Advisory (tier 1) otherwise.
