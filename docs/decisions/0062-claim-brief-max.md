---
id: 0062-claim-brief-max
title: A delegated unit keeps at most 8 KB of brief fields in the claims ledger
status: active
date: 2026-11-23
tags: [practice-packs, agent-roles, harness]
track: process
accepted-by: Мария
go-getter:
  brief-max: "8"
  generated-by: orchestration@0.1.5
  pack-answer: brief-max
  pack-option: "8"
---

## Decision

A delegated unit keeps at most 8 KB of brief fields in the claims ledger (decision 0166; pack orchestration@0.1.5).

## Why

The ledger is fetched by every claim, so each delegated brief in it must stay small; a brief over the cap is kept on the tracker issue instead, and the ledger holds a pointer to it.
