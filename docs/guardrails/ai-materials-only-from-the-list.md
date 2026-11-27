---
id: ai-materials-only-from-the-list
title: Materials in a plan come only from the verified site list or the search link
status: active
date: 2026-11-23
tags: [product, ai, guardrail]
governed-by: [0072-materials-only-from-a-verified-list]
derivation-note: Given 0072 (materials only from a verified list), an address written by the AI must never reach a person as a material.
enforced-by: app/src/lib/server/plan.ts
---

## Guardrail

An address written by the AI is never shown as a material. Every material URL comes from the verified site list (built by the code from a site id and a phrase) or is the generated web search link.
