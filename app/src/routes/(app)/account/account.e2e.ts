import { expect, test } from '@playwright/test';
import { E2E, seedDb, signInAs } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

test('anyone can read the privacy page, a person downloads their data and deletes the account', async ({ page, context }) => {
	// The privacy page is open without signing in.
	await page.goto('/privacy');
	await expect(page.getByRole('heading', { name: 'Конфиденциальность' })).toBeVisible();

	const today = todayIso();
	seedDb(`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('ac-g', '${E2E.account.id}', 'Моя цель для выгрузки', '${today}', '2030-01-01')`);
	await signInAs(context, E2E.account);
	await page.goto('/account');
	await expect(page.getByTestId('export-link')).toBeVisible();

	const response = await page.request.get('/account/export');
	expect(response.headers()['content-disposition']).toContain('attachment');
	expect(JSON.stringify(await response.json())).toContain('Моя цель для выгрузки');

	// Deleting needs the word.
	await expect(async () => {
		await page.getByRole('button', { name: 'Удалить аккаунт и данные' }).click();
		await expect(page.getByTestId('delete-form')).toBeVisible({ timeout: 2000 });
	}).toPass();
	await page.getByLabel(/Напиши слово/).fill('нет');
	await page.getByRole('button', { name: 'Удалить насовсем' }).click();
	await expect(page.getByRole('alert')).toContainText('УДАЛИТЬ');
	await page.getByLabel(/Напиши слово/).fill('УДАЛИТЬ');
	await page.getByRole('button', { name: 'Удалить насовсем' }).click();
	await expect(page).toHaveURL(/\/login\?deleted=1/);
	await expect(page.getByText('Аккаунт и все данные удалены.')).toBeVisible();

	// The old session no longer works.
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
});
