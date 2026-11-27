---
id: stats-hold-no-personal-data
title: The statistics page shows only totals, never names, emails or goal text
status: active
date: 2026-11-23
tags: [privacy, guardrail]
governed-by: [0073-owner-statistics-page-without-tracking]
derivation-note: Given 0073 (a statistics page from existing tables without tracking), the page must show only aggregated counts and be closed to everyone but the owner.
enforced-by: app/src/routes/(app)/stats/+page.server.ts
---

## Guardrail

The statistics page is open only to an owner and returns counts only: no names, emails, user ids or goal text. A test must prove a member gets a refusal and the result holds no personal field.
