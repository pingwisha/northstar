import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../../e2e/support';

test.use({ viewport: { width: 390, height: 844 } });

test('two people become friends through a link and see each other by nickname only', async ({ browser }) => {
	const a = await browser.newContext();
	const b = await browser.newContext();
	await signInAs(a, E2E.friendA);
	await signInAs(b, E2E.friendB);
	const pageA = await a.newPage();
	await pageA.goto('/friends');
	await expect(pageA.getByTestId('friends-empty')).toBeVisible();

	let link = '';
	await expect(async () => {
		await pageA.getByLabel(/Как друг будет тебя видеть/).fill('Маша');
		await pageA.getByRole('button', { name: 'Создать ссылку' }).click();
		link = await pageA.getByLabel('Ссылка-приглашение').inputValue({ timeout: 2500 });
	}).toPass({ timeout: 20000 });
	expect(link).toContain('/friends/join/');

	const pageB = await b.newPage();
	await pageB.goto(new URL(link).pathname);
	await expect(async () => {
		await pageB.getByLabel('Твоё прозвище для друга').fill('Боря');
		await pageB.getByRole('button', { name: 'Подружиться' }).click();
		await expect(pageB.getByTestId('friend')).toContainText('Маша', { timeout: 2500 });
	}).toPass({ timeout: 20000 });

	await pageA.reload();
	await expect(pageA.getByTestId('friend')).toContainText('Боря');
	await expect(pageA.getByTestId('friend')).not.toContainText('example.com');

	const overflow = await pageA.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);

	await pageA.getByRole('button', { name: 'Перестать дружить' }).click();
	await pageA.getByRole('button', { name: 'Перестать дружить' }).last().click();
	await expect(pageA.getByTestId('friends-empty')).toBeVisible();
});
