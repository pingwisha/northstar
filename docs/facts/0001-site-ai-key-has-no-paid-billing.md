---
id: 0001-site-ai-key-has-no-paid-billing
title: The site's Gemini key has no paid billing, as stated by the owner
status: active
date: 2026-11-23
tags: [ai, privacy]
source: statement of the owner Мария, 2026-11-23, in the session that set up go-getter; the key itself lives in Cloudflare secrets and in the ignored .env
last-verified: 2026-11-23
scope: {component: app/src/lib/server/ai.ts, environment: production}
---

The site calls Gemini through an OpenAI-compatible address with one key (GEMINI_API_KEY). The owner buys nothing paid for the project, so the key is treated as a free-tier key. This was not checked in the Google console; if billing is ever turned on, update this fact.
