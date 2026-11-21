import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../../e2e/support';

test.use({ viewport: { width: 390, height: 844 } });

test('a person adds a goal, sees it with 0%, changes its deadline and finishes it', async ({ page, context }) => {
	await signInAs(context, E2E.goals);
	await page.goto('/goals');
	await expect(page.getByTestId('goals-title')).toBeVisible();

	await page.getByRole('button', { name: 'Добавить цель' }).click();
	await page.getByLabel('Что хочешь получить в итоге').fill('Сдать ОГЭ на 100 баллов');
	await page.getByLabel('К какому числу').fill('2030-05-18');
	await page.getByLabel('Суббота').uncheck({ force: true });
	await page.getByLabel('Воскресенье').uncheck({ force: true });
	await page.getByLabel('Розовый').check({ force: true });
	await page.getByLabel('Книги').check({ force: true });
	await page.getByRole('button', { name: 'Сохранить цель' }).click();

	const card = page.getByTestId('goal-card').filter({ hasText: 'Сдать ОГЭ на 100 баллов' });
	await expect(card).toBeVisible();
	await expect(card.getByRole('img', { name: /0%/ })).toBeVisible();
	await expect(card).toContainText('До 18.05.2030');
	await expect(card).toContainText('плана пока нет');
	await expect(card).toHaveClass(/goal-rose/);
	await expect(card).toContainText('📚');

	await card.getByRole('button', { name: 'Изменить срок' }).click();
	await card.getByLabel('Новый срок').fill('2031-01-01');
	await card.getByRole('button', { name: 'Сохранить срок' }).click();
	await expect(card).toContainText('До 01.01.2031');

	// The page must not scroll sideways on a phone.
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);

	await card.getByRole('button', { name: 'В архив (пауза)' }).click();
	await expect(page.getByTestId('goal-card').filter({ hasText: 'Сдать ОГЭ на 100 баллов' })).toHaveCount(0);
	const archived = page.getByTestId('archived-goal').filter({ hasText: 'Сдать ОГЭ на 100 баллов' });
	await expect(archived).toBeVisible();
	await archived.getByRole('button', { name: 'Вернуть' }).click();
	await expect(card).toBeVisible();

	await card.getByRole('button', { name: 'Завершить' }).click();
	await expect(page.getByTestId('goal-card').filter({ hasText: 'Сдать ОГЭ на 100 баллов' })).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Завершённые' })).toBeVisible();
});

test('an empty goal list invites the person to add a goal', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/goals');
	await expect(page.getByText('Пока нет активных целей')).toBeVisible();
});

test('a member cannot open the family page', async ({ page, context }) => {
	await signInAs(context, E2E.goals);
	const response = await page.goto('/family');
	expect(response?.status()).toBe(403);
});
