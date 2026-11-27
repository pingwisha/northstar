---
id: 0074-free-tier-ai-key-exception
title: The site's AI key may be a free-tier Gemini key, with people told in the privacy page
status: active
date: 2026-11-23
tags: [governance, model-routing, privacy]
accepted-by: Мария
governed-facts: [0001-site-ai-key-has-no-paid-billing]
---

## Decision

Decision 0007 lets internal data go only to providers on paid no-training terms. For the site's own AI helper (not for the development agent) an exception is accepted: the helper may use a free-tier Gemini key, because nothing paid is bought for this project. The exception holds while: the privacy page tells people that Google Gemini processes what they send under its own rules; only goal text, plan context, chat messages and quiz topics are sent, never emails or names; and the daily limits stay in force.

## Why

The owner will not pay for the project, and the free tier of Gemini may use content to improve Google products. Writing the exception down is honest; leaving 0007 unchanged would pretend the site follows a rule it does not.

## Tradeoffs considered

- Move to a paid key: matches 0007 but breaks the rule of buying nothing.
- Turn the AI off: removes the main feature.
