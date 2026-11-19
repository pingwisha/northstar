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

test('a member sees that the AI is closed for now', async ({ page, context }) => {
	await signInAs(context, E2E.goals);
	await page.goto('/chat');
	await expect(page.getByTestId('chat-closed')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Чат с ИИ' })).toHaveCount(0);
});
