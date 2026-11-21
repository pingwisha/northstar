// Congratulations on the days left before a deadline. Pure: no clock, no storage.
export const MILESTONES = [100, 50, 30, 14, 7, 3, 1, 0] as const;

export const isMilestone = (daysLeft: number): boolean => (MILESTONES as readonly number[]).includes(daysLeft);

export function milestoneMessage(daysLeft: number, title: string): string {
	if (daysLeft === 0) return `Сегодня срок цели «${title}». Ты у финиша, сделай последний рывок.`;
	if (daysLeft === 1) return `Остался 1 день до срока цели «${title}». Финишная прямая.`;
	return `До срока цели «${title}» ${daysLeft === 100 ? 'ровно 100 дней' : daysLeft === 50 ? 'ровно 50 дней' : `осталось ${daysLeft} дн.`}. Так держать.`;
}

// The key a shown congratulation is remembered under, so it appears once per goal and milestone.
export const milestoneKey = (goalId: string, deadline: string, daysLeft: number): string => `milestone:${goalId}:${deadline}:${daysLeft}`;
