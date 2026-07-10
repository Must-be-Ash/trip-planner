# pitfalls.md — check before you call

Consolidated gotchas from the endpoint `usage.quirks`. **Read the relevant entries before calling** — several
endpoints **charge even on a bad request**. The full per-endpoint quirks live in `reference/endpoints/*.json`.

## 1. Charge-then-fail — build the request correctly the FIRST time (you lose money otherwise)
- **`x402-deployer-weather`** — needs numeric `{latitude,longitude}`. A `{"location":"Tokyo"}` string → 400
  **and still charges $0.005**. Geocode the place name first (`x402node-geocoding-forward`).
- **`stabletravel-transfers-search`** — drop-off needs **both** full address (`endAddressLine`+`endCityName`+
  `endCountryCode`) **and** `endGeoCode:"lat,long"`. Missing either → HTTP 200 with an `errors[]` body but you
  **still paid ~$0.003**.
- **`flight-delay-predictor`** — strict validation; requires ALL of `flight_number, departure_date, origin,
  destination`. Partial body → 400 **and still charges $0.01**. (Also needs-review — label output as a prediction.)
- **`perplexity-sonar-deep-research-async`** — charges $0.01 even on a 400. Body must be wrapped:
  `{"request":{model:"sonar-deep-research", messages}}` (not a bare chat body).
- **`agentphone-messaging-calls` (SMS)** — body must be **wrapped**: `{"body":{to_number, body, from_number}}`.
  A flat body or `{text}` → 422 **and still charges ~$0.02**.
- **`stablegiftcards-buy`** — a prior QA buy was **charged then 403'd ("not_available") with no refund**. It's
  user-confirmed working now, but do a **small first buy** and poll `stablegiftcards-invoice-status` for the code.

## 2. Field-name traps
- **Flight tokens:** one-way (`type=2`) → `booking_token`; round-trip (`type=1`) → `departure_token`. Different
  fields; the booking deep-link only takes `departure_token`.
- **Hotels:** `stabletravel-hotel-offers-search` uses **plural** `hotelIds` (comma list);
  `stabletravel-hotel-offers-by-hotel` uses **singular** `hotelId`. Don't mix them.
- **Transfers cancel:** the field is `confirmNbr` (abbreviated), not `confirmationNumber`.
- **Hotel booking:** `guests[].tid` is a **numeric** guest index referenced by `roomAssociations`, not a string id.
- **Reddit:** `reddit-post-comments-stableenrich` input key is `url` (full post URL), NOT a post id.

## 3. GET-vs-POST / body-shape mismatches
- **`x402node-geocoding-forward`** — registry may say POST, but POST → 404. **Use GET.** Results wrapped in
  `results[]`; pass `limit=1` for a single best match.
- **`open-meteo-weather`** — it's **GET** (registry says POST); param is `lng` (not `lon`/`longitude`).
- **`google-maps-place-details-stableenrich`** — **GET** with `placeId` as a query param; but
  `-text-search-`/`-nearby-search-` are **POST body**. Don't assume they're the same.
- **`stabletravel-amadeus-flight-seatmap`** — POST body must wrap offers in `{data:[...]}`; a bare array or
  `{flightOffers}` → 400 "Invalid JSON".
- **`stabletravel-hotel-autocomplete`** — use `subType=HOTEL_GDS`; `HOTEL_LEISURE` returned HTTP 500 in testing.

## 4. Currency defaults to EUR (pass USD)
- **`stabletravel-amadeus-flight-search-get`** — pass `currencyCode=USD` or prices come back EUR.
- **`stabletravel-hotel-offers-search`** — pass `currencyCode=USD`; else the hotel's native currency (often EUR).
- **`stabletravel-activities-search`** — `price.currencyCode` is EUR for European activities; don't assume USD.

## 5. Path/ID chaining (get the id first)
- **Tripadvisor** `-location-details`/`-reviews`/`-photos` — `locationId` is a **path param**; get it from
  `tripadvisor-location-search` first.
- **Hotels:** `-list-*` returns directory (no prices) → feed `hotelId` into `-offers-search`; capture `offers[].id`
  → fetch fresh `-hotel-offer-detail` right before booking (offer IDs are time-sensitive/expire).
- **Award:** `-award-seats-search-` returns availability IDs → `-award-trip-detail-` for segments+links.
- **Reddit:** `-search-` truncates `selftext` (~500 chars) → use the permalink with `-post-comments-` for the full body.

## 6. Async / poll (don't treat as sync)
- **`parallel-deep-research-task`** — POST only **queues** (`run_id`, status "queued"); poll GET
  `/api/task/{run_id}` (**free**) until `completed` (1–5+ min; backoff 10→60s).
