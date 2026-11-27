---
id: midpoint-percent
title: Honest percent of goals at the middle of their term
reads: one number 0..100: the average honest percent of goals that have passed half of their term, with the number of such goals
source: same as plan-accept-share: statistics page or a read-only SQL count
capabilities: [person]
refresh: 1w
cost: 0
noise: very high: goals differ in size and length; use only as a side reading, never as the target
owner: Мария
data-class: internal
retention: 12mo
---

## What one reading is

Средний честный процент (по отметкам) у целей, у которых прошла половина срока, и сколько таких целей. Справочная метрика, цели не задаёт.

Запоминается только число (и размер выборки). Имён, почт и текста целей в показаниях нет (`telemetry-records-metadata-only`). Пока на сайте нет страницы «Статистика», показание снимается запросом только на чтение к боевой базе по просьбе Марии; после появления страницы владелец читает число с неё.
