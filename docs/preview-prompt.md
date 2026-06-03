Промт для генерации preview-изображения 640×360 для Telegram/сторис

────────────────────────────────────────
ВАРИАНТ 1 — детальный (рекомендую)
────────────────────────────────────────

A 16:9 promotional preview image (640x360) of an interactive 3D political
map of medieval Europe. The map shows the political borders of the year 1200
in an EU4/Europa Universalis grand-strategy game visual style.

Visual style:
- Slightly tilted top-down perspective, as if viewing a tabletop war-game
  board from a 30-degree angle
- Deep navy/petrol-blue ocean (hex #0a1628) with subtle gradient
- Landmasses are extruded 3D polygons casting soft shadows on the water
- Political regions are filled with saturated, parchment-era colors:
  crimson red (Holy Roman Empire), forest green (Kingdom of France),
  royal blue (Kingdom of England), gold (Kievan Rus), teal (Byzantine Empire),
  sandy tan (Kingdom of Hungary), brown (Duchy of Poland)
- A faint golden grid/compass-rose is barely visible on the ocean
- Country borders are dark-brown thin lines
- A subtle vignette darkens the corners
- NO text labels on the map itself (labels will be added in the app)

Composition:
- Centered on Europe, with Scandinavia at top, Mediterranean at bottom
- Atlantic Ocean on the left, Eastern Europe/Rus visible on the right
- Aspect ratio 16:9, width 640px, height 360px

Mood:
- Historical, slightly cinematic, mysterious
- Soft warm light from the upper-left, cool ambient from the right
- High contrast between dark ocean and bright landmasses

Style references:
- Europa Universalis IV / V in-game political map mode
- Crusader Kings III region map
- 3D printed low-poly terrain boards

Format: PNG, 640x360 px, no transparency, no rounded corners.

────────────────────────────────────────
ВАРИАНТ 2 — компактный
────────────────────────────────────────

640x360 promo image of a 3D political map of medieval Europe in
EU4/Crusader Kings style. Tilted top-down 30° view, deep navy ocean
(#0a1628), extruded country polygons in saturated medieval colors
(crimson HRE, green France, blue England, gold Kievan Rus, teal Byzantium,
tan Hungary, brown Poland). Dark-brown borders, soft shadows, golden
compass-rose hint, subtle vignette. No text labels. Cinematic warm/cool
lighting, 16:9 aspect ratio, PNG no transparency.

────────────────────────────────────────
НЕГАТИВНЫЕ УКАЗАНИЯ (добавить в любой вариант если LLM поддерживает):
────────────────────────────────────────

Negative prompt: no text, no labels, no UI overlays, no modern elements,
no grid lines, no flat 2D top-down (must be 3D perspective), no realistic
satellite imagery, no flags, no watermarks.

────────────────────────────────────────
Где взять:
────────────────────────────────────────

- Midjourney: добавить `--ar 16:9 --v 6.1 --style raw`
- DALL·E 3: вставить вариант 1 как есть
- Stable Diffusion: вариант 1 + negative prompt
- Flux: вариант 1
- Ideogram: вариант 2 (хорошо понимает компактные)

────────────────────────────────────────
Куда положить готовый файл:
────────────────────────────────────────

- `public/preview.png` — будет доступен на https://timgrid.github.io/europe-map-1230/preview.png
- Или в корень репо → `preview.png` для README/Telegram-постинга
- Telegram Stories принимает PNG/JPEG, 1080×1920 (вертикаль) — для сторис
  надо кропнуть/расширить вертикально, либо использовать горизонтальный
  формат для in-channel preview
