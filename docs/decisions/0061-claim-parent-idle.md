---
id: 0061-claim-parent-idle
title: A parent unit with live children is flagged idle after 7 days without action
status: active
date: 2026-11-23
tags: [practice-packs, agent-roles, harness]
track: process
accepted-by: Мария
go-getter:
  parent-idle: "7"
  generated-by: orchestration@0.1.5
  pack-answer: parent-idle
  pack-option: "7"
---

## Decision

A parent unit with live children is flagged idle after 7 days without action (decision 0166; pack orchestration@0.1.5).

## Why

A parent with live children holds no lease, so nothing else would show that nobody is working on it; the idle period flags it for a person or K7 to park, and a week keeps a normal pause from raising a flag.
