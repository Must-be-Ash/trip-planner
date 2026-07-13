# knowledge.md — which endpoint for which need, and why it beats free

Decision rules for the trip-planner skill. Route intents here from `manifest.json`. Every service named
below lives in `reference/endpoints/<file>.json` with its exact `url`, `method`, `accepts[]`, `usage`
(callShape / inputExample / outputShape / quirks / guide) and `confirmGate`. **Read the endpoint's `usage`
before calling it** — the quirks matter (see `pitfalls.md`).

## §0. The spending principle (apply to every step)

**Only spend when it beats what the base model already does for free.** Pay for exactly two things:
1. **Data the model can't have** — live/real-time (prices, delays, transit, news on the dates), proprietary
   (Google Flights price history, award seats, review text at scale), or at-scale.
2. **Actions the model can't take** — book, buy, send, place a call, or render + host a durable artifact.

Do **NOT** pay to: translate text or menu/sign photos, score review sentiment, do currency arithmetic once
you have a rate, or reason about geography/plug types — the model does these free. When two endpoints do the
same job, pick the **cheapest verified** one; fall back to the next only on failure.

## §1. Orient & budget (cheap, do first)

- **Place → coordinates:** `x402node-geocoding-forward` ($0.008, Base) when a downstream call needs lat/lon
  (weather-by-coord, routing, hotels-by-geocode, activities). Skip if you already have coords or the endpoint
  takes a city name.
- **Currency for budgeting:** `fx-price` (**free**, Base, Pyth) for a spot rate; `fx-symbols` (free) for the
  pair. For **broad destination-currency coverage** (exotic pairs Pyth may not carry — THB, IDR, INR, MXN, etc.)
  use **`otto-ai-fx-rates`** ($0.001; live 12 majors + ECB ~30-currency table, base USD, Base/Polygon/Solana).
  Do the conversion arithmetic yourself — do **not** pay a "convert" endpoint. All are interbank **mid**; tell
  the user real card/ATM rates carry a ~1–3% spread (model knowledge, free).

## §2. Flights (`flights.json`) — the marquee "better than free" layer

- **Cash-fare search + when-to-buy:** `stabletravel-google-flights-search` ($0.02, Base/Solana). **Beats free:**
  returns `price_insights` (lowest price, typical range, **60-day price history**) so you can say "wait, it
  usually drops" — impossible for a free assistant reading a static OTA page. ⚠️ one-way (`type=2`) carries
  `booking_token`; round-trip (`type=1`, needs `return_date`) carries `departure_token` — different fields.
- **GDS priced offers (for seatmap/fare basis):** `stabletravel-amadeus-flight-search-get` ($0.054). ⚠️ pass
  `currencyCode=USD` (defaults EUR). Use when you need fare-basis/cabin/baggage or to drive the seatmap.
