import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../../e2e/support';

test.use({ viewport: { width: 390, height: 844 } });

test('the owner writes a message and keeps the text when the AI is not connected', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/chat');
	await expect(page.getByRole('heading', { name: 'Чат с ИИ' })).toBeVisible();
	await page.getByLabel('Сообщение').fill('Как мои дела?');
	await page.getByRole('button', { name: 'Отправить' }).click();
	await expect(page.getByRole('alert')).toContainText('нет ключа');
	await expect(page.getByLabel('Сообщение')).toHaveValue('Как мои дела?');
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});

test('Enter sends the message and Shift+Enter makes a new line', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/chat');
	const box = page.getByLabel('Сообщение');
	await box.fill('Первая строка');
	await box.press('Shift+Enter');
	await box.type('Вторая строка');
	await expect(box).toHaveValue('Первая строка\nВторая строка');
	await box.press('Enter');
	await expect(page.getByRole('alert')).toContainText('нет ключа');
});

test('a member has the chat too, and no family page', async ({ page, context }) => {
	await signInAs(context, E2E.goals);
	await page.goto('/chat');
	await expect(page.getByRole('heading', { name: 'Чат с ИИ' })).toBeVisible();
	await expect(page.getByTestId('quick')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Семья и доступ' })).toHaveCount(0);
});

test('quick commands are offered and send their question', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/chat');
	const quick = page.getByTestId('quick');
	await expect(quick.getByRole('button')).toHaveCount(3);
	// The self-check lives on its own page; the chat only points to it.
	await expect(quick.getByRole('link', { name: 'Проверь себя' })).toHaveAttribute('href', '/check');
	// "Explain simpler" needs an earlier answer, so it is not offered in an empty chat.
	await expect(quick.getByRole('button', { name: 'Объясни проще' })).toHaveCount(0);
	await expect(async () => {
		await quick.getByRole('button', { name: 'Что делать сегодня?' }).click();
		await expect(page.getByRole('alert')).toContainText('нет ключа', { timeout: 3000 });
	}).toPass({ timeout: 20000 });
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
