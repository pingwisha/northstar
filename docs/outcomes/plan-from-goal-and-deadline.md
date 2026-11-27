---
id: plan-from-goal-and-deadline
title: A person names only a goal and a deadline, the AI builds the plan, and the person keeps going
status: active
accepted-by: Мария
hypothesis: If a person only names a goal and a deadline (and describes unusual conditions), and the AI builds stages, daily tasks and materials by itself, then more people accept a plan and come back after a week, because nothing has to be set up by hand. For school and university students preparing for exams (ОГЭ, ЕГЭ) and other big goals with a deadline.
meters: [plan-accept-share, first-3-days-active, day-7-return, midpoint-percent]
target: at least 5 people with an accepted plan and at least 3 of them back on day 7 (checked a task on day 7 or later), within 30 days. Percentages are reference only (60% of goals with an accepted plan, 40% back on day 7); with under 10 people one person is more than 10%, so a percentage alone never decides.
window: 30 days, from 2026-11-23 to 2026-12-23. While it waits the unit is parked as awaiting-window and wakes every Monday (2026-11-30, 12-07, 12-14, 12-21) to take a reading; the decision is on 2026-12-23. It ends early if 10 people have been read.
attribution: Before and after the changes of 2026-11-23 (plan built at once on creation, goal page with all tasks, forgiving streak, reminders), plus a talk with every active person about why they came back or did not. Before the change there were only 3 people, so the "before" is a story, not a baseline. Breaks if the new people are friends and relatives who differ from the first three, if exam dates push motivation up, if the owner nudges people, or if the AI plan takes 2-3 minutes and people leave before seeing it.
constraints: nothing paid is bought (no domain, no paid plans); each person's data is visible only to them; the AI never invents links; only totals are read, never names, emails or goal text.
budget: 0 rubles; free Cloudflare plans and AI limits (50 requests a day for the owner, 30 for each guest, 300 in total).
effect-caps: reversible only - code changes through commits that can be rolled back; no outward effect beyond the site's own notifications to people who turned them on.
review-cadence: every Monday at each reading, and at the decision on 2026-12-23
---

## Evidence so far

On 2026-11-23 the live database had 3 people, 5 goals, 4 goals with tasks and 3 checked tasks. The owner's own run: the plan takes 2-3 minutes to build, some tasks have no material, a web search link is now added to every task without a page, and phone reminders arrive.

## Open questions

- Who can be invited, and how many (the target needs 5 people with an accepted plan).
- The statistics page for the owner does not exist yet; it is task 3 of docs/plans/plan-from-goal-and-deadline.md, and until then readings are taken with a read-only query.

## Review log

One line per reading: date, the four numbers with sample sizes, and what each active person said.
