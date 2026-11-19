// What the AI is told about the person in a chat: their goals, progress and the next tasks.
// Plain text, built from the stored rows. Pure: no database, no clock.
import { buildCards } from './goal-view';
import type { GoalData } from './goal-view';
import type { HomeTaskData, MaterialData } from './home-view';

const TASKS_PER_GOAL = 8;

const date = (iso: string): string => iso.split('-').reverse().join('.');

export function buildChatContext(goals: GoalData[], tasks: HomeTaskData[], today: string, materials: MaterialData[] = []): string {
	const active = goals.filter((g) => g.status === 'active');
	const lines = [`Сегодня ${date(today)}.`];
	if (active.length === 0) {
		lines.push('У человека пока нет активных целей. Предложи начать с первой цели на странице Мои цели.');
		return lines.join('\n');
	}

	const { cards, overall } = buildCards(active, tasks, today);
	lines.push(`Общий прогресс ${overall} процентов.`);
	for (const card of cards) {
		const own = tasks.filter((t) => t.goal_id === card.id);
		const open = own.filter((t) => t.completed_at === null);
		const overdue = open.filter((t) => t.planned_for < today).length;
		lines.push('', `Цель: ${card.title}. Срок ${date(card.deadline)}, ${card.daysLabel}. Прогресс ${card.percent} процентов, ${card.pace.label}.`);
		if (own.length === 0) {
			lines.push('Плана пока нет, задач нет.');
			continue;
		}
		lines.push(`Всего задач ${own.length}, не сделано ${open.length}, из них просрочено ${overdue}.`);
		lines.push('Ближайшие несделанные задачи по порядку:');
		open.slice(0, TASKS_PER_GOAL).forEach((t, i) => {
			lines.push(`${i + 1}. ${t.title}, на ${date(t.planned_for)}`);
			for (const m of materials.filter((x) => x.task_id === t.id)) {
				lines.push(`   Материал: ${m.title}. ${m.url ? `Ссылка: ${m.url}` : m.source ? `Где искать: ${m.source}` : ''}`.trimEnd());
			}
		});
		if (open.length > TASKS_PER_GOAL) lines.push(`И ещё ${open.length - TASKS_PER_GOAL} задач дальше по плану.`);
	}
	lines.push(
		'',
		'Это весь план человека. Называй только задачи из этого списка и не придумывай другие. Если нужна задача, которой нет в плане, скажи, что её нет, и предложи добавить её в план.',
		'Ссылки давай только из строк Ссылка выше, целиком и без изменений. Если у задачи нет строки Ссылка, честно скажи, что проверенной ссылки нет, и назови подсказку Где искать, если она есть.',
		'Если человек отстаёт, посоветуй нажать кнопку Я отстаю на странице Мои цели.'
	);
	return lines.join('\n');
}
