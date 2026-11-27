---
id: 0028-gated-free-commands
title: Outward-facing commands that run without asking are listed
status: active
date: 2026-11-23
tags: [practice-packs, hooks]
track: process
accepted-by: Мария
go-getter:
  generated-by: hitl@0.7.0
  pack-answer: free-commands
  pack-option: []
---

## Decision

The commands [] run without a human, though they are outward-facing (pack hitl@0.7.0); an empty list frees none. Irreversible commands and every other outward-facing command still need a human.

## Why

A plain push to a feature branch is reversible, and a push to the default branch is stopped by a git hook or branch protection, so asking for each one adds friction without protection (decision 0120).
