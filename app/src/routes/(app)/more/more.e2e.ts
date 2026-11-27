import { expect, test } from '@playwright/test';
import { E2E, signInAs } from '../../../../e2e/support';

test.use({ viewport: { width: 390, height: 844 } });

test('on a phone the rare sections are behind «Ещё» and the bottom bar stays short', async ({ page, context }) => {
	await signInAs(context, E2E.zone);
	await page.goto('/');
	const bar = page.getByRole('navigation', { name: 'Разделы' });
	await expect(bar.getByRole('link')).toHaveCount(5);
	await bar.getByRole('link', { name: 'Ещё' }).click();
	await expect(page).toHaveURL(/\/more/);
	const list = page.getByTestId('more-list');
	for (const name of ['Проверь себя', 'Пробники', 'Тетрадь ошибок', 'Недельный отчёт', 'Режим экзамена', 'Настройки', 'Мои данные', 'Написать нам']) {
		await expect(list.getByRole('link', { name: new RegExp(name) })).toBeVisible();
	}
	// A member does not see the owner's page.
	await expect(list.getByRole('link', { name: /Статистика/ })).toHaveCount(0);
	// Inside one of the sections «Ещё» stays lit.
	await list.getByRole('link', { name: /Пробники/ }).click();
	await expect(bar.getByRole('link', { name: 'Ещё' })).toHaveAttribute('aria-current', 'page');
});

test('on a wide screen every section has its own place in the side menu', async ({ page, context }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await signInAs(context, E2E.zone);
	await page.goto('/');
	const side = page.getByRole('navigation', { name: 'Разделы' });
	for (const name of ['Сегодня', 'Календарь', 'Мои цели', 'Проверь себя', 'Пробники', 'Тетрадь ошибок', 'Недельный отчёт', 'Режим экзамена', 'Чат с ИИ']) {
		await expect(side.getByRole('link', { name })).toBeVisible();
	}
	await expect(side.getByRole('link', { name: 'Ещё' })).toHaveCount(0);
});
