import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('a person writes down a mistake, marks it fixed and finds it again', async ({ page, context }) => {
	seedDb(`INSERT OR IGNORE INTO goals (id, user_id, title, start_date, deadline) VALUES ('mk-g', '${E2E.exam.id}', 'Сдать ОГЭ', '${todayIso()}', '2030-01-01')`);
	await signInAs(context, E2E.exam);
	await page.goto('/mistakes');
	await expect(page.getByTestId('mistakes-empty')).toBeVisible();

	await expect(async () => {
		await page.getByRole('button', { name: 'Записать ошибку' }).click();
		await expect(page.getByLabel('Тема', { exact: true })).toBeVisible({ timeout: 1500 });
	}).toPass({ timeout: 20000 });
	await page.getByLabel('Тема', { exact: true }).fill('Дроби');
	await page.getByLabel(/Что пошло не так/).fill('Не сократила');
	await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
	const item = page.getByTestId('mistake').filter({ hasText: 'Дроби' });
	await expect(item).toContainText('Не сократила');

	await item.getByRole('checkbox', { name: /Отметить исправленным/ }).click();
	await expect(page.getByTestId('mistake')).toHaveCount(0);
	await page.getByRole('button', { name: /Показать исправленные/ }).click();
	await expect(page.getByTestId('fixed-list')).toContainText('Дроби');

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});

test('a mistake that is due comes back on the home page and goes after "remembered"', async ({ page, context }) => {
	seedDb(`INSERT OR IGNORE INTO goals (id, user_id, title, start_date, deadline) VALUES ('mk-g', '${E2E.exam.id}', 'Сдать ОГЭ', '${todayIso()}', '2030-01-01')`);
	seedDb(`DELETE FROM mistakes WHERE id = 'mk-review'`);
	seedDb(`INSERT INTO mistakes (id, user_id, goal_id, topic, review_step, review_due) VALUES ('mk-review', '${E2E.exam.id}', 'mk-g', 'Степени', 0, '${todayIso()}')`);
	await signInAs(context, E2E.exam);
	await page.goto('/');
	const item = page.getByTestId('review').filter({ hasText: 'Степени' });
	await expect(item).toBeVisible();
	await expect(async () => {
		await item.getByRole('button', { name: 'Вспомнил', exact: true }).click();
		await expect(page.getByTestId('review').filter({ hasText: 'Степени' })).toHaveCount(0, { timeout: 1500 });
	}).toPass({ timeout: 20000 });
});
