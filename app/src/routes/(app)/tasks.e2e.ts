import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../e2e/support';
import { todayIso } from '../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('a person adds, renames and deletes their own tasks', async ({ page, context }) => {
	const today = todayIso();
	const sql = `INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('tk-g', '${E2E.tasks.id}', 'Выучить 100 слов', '${today}', '2030-01-01')`;
	execSync(`npx wrangler d1 execute northstar --local --command "${sql}"`, { stdio: 'ignore' });
	await signInAs(context, E2E.tasks);
	await page.goto('/');

	// A list pasted with one task per line becomes several tasks.
	await page.getByRole('button', { name: 'Добавить задачу' }).click();
	await page.getByLabel(/Что сделать/).fill('Первая задача\nВторая задача');
	await page.getByRole('button', { name: 'Добавить', exact: true }).click();
	await expect(page.getByTestId('task')).toHaveCount(2);

	// A mistake is explained and the text stays.
	await page.getByRole('button', { name: 'Добавить задачу' }).click();
	await page.getByLabel(/Что сделать/).fill('Из прошлого');
	await page.getByLabel('На какой день').evaluate((el: HTMLInputElement) => { el.removeAttribute('min'); el.value = '2020-01-01'; });
	await page.getByRole('button', { name: 'Добавить', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('уже прошёл');
	await expect(page.getByLabel(/Что сделать/)).toHaveValue('Из прошлого');
	await page.getByRole('button', { name: 'Добавить задачу' }).click();

	// Rename.
	await page.getByRole('button', { name: 'Изменить задачу: Первая задача' }).click();
	await page.getByLabel('Название').fill('Первая задача, уточнённая');
	await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
	await expect(page.getByTestId('task').filter({ hasText: 'Первая задача, уточнённая' })).toBeVisible();

	// Delete asks first.
	await page.getByRole('button', { name: 'Изменить задачу: Вторая задача' }).click();
	await page.getByRole('button', { name: 'Удалить задачу' }).click();
	await expect(page.getByText('Удалить задачу насовсем?')).toBeVisible();
	await page.getByRole('button', { name: 'Не удалять' }).click();
	await expect(page.getByTestId('task')).toHaveCount(2);
	await page.getByRole('button', { name: 'Удалить задачу' }).click();
	await page.getByRole('button', { name: 'Да, удалить' }).click();
	await expect(page.getByTestId('task')).toHaveCount(1);

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
