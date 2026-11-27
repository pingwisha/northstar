---
id: 0068-telemetry-retention
title: The metadata log keeps 30 days
status: active
date: 2026-11-23
tags: [practice-packs, observability, harness]
track: process
accepted-by: Мария
go-getter:
  telemetry-retention-days: "30"
  generated-by: telemetry@0.1.0
  pack-answer: retention
  pack-option: "30"
---

## Decision

Keep log lines for 30 days; every write prunes older lines (pack telemetry@0.1.0).

## Why

Calibration needs recent data only, and old metadata is a liability without a use.
