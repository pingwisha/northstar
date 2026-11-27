# Northstart (репозиторий и адрес по-прежнему называются northstar)

Личный проджект-менеджер для больших целей: цель и срок, план по дням, честный прогресс и ИИ-помощник.

- Сайт: https://northstar-5gb.pages.dev
- Актуальное поведение системы: openspec/specs/ (по одной папке на возможность).
- История решений: docs/stage-1.md, docs/stage-2.md, планы docs/plan-stage-*.md.
- Запуск и проверки из папки app/: npm run dev, npm run check, npx vitest run, npx playwright test.
- Перед публикацией из папки app/: node scripts/check-sites.mjs (каждый сайт из app/src/lib/sites.ts должен открываться).
