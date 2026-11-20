import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from './support';
import { todayIso } from '../src/lib/goals';

// One of two zones 25 hours apart always has a different date from the default one.
const now = new Date();
const zone = todayIso(now, 'Pacific/Kiritimati') !== todayIso(now) ? 'Pacific/Kiritimati' : 'Pacific/Pago_Pago';

test.use({ viewport: { width: 390, height: 844 }, timezoneId: zone });

test("'today' follows the person's own time zone, not the site's", async ({ page, context }) => {
	const there = todayIso(new Date(), zone);
	const sql = [
		`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('zn-g', '${E2E.zone.id}', 'Цель в другом поясе', '${there}', '2030-01-01')`,
		`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('zn-t', '${E2E.zone.id}', 'zn-g', 'Задача на мой сегодняшний день', '${there}')`
	].join('; ');
	seedDb(sql);
	await signInAs(context, E2E.zone);
	await page.goto('/');
	// The first load may still use the default zone; the browser then tells the site its zone and the page reloads the day.
	await expect(page.getByTestId('task').filter({ hasText: 'Задача на мой сегодняшний день' })).toBeVisible();
	await expect(page.getByTestId('task')).toHaveCount(1);
});
