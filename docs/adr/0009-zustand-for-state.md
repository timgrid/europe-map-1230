# ADR-0009: Zustand для глобального состояния

Дата: 2026-06-02

## Статус

**Accepted**

## Контекст`

Нужно глобальное состояние для:
- `currentYear` (1200, 1279, ...);
- `layer` (`unified` / `principalities`);
- `selectedCountry`, `hoveredCountry`;
- `isLoading`, `reloadKey` (для retry при ошибке загрузки).

Альтернативы:
- **React Context** + `useReducer`: минимум зависимостей, но ререндер всех потребителей
  при любом изменении (нужны селекторы вручную);
- **Redux Toolkit**: мощно, но для 4-5 полей избыточно (~20 КБ);
- **Zustand**: ~1 КБ, селекторы «из коробки», middleware (persist, devtools) по желанию.

## Решение

Использовать **Zustand v5** с селекторами для каждого поля:
```ts
const currentYear = useMapStore((s) => s.currentYear)
```
Это даёт ререндер только при изменении конкретного поля. State-actions (`setYear`,
`setLoading`, `reload`) определены в одном `create()` вызове.

## Последствия`

**Плюсы:** минимальный API, нет boilerplate, tree-shakable. **Минусы:** менее строгая
типизация actions по сравнению с Redux Toolkit. **Риски:** если state-граф вырастет
(например, добавятся слои, фильтры, история выбора), может потребоваться slices
(`useMapStoreSlice`) — Zustand поддерживает это нативно.
