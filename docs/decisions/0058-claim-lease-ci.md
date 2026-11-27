---
id: 0058-claim-lease-ci
title: The lease of a CI job's claim is 60 minutes
status: active
date: 2026-11-23
tags: [practice-packs, agent-roles, harness]
track: process
accepted-by: Мария
go-getter:
  lease-ci: "60"
  generated-by: orchestration@0.1.5
  pack-answer: lease-ci
  pack-option: "60"
---

## Decision

The lease of a CI job's claim is 60 minutes (decision 0166; pack orchestration@0.1.5).

## Why

A CI job ends by itself, so its lease follows the job's time limit: it frees the unit when the job can no longer be running, with no renewal traffic.
