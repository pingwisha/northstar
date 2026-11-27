---
id: 0020-watcher-noise
title: Watchers are quiet
status: active
date: 2026-11-23
tags: [practice-packs, harness, cost]
track: process
accepted-by: Мария
go-getter:
  watcher-noise: quiet
  generated-by: context@0.3.1
  pack-answer: watcher-noise
  pack-option: quiet
---

## Decision

Watchers started through `go-getter watch` report state changes and a final summary, collapse duplicates and bursts (60 s window) and stop after 6 notifications an hour with one notice; `--until done` prints one result. (pack context@0.3.1.)

## Why

Each watcher line can wake a model turn that re-reads the whole context from cache, and hosts offer no throttle.
