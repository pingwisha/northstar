import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../e2e/support';
import { todayIso } from '../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

// Puts a goal with two tasks planned for today straight into the local database.
function seedGoal(): void {
	const today = todayIso();
	const sql = [
		`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('home-g', '${E2E.home.id}', 'Выучить 100 слов', '${today}', '2030-01-01')`,
		`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('home-t1', '${E2E.home.id}', 'home-g', 'Первые десять слов', '${today}'), ('home-t2', '${E2E.home.id}', 'home-g', 'Повторить слова', '${today}')`
	].join('; ');
	seedDb(sql);
}

test('checking a task changes the percent at once', async ({ page, context }) => {
	await signInAs(context, E2E.home);
	await page.goto('/');
	await expect(page.getByTestId('home-empty')).toBeVisible();

	seedGoal();
	await page.goto('/');
	await expect(page.getByRole('img', { name: /Общий прогресс: 0%/ })).toBeVisible();
	await expect(page.getByTestId('task')).toHaveCount(2);
	await expect(page.getByTestId('nearest')).toContainText('Выучить 100 слов');
	await expect(page.getByTestId('streak')).toContainText('отметь задачу');

	await page.getByRole('checkbox', { name: 'Отметить: Первые десять слов' }).click();
	await expect(page.getByRole('img', { name: /Общий прогресс: 50%/ })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: 'Снять отметку: Первые десять слов' })).toBeVisible();
	await expect(page.getByTestId('streak')).toContainText('Серия: 1 день подряд');
	await expect(page.getByTestId('tile-week')).toHaveText('1');
	await expect(page.getByTestId('week-chart')).toHaveAttribute('aria-label', /Задач сделано по дням/);
	await expect(page.getByTestId('goal-chip')).toContainText('Выучить 100 слов');

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});

test('a quick line with a day in the text creates a task on that day', async ({ page, context }) => {
	seedDb(`INSERT OR IGNORE INTO goals (id, user_id, title, start_date, deadline) VALUES ('home-g', '${E2E.home.id}', 'Выучить 100 слов', '${todayIso()}', '2030-01-01')`);
	seedDb(`DELETE FROM tasks WHERE title LIKE '%quick-e2e%'`);
	await signInAs(context, E2E.home);
	await page.goto('/');
	const form = page.getByTestId('quick-add');
	await expect(async () => {
		await form.getByLabel('Быстрая задача').fill('сегодня в 18:00 quick-e2e проверка');
		await form.getByRole('button', { name: 'Добавить' }).click();
		await expect(page.getByTestId('task').filter({ hasText: '18:00' })).toBeVisible({ timeout: 2500 });
	}).toPass({ timeout: 20000 });
});
