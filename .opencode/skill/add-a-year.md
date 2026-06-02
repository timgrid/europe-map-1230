---
name: add-a-year
description: Add a new historical year (e.g. 1450, 1600) to the Europe map. Use this skill whenever the user asks to add, enable, or support a new year, or when a missing year is mentioned in the context of the historical-basemaps data source.
---

# Add a new historical year

The app currently supports **1200, 1279, 1300, 1400, 1492, 1500, 1530**. To add a new year
(for example **1450**), follow these steps in order. Replace `1450` with the target year everywhere.

## 1. Read the conventions first

Before starting, skim:

- `AGENTS.md` — project context, "Частые задачи" section
- `docs/adr/0004-historical-basemaps-data-source.md` — data source details
- `docs/adr/0005-build-time-geojson-preprocessing.md` — preprocessing pipeline
- `scripts/process-geojson.cjs` — the script you'll modify
- `src/components/UI/YearToggle.tsx` — year list

Do not skip this. Each step below has subtleties (color palette, ID slug, Russian metadata) that
existing code already solved.

## 2. Download the source GeoJSON

```bash
curl -L -o public/world_1450.geojson \
  https://raw.githubusercontent.com/aourednik/historical-basemaps/main/geojson/world_1450.geojson
```

The file goes in `public/world_1450.geojson`. It's gitignored — do not commit it. Verify the
file is not truncated (`Get-Content ... -Tail 1` should end with a balanced `]}`).

## 3. Extend the preprocessing script

In `scripts/process-geojson.cjs`:

### 3a. Add a config entry

Find the `configs` object and add:

```js
configs[1450] = {
  bbox: configs[1300].bbox,  // reuse nearby year's bbox unless a different region is needed
  mergeInto: {
    'England and Ireland': 'England',
    // add year-specific merges here (e.g. splinter states to consolidate)
  },
}
```

### 3b. Add colors for new entities

Find `colorMap`. For each country name that doesn't have a color yet, add an entry:

```js
colorMap['Burgundian State'] = '#7B2D8E'
colorMap['Teutonic Order'] = '#222222'
```

Aim for visually distinct colors. Check existing entries for saturation/brightness conventions.

### 3c. Normalize name variants

Find `commonAliases`. Add entries for misspellings or alternate names found in the source:

```js
commonAliases['Castilla'] = 'Castile'
commonAliases['Castille'] = 'Castile'
```

### 3d. Add ID overrides if needed

In `idOverrides`, if a country's normalized name would produce an awkward ID, override it:

```js
idOverrides['Grand Duchy of Moscow'] = 'grand_duchy_of_moscow'
```

## 4. Update the UI

### 4a. Year toggle

`src/components/UI/YearToggle.tsx`:

```ts
const years = [1200, 1279, 1300, 1400, 1450, 1492, 1500, 1530]
```

Keep the array sorted ascending.

### 4b. Map labels (optional)

In `src/components/MapScene.tsx`, add the new country's ID to `labelCountries` if it should
have a label rendered on the map (e.g. major powers).

### 4c. Russian metadata

In `src/data/countryMetadata.ts`, add an entry for each new country with Russian name and
description:

```ts
'grand_duchy_of_moscow': {
  name: 'Великое княжество Московское',
  description: 'Русское государство, сложившееся в XIV веке...',
},
```

Skip metadata for tiny entities (single-village statelets) — they still render but without
a side-panel description.

## 5. Run the preprocessing

```bash
node scripts/process-geojson.cjs 1450
```

Expected output: `X countries (0 default-color)`. If you see non-zero default-color count,
inspect the GeoJSON for new entity names and add them to `colorMap` + rerun.

## 6. Add tests

In `tests/geoParser.test.ts`, no changes are typically needed (parser is generic). But:

- If you added unusual polygons (e.g. an entity with 50+ holes), consider a smoke test.
- If you added new entity types that need rendering tweaks, add a test in
  `tests/countryMetadata.test.ts` (create if missing).

## 7. Verify

```bash
npm run build      # catches type errors and broken imports
npm test           # 22+ tests must pass
npm run dev        # open http://localhost:5173/europe-map-1230/ → switch to new year
```

Visually check:

- New year appears in the toggle.
- All countries have distinct colors (no flat gray #888888).
- Labels are positioned correctly (use the `labelCountries` list).
- No console errors (open DevTools).

## 8. Commit

Use Conventional Commits:

```bash
git add scripts/process-geojson.cjs \
        src/components/UI/YearToggle.tsx \
        src/components/MapScene.tsx \
        src/data/countryMetadata.ts \
        public/data/processed/europe_1450.json

git commit -m "feat(data): add year 1450

- Download world_1450.geojson (gitignored)
- Add colorMap entries for X new entities
- Add commonAliases for Y spelling variants
- Update YearToggle and labelCountries
- Add Russian metadata for Z countries"
```

The `commit-msg` husky hook will validate the format. `pre-commit` will run `npm test`.

## 9. Do NOT

- Commit `public/world_*.geojson` — it's gitignored.
- Edit `public/data/processed/europe_*.json` by hand — always regenerate via the script.
- Reorder years in `YearToggle.tsx` non-ascending — UI expects chronological order.
- Add years below 1200 or above 1530 without checking the data source — coverage may be
  incomplete.
- Skip the `0 default-color` check — it means there are entities not in the colorMap.

## Files typically touched

```
scripts/process-geojson.cjs                  (configs, colorMap, commonAliases)
src/components/UI/YearToggle.tsx             (year list)
src/components/MapScene.tsx                  (labelCountries, if needed)
src/data/countryMetadata.ts                  (Russian descriptions)
public/data/processed/europe_<year>.json      (generated, not edited by hand)
```

Optional:

```
docs/adr/NNNN-add-year-<YEAR>.md             (only if a non-trivial decision was made)
```
