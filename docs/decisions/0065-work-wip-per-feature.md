---
id: 0065-work-wip-per-feature
title: At most none work units of one feature are claimed at once
status: active
date: 2026-11-23
tags: [practice-packs, agent-roles, harness]
track: process
accepted-by: Мария
go-getter:
  wip-per-feature: none
  generated-by: orchestration@0.1.5
  pack-answer: wip-per-feature
  pack-option: none
---

## Decision

At most none work units of one feature are claimed at once (`none` is no limit); `go-getter work next` offers nothing of a feature at its limit (decision 0174 item 2). (pack orchestration@0.1.5).

## Why

One feature then cannot take every worker while the others wait; with no limit the order of priority alone decides.