- **Fly on miles (free assistants can't):** `stabletravel-award-seats-search-seats-aero` ($0.02) → read per-cabin
  Y/W/J/F columns; `-award-trip-detail-` for segments+booking links; `-award-availability-sweep-` for a date range.
- **Seat map:** `stabletravel-amadeus-flight-seatmap` ($0.032). **Live status/delays:** `-amadeus-flight-status`
  ($0.005), `-flightaware-flight-by-ident` ($0.01), `-flightaware-airport-delays-specific` ($0.02).
- **Check-in links / alt-airport:** `-amadeus-check-in-links`, `-reference-airport-routes`, `-reference-locations-search`.
- **Booking:** `stabletravel-google-flights-booking` returns **read-only deep-links only** — there is NO verified
  cash-fare order-create (see `gaps.md`). Hand the deep-link + check-in link to the user. `flight-delay-predictor`
  is needs-review — use cautiously, label output as a prediction.

## §3. Lodging & activities (`lodging.json`)

Pipeline: **autocomplete/list → offers-search → offer-detail → book**.
- `stabletravel-hotel-autocomplete` ($0.005; use `subType=HOTEL_GDS`) or `-hotel-list-by-city` (IATA city code
  e.g. `TYO`) / `-hotel-list-by-geocode` (needs lat/lon) → hotelIds.
- `stabletravel-hotel-offers-search` ($0.032; `hotelIds` **plural**, comma-sep) or `-hotel-offers-by-hotel`
  (`hotelId` **singular** — field-name trap) → capture `offers[].id`. Future dates only.
- `stabletravel-hotel-offer-detail` right before booking (offer IDs are time-sensitive).
- **Book (🔴 RED):** `stabletravel-hotel-booking` — the x402 fee (~$0.002) only pays the API; the **room cost is
  charged to a credit card in the payload**. Pay it in USDC via the **card-funds-the-booking pattern**
  (`wallet-payment.md` §owned-assets) or use **Travala** (hotels-only MCP; USDC, no card) — see `wallet-payment.md`.
- **Activities:** `stabletravel-activities-search` ($0.054, needs lat/lon) → name/price/`bookingLink` (hand the
  link to the user; no in-flow activity booking).
- **Airport transfer:** `stabletravel-transfers-search` ($0.003; needs full address **and** `endGeoCode:"lat,long"`;
  ⚠️ charges even on a validation error — build the body right the first time) → `-transfers-book` (🔴) / `-transfers-cancel` (🔴).
- **OTA breadth (Airbnb/Booking.com):** use Apify (`apify.json`: `voyager~booking-scraper`, `tri_angle~airbnb-scraper`)
  for discovery beyond Amadeus GDS, then book via Travala/StableTravel or the listing deep-link.

## §4. Getting around (`ground-transport.json`)

- **Sequence the itinerary / "is this day feasible":** `keyronne-directions-travel-times` ($0.01, Base) — 2–10
  stops (names or coords), car/bike/foot, per-leg time+distance. **Beats free:** real travel times, not a guess.
  `relaystation-route` is the fallback. Returns a polyline, not a map image (see `gaps.md`).
- **Worldwide directions + ETA incl. PUBLIC TRANSIT (Apify):** for real Google/Apple Maps routing in any city
  (driving, walking, **transit**, turn-by-turn, ETA) use Apify (`apify.json`: `zen-studio~google-maps-directions-api`,
  `xtracto~gmaps-direction-rute`, `zen-studio~apple-maps-directions-route-api`) and `seemuapps~google-distance-matrix-scraper`
  for many-to-many travel times (day-feasibility). This goes beyond keyronne (OSM car/bike/foot) and covers the
  cities without live-transit endpoints. ⚠️ Apify holds ~$1 then refunds ~97%+ within ~1h (see §Apify note below).
- **Live real-time transit (only NYC + Japan):** `nyc-transit-live-subway-nearest` / `-bus-nearest` ($0.02, need
  lat/lon); `japan-transit-station-search` ($0.001) / `-station-status` ($0.005, rail delays). Other cities →
  keyronne (car/walk) or Apify Google Maps directions (transit).
- **Traffic incidents:** `waze-traffic` ($0.01) for jams/alerts in an area (not turn-by-turn).

## §5. Places, ratings & review text (`places-reviews.json`)

- **Find POIs:** `serper-places` ($0.002, cheapest) or `-maps` ($0.006); `google-maps-text-search-stableenrich`
  (`/partial` $0.02, `/full` w/ ratings+reviews $0.08) / `-nearby-search-` / `-place-details-`.
- **Honest verdict on a spot:** `tripadvisor-location-reviews` ($0.01) + `-location-details`/`-photos`. **Beats
  free:** hundreds of real reviews → the model summarizes/scores them itself (don't pay a sentiment endpoint).
- **Cheapest-first:** try Serper ($0.002) before Google-Maps-full ($0.08); escalate only when you need review text.

## §6. Social / real-traveler intel (`social-sentiment.json` + Apify)

- **Where locals actually go (beats listicles):** use **Apify hashtag/location scrapers** — one paid call returns
  *many* posts for a hashtag or place (`clockworks~tiktok-hashtag-scraper`, `apidojo~tiktok-location-scraper`,
  `apify~instagram-hashtag-scraper`; see the Apify note below + `apify.json`). That's **aggregated** signal — what
  a lot of people are posting about a place — and the model synthesizes it (no paid "sentiment" step).
- **Aggregated only, never one-by-one:** do NOT search video-by-video or profile-by-profile (e.g. StableSocial
  `/video-search`, `/creator-search`, `/brand-mentions`) — that spends per item hunting for a single hit and isn't
  the aggregated chatter we want. `twit-sh-tweet-search` (raw X) and Reddit are **removed/dropped**.
- **Reddit is DROPPED (2026-07-13):** `reddit-search-stableenrich` / `-post-comments-` returned low-signal
  **generic viral posts** (not Tokyo/destination content) on travel-intent keyword queries — wasted $0.04 with no
  usable signal. Do **not** call the Reddit endpoints for trip intel; lean on aggregated ratings (`places-reviews`)
  + X + Apify instead.
- **TikTok/Instagram/YouTube discovery (by keyword/place, no known URL):** use **Apify** (`apify.json`) —
  `clockworks~tiktok-hashtag-scraper`, `apidojo~tiktok-location-scraper`, `apify~instagram-hashtag-scraper`,
  `streamers~youtube-scraper` + `pintostudio~youtube-transcript-scraper`. Always set `maxTotalChargeUsd`.
  `scrape-creators-tiktok-video` ($0.02) is for a TikTok URL you already have.

## §7. Weather (`weather.json`) — drives day plan + gear list

- **Default multi-day, any city:** `hugen-weather-forecast` ($0.01; `?city=&days=1..7`). Current: `hugen-weather-current`.
- **By coordinate:** `x402-deployer-weather` ($0.005; ⚠️ numeric lat/lon only — a name string 400s **and still
  charges**; geocode first) or `open-meteo-weather` (⚠️ it's GET, param is `lng`).
- **Cheapest / regional:** `2s-io-weather` ($0.0012, US ZIP only); `japan-weather-jma` ($0.003, 6-digit JMA area
  code — Tokyo `130000`, Osaka `270000`). No hourly/climate-normals (see `gaps.md`).

## §8. News, events & safety on the dates (`news-safety.json`)

- **Local events / strikes / closures / advisories:** `stableenrich-news` ($0.04, geo+location targeted) — best
  for "anything disrupting my trip on these dates". Cheaper: `serper-news` ($0.002), `httpay-news-headlines` ($0.005).
  **Beats free:** current, date-scoped — not stale training data. No official gov-advisory feed (see `gaps.md`).
- **Concerts / sports / arts + TICKET PRICES on the dates (`events.json`):** `stabletickets-events-search` ($0.01,
  Base/Solana) — real Ticketmaster inventory with dates, venue+geo, genre, price ranges, and a buy URL. POST with
  `locale:"*"`, `includeTicketing:"yes"` + keyword/city/countryCode + start/endDateTime window. Best for US/major
  markets; for indie/local or many non-US cities, fall back to Apify (TikTok/IG) + Reddit + a web search.

## §9. Deep research / semantic (`web-research.json`)

- **Live web search:** `tavily-search` / `parallel-search` / `perplexity-search` (~$0.01). **Extract a page:**
  `parallel-extract` ($0.01/URL). **Definitive guide (async):** `parallel-deep-research-task` ($0.10–0.30) or
  `perplexity-sonar-deep-research-async` — poll to completion.
- **"Places like X":** `exa-find-similar` / `exa` / `exa-answer` / `exa-contents`; `perplexica-ai-search`.
- **Personalize across sessions:** `honcho-agent-memory` (🔴 query cost varies up to $0.50 → confirm; reads free/SIWX).

## §10. Prepare & buy (`prepare-buy.json`) — mostly 🔴 RED

- **eSIM + gift cards:** `stablegiftcards-search` (**free/SIWX**) → `-product-details` (free) → `-buy` (🔴,
  dynamic $0–500) → poll `-invoice-status` for codes/QR. User-confirmed working; do a small first buy.
- **Prepaid card (and the card-funds-booking trick):** `laso-finance-order-usa-prepaid-card` (🔴; x402 charge =
  card value) → `-get-card-data` (Bearer from `-auth`, free) for PAN/CVV; `-order-international-prepaid-card` for
  non-US; `-merchant-acceptance-search` to check acceptance first.
- **Travel gear — search AND buy+ship (Purch):** `purch-search` ($0.01, keyword) or `purch-shop` ($0.10, NL
  assistant) to find a real Amazon/Shopify product → **`purch-buy` (🔴, USDC = product total incl. tax/shipping)**
  to actually order it to the user's address. Solana USDC. **Beats free + fills the old gap:** the agent doesn't
  just link a product, it buys it. Flow: reason about what gear the destination needs (plug/voltage/climate —
  free), search, show the pick + exact total + shipping address, confirm, then buy. **Even when no adaptor is
  needed (e.g. US↔Japan both Type A), still proactively offer other useful gear** (power bank, pocket wifi,
  packing cubes, walking shoes). `channel3-commerce-product-search` / `stableninja-retail-products` remain as
  buy-link-only alternates.
- **Custom merch:** `stablemerch-custom-merch` (🔴, ships a real product).

## §11. Deliverables (`deliverables.json`) — see `reference/deliverable-design.md` for the full build
**Package it as well as the free competitor.** Deliver **two artifacts**: an **interactive HTML page** (built
from `examples/itinerary-template.html` — day tabs, hero map image, interactive Leaflet pinned map, per-spot
Open-in-Maps, gradient weather cards, phrasebook audio players, receipt) hosted via StableUpload, **plus** a
static **PDF companion**. Embed EVERYTHING you generated (hero map, phrasebook audio, directions, weather) —
nothing dropped. Authoring the HTML/CSS/JS is free; you pay only to host + for the map image. Endpoint specifics:

- **Illustrated map + day-by-day calendar — primary = `gpt-image-2` on StableStudio** (verified 2026-07-13 with a
  full 7-marker prompt that BlockRun timed out on): `POST https://stablestudio.dev/api/generate/gpt-image-2/generate`
  `{prompt, size:"1536x1024", quality:"high"}` (x402; high≈$0.17, medium/low cheaper) → `{jobId, pollUrl}` → poll
  `GET /api/jobs/{jobId}` until `status:"complete"` → `result.imageUrl` (~2–3 min). **Poll is SIWX-gated with a
  single-use nonce** — sign-per-poll dance in `pitfalls.md`. **Fallback → `gpt-image-2` on BlockRun**
  (`POST blockrun.ai/api/v1/images/generations` `{model:"openai/gpt-image-2", prompt, size, n}`; sync, returns a
  URL, ≈$0.06, no SIWX — but times out on long/dense prompts). Further fallback → **`nano-banana-pro-generate`**
  (StableStudio). It's *illustrative*, not a navigable map (gaps). If all fail, degrade to a **themed CSS hero**
  (don't spray paid retries).
- **PDF itinerary:** `makespdf-markdown-to-pdf` ($0.01, from Markdown — cheapest) or `html-to-pdf-raw-html`
  ($0.005, full CSS). Output is binary (base64 via paid_fetch — strip prefix, decode).
- **Shareable link:** `stableupload-file-upload` ($0.005–2.00) — host the PDF/image, hand over `publicUrl`.
  ⚠️ URLs expire (7d–6mo, renewable).
- **Spoken phrasebook (a real, playable deliverable — do it fully):** this is *not* just "call TTS". Build it:
  1. Pick ~8–12 essential phrases for the trip (greetings, please/thank-you, "how much?", "where is…?", allergy/
     emergency, "check please", station/taxi). **Translate them yourself — free.** For each, produce **English +
     native script + romaji** (e.g. すみません / *sumimasen* / "excuse me").
  2. TTS with **`text-to-speech-elevenlabs`** (multilingual model, **native-script input** — e.g. `すみません`, not
     `sumimasen` — so pronunciation is native, not anglicised; OpenAI TTS mispronounces non-English, see
     `pitfalls.md`). **Default: one MP3 per phrase** so each row gets its own tap-to-hear link (best for a
     phrasebook). A single combined MP3 is a cheaper fallback (fewer TTS+host calls) when cost matters — mention
     the tradeoff. `voices-free` (free) to pick a voice.
  3. **Host each MP3 on `stableupload-file-upload`** (short-10mb tier) and record the `publicUrl` — an un-hosted
     base64 blob or an expiring BlockRun URL is not a deliverable. 
  4. Deliver a **table (English / native script / romaji / when-to-use / ▶ playable link)** both **in chat AND
     embedded in the PDF**. Tell the user each link is audio to *hear* the pronunciation, not text to read. Only
     tick the checklist item once every MP3 is hosted and the table is in the PDF. (This is the piece the first
     run planned but never delivered.)
- **Email the plan (🔴):** `agentmail-send-email` ($0.01, supports attachments — attach the PDF) — reuse the
  **owned inbox** (`wallet-payment.md`); `stableemail-send` ($0.02, keyless, no attach). Don't mint a new inbox.
  **Always tell the user to check spam/junk if it's not in their inbox** — AgentMail/SES mail can land there.
- **Reminders (🔴):** **AI wake-up call → StablePhone** (`ai-phone-call`, US/CA; endpoints in
  `stable-family/stablephone.md`) + the emailed itinerary. Timing is the agent's job (no scheduler primitive).
  **No SMS/text reminders — SMS is intentionally unsupported** (no reliable keyless sender: Textbelt's shared
  quota depletes to `quotaRemaining:0` + no non-US delivery; AgentPhone needs US 10DLC; StablePhone has no
  SMS-send; the Bazaar's only sender is a sandbox mock). See `pitfalls.md`.

## §12. Cheapest-verified-first & fallback ladder

When several endpoints serve one need, prefer in this order: **(1) free** (fx, voices, gift-card search) →
**(2) cheapest verified** → **(3) next verified** on failure → **(4) needs-review / Apify** only if nothing
verified fits. Never call a `needsApproval: true` endpoint without going through `confirm-gate.md`.

## §13. Apify billing — hold-then-refund (state this in spend estimates + receipts)
Apify's direct x402 uses the **`exact`** scheme and **captures a flat ~$1.00 USDC upfront** (the
`maxTotalChargeUsd` cap; default ~$1), then **auto-refunds the unused portion ~1 hour later — typically 97%+**
(e.g. pay $1.00 → ~$0.98 back → **net ~$0.02**). An Apify call's *true* cost is only its actual usage — a few
cents. **Always** set `maxTotalChargeUsd`. When estimating or reporting spend: show the ~$1 hold **and** say
"≈97%+ auto-refunds within ~1h, so net is a few cents" — never present the raw $1 as the cost, and report Apify
as **net (after refund)** in the final receipt with a one-line note that the refund lands within the hour.
