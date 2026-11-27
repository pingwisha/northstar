---
id: day-7-return
title: People who checked a task on day 7 or later after signing up
reads: one integer: people who checked a task between day 7 and day 10 after signing up, with the number of people who signed up at least 7 days ago
source: same as plan-accept-share: statistics page or a read-only SQL count
capabilities: [person]
refresh: 1w
cost: 0
noise: high: exams, holidays and the owner's invitations move it
owner: Мария
data-class: internal
retention: 12mo
---

## What one reading is

Сколько людей отметили задачу на 7-й день и позже после регистрации (до 10-го дня), из тех, кто зарегистрировался не менее 7 дней назад.

Запоминается только число (и размер выборки). Имён, почт и текста целей в показаниях нет (`telemetry-records-metadata-only`). Пока на сайте нет страницы «Статистика», показание снимается запросом только на чтение к боевой базе по просьбе Марии; после появления страницы владелец читает число с неё.
