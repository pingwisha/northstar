import { expect, test } from '@playwright/test';
import { E2E, signInAs, seedDb } from '../../../../e2e/support';
import { todayIso } from '../../../lib/goals';

test.use({ viewport: { width: 390, height: 844 } });

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

test('a plan from the AI is only a draft until accepted, and unticked tasks stay out', async ({ page, context }) => {
	const today = todayIso();
	const plan = JSON.stringify([
		{ title: 'Основы', tasks: [{ title: 'Прочитать главу', weight: 1, materials: [] }, { title: 'Лишняя задача', weight: 1, materials: [] }] },
		{ title: 'Практика', tasks: [{ title: 'Пробный тест', weight: 2, materials: [] }] }
	]);
	seedDb(
		[
			`INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('dr-g', '${E2E.draft.id}', 'Подготовиться к экзамену', '${today}', '${addDays(today, 30)}')`,
			`INSERT INTO plan_drafts (goal_id, user_id, plan) VALUES ('dr-g', '${E2E.draft.id}', '${plan.replaceAll('"', '\\"')}')`
		].join('; ')
	);

	await signInAs(context, E2E.draft);
	await page.goto('/goals');
	const card = page.getByTestId('goal-card').filter({ hasText: 'Подготовиться к экзамену' });
	const proposal = card.getByTestId('plan-proposal');
	await expect(proposal).toContainText('Пока это только предложение');
	await expect(proposal).toContainText('Прочитать главу');

	// A draft survives a reload: it was paid for with an AI request.
	await page.reload();
	await expect(card.getByTestId('plan-proposal')).toBeVisible();

	await expect(async () => {
		await card.getByLabel('Лишняя задача').uncheck();
		await expect(card.getByLabel('Лишняя задача')).not.toBeChecked({ timeout: 1000 });
	}).toPass();
	await card.getByRole('button', { name: 'Принять план' }).click();

	await expect(card.getByTestId('plan-proposal')).toHaveCount(0);
	// The accepted plan shows its stages with a percent each.
	await card.getByText(/Этапы: 2/).click();
	await expect(card.getByTestId('stage')).toHaveCount(2);
	await expect(card.getByTestId('stage').first()).toContainText('Основы');
	await expect(card.getByTestId('stage').first()).toContainText('0%');
	await page.goto('/calendar');
	await expect(page.getByText('Лишняя задача')).toHaveCount(0);
	await page.goto('/');
	await expect(page.getByText('Прочитать главу').first()).toBeVisible();
});
