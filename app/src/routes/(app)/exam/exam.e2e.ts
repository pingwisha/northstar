import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

test('exam mode counts down, shows the last weeks and adds reviews of weak topics', async ({ page, context }) => {
	const today = todayIso();
	const sql = [
		`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('ex-g', '${E2E.exam.id}', 'Сдать ОГЭ', '${today}', '${addDays(today, 20)}')`,
		`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('ex-t', '${E2E.exam.id}', 'ex-g', 'Решить вариант', '${addDays(today, 18)}')`,
		`INSERT INTO trials (id, user_id, goal_id, taken_on, title, score, max_score, weak_topics) VALUES ('ex-r', '${E2E.exam.id}', 'ex-g', '${today}', 'Пробник 1', 10, 30, 'Дроби, Графики')`
	].join('; ');
	execSync(`npx wrangler d1 execute northstar --local --command "${sql}"`, { stdio: 'ignore' });
	await signInAs(context, E2E.exam);
	await page.goto('/');
	await expect(async () => {
		await page.getByRole('link', { name: 'Режим экзамена' }).click();
		await expect(page.getByTestId('countdown')).toBeVisible({ timeout: 3000 });
	}).toPass();
	await expect(page.getByTestId('countdown')).toHaveText('20');
	await expect(page.getByTestId('exam-weeks')).toContainText('Последняя неделя перед сроком');
	await expect(page.getByTestId('exam-review')).toContainText('Дроби');

	await page.getByRole('button', { name: 'Добавить повторение в план' }).click();
	await expect(page.getByTestId('review-added')).toContainText('2');
	await expect(page.getByTestId('exam-review')).toContainText('Уже в плане');
	await expect(page.getByRole('button', { name: 'Добавить повторение в план' })).toHaveCount(0);

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
