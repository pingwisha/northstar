---
id: 0072-materials-only-from-a-verified-list
title: Materials come only from a list of verified sites kept in the code
status: active
date: 2026-11-23
tags: [product, ai, quality]
accepted-by: Мария
---

## Decision

The AI no longer writes web addresses. The code keeps a list of verified sites (each with an id, a name, a base address and the subjects it fits). The AI picks site ids and a search phrase for each task; the code builds the address from the list. A task the list does not cover keeps the web search link added by plan-building. The first list covers exams (ОГЭ, ЕГЭ) and school subjects plus a few general sites. A check run before publishing opens each address and fails when one does not open.

## Why

The AI was told to give an address only when sure, so most tasks got no material, and an address it does give may be invented. The owner called missing materials a big minus. A list the code controls removes invented addresses and gives every task a real place to start.

## Tradeoffs considered

- Keep asking the AI for addresses and check them: already done, and it yields few links.
- Let the owner write the whole list: slower, and the owner is not a programmer; she can add sites to the list later.
