# deliverable-design.md — build a great-looking deliverable, and put EVERYTHING in it

> **The visual system is fixed — read `reference/DESIGN.md` and DO NOT restyle the template.** One accent
> (`#C8442A`) + tints only, off-white canvas, serif display + Inter + mono, inline **line icons (never emoji)**,
> **no gradients except the header's single subtle radial**, number-badge cards (no side/color bars). Your job
> is to **fill the `TRIP` data + set the native-script name** — not to invent colors, fonts, or layout. The two
> ugly early drafts came from per-trip theming and improvised styling; that freedom is now removed.

The free competitor packages its plan beautifully: day-switcher tabs, an interactive pinned map with an
"Open route" button, per-spot cards with ratings, and a gradient weather card with icons. We provide *more*
(live prices, real reviews, forecasts, purchases) — so our presentation must match or beat theirs. Authoring a
polished interactive page is **free** (you write the HTML/CSS/JS); we only pay to host it (~$0.005) and for the
hero image. **Two artifacts, always:**

1. **Interactive HTML page (the star)** — hosted, day tabs, hero map, interactive pinned map, weather cards,
   per-spot "Open in Maps", phrasebook audio players, flight verdict, x402 receipt.
2. **PDF companion (offline)** — a static render of the same content.

## The golden rule: nothing generated gets left out — and fill it COMPLETELY
Every asset you produced or paid for **must appear in the deliverable** — this is what got missed before (the
map image and phrasebook were generated but never embedded). Before you finish, reconcile against the Step-1.5
checklist: hero map image ✅ embedded, phrasebook ✅ with audio, each recommended spot ✅ has an Open-in-Maps
link, weather ✅ as cards, flights ✅, budget ✅. If something can't be embedded, say so (⚠️) — don't drop it.

**Fill the COMPLETE plan, not the template's example counts.** The template ships trimmed placeholders (2 days,
a few phrases) for readability — a real run includes **EVERY day of the trip**, **ALL ~8–12 phrasebook rows**,
every recommended spot, and a full **"Before you go"** section. Never ship the 2-day / 3-phrase placeholder.

