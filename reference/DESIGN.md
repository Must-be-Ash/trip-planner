---
name: "trip-planner itinerary"
description: "The fixed visual system for the trip-planner deliverable (interactive HTML + PDF). Minimal, editorial, professional. One accent, off-white canvas, serif display + sans body, line icons. The agent FILLS the template with data — it does NOT invent styling. Theme is expressed only through the destination's native-script name and the illustrated map, never through color or layout."
colors:
  accent:        "#C8442A"   # THE one accent (vermilion). Used for actions, active states, the number badges, the header glow.
  accent-600:    "#A8371F"   # hover / pressed
  accent-100:    "#F6E3DD"   # tint — chips, subtle fills
  accent-050:    "#FBF1EE"   # faintest tint — table zebra, hovers
  ink:           "#1A1815"   # primary text + the dark header base
  ink-70:        "#5B564E"   # secondary text
  ink-40:        "#8B857A"   # tertiary / captions
  bg:            "#F4F1EA"   # off-white page canvas
  surface:       "#FFFFFF"   # cards / tables
  border:        "#E7E1D6"   # the ONE hairline border color
typography:
  display:  { fontFamily: "Fraunces, Georgia, serif",        role: "big headings + the native-script name" }
  body:     { fontFamily: "Inter, system-ui, sans-serif",    role: "all body copy, buttons, cards" }
  label:    { fontFamily: "JetBrains Mono, ui-monospace, monospace", role: "small labels/metadata, UPPERCASE, letter-spacing .06em" }
  scale:
    display-xl: "clamp(44px, 8vw, 76px) / 0.98"   # the native name (東京)
    display-lg: "clamp(26px, 4vw, 36px) / 1.08"   # trip title
    h2:         "21px / 1.2"
    body:       "16px / 1.6"
    small:      "13.5px / 1.5"
    label:      "12px / 1.2"
spacing:   { base: "8px", gap: "16px", card-padding: "22px", section: "clamp(40px, 7vw, 64px)", max-width: "880px" }
rounded:   { card: "14px", control: "9px", pill: "9999px" }
shadow:
  card:  "0 1px 2px rgba(26,24,21,.04)"          # hairline lift only
  float: "0 10px 30px rgba(26,24,21,.08)"        # sparingly (hero image, active map)
icons:     "Lucide / Feather line icons, inline SVG, 1.75px stroke, currentColor, 18–20px. NEVER emoji."
---

# trip-planner itinerary — design system

The first two runs looked amateur: gradients everywhere, a rainbow of day buttons, emoji icons, a left color bar
on cards, no consistent palette. This document + `examples/itinerary-template.html` fix that by removing the
freedom that produced it. **Fewer choices → better, more consistent output.** The template is the source of
truth; the agent fills the `TRIP` data object and sets the native-script name — it must not restyle it.

## Philosophy
Minimal, editorial, professional — the feel of a well-made travel magazine or a considered product page, not a
SaaS dashboard. **Less is more, but never bland:** confidence comes from generous whitespace, a strong type
hierarchy, one decisive accent, and crisp hairlines — not from adding color. When something needs emphasis or
grouping, use **space, weight, and tints of the one accent** — never a new hue.

## Where the theme is expressed (and ONLY here)
The design is identical for every destination. The trip's personality shows up in exactly three places:
1. **The native-script name in the header** (e.g. 東京, ロ124, Roma, Αθήνα) — large, in the display serif.
2. **The illustrated map image** (its art carries the local flavor).
3. **The words** — copy, spot names, the flight verdict.
Do **not** change colors, fonts, spacing, or layout per destination. No "Tokyo palette", no per-trip theming.

## Color
- **Exactly one accent: `#C8442A`.** Everything colored is either the accent, a **tint** of it (`accent-100`,
  `accent-050`) or `accent-600` for hover. For any color-coding (day chips, weather emphasis, active tab) use
  the accent + its tints/opacity — **never** introduce blue/green/purple/yellow. No rainbows.
- Text is `ink` / `ink-70` / `ink-40`. Canvas is `bg` (off-white). Cards/tables are `surface` (white). Every
  divider/outline is the single `border` hairline. Maintain WCAG AA contrast (accent on white is AA for large/bold;
  for small text use `ink`).
