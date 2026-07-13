# gaps.md — what the catalog still can't do (hunt-list + fallbacks)

A "gap" is **data or an action the model genuinely lacks** — NOT something the base model already does.
Translating a menu photo, scoring review sentiment, knowing plug types, currency arithmetic → **not gaps**
(the model does them free; see `knowledge.md` §0). For each real gap: use the fallback, or hunt an x402
endpoint and add it via `scripts/build-catalog.mjs` (registry) or as a baked constant (Bazaar/Apify-style).

## Real gaps that remain
- **Cash-fare flight BOOKING (order-create) — the one big gap.** `stabletravel-google-flights-booking` is
  read-only deep-links; the Apify flight scrapers are data-only; Travala is hotels-only. **Fallback:** hand the
  user the booking deep-link + `stabletravel-amadeus-check-in-links`. *Hunt: a bookable flight x402 endpoint.*
- **Hourly + climate-normals weather; severe-weather / AQI / marine / UV.** Current catalog is current + daily
  only. **Fallback:** daily forecast + model climate knowledge for "when to go".
- **Official travel-advisory / visa / entry-requirements feed.** No authoritative source. **Fallback:**
  `stableenrich-news` geo search + the model's knowledge (flag "verify with the consulate").
- **Transit/airline STRIKE tracker** with dates (structured). **Fallback:** `stableenrich-news`/`serper-news`
  keyword+location. (General concerts/sports/arts events + ticket prices are now solved — see below.)
- **Restaurant reservations** (Resy endpoints are dead/need a linked account) and **rental car** search. **Fallback:**
  surface booking links from places/activities search.
- **Scheduled (timed) calls.** The *channel* is solved (StablePhone AI call + email), but there's no
  timed-delivery primitive. **Fallback:** the agent fires the call/email at the right time itself. (**SMS is not
  supported** — no reliable keyless sender; see `pitfalls.md`.)
- **Static / navigable map RENDERING.** `gpt-image-2` makes an *illustrative* map; `keyronne` returns a polyline,
  not an image. **Fallback:** illustrative image + the routing polyline/text. *Hunt: a static-maps tile API.*
- **Calendar `.ics` invite; consumer parcel shipping rates/labels; general (non-JP) address validation** — only
  needed if shipping physical goods. **Fallback:** none baked; hunt if the trip needs them.

## Already solved (do NOT re-hunt these)
- **Events / concerts / sports / tickets + prices** → **StableTickets** (`events.json`,
  `stabletickets-events-search`, Ticketmaster, $0.01 Base/Solana). US/major-market coverage.
- **Broad destination-currency FX** → **Otto AI** (`fx-budget.json`, `otto-ai-fx-rates`, live 12 + ECB ~30,
  $0.001) alongside the free `fx-price`.
- **In-flow gear CHECKOUT + ship** → **Purch** (`prepare-buy.json`: `purch-search`/`purch-shop` → `purch-buy`)
  buys a real Amazon/Shopify product and ships it (USDC on Solana, charge = product total). Closes the old
  buy-link-only gap.
- **Routing / distance / ETA / public transit** → `keyronne-directions-travel-times` ($0.01 Base, OSM
  car/bike/foot) + `relaystation-route` (Bazaar, `ground-transport.json`), **plus Apify Google/Apple Maps
  directions + distance-matrix** (`apify.json`: `zen-studio~google-maps-directions-api`, `xtracto~gmaps-direction-rute`,
  `seemuapps~google-distance-matrix-scraper`) for worldwide routing **including public transit** in cities without
  a live-transit endpoint. (Live real-time arrivals remain NYC + Japan only.)
- **TikTok/Instagram/YouTube keyword & location discovery** → Apify direct x402 (`apify.json`:
  `clockworks~tiktok-hashtag-scraper`, `apidojo~tiktok-location-scraper`, `apify~instagram-hashtag-scraper`,
  `streamers~youtube-scraper` + transcripts).
- **OTA lodging breadth (Airbnb / Booking.com)** → Apify (`voyager~booking-scraper`, `tri_angle~airbnb-scraper`)
  for discovery; book via Travala/StableTravel or the listing deep-link.
- **Review sentiment aggregation** → fetch raw reviews (Tripadvisor, Google Maps, Apify review actors); the model
  scores sentiment **free**.
- **Timezone-by-coordinate; menu/sign photo OCR translation; retail/card FX with fees** → the model handles these
  free (local-time inference, multimodal photo translation, applying a typical FX spread). Not endpoints.
- **eSIM buy** → `stablegiftcards-buy` (Bitrefill), user-confirmed working.
- **Card-required bookings paid in USDC** → the Laso card-funds-the-booking pattern (`wallet-payment.md`), or Travala.

## How to add a hunted endpoint
- If it's in the **MasterKey registry**: add its service id to the right capability in `SELECTION` inside
  `scripts/build-catalog.mjs`, then re-run the script.
- If it's a **Bazaar / direct x402** endpoint: bake it as a constant (like `MANUAL_ROUTING` / `APIFY` in the
  build script) with its `accepts[]` from the 402 challenge, then re-run.
- Update `VERSION` and note it in `knowledge.md`.
