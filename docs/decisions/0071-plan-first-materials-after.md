---
id: 0071-plan-first-materials-after
title: The AI plan appears first; materials are added to it afterwards
status: active
date: 2026-11-23
tags: [product, performance]
accepted-by: Мария
---

## Decision

When a person creates a goal, the site asks the AI only for stages and tasks and shows that draft as soon as it is ready. Materials for the tasks are asked for afterwards, one request per stage, and appear on the tasks when they arrive. A person never waits for materials to see or accept the plan.

## Why

Today one run takes 2 to 3 minutes: one large plan request (up to 90 seconds), then one materials request per stage (up to 60 seconds each), then a check of every link. The owner called the wait too long. The outcome brief plan-from-goal-and-deadline asks that more people accept a plan; a long wait before seeing anything is the likeliest reason a person leaves.

## Tradeoffs considered

- Smaller plans in one request: simpler, but a plan with fewer tasks is less useful.
- Building in the background and sending a notification: the person does not wait, but free Cloudflare Pages limits background work, so it needs a separate Worker and a queue; too much work for the gain.
