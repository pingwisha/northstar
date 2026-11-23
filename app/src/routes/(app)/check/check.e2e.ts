import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('the self-check page opens from the goals page and says plainly when the AI is not connected', async ({ page, context }) => {
	seedDb(`INSERT OR IGNORE INTO goals (id, user_id, title, start_date, deadline) VALUES ('ck-g', '${E2E.zone.id}', 'Выучить английский', '${todayIso()}', '2030-01-01')`);
	await signInAs(context, E2E.zone);
	await page.goto('/goals');
	await page.getByRole('link', { name: /Проверь себя/ }).click();
	await expect(page).toHaveURL(/\/check/);
	await expect(page.getByRole('heading', { name: 'Проверь себя' })).toBeVisible();

	// No AI key in the test site: the person gets a clear message, not a broken page.
	await expect(async () => {
		await page.getByRole('button', { name: 'Задать вопросы' }).click();
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 2000 });
	}).toPass({ timeout: 20000 });
	await expect(page.getByRole('alert')).toContainText(/ИИ/);

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
