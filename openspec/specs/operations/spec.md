# Operations Specification

## Purpose
Как сайт публикуется, как меняется база и как сохраняются резервные копии. Это правила работы владельца и разработки, а не экран для человека.

## Requirements

### Requirement: Migrations in order
Система SHALL менять схему базы только пронумерованными файлами в migrations/, применяемыми по порядку, и каждая новая миграция MUST быть применена к боевой базе до публикации кода, который её использует.

#### Scenario: Новая таблица
- **WHEN** добавляется таблица или столбец
- **THEN** появляется следующий по номеру файл миграции, он применяется командой wrangler d1 migrations apply northstar --remote, и только затем публикуется сайт

#### Scenario: Тесты базы
- **WHEN** запускаются тесты с базой
- **THEN** все миграции применяются к чистой базе в Miniflare, и список таблиц сверяется с ожидаемым

### Requirement: Cascade deletion
Система SHALL хранить данные человека так, чтобы удаление записи пользователя удаляло все его строки через внешние ключи.

#### Scenario: Удаление пользователя
- **WHEN** удаляется строка users
- **THEN** его цели, задачи, материалы, пробники, записи тетради, черновики, чаты, сообщения и счётчики ИИ исчезают

### Requirement: Publishing
Система SHALL публиковаться сборкой SvelteKit для Cloudflare Pages в проект northstar, ветка main, на адрес https://northstar-5gb.pages.dev, а ключи и секреты хранить вне репозитория.

#### Scenario: Публикация
- **WHEN** выполнены сборка и wrangler pages deploy
- **THEN** новая версия доступна по адресу сайта

#### Scenario: Секреты
- **WHEN** репозиторий публикуется на GitHub
- **THEN** файлы .env и .dev.vars, папки backups/, .wrangler/ и .svelte-kit/ исключены через .gitignore, а в репозитории лежит только .env.example с названиями ключей

### Requirement: Backups
Система SHALL давать скрипт scripts/backup.sh, который сохраняет копию боевой базы в backups/ в один SQL-файл на запуск, и эти файлы MUST оставаться вне git.

#### Scenario: Резервная копия
- **WHEN** запускается scripts/backup.sh
- **THEN** создаётся файл backups/northstar-ДАТА-ВРЕМЯ.sql

### Requirement: Scheduled reminder worker
Система SHALL публиковать почасовой Worker напоминаний отдельно от сайта (папка worker/reminders, wrangler deploy), с тем же привязанным D1 и секретами VAPID_PUBLIC_KEY и VAPID_PRIVATE_KEY, и MUST хранить закрытый ключ только в секретах и в .env вне git.

#### Scenario: Публикация Worker
- **WHEN** меняется логика напоминаний
- **THEN** сайт публикуется командой wrangler pages deploy, а Worker отдельной командой wrangler deploy из worker/reminders, потому что общий код подхватывается при сборке каждого из них

#### Scenario: Ключи
- **WHEN** репозиторий публикуется
- **THEN** закрытого ключа VAPID в нём нет
