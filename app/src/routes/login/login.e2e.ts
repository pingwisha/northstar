import { expect, test } from '@playwright/test';

test('a visitor who is not signed in lands on the welcome page and can read what the site is for', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/welcome$/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Большая цель');
	await expect(page.getByRole('list', { name: 'Как это работает' }).or(page.getByRole('heading', { name: 'Как это работает' }))).toBeVisible();
	await expect(page.getByTestId('welcome-cta')).toHaveAttribute('href', '/auth/google');
	await expect(page.getByRole('link', { name: 'Конфиденциальность' })).toBeVisible();
});

test('the sign-in page is still there', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByRole('link', { name: 'Войти через Google' })).toBeVisible();
});

test('the family page is closed to a visitor who is not signed in', async ({ page }) => {
	await page.goto('/family');
	await expect(page).toHaveURL(/\/login$/);
});

test('a refused sign-in explains what to do', async ({ page }) => {
	await page.goto('/login?error=not_allowed');
	await expect(page.getByRole('alert')).toContainText('не в списке приглашённых');
});

test('the welcome page fits a phone screen', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/welcome');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
