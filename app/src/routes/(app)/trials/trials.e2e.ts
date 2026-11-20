import { expect, test } from '@playwright/test';
import { E2E, seedDb, signInAs } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('a person records practice test results and sees growth and weak topics', async ({ page, context }) => {
	const today = todayIso();
	seedDb(`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('tr-g', '${E2E.trials.id}', 'Сдать ОГЭ', '${today}', '2030-01-01')`);
	await signInAs(context, E2E.trials);
	await page.goto('/trials');

	const add = async (title: string, score: string, topics: string) => {
		await expect(async () => {
			await page.getByRole('button', { name: 'Записать результат' }).click();
			await expect(page.getByLabel('Название пробника')).toBeVisible({ timeout: 2000 });
		}).toPass();
		await page.getByLabel('Название пробника').fill(title);
		await page.getByLabel('Мои баллы').fill(score);
		await page.getByLabel('Максимум').fill('30');
		await page.getByLabel(/Слабые темы/).fill(topics);
		await page.getByRole('button', { name: 'Сохранить результат' }).click();
		await expect(page.getByTestId('trial-form')).toHaveCount(0);
	};

	await add('Пробник 1', '15', 'Дроби, Графики');
	await add('Пробник 2', '21', 'Дроби');
	await expect(page.getByTestId('trial-summary')).toContainText('Последний: 70%');
	await expect(page.getByTestId('trial-summary')).toContainText('+20');
	await expect(page.getByTestId('weak-topics')).toContainText('Дроби, 2');
	await expect(page.getByRole('img', { name: /50%, 70%/ })).toBeVisible();

	// A score above the maximum is explained.
	await page.getByRole('button', { name: 'Записать результат' }).click();
	await page.getByLabel('Название пробника').fill('Ошибка');
	await page.getByLabel('Мои баллы').fill('99');
	await page.getByLabel('Максимум').fill('30');
	await page.getByRole('button', { name: 'Сохранить результат' }).click();
	await expect(page.getByRole('alert')).toContainText('больше максимума');

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
