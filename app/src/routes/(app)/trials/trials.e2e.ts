import { expect, test } from '@playwright/test';
import { E2E, seedDb, signInAs } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('a person records practice test results and sees growth and weak topics', async ({ page, context }) => {
	const today = todayIso();
	seedDb(`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('tr-g', '${E2E.trials.id}', 'Сдать ОГЭ', '${today}', '2030-01-01')`);
	seedDb(`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('tr-t', '${E2E.trials.id}', 'tr-g', 'Сложение дробей', '${today}')`);
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
	// A weak topic points to the goal's tasks about it, or offers to add one.
	await expect(page.getByTestId('weak-topic').filter({ hasText: 'Дроби' }).getByRole('link', { name: 'Сложение дробей' })).toHaveAttribute('href', '/goals/tr-g');
	await expect(page.getByTestId('weak-topic').filter({ hasText: 'Графики' }).getByRole('link', { name: 'Добавить пункт в план' })).toBeVisible();

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

test('a timed trial counts down, survives a reload and opens the result form with its title', async ({ page, context }) => {
	seedDb(`INSERT OR IGNORE INTO goals (id, user_id, title, start_date, deadline) VALUES ('tr-g2', '${E2E.trials.id}', 'Другая цель', '${todayIso()}', '2030-01-01')`);
	await signInAs(context, E2E.trials);
	await page.goto('/trials');
	const timer = page.getByTestId('trial-timer');
	await expect(async () => {
		await timer.getByLabel('Сколько минут').fill('0');
		await timer.getByRole('button', { name: 'Начать' }).click();
		await expect(timer.getByRole('alert')).toContainText('от 1 до 300', { timeout: 1500 });
	}).toPass({ timeout: 20000 });
	await timer.getByLabel('Название').fill('Вариант 12');
	await timer.getByLabel('Сколько минут').fill('90');
	await timer.getByRole('button', { name: 'Начать' }).click();
	await expect(page.getByTestId('timer-clock')).toContainText(/1:29:5\d|1:30:00/);

	await page.reload();
	await expect(page.getByTestId('timer-clock')).toContainText(/1:29:/);

	await page.getByRole('button', { name: 'Закончить' }).click();
	await expect(page.getByTestId('trial-form').getByLabel('Название пробника')).toHaveValue('Вариант 12');
	await expect(page.getByTestId('timer-clock')).toHaveCount(0);
});
