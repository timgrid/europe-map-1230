# ADR-0008: Conventional Commits + ADR + автоматические тесты

Дата: 2026-06-02

## Статус

**Accepted**

## Контекст

Проект растёт: добавлено 3 года (1300, 1400, 1492, 1500, 1530), ~10 новых сущностей,
фикс загрузки, фикс пути данных. Без формализованного процесса:

- сообщения коммитов разношёрстные (`fix: ...`, `Fix loading hang`, `Add years`);
- сложно понять, почему принято то или иное решение (проекция? источник данных?);
- регрессии (например, 404 на dev-сервере) ловятся только руками;
- нет способа убедиться, что новые ADR соответствуют формату.

## Решение

Ввести три практики:

1. **Conventional Commits** — формат `type(scope): subject`. Типы: `feat`, `fix`,
   `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   Проверяется `commitlint` в husky `commit-msg` хуке.

2. **Architecture Decision Records (ADR)** — markdown-файлы в `docs/adr/`
   с шаблоном Nygard (Status, Context, Decision, Consequences). Номер `NNNN`, slug,
   `0000-template.md` для новых записей. Ретроспективно оформлены ключевые решения
   (ADR-0001 ... ADR-0009).

3. **Автотесты (vitest)**:
   - `tests/adr.test.ts` — структура ADR (наличие секций, enum Status, сквозная нумерация);
   - `tests/commits.test.ts` — прогон `commitlint` по всей истории;
   - `tests/geoParser.test.ts` — unit-тесты `parseEuropeGeoJSON`, `getMapCenter`,
     `createExtrudedGeometry`, `createEdgeGeometry`.

CI запускает `npm test` перед сборкой; husky `commit-msg` блокирует неконвенциональные
коммиты.

## Последствия

**Плюсы:** единый стиль сообщений, история решений видна в git, регрессии геометрии
ловятся тестами. **Минусы:** overhead при первом коммите (нужно прочитать соглашения);
ADR-ы требуют дисциплины. **Риски:** неконвенциональные коммиты из прошлого
(`Initial commit`, `Add years ...`) не пройдут `test:commits` — решение: проверять
только коммиты после точки отсечения (например, `9f7ca3d`), а не всю историю.