- **`perplexity-sonar-deep-research-async`** — submit → poll `GET /v1/async/sonar/{id}` (settles $0) until COMPLETED.
- **StableStudio images** (`gpt-image-2-generate`, `nano-banana-pro-*`, `flux-2-pro-*`) — async; poll
  `/api/jobs/{id}` (SIWX, free). Prefer **`nano-banana-2`** when you want a **sync** image.
- **`ai-phone-call`** — call is **queued**; transcript via SIWX poll `GET /api/call/{id}`.

## 7. Output-shape surprises
- **PDFs** (`makespdf-markdown-to-pdf`, `html-to-pdf-raw-html`) — response is **binary PDF**; via paid_fetch it
  arrives as `"base64:<...>"` — strip the `base64:` prefix and decode (starts with `%PDF`).
- **`precip-ai`** — returns an **HTML widget page**, not JSON; don't expect structured values. (Not in the default
  weather picks for that reason — prefer `hugen-weather-forecast`.)
- **`openai-tts`** — `body.audio` is base64 MP3; decode + write `.mp3`. **`text-to-speech-elevenlabs`** returns a
  hosted MP3 URL.
- **`stableupload-file-upload`** — two-step: buy slot → upload bytes (multipart to `postUrl` with ALL `postFields`
  + `file`, or PUT to `uploadUrl`) → served at `publicUrl`. ⚠️ URLs **expire** (7d–6mo, renewable).

## 8. Payment-rail quirks (chain/price)
- **NYC transit** (`nyc-transit-live-*`) — plain x402 'exact' fails the paymentauth handshake; settled via **MPP
  on Tempo** in QA. If your wallet can't do MPP, this endpoint may not pay cleanly — have a fallback (routing).
- **Price reality vs advertised:** `twit-sh-tweet-search` and `japan-transit-station-status` settled **cheaper**
  than their advertised/OpenAPI price. Pay the **402 challenge amount**, not the doc number.
- **Async settlement:** `twit-sh-tweet-search` returned `confirmed:false/txHash:null` but 200 with real data — the
  **200 response is the success proof**; don't retry.
- **`agentphone-messaging-calls` (SMS)** — outbound SMS needs the AgentPhone account's **10DLC registration**
  (off-x402, one-time). User-confirmed resolved; if a fresh account, expect a 403 until 10DLC is done.

## 8a. Apify billing — the $1 hold is NOT the cost
Apify's `exact` x402 **captures a flat ~$1.00 USDC upfront**, then **auto-refunds ~97%+ within ~1 hour** (net ≈
actual usage, usually a few cents). Always set `?maxTotalChargeUsd=` (caps the hold). Don't alarm the user with
the raw $1 or count it as spend — report Apify **net-after-refund** and note the refund lands within the hour
(`knowledge.md` §13). Apify also has **worldwide Google/Apple Maps directions + distance-matrix** actors — use
them for transit/ETA in cities without a live-transit endpoint (keyronne is OSM car/bike/foot only).

## 8b. Purch (gear buy) + phrasebook TTS
- **Purch is Solana USDC only.** `purch-search` $0.01, `purch-shop` $0.10 (NL assistant — use search unless the
  query is loose), `purch-buy` **dynamic = product total incl. tax/shipping** (not a flat fee).
- **`purch-buy` requires `shippingAddress` (name, line1, city, state, postalCode, country ISO-2) + `email`.**
  Amazon: `asin` or `productUrl`. Shopify: `productUrl` + `variantId`. It's 🔴 — confirm item + total + address first.
- **Phrasebook pronunciation trap:** OpenAI TTS mispronounces non-English. For a foreign-language phrasebook use
  **`text-to-speech-elevenlabs` with a multilingual model + the native script** (not romaji). Then **host the MP3**
  (`stableupload-file-upload`) and deliver the link — a base64 blob in the response is not a deliverable.

## 9. Read-only / not-what-it-says
- **`stabletravel-google-flights-booking`** — read-only deep-links; does **not** book (see `gaps.md`).
- **`channel3-commerce-product-search` / `stableninja-retail-products`** — return **buy-links**, not an in-flow
  order; there is no gear checkout+ship (see `gaps.md`).
- **`precip-ai`** apiKey field — the gateway injects it after payment; do **not** pass an apiKey.

## 10. needs-review / hidden — use with care (avoid in a clean demo unless confirmed)
- `flight-delay-predictor` (needs-review), `stablegiftcards-buy` (registry-hidden; user-confirmed),
  `agentphone-messaging-calls` (registry-hidden; user-confirmed), `laso-finance-get-card-data` /
  `-merchant-acceptance-search` (registry-hidden but needed for the card flow). These are marked
  `registryStatus` in the catalog — prefer verified+active endpoints when a choice exists.
