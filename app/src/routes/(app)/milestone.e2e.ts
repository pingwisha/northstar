import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../e2e/support';
import { todayIso } from '../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('a goal seven days from its deadline is congratulated once', async ({ page, context }) => {
	const today = todayIso();
	const deadline = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
	seedDb(`INSERT OR IGNORE INTO goals (id, user_id, title, start_date, deadline) VALUES ('ms-g', '${E2E.trials.id}', 'Выучить 100 слов', '${today}', '${deadline}')`);
	await signInAs(context, E2E.trials);

	await expect(async () => {
		await page.goto('/');
		await expect(page.getByTestId('milestone')).toContainText('осталось 7', { timeout: 3000 });
	}).toPass({ timeout: 20000 });

	await page.getByRole('button', { name: 'Спасибо' }).click();
	await expect(page.getByTestId('milestone')).toHaveCount(0);
	await page.reload();
	await expect(page.getByTestId('nearest')).toBeVisible();
	await expect(page.getByTestId('milestone')).toHaveCount(0);
});
