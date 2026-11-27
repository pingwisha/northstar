import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../../e2e/support';

test.use({ viewport: { width: 390, height: 844 } });

test('a person picks an accent colour and a text size, and they stay after a reload', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/settings');
	const html = page.locator('html');
	await expect(html).not.toHaveAttribute('data-accent', /.+/);

	await expect(async () => {
		await page.getByTestId('accent-violet').click();
		await expect(html).toHaveAttribute('data-accent', 'violet', { timeout: 1500 });
	}).toPass({ timeout: 20000 });
	await page.getByTestId('size-large').click();
	await expect(html).toHaveAttribute('data-size', 'large');

	await page.reload();
	await expect(html).toHaveAttribute('data-accent', 'violet');
	await expect(html).toHaveAttribute('data-size', 'large');
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);

	await page.getByTestId('accent-blue').click();
	await page.getByTestId('size-normal').click();
	await page.reload();
	await expect(html).not.toHaveAttribute('data-accent', /.+/);
	await expect(html).not.toHaveAttribute('data-size', /.+/);
});

test('a person picks a font and a hue of their own for the buttons, and they stay after a reload', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/settings');
	const html = page.locator('html');
	await expect(html).not.toHaveAttribute('data-font', /.+/);

	await expect(async () => {
		await page.getByTestId('font-serif').click();
		await expect(html).toHaveAttribute('data-font', 'serif', { timeout: 1500 });
	}).toPass({ timeout: 20000 });
	await page.getByTestId('hue').fill('140');
	await expect(html).toHaveAttribute('data-accent', 'custom');
	await expect(html).toHaveCSS('--hue', '140');

	await page.reload();
	await expect(html).toHaveAttribute('data-font', 'serif');
	await expect(html).toHaveAttribute('data-accent', 'custom');
	await expect(html).toHaveCSS('--hue', '140');
	expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Georgia');

	// A ready colour cancels the own hue; the normal font comes back.
	await page.getByTestId('accent-violet').click();
	await expect(html).toHaveAttribute('data-accent', 'violet');
	await page.getByTestId('font-normal').click();
	await page.reload();
	await expect(html).not.toHaveAttribute('data-font', /.+/);
	await expect(html).toHaveAttribute('data-accent', 'violet');
	await page.getByTestId('accent-blue').click();
});

test('a new person sees the welcome with three steps', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/');
	await expect(page.getByTestId('home-empty')).toContainText('Добро пожаловать');
	await expect(page.getByRole('list', { name: 'Как это работает' }).getByRole('listitem')).toHaveCount(3);
});

test('the settings page has the reminders block and says plainly when reminders are not set up', async ({ page, context }) => {
	await signInAs(context, E2E.owner);
	await page.goto('/settings');
	const block = page.getByTestId('reminders');
	await expect(block).toBeVisible();
	await expect(block).toContainText('Раз в день');
	// The test site has no push keys, so the person is told instead of seeing a button that fails.
	await expect(block).toContainText('ещё не настроены');
	await expect(page.getByTestId('reminder-on')).toHaveCount(0);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});
