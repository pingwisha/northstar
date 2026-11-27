---
id: 0073-owner-statistics-page-without-tracking
title: The owner reads usage numbers on a statistics page built from existing tables
status: active
date: 2026-11-23
tags: [product, privacy, observability]
accepted-by: Мария
---

## Decision

The site gets a page «Статистика», open only to the owner, that shows four totals: the share of created goals with an accepted plan, the people who checked a task in their first three days, the people who came back on day 7 or later, and the average honest percent of goals at the middle of their term. The numbers are counted from tables that already exist (goals, tasks, users); there is no new tracking of people and no new table. The page shows counts only, never names, emails or goal text.

## Why

The outcome brief plan-from-goal-and-deadline needs weekly readings of these numbers, and the owner chose a page inside the site over a manual query and over outside analytics (which would send data about people to other services and change the privacy page).

## Tradeoffs considered

- A manual read-only query each week: no new code, but depends on remembering to ask.
- Outside analytics: more data, but people's data leaves the site.
