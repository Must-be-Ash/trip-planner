# deliverable-design.md — build a great-looking deliverable, and put EVERYTHING in it

The free competitor packages its plan beautifully: day-switcher tabs, an interactive pinned map with an
"Open route" button, per-spot cards with ratings, and a gradient weather card with icons. We provide *more*
(live prices, real reviews, forecasts, purchases) — so our presentation must match or beat theirs. Authoring a
polished interactive page is **free** (you write the HTML/CSS/JS); we only pay to host it (~$0.005) and for the
hero image. **Two artifacts, always:**

1. **Interactive HTML page (the star)** — hosted, day tabs, hero map, interactive pinned map, weather cards,
   per-spot "Open in Maps", phrasebook audio players, flight verdict, x402 receipt.
2. **PDF companion (offline)** — a static render of the same content.

## The golden rule: nothing generated gets left out
Every asset you produced or paid for **must appear in the deliverable** — this is what got missed before (the
map image and phrasebook were generated but never embedded). Before you finish, reconcile against the Step-1.5
checklist: hero map image ✅ embedded, phrasebook ✅ with audio, each recommended spot ✅ has an Open-in-Maps
link, weather ✅ as cards, flights ✅, budget ✅. If something can't be embedded, say so (⚠️) — don't drop it.

## Build the interactive HTML from the template
Use **`examples/itinerary-template.html`** — a self-contained, themeable, data-driven page. You only do two things:
1. **Fill the `TRIP` object** with real data (title, hero image URL, flight verdict, weather, facts, days →
   spots with `lat`/`lng`/rating/category/blurb, phrasebook rows with hosted `audio` URLs, receipt lines).
2. **Theme `:root`** to the destination, echoing your generated hero-map's art (see Theming below).
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
- **Hero image** — your generated pamphlet map (`gpt-image-2-generate` / `nano-banana`), hosted; put its
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

## Theming (destination-adaptive)
Set the CSS variables in `:root` to echo the place and your hero-map art. Examples:
- **Tokyo:** `--accent:#d64545` (vermilion) · `--accent-2:#1f3a5f` (indigo) · `--bg:#f7f2ea` (washi) · serif display.
- **Beach/tropical:** teal `--accent:#0ea5a4` · coral `--accent-2:#ff7059` · sand `--bg:#fff7ec`.
- **Europe/classic:** deep green/gold, warm ivory bg, an elegant serif.
Pick a display + body font pair that fits. Keep contrast high (text on the hero uses the scrim already).

## PDF companion (make it reliably non-blank)
The interactive template is JS-rendered, so **do not** count on a headless renderer to reproduce it. Instead
render a **static** version of the same content:
- Easiest + reliable: author **Markdown** and render with `makespdf-markdown-to-pdf` ($0.01) — include: the hero
  image (Markdown image; use the numbered version if you generated one), a one-line flight verdict, the weather
  summary, then per-day sections (each spot with **name + street address**, ★rating, category, blurb, and the
  **full Open-in-Maps URL** as text so it's tappable in the PDF), the **phrasebook table** (English / native /
  romaji / audio link), and the itemized x402 receipt. **Do not overlay pin numbers on the map for the PDF** —
  rely on the names + addresses (and, if generated, the numbers already baked into the hero image).
- Or author a static (no-JS) HTML and use `html-to-pdf-raw-html` ($0.005) for finer layout control.
Host the PDF (`stableupload-file-upload`, `contentType:"application/pdf"`) and put its `publicUrl` in
`TRIP.pdfUrl` so the HTML page links to it. (The template's `@media print` block also lets the user Print-to-PDF
from the browser as a bonus.)

## Deliver + explain
Give the user **both links** (interactive HTML + PDF), then email them (reuse the owned AgentMail inbox) with
both links. Tell them what's interactive ("switch days, open any spot in Maps, tap ▶ to hear the phrases").
This is the presentation layer — it's what makes the extra x402 value *feel* better than the free version.
