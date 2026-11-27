---
id: 0038-verification-typecheck-command
title: The verification typecheck command is "cd app && npm run check"
status: active
date: 2026-11-23
tags: [practice-packs, verification, harness]
track: process
accepted-by: Мария
go-getter:
  verify-typecheck-command: cd app && npm run check
  generated-by: verification-gate@0.4.0
  pack-answer: typecheck-command
  pack-option: cd app && npm run check
---

## Decision

Verification runs `cd app && npm run check` for the typecheck check; an empty command skips it (pack verification-gate@0.4.0).

## Why

The command is project-specific, so it is recorded as an answer rather than guessed at run time.
