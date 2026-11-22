import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

test('a person who fell behind recalculates the plan and sees what changed', async ({ page, context }) => {
	const today = todayIso();
	const rows = [-6, -5, -4, -3].map((d, i) => `('rp-t${i}', '${E2E.replan.id}', 'rp-g', 'Задача ${i}', '${addDays(today, d)}')`).join(', ');
	const sql = [
		`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('rp-g', '${E2E.replan.id}', 'Подготовить доклад', '${addDays(today, -7)}', '${addDays(today, 20)}')`,
		`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ${rows}`
	].join('; ');
	seedDb(sql);

	await signInAs(context, E2E.replan);
	await page.goto('/goals');
	const card = page.getByTestId('goal-card').filter({ hasText: 'Подготовить доклад' });
	await expect(card).toContainText('Отстаёшь на 4 задачи');

	await card.getByRole('button', { name: /Я отстаю/ }).click();
	// First only a preview: nothing is saved yet.
	await expect(card.getByTestId('replan-preview')).toContainText('Пока ничего не сохранено');
	await expect(card.getByTestId('replan-preview')).toContainText('Задача 0');
	await expect(card).toContainText('Отстаёшь на 4 задачи');
	await card.getByRole('button', { name: 'Применить' }).click();
	await expect(card.getByTestId('replan-summary')).toContainText('срок цели не изменился');
	await expect(card).toContainText('Успеваешь');
	await expect(card.getByRole('button', { name: /Я отстаю/ })).toHaveCount(0);
});
