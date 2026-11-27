---
id: first-3-days-active
title: People who checked at least one task within 3 days of signing up
reads: one integer: people who signed up in the window and checked at least one task in their first 3 days, with the number of people who signed up
source: same as plan-accept-share: statistics page or a read-only SQL count
capabilities: [person]
refresh: 1w
cost: 0
noise: high: one person moves it by a third while there are 3 people
owner: Мария
data-class: internal
retention: 12mo
---

## What one reading is

Сколько людей, зарегистрировавшихся за окно, отметили хотя бы одну задачу в первые 3 дня после регистрации, и сколько всего зарегистрировалось.

Запоминается только число (и размер выборки). Имён, почт и текста целей в показаниях нет (`telemetry-records-metadata-only`). Пока на сайте нет страницы «Статистика», показание снимается запросом только на чтение к боевой базе по просьбе Марии; после появления страницы владелец читает число с неё.
