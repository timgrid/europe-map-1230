# 3D Renderer

## Purpose

Рендер интерактивной 3D-карты в браузере с помощью React Three Fiber.

## Scene Setup

- **Canvas**: R3F, `camera.fov=18`, `camera.near=0.1`, `camera.far=800`
- **Background**: `#0a1628` (тёмно-индиго)
- **Fog**: `#0a1628`, near=300, far=600

## Lighting

| Light | Position | Intensity | Color | Notes |
|---|---|---|---|---|
| AmbientLight | — | 0.5 | `#ffd4a3` (warm) | Убирает чёрные тени |
| DirectionalLight | center-40, 100, -center+40 | 1.2 | `#ffecd1` (warm) | Кастует тени |
| HemisphereLight | — | 0.3 | Sky `#87CEEB`, Ground `#8B4513` | Дополнительное заполнение |

## Country Mesh (`src/components/CountryMesh.tsx`)

- Каждая страна — `<mesh>` с `ExtrudeGeometry`
- Depth: 0.5 (толщина государства)
- Bevel: 0.05 / 0.05 / 2 segments
- Материал: `meshStandardMaterial` с цветом из `ProcessedCountry.color`
- Обводка: `LineSegments` из `EdgeGeometry` на высоте 0.55 (над экструзией)
- При наведении: цвет светлеет (+20 brightness)
- При выборе: подсветка (фикс. контур + эффект)

## Map Geometry (`src/components/MapScene.tsx`)

- Водная поверхность: `PlaneGeometry 600×400` на Y=-0.3, dark blue `#0d2137`, transparent
- Декоративное кольцо: `PlaneGeometry 700×500` на Y=-0.4, даже темнее `#081220`
- Порядок рендера: 1) кольцо → 2) вода → 3) страны

## Camera & Controls

- `OrbitControls` (drei)
- Min polar angle: 0.1 (не уходит под карту)
- Max polar angle: 0.6 (не смотрит сверху)
- Min distance: 80 | Max distance: 400
- Enable damping: 0.05
- Left click + drag → pan (`screenSpacePanning: true`)
- Right click + drag → rotate
- Scroll → zoom
- `makeDefault` — инстанс по умолчанию

## Labels (Html)

- Для стран из `labelCountries` (major powers, ~30 стран)
- `Html` из drei, position `[center.x, 0.8, -center.y]`
- `distanceFactor: 80` — размер текста меняется с расстоянием
- Font: Georgia, serif; text-shadow для читаемости
- Размер: 14px (unified layer), 11px (principalities layer)
- Color: `rgba(255, 245, 220, 0.95)`

## Coordinate System

- XZ plane (Y up)
- `MapScene` находится в `group`, `rotation={[-PI/2, 0, 0]}` накладывает на XZ
- Y отрицательно = под карту, положительно = над картой
- `center` из ProcessedCountry → `[center.x, 0.8, -center.y]`
  (инверсия Y: d3 SVG convention → Three.js)
