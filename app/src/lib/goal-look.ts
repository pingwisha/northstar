// The colour and icon of a goal. Only keys from these lists are stored, never free text.
export const GOAL_COLORS = ['blue', 'violet', 'green', 'rose', 'orange', 'teal', 'amber', 'slate', 'red', 'lime', 'sky', 'brown'] as const;
export type GoalColor = (typeof GOAL_COLORS)[number];

export const GOAL_COLOR_NAMES: Record<GoalColor, string> = {
	blue: 'Синий',
	violet: 'Фиолетовый',
	green: 'Зелёный',
	rose: 'Розовый',
	orange: 'Оранжевый',
	teal: 'Бирюзовый',
	amber: 'Жёлтый',
	slate: 'Серый',
	red: 'Красный',
	lime: 'Салатовый',
	sky: 'Голубой',
	brown: 'Коричневый'
};

export const GOAL_ICONS = {
	target: '🎯',
	books: '📚',
	math: '🧮',
	speak: '🗣️',
	fit: '💪',
	work: '💼',
	art: '🎨',
	music: '🎵',
	code: '💻',
	world: '🌍',
	write: '✍️',
	run: '🏃',
	star: '⭐',
	heart: '❤️',
	home: '🏠',
	idea: '💡',
	science: '🔬',
	game: '🎮',
	cook: '🍳',
	camera: '📷',
	plant: '🌱',
	money: '💰',
	health: '🩺',
	rocket: '🚀'
} as const;
export type GoalIcon = keyof typeof GOAL_ICONS;
export const GOAL_ICON_KEYS = Object.keys(GOAL_ICONS) as GoalIcon[];
export const GOAL_ICON_NAMES: Record<GoalIcon, string> = {
	target: 'Цель',
	books: 'Книги',
	math: 'Математика',
	speak: 'Язык',
	fit: 'Спорт',
	work: 'Работа',
	art: 'Творчество',
	music: 'Музыка',
	code: 'Программирование',
	world: 'Путешествия',
	write: 'Письмо',
	run: 'Бег',
	star: 'Звезда',
	heart: 'Сердце',
	home: 'Дом',
	idea: 'Идея',
	science: 'Наука',
	game: 'Игры',
	cook: 'Кулинария',
	camera: 'Фото',
	plant: 'Растения',
	money: 'Деньги',
	health: 'Здоровье',
	rocket: 'Ракета'
};

export const isGoalColor = (v: unknown): v is GoalColor => typeof v === 'string' && (GOAL_COLORS as readonly string[]).includes(v);
export const isGoalIcon = (v: unknown): v is GoalIcon => typeof v === 'string' && Object.hasOwn(GOAL_ICONS, v);

// Unknown or missing values fall back, so a broken row never breaks a page.
export const colorOf = (v: unknown): GoalColor => (isGoalColor(v) ? v : 'blue');
export const iconOf = (v: unknown): string => (isGoalIcon(v) ? GOAL_ICONS[v] : GOAL_ICONS.target);

// The colour a new goal gets when the person did not choose: the next one in the row.
export const nextColor = (goalCount: number): GoalColor => GOAL_COLORS[goalCount % GOAL_COLORS.length];

export function parseLook(raw: { color?: unknown; icon?: unknown }, fallbackColor: GoalColor, fallbackIcon: GoalIcon = 'target'): { color: GoalColor; icon: GoalIcon } {
	return { color: isGoalColor(raw.color) ? raw.color : fallbackColor, icon: isGoalIcon(raw.icon) ? raw.icon : fallbackIcon };
}
