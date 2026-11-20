import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

test('the calendar shows every planned day and a day opens its tasks', async ({ page, context }) => {
	const today = todayIso();
	const later = addDays(today, 3);
	const sql = [
		`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('cal-g', '${E2E.calendar.id}', 'Подготовить проект', '${today}', '${addDays(today, 60)}')`,
		`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('cal-t1', '${E2E.calendar.id}', 'cal-g', 'Написать план проекта', '${today}'), ('cal-t2', '${E2E.calendar.id}', 'cal-g', 'Собрать материалы', '${later}')`
	].join('; ');
	seedDb(sql);

	await signInAs(context, E2E.calendar);
	await page.goto('/calendar');
	await expect(page.getByTestId('month-title')).toBeVisible();
	await expect(page.getByTestId('day-title')).toBeVisible();
	await expect(page.getByTestId('day-tasks')).toContainText('Написать план проекта');

	// Checking a task in the calendar is kept.
	await page.getByRole('checkbox', { name: 'Отметить: Написать план проекта' }).click();
	await expect(page.getByRole('checkbox', { name: 'Снять отметку: Написать план проекта' })).toBeVisible();

	// Another day, in this month or the next, shows its own task.
	await page.goto(`/calendar?month=${later.slice(0, 7)}&day=${later}`);
	await expect(page.getByTestId('day-tasks')).toContainText('Собрать материалы');
	await expect(page.getByTestId('day-tasks')).not.toContainText('Написать план проекта');

	// Checking a task on another day keeps that day open (it must not jump back to today).
	await page.getByRole('checkbox', { name: 'Отметить: Собрать материалы' }).click();
	await expect(page.getByRole('checkbox', { name: 'Снять отметку: Собрать материалы' })).toBeVisible();
	await expect(page).toHaveURL(new RegExp(`day=${later}`));
	await expect(page.getByTestId('day-tasks')).toContainText('Собрать материалы');

	// An empty day says so, and the month can be turned.
	await page.goto(`/calendar?month=${today.slice(0, 7)}&day=${addDays(today, 40)}`);
	await expect(page.getByTestId('day-empty')).toBeVisible();
	await page.getByRole('link', { name: 'Следующий месяц' }).click();
	await expect(page.getByTestId('month-title')).not.toHaveText('');

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
