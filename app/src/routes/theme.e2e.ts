import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../e2e/support';

test.use({ viewport: { width: 390, height: 844 } });

test('the theme can be switched and is remembered', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/');
	const html = page.locator('html');
	// The page must be ready before its button works, so the click is retried until the theme changes.
	await expect(async () => {
		await page.getByTestId('theme-toggle').click();
		await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Тема: светлая', { timeout: 2000 });
	}).toPass();
	await expect(html).not.toHaveClass(/dark/);
	await page.getByTestId('theme-toggle').click();
	await expect(html).toHaveClass(/dark/);
	await page.reload();
	await expect(html).toHaveClass(/dark/);
	await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Тема: тёмная');
});

test('every page fits a phone screen in both themes', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	for (const scheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: scheme });
		for (const path of ['/', '/goals', '/calendar', '/trials', '/report', '/exam', '/chat', '/settings', '/mistakes', '/check', '/more']) {
			await page.goto(path);
			await expect(page.locator('main')).toBeVisible();
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
			expect(overflow, `${path} in ${scheme}`).toBeLessThanOrEqual(0);
		}
	}
});
