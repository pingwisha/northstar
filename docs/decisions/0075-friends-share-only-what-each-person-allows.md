---
id: 0075-friends-share-only-what-each-person-allows
title: Friends see only the goals, tasks and marks a person explicitly allows, item by item
status: active
date: 2026-11-27
tags: [product, privacy, social]
accepted-by: Мария
---

## Decision

People can become friends through a one-time invitation link (valid 7 days, used once). Each side names themselves with a nickname they type; no email, Google name or id is shown to the friend. A friend sees nothing by default. The owner of a goal allows sharing per goal and per task: whether the goal or the task is shown at all, whether its title is shown, and whether its done-marks are shown. Notes, materials, the mistakes notebook, trials and chats are never shareable. A friend can send a «Подбодрить» message, at most one per day to one person; the receiver can turn it off. Either person can end the friendship at any time, and sharing stops at once.

A goal done together (tasks split between two people) is a later step and needs its own decision: whose data it is and what happens when one leaves.

## Why

Maria wants a Habitica-like shared goal with a friend, but with control over every shared item. The privacy page now promises that no one's data is shown to others; this decision changes that promise only for what a person allows, and the privacy page changes with the feature.

## Tradeoffs considered

- Sharing by email address: simpler to use, but stores and shows other people's emails.
- Whole-goal sharing only: simpler, but Maria asked for per-task control.
- One goal owned by two people: richer, but raises who owns and who can delete the data.
