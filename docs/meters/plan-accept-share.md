---
id: plan-accept-share
title: Share of created goals whose AI plan was accepted
reads: one number 0..1 and the goal count: goals that have at least one task, divided by all goals created in the window, among active people
source: owner-only statistics page of the site (to be built), until then a read-only SQL count on the live D1 database run for the owner
capabilities: [person]
refresh: 1w
cost: 0
noise: high while there are under 10 goals; read it together with the goal count
owner: Мария
data-class: internal
retention: 12mo
---

## What one reading is

Доля целей, созданных за окно, у которых есть хотя бы одна задача (план принят), от всех созданных целей. Цели владельца и тестовые не считаются.

Запоминается только число (и размер выборки). Имён, почт и текста целей в показаниях нет (`telemetry-records-metadata-only`). Пока на сайте нет страницы «Статистика», показание снимается запросом только на чтение к боевой базе по просьбе Марии; после появления страницы владелец читает число с неё.
