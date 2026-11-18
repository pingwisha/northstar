import { expect, test } from '@playwright/test';

test('a visitor who is not signed in lands on the sign-in page', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
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
