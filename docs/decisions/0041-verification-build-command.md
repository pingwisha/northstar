---
id: 0041-verification-build-command
title: The verification build command is ""
status: active
date: 2026-11-23
tags: [practice-packs, verification, harness]
track: process
accepted-by: Мария
go-getter:
  verify-build-command: ""
  generated-by: verification-gate@0.4.0
  pack-answer: build-command
  pack-option: ""
---

## Decision

Verification runs `` for the build check, where the machine profile places it; an empty command skips it (pack verification-gate@0.4.0).

## Why

The command is project-specific, so it is recorded as an answer rather than guessed at run time.
