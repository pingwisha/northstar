import { expect, test } from '@playwright/test';

test('a visitor who is not signed in lands on the welcome page and can read what the site is for', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/welcome$/);
	await expect(page.getByTestId('welcome-cta')).toHaveAttribute('href', '/auth/google');
	await expect(page.getByRole('heading', { name: 'Честный процент' })).toHaveCount(0);
});

test('the welcome page speaks Russian to Russian browsers and English to the rest, and the switch overrides', async ({ browser }) => {
	const ru = await browser.newContext({ locale: 'ru-RU', extraHTTPHeaders: { 'accept-language': 'ru-RU,ru;q=0.9' } });
	const p1 = await ru.newPage();
	await p1.goto('/welcome');
	await expect(p1.getByRole('heading', { level: 1 })).toContainText('Большая цель');
	await p1.getByTestId('lang-switch').click();
	await expect(p1.getByRole('heading', { level: 1 })).toContainText('Big goal');
	await expect(p1.getByRole('link', { name: 'Privacy', exact: true })).toBeVisible();
	await ru.close();

	const en = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'accept-language': 'en-US,en;q=0.9' } });
	const p2 = await en.newPage();
	await p2.goto('/welcome');
	await expect(p2.getByRole('heading', { level: 1 })).toContainText('Big goal');
	await en.close();
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
