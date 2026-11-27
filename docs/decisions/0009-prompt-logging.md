---
id: 0009-prompt-logging
title: Host prompt logging is disabled on every host
status: active
date: 2026-11-23
tags: [practice-packs, governance, observability]
track: process
accepted-by: Мария
go-getter:
  prompt-logging:
    scope: all
  generated-by: data-policy@0.6.0
  pack-answer: prompt-logging
  pack-option: disable-everywhere
---

## Decision

`go-getter apply` switches off prompt and content logging in every host setting that has one (pack data-policy@0.6.0).

## Why

A host that logs prompts by default would copy restricted content into its telemetry (decision 0018).