- **No gradients anywhere — with ONE exception:** the header may use a single, *very subtle radial* gradient
  (one hue: a faint accent glow or an ink-to-darker-ink radial) to feel distinguished, not flat. Low contrast,
  no hard color stops, no multi-hue mixes. Nothing else on the page gets a gradient.

## Typography
- **Display serif (Fraunces)** for the native name + trip title + section headings — this is the editorial voice.
- **Inter** for all body, cards, buttons, tables.
- **JetBrains Mono** for tiny labels/metadata only (e.g. "DAY 02", "★ 4.6", price tags), UPPERCASE, tracked.
- One size scale (frontmatter). Big type + lots of leading; don't crowd.

## Icons
Inline **line icons** (Lucide/Feather), stroke `currentColor`, ~18–20px, 1.75 stroke. Bundle the handful you need
as inline `<svg>` (offline-safe). Map each concept to a line icon (sun/cloud/rain, plane, map-pin, utensils,
train, ticket, phone, wallet, clock). **Never use an emoji** — no ☀️🍜✈️🔊📍.

## Layout & components (all in the template)
- **Single column**, `max-width 880px`, centered, generous `section` rhythm. Hairline borders over heavy shadows.
- **Header:** distinguished dark-ink band with the one subtle radial; the native name (display-xl) + trip title
  (display-lg) + a mono meta line + a single row of quiet chips (accent-tint). Illustrated map sits just below as
  a **framed** image (border + `float` shadow + card radius) — not a full-bleed background.
- **Day tabs:** pill row; inactive = ink-70 on transparent, active = accent fill, white text. One color only.
- **Spot card:** white surface, hairline border, `card` radius. **Number badge** (accent circle) at left — this is
  the numbering, **NOT a left color bar**. Then time-label (mono), name (serif), a mono meta line (★ rating ·
  category), the `📍`→**map-pin line icon** + address, a short blurb, and an outline "Directions" button.
  **No left/side accent border on any card.**
- **Weather:** a row of equal cards on `surface` with a hairline border, a line weather-icon, the temp in the
  display serif, and a small mono caption. **No gradient fills, no 4 different colors** — identical card styling;
  emphasis (e.g. a rain day) via an `accent-100` chip, not a colored card.
- **Header native name:** render the native-script name (東京) as a **large translucent background watermark**
  inside the dark header (low opacity ~.10, clipped) — the English title is the readable foreground. Not a solid
  foreground heading.
- **Map:** framed (border + radius). Use **CARTO Positron** minimal light tiles
  (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`) — a calm light-grey street map, NOT the busy
  default OSM tiles and NOT satellite. Leaflet pins are the accent circle with a white number. One color.
- **"Good to know" vs "Before you go":** `facts` = at-a-glance *references* only (currency, plug, timezone,
  emergency) — never purchases. Everything you *did/bought/should grab* (eSIM, adaptor/gear, prepaid card,
  phrasebook pointer) goes in the **"Before you go"** prep section as items with a short status chip + optional link.
- **Receipt:** plain table; **do not** put the Apify hold/refund disclaimer in the artifact — the agent explains
  that in chat, not on the page.
- **Phrasebook:** clean table, mono header row in ink, zebra via `accent-050`, an audio control per row.
- **Receipt:** plain table, right-aligned amounts, total in bold; a mono caption for the Apify-refund note.
- **Buttons:** primary = accent fill / white text / `control` radius; secondary = ink outline, transparent.

## Motion
Restrained: 120–180ms ease on hover (cards lift 1px via border darken, buttons darken to `accent-600`), tab
switches fade/slide subtly. No bounce, no parallax, no auto-playing anything.

## Guardrails (hard NOs — a reviewer should reject any of these)
- ❌ Any gradient other than the single subtle radial in the header.
- ❌ Any hue other than the accent + its tints (no blue/green/purple/yellow, no rainbow day buttons).
- ❌ Emoji anywhere (use line icons).
- ❌ A colored vertical bar / left border on cards (use the number badge + hairline).
- ❌ Per-destination re-theming of color/type/layout.
- ❌ Heavy/multiple drop shadows, neon, glassmorphism, or generic SaaS hero clutter.
- ❌ The agent rewriting the CSS/structure — fill the `TRIP` data + native name only; adjust content, not the system.
