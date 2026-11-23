import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../e2e/support';
import { todayIso } from '../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

test('an overdue task moves to tomorrow in one tap', async ({ page, context }) => {
	const today = todayIso();
	seedDb(
		[
			`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('pp-g', '${E2E.draft.id}', 'Цель для переноса', '${addDays(today, -5)}', '${addDays(today, 30)}')`,
			`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('pp-t', '${E2E.draft.id}', 'pp-g', 'Просроченная задача', '${addDays(today, -2)}')`
		].join('; ')
	);
	await signInAs(context, E2E.draft);
	await page.goto('/');
	const task = page.getByTestId('task').filter({ hasText: 'Просроченная задача' });
	await expect(async () => {
		await task.getByTestId('postpone').click();
		await expect(page.getByTestId('task').filter({ hasText: 'Просроченная задача' })).toHaveCount(0, { timeout: 2500 });
	}).toPass({ timeout: 20000 });
	await page.goto(`/calendar?day=${addDays(today, 1)}&month=${addDays(today, 1).slice(0, 7)}`);
	await expect(page.getByTestId('task').filter({ hasText: 'Просроченная задача' })).toBeVisible();
});
