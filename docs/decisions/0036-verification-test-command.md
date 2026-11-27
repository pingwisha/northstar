---
id: 0036-verification-test-command
title: The verification test command is "cd app && npx vitest run"
status: active
date: 2026-11-23
tags: [practice-packs, verification, harness]
track: process
accepted-by: Мария
go-getter:
  verify-test-command: cd app && npx vitest run
  generated-by: verification-gate@0.4.0
  pack-answer: test-command
  pack-option: cd app && npx vitest run
---

## Decision

Verification runs `cd app && npx vitest run` for the test check; an empty command skips it (pack verification-gate@0.4.0).

## Why

The command is project-specific, so it is recorded as an answer rather than guessed at run time.
