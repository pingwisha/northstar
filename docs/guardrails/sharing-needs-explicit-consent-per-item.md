---
id: sharing-needs-explicit-consent-per-item
title: Nothing is shown to a friend unless the owner allowed that item, and never emails, notes or chats
status: active
date: 2026-11-27
tags: [privacy, social, guardrail]
governed-by: [0075-friends-share-only-what-each-person-allows]
derivation-note: Given 0075 (friends see only what each person allows, item by item), a friend's view must be built from explicit allow flags, with the default being nothing shared and the private areas excluded.
enforced-by: app/tests/friends.test.ts
---

## Guardrail

What a friend can read is built only from items the owner allowed: an item with no allow flag, a title without the title flag, and marks without the marks flag are not returned. A friend's view never contains an email, a Google name, a user id, notes, materials, mistakes, trials or chat messages, and ending the friendship removes access at once. A test must prove the default shows nothing and that the friend's data holds none of these fields.
