import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../e2e/support';
import { todayIso } from '../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('a person adds a note and their own link to a task and removes the link', async ({ page, context }) => {
	const today = todayIso();
	const sql = [
		`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('mt-g', '${E2E.materials.id}', 'Выучить Python', '${today}', '2030-01-01')`,
		`INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('mt-t', '${E2E.materials.id}', 'mt-g', 'Прочитать главу', '${today}')`,
		`INSERT INTO materials (id, user_id, task_id, kind, title, url, own) VALUES ('mt-ai', '${E2E.materials.id}', 'mt-t', 'article', 'Учебник от ИИ', 'https://example.com/ai', 0)`
	].join('; ');
	execSync(`npx wrangler d1 execute northstar --local --command "${sql}"`, { stdio: 'ignore' });
	await signInAs(context, E2E.materials);
	await page.goto('/');

	// The page must be ready before its buttons work, so the click is retried until the panel opens.
	await expect(async () => {
		await page.getByRole('button', { name: 'Изменить задачу: Прочитать главу' }).click();
		await expect(page.getByLabel('Моя заметка')).toBeVisible({ timeout: 2000 });
	}).toPass();
	await page.getByLabel('Моя заметка').fill('Читать после обеда');
	await page.getByRole('button', { name: 'Сохранить заметку' }).click();
	await expect(page.getByTestId('note')).toHaveText('Читать после обеда');

	// A plain http link is refused with a reason.
	await page.getByLabel(/Ссылка \(https/).evaluate((el: HTMLInputElement) => { el.type = 'text'; });
	await page.getByLabel(/Ссылка \(https/).fill('http://example.com');
	await page.getByRole('button', { name: 'Добавить ссылку' }).click();
	await expect(page.getByRole('alert')).toContainText('https://');

	await page.getByLabel(/Ссылка \(https/).fill('https://example.com/mine');
	await page.getByLabel(/Подпись ссылки/).fill('Моя шпаргалка');
	await page.getByRole('button', { name: 'Добавить ссылку' }).click();
	const link = page.getByTestId('materials').getByRole('link', { name: 'Моя шпаргалка' });
	await expect(link).toHaveAttribute('href', 'https://example.com/mine');

	// The planned link has no remove button; the own one does.
	await expect(page.getByRole('button', { name: /Убрать ссылку: Учебник/ })).toHaveCount(0);
	await page.getByRole('button', { name: 'Убрать ссылку: Моя шпаргалка' }).click();
	await expect(page.getByTestId('materials').getByRole('link', { name: 'Моя шпаргалка' })).toHaveCount(0);
	await expect(page.getByTestId('materials').getByRole('link', { name: 'Учебник от ИИ' })).toBeVisible();
});
