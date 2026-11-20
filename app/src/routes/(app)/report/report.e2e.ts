import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('the weekly report shows the real numbers and no AI button to a member', async ({ page, context }) => {
	const today = todayIso();
	const sql = [
		`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('wk-g', '${E2E.report.id}', 'Выучить 100 слов', '${today}', '2030-01-01')`,
		`INSERT INTO tasks (id, user_id, goal_id, title, planned_for, completed_at) VALUES ('wk-1', '${E2E.report.id}', 'wk-g', 'Первая', '${today}', '${today}T08:00:00Z'), ('wk-2', '${E2E.report.id}', 'wk-g', 'Вторая', '${today}', NULL)`
	].join('; ');
	seedDb(sql);
	await signInAs(context, E2E.report);
	await page.goto('/');
	await expect(async () => {
		await page.getByRole('link', { name: 'Недельный отчёт' }).click();
		await expect(page.getByTestId('report-range')).toBeVisible({ timeout: 3000 });
	}).toPass();
	await expect(page.getByTestId('report-totals')).toContainText('1 из 2');
	await expect(page.getByTestId('report-goal')).toContainText('Прогресс 50%');
	await expect(page.getByRole('button', { name: 'Написать итог' })).toHaveCount(0);
	await expect(page.getByText('только владельцу')).toBeVisible();
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