**Two distinct sections (don't merge them):** `facts` ("Good to know") = at-a-glance *references* only —
currency, plug, timezone, emergency numbers. `prep` ("Before you go") = what you *did/bought/should grab* — the
eSIM (with its QR link + a "Bought" chip), adaptor/gear (or "Not needed"), prepaid card, and a phrasebook pointer
(`link:"#phrasebook"`). Putting "eSIM bought" or "phrasebook" in the facts row is wrong — they go in prep.

## The template is a STARTING POINT, not a straitjacket (add / remove / reorder — don't just inject)
Fill it with data, **and adapt it to the actual trip**:
- **Remove** any section you have no real data for — don't show an empty or padded block (empty ones auto-hide,
  but also don't invent filler to fill a slot).
- **Add your own sections** for things you researched that have **no slot** — e.g. a *Neighborhoods* guide, a
  *Food & drink* shortlist, a *Day-trip* option, *Etiquette & safety*, a *Budget breakdown*, *Getting around*.
  Build them **on the fixed system** (see the reusable blocks below) — same tokens, one accent, line icons,
  eyebrow + section pattern. A new section is welcome; a new *color/gradient/emoji/font* is not.
- **Reorder** sections to match the trip's emphasis (a food trip leads with food; a nature trip with day-trips).
- The goal: the page reflects **what you actually found**, not a fixed 5-slot form with data poured in.

**Reusable building blocks (already in the template — compose these for a new section):**
- `eyebrow("iconName","SECTION LABEL")` — the accent mono section header (use before every section).
- `.strip` → one panel split into `.col` columns by hairlines (great for compact stats/facts/weather).
- `.preplist` → one panel of `.item` rows divided by hairlines (great for checklists / grouped items).
- `.card` → a surface card (use sparingly — for a single callout like the flight verdict, or per-spot).
- The **spot card** pattern (number badge + name + meta + address + Directions) for any place list.
Vary the format so the page doesn't become a wall of identical cards (weather/facts are strips, prep is a list).

## Build the interactive HTML from the template
Use **`examples/itinerary-template.html`** — a self-contained, data-driven page. You do two things (then adapt per above):
1. **Fill the `TRIP` object** with real data (title, hero image URL, flight verdict, weather, facts, days →
   spots with `lat`/`lng`/rating/category/blurb, phrasebook rows with hosted `audio` URLs, receipt lines).
2. **Set `TRIP.nativeName`** to the destination's native script (東京 / Roma / Αθήνα). **Do NOT change the CSS,
   colors, fonts, or layout** — the design is fixed for every trip (see `DESIGN.md`); the theme shows only in the
   native name, the illustrated map art, and the words.
It renders (safely, via DOM text nodes — no innerHTML) the tabs, the Leaflet pinned map per day, weather strip,
spot cards, phrasebook table with `<audio>` players, and the receipt. Empty sections auto-hide.

Then **host it**: `stableupload-file-upload` with `filename:"itinerary.html"`, `contentType:"text/html"`, upload
the bytes, hand the user the `publicUrl`.

## Data you need (and where it comes from)
- **Coordinates** (`lat`/`lng`) for every spot — from `x402node-geocoding-forward`, Tripadvisor
  `location.latitude/longitude`, or Google Maps place details. Coords make both the **pins** and the
  **Open-in-Maps directions** accurate; without them the map falls back to a name search (less precise).
- **Rating / category / blurb / ADDRESS** — from Tripadvisor `location` / Google Maps place details (you already
  fetch these). **Always capture the street address** for each spot and show it on the card (`📍`) and in the PDF.
- **Weather** — from the weather endpoints; map the condition/WMO code to an emoji for the cards:
  `0 ☀️ · 1–2 🌤️ · 3 ☁️ · 45/48 🌫️ · 51–67 🌦️ · 71–77 ❄️ · 80–82 🌧️ · 95–99 ⛈️`. Put the current temp + a
  5-day row with icons + hi/lo (+ precip%) — **never a raw number dump**.
- **Hero image** — your generated pamphlet map via `gpt-image-2` (**StableStudio** primary → **BlockRun** fallback → `nano-banana-pro` on StableStudio), hosted; put its
  `publicUrl` in `TRIP.heroImageUrl`. **If you want the map to show numbered stops, bake the numbers into the
  image at generation time** — prompt the model to draw numbered markers/pins in itinerary order (e.g. "a
  tourism-pamphlet illustrated map of Tokyo with numbered markers 1–8 at these neighborhoods…"). **Never overlay
  numbers on the image afterward** — it looks bad. The interactive Leaflet map already has real numbered pins.
- **Phrasebook audio** — host each MP3 (`stableupload-file-upload`); put each `publicUrl` in the row's `audio`.

## Open-in-Maps links (free — just URLs)
- **One spot (directions):** `https://www.google.com/maps/dir/?api=1&destination=<lat,lng or url-encoded name>`
- **Whole-day route:** `.../dir/?api=1&destination=<last>&waypoints=<a>|<b>|...` (origin = the user's location).
- **Just show a place:** `https://www.google.com/maps/search/?api=1&query=<name>`
The template builds these for you from each spot's `lat`/`lng` (preferred) or `name`.

## Theming — DON'T (the system is fixed)
There is **no per-destination theming**. The palette (one accent `#C8442A` + tints, off-white bg, white surface,
one border), the fonts (Fraunces / Inter / JetBrains Mono), spacing, radii, and every component are locked in
`DESIGN.md` + the template. The trip's personality is expressed **only** through: (1) `TRIP.nativeName` in the
header, (2) the illustrated map image, (3) the copy. Do not swap the accent, add a second hue, add gradients
(other than the header's built-in radial), or change fonts/layout. If a review flags a color/gradient/emoji/side
-bar, it's a bug — fix it back to the system.

## PDF companion (make it reliably non-blank)
The interactive template is JS-rendered, so **do not** count on a headless renderer to reproduce it. Instead
render a **static** version of the same content.
- **The PDF is STATIC — it must NOT contain interactive-only elements (learned 2026-07-13):** (a) **omit the
  Leaflet map + "Open day route" buttons** entirely — in a PDF they're a dead tile with useless +/- zoom; rely on
  the hero image + each spot's **Open-in-Maps URL as text**; (b) the phrasebook must have **NO audio players /
  "Listen" column** (say "audio is in the interactive web version"); (c) **reveal ALL day sections** — the
  interactive template hides days behind tabs (`.day{display:none}`), so a naive render shows only Day 1. If you
  produce the PDF by rendering the interactive HTML with headless Chrome, first derive a static copy that strips
  the map section + the audio column and un-hides every `.day` — never print the interactive page as-is (that's
  exactly how a live map, dead audio players, and a Day-1-only PDF slipped in once).
- Easiest + reliable: author **Markdown** and render with `makespdf-markdown-to-pdf` ($0.01) — include: the hero
  image (Markdown image; use the numbered version if you generated one), a one-line flight verdict, the weather
  summary, then per-day sections (each spot with **name + street address**, ★rating, category, blurb, and the
  **full Open-in-Maps URL** as text so it's tappable in the PDF), the **phrasebook table** (English / native /
  romaji / when — **no audio/Listen column**; the tap-to-hear players live only in the interactive page), and the
  itemized x402 receipt. **Do not overlay pin numbers on the map for the PDF** —
  rely on the names + addresses (and, if generated, the numbers already baked into the hero image).
- Or author a static (no-JS) HTML and use `html-to-pdf-raw-html` ($0.005) for finer layout control.
Host the PDF (`stableupload-file-upload`, `contentType:"application/pdf"`) and put its `publicUrl` in
`TRIP.pdfUrl` so the HTML page links to it. (The template's `@media print` block also lets the user Print-to-PDF
from the browser as a bonus.)

## Deliver + explain
Give the user **both links** (interactive HTML + PDF), then email them (reuse the owned AgentMail inbox) with
both links. Tell them what's interactive ("switch days, open any spot in Maps, tap ▶ to hear the phrases").
This is the presentation layer — it's what makes the extra x402 value *feel* better than the free version.
