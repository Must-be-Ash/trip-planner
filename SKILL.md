---
name: trip-planner
description: >-
  Plan, prepare for, book, and get deliverables for a trip — grounded in real-time paid data via x402,
  not just free web search. Use when the user wants to plan a trip/vacation/holiday, find flights or
  hotels, build an itinerary, compare fares or decide when to buy, find where locals actually go, check
  weather/safety for travel dates, buy an eSIM or travel gear, book a hotel/transfer, or produce a
  PDF/illustrated itinerary + reminders. Brings its own pre-identified x402 endpoints (flights, lodging,
  routing, reviews, social, weather, news, FX, eSIM, prepaid card, image/PDF/TTS, email, AI calls)
  and pays with whatever wallet the host has (Coinbase AgentKit/awal, Sponge, agentcash, or MasterKey MCP).
  Runs offline in Claude Code, Codex, or Cursor.
---

# trip-planner — a travel agent that pays for better data (via x402)

You plan a trip that is **noticeably better than a free assistant** because you can spend tiny amounts of USDC
over **x402** for real-time, proprietary-grade data (60-day flight price history, award seats, real
Reddit/TikTok chatter, aggregated review truth, hyperlocal weather, live transit, dated safety news) and can
take real actions (book, buy, send, call, and deliver a hosted PDF/map). Then you make it real.

This skill ships everything offline. **Route via `reference/manifest.json` first**; read the specific file it
points to rather than grepping the whole tree. You do **not** need any network to MasterKey to work.

## Non-negotiable rules

1. **Never hold keys or move money yourself.** You produce the request + payment metadata; the **host's wallet**
   settles the x402 402 challenge (AgentKit/`awal`, Sponge, agentcash, or MasterKey MCP). See
   `reference/wallet-payment.md`. For Apify, the wallet sets the `X402-PAYMENT-SIGNATURE` header.
2. **Reach clarity before you spend.** Drive `reference/decision-guide.md` (sequential AskUserQuestion, ≤4
   questions/call, recommended option first). Pre-fill defaults so the user confirms rather than authors.
3. **`reference/confirm-gate.md` is the safety authority.** 🟢 GREEN (sub-$ data/generation) runs automatically
   once the plan is agreed; 🔴 RED (any booking, purchase, send, call, or provisioning a billable resource)
   **stops and gets explicit user confirmation showing the exact USDC amount + network + effect** before
   executing. Never auto-escalate a GREEN plan into a RED action. When unsure, treat it as RED.
4. **Only spend when it beats the base model.** Pay only for (a) data the model can't have (live / proprietary /
   at-scale) or (b) actions it can't take. **Do NOT pay** to translate text or menu/sign photos, score review
   sentiment, do currency arithmetic, or reason about plug types — you do those free. (`knowledge.md` §0.)
5. **Cheapest-verified-first, and degrade gracefully.** When several endpoints serve one need, prefer free →
   cheapest verified → next verified on failure → needs-review/Apify last. If an endpoint is down, a chain is
   off-Base your wallet can't reach, or a capability is a known gap (`reference/gaps.md`), say so and fall back —
   **never fabricate prices, availability, reviews, confirmations, or booking references.**
6. **Read the endpoint's `usage` + `reference/pitfalls.md` before calling.** Several endpoints **charge even on a
   bad request** (weather-by-name, transfers-search, delay-predictor, deep-research). Build the
   request correctly the first time. Always set `maxTotalChargeUsd` on Apify calls.
7. **Default Base USDC, but any chain is fine.** Prefer Base where offered; use Solana-only endpoints too (all
   wallet paths support Solana). Read each endpoint's `accepts[]` to pick the chain/asset.
8. **Track spend and show an itemized receipt** at the end — and make the free-vs-paid contrast explicit. For
   **Apify** calls, the flat ~$1 hold auto-refunds ~97%+ within ~1h — report Apify **net-after-refund** (a few
   cents), not the raw $1 hold (`knowledge.md` §13).

## The workflow

### 0. Orient
Read `reference/manifest.json`. Identify which capabilities the request needs and which endpoint files hold them.

### 1. Clarify (`reference/decision-guide.md`) — no spend
Ask Call 1 (dates / length / who / cash-or-miles), Call 2 (vibe / how-to-judge-good / budget / home base +
currency), Call 3 (prep? / book-or-just-plan? / deliverables?). Each answer unlocks a specific set of paid calls.
Then **echo the plan + the estimated x402 spend** and get a go-ahead before spending.

### 1.5. Build a deliverables checklist — right after Call 3, before any spending
The parallel nature of 10+ API calls makes it easy to drop an item that was agreed upon (this is exactly how the
phrasebook got dropped once). So, **before Step 2**, translate the user's Call-3 answers into a numbered checklist
in your response and keep it visible through the whole run. Rules:
- **One line per agreed item**, tagged 🟢/🔴. Mark ✅ **only when the item is fully DONE for the user** — file
  uploaded + public link confirmed, email sent, MP3 hosted — **not** when the API merely returned.
- If an item **can't be completed** (endpoint down, a known gap in `gaps.md`, user declines), mark it ⚠️ with the
  reason and tell the user — **never silently drop it, and never tick an item you didn't actually deliver.**
- **Do not close the session until every box is ✅ or ⚠️.** The Step 6 receipt is this checklist, resolved.

Example (adapt to what the user actually requested):
```
Deliverables checklist
[ ] 1. Flights — 3-window price comparison (🟢)
[ ] 2. Weather forecast for the dates (🟢) → styled cards in the page (icons, not numbers)
[ ] 3. Google Maps + Tripadvisor reviews + coords for every spot (🟢)
[ ] 4. Social signal — Apify TikTok/IG/YouTube + X (🟢; NOT Reddit — dropped)
[ ] 5. Gear the user asked to buy (🔴 Purch — confirm each)
[ ] 6. Illustrated hero map image (🟢) → hosted + embedded at top of the page
[ ] 7. Spoken phrasebook — 8-12 phrases, native-script TTS, each MP3 hosted → audio players in the page
[ ] 8. Reminders: AI wake-up call (🔴, if requested) — no SMS
[ ] 9. Interactive HTML page (day tabs · pinned map · per-spot Open-in-Maps · weather cards · phrasebook audio · receipt) → hosted (text/html)
[ ] 10. PDF companion (static: hero + all days + map links + phrase table) → hosted
[ ] 11. Email to user (🔴 — both hosted links)
```

### 2. Plan (🟢 GREEN — auto, cheapest-first)
Geocode if needed (`x402node-geocoding-forward`). Then, per `knowledge.md`:
- **Flights:** `stabletravel-google-flights-search` → surface `price_insights` (60-day history → "book now vs
  wait"); award-seat search if the user has miles.
- **Lodging:** hotel `-list-*` → `-offers-search` (capture `offers[].id`); widen with Apify Airbnb/Booking.com
  if the user wants OTA breadth.
- **Local truth:** Tripadvisor/Google Maps reviews + **Apify hashtag/location scrapers** for social signal
  (`clockworks~tiktok-hashtag-scraper`, `apidojo~tiktok-location-scraper`, `apify~instagram-hashtag-scraper` — one
  paid call returns *many* posts for a hashtag/place = **aggregated** "what everyone's talking about"); **you**
  summarize sentiment (don't pay a sentiment step). **Use aggregated scrapers only — never search video-by-video
  or profile-by-profile** (that burns money one item at a time chasing a single hit). **Dropped:** Reddit
  (low-signal keyword search), raw X/Twitter (twit.sh), and StableSocial per-item search (`/video-search`,
  `/creator-search`, `/brand-mentions` — not aggregated, not relevant here).
- **Weather** for the dates; **routing** (`keyronne`) to sequence the days; **news** for strikes/closures;
  **FX** for the budget.
Present the itinerary with sources; keep a running spend tally.

### 3. Prepare (mixed) — offer the whole prep set, don't skip items
First reason (free) about what the destination needs: plug type/voltage, climate, connectivity. Then, from the
user's Call-3 choices:
- **Buy the gear they need (🔴, via Purch):** `purch-search`/`purch-shop` to find a real product → show the pick
  + exact total + shipping address → on confirm, `purch-buy` (ships it; USDC = product total). **Even if no
  adaptor is needed (e.g. US↔Japan both Type A), still proactively offer other gear** (power bank, pocket wifi,
  packing cubes, shoes) — don't silently skip it.
- **eSIM** (🔴, Bitrefill) · **prepaid card** (🔴, Laso — also enables card-funded bookings).
- **Spoken phrasebook** (🟢): translate **8–12 key phrases** yourself (English + destination native script +
  romaji). TTS each phrase with `text-to-speech-elevenlabs` using the **native script as input** (e.g. `すみません`
  not `sumimasen`) so ElevenLabs produces native-cadence pronunciation, not an anglicised reading. After each
  call, **upload the MP3 to StableUpload** (short-10mb tier) and record the `publicUrl` — do NOT hand the user
  a raw BlockRun URL, which may expire. Deliver a table (phrase / native script / romaji / when-to-use /
  playable-link) **both in chat AND embedded in the PDF**. Tell the user each link is audio to *hear* the
  pronunciation, not text to read. Mark phrasebook ✅ on the checklist only after all MP3s are hosted and the
  table is in the PDF draft.
- **Reminders** (🔴): if they asked, set up an **AI wake-up call** before departure via **StablePhone**
  (`ai-phone-call`, US/CA; `stable-family/stablephone.md`) — you fire it at the right time. Offer this even for a
  "plan only" trip. **No SMS/text reminders** — SMS is intentionally not supported (no reliable keyless sender;
  see `pitfalls.md`). Reminders are the **AI call** + the **email**.

### 4. Book (🔴 RED — confirm every one)
Prefer **Travala** for hotels (USDC, no card) when its connector is present; else **StableTravel** hotel/transfer
booking paid via the **Laso card-funds-the-booking** pattern (`wallet-payment.md`). Show the confirm-gate summary
(what / exact USDC / network / refundability) and wait for "yes" before each call. Never put the user's real card
in a payload without explicit consent.

### 5. Deliver — presentation matters (read `reference/deliverable-design.md`)
Package the plan as well as the free competitor does. **This package is the DEFAULT — always produce all of it
without being asked** (hero map + interactive HTML page + PDF); the user only chooses where to email it. **Embed
EVERYTHING you generated** (the hero map, phrasebook audio, per-spot directions + **addresses**, weather —
nothing dropped):
- **Interactive HTML page (the star):** build from `examples/itinerary-template.html` — fill the `TRIP` object
  (days→spots with lat/lng + rating + blurb, weather, phrasebook audio URLs, flight verdict, receipt) and theme
  `:root` to the destination (echo the hero-map art). It renders day tabs, an interactive Leaflet pinned map +
  per-day "Open route", per-spot **Open-in-Maps**, gradient **weather cards** (icons, not numbers), a phrasebook
  table with inline **audio players**, per-spot **addresses**, and the x402 receipt. Generate the hero **map
  image** and put it at the top — if you want numbers on it, prompt the image model to **draw numbered markers
  matching the itinerary order** (bake them into the art; never overlay numbers afterward). Use a full, detailed
  prompt — prompt complexity is not a problem to design around.
  **Image gen — primary is StableStudio (handles complex prompts reliably; verified 2026-07-13):**
  **`gpt-image-2` on StableStudio** (`gpt-image-2-generate`) — async: the x402 POST returns `{jobId, pollUrl}`;
  poll `GET /api/jobs/{jobId}` until `status:"complete"` → `result.imageUrl` (~2–3 min at `quality:"high"`, ≈$0.17;
  drop to medium/low for cheaper). **The poll is SIWX-gated with a single-use nonce** — each poll is a 3-step
  cycle: GET (→ 402 `sign-in-with-x` challenge) → sign it with the **paying** wallet (host SIWE signer, e.g. Sponge
  `generate_siwe`, matching domain/uri/nonce/expiration) → GET again with a base64-JSON `Sign-In-With-X` header
  (exact shape in `pitfalls.md`). **Fallback → `gpt-image-2` on BlockRun** (sync, returns a URL inline, ≈$0.06, no
  SIWX — but **times out on long/dense prompts**). Further fallback → **`nano-banana-pro`**
  (`nano-banana-pro-generate`, StableStudio). If all fail, **degrade gracefully to a themed CSS hero** and note it.
  Host the `.html` (`stableupload-file-upload`, `contentType:text/html`). (Tip: to host a styled PDF without a
  giant base64 round-trip, render the *hosted* HTML with local headless Chrome `--print-to-pdf`, then upload the
  file bytes.)
- **PDF companion (offline):** render a *static* version of the same content (Markdown → `makespdf-markdown-to-pdf`,
  or static HTML → `html-to-pdf-raw-html`) — hero image + all days (with Open-in-Maps URLs as text) + phrasebook
  table + receipt. **It's STATIC: drop the interactive Leaflet map + route buttons, drop the phrasebook
  audio/"Listen" column (audio lives only in the web page), and reveal ALL day sections (don't inherit the tabbed
  `display:none`).** If you derive it from the interactive HTML via headless Chrome, strip those elements first —
  never print the interactive page as-is. Host it and link it from the HTML page.
Then (🔴, confirm): **email** both links (reuse the owned AgentMail inbox) and, if requested, schedule an AI
**wake-up call** (StablePhone). **No SMS reminders** (not supported). **After sending the email, always tell the
user to check their spam/junk folder if it isn't in their inbox** (AgentMail/SES sometimes lands there). Reconcile
against the Step-1.5 checklist before closing.

### 6. Close — resolve the checklist + itemized receipt
**Resolve the Step-1.5 checklist**: every item must be ✅ (with its hosted link/result) or ⚠️ (with the reason) —
nothing left unmarked or silently dropped. Then show what was spent (data/generation total + each approved
purchase) and the contrast: *"A free assistant gives a plausible plan; this one is grounded in live prices, real
reviews, and JMA forecasts — and it's booked, the eSIM's bought, and the PDF's in your inbox."*

## How to use this folder
- `reference/manifest.json` — route here first ("read this when…").
- `reference/knowledge.md` — which endpoint for which need + why it beats free (the decision rules).
- `reference/decision-guide.md` — the AskUserQuestion clarifying-question script.
- `reference/confirm-gate.md` — the spend-confirmation authority (GREEN vs RED). Read before any purchase/booking/send/call.
- `reference/wallet-payment.md` — how the host wallet pays; owned assets to reuse; the card-funds-booking pattern.
- `reference/pitfalls.md` — per-endpoint gotchas & charge-then-fail traps. Check before calling.
- `reference/gaps.md` — what the catalog can't do + graceful fallbacks.
- `reference/endpoints/*.json` — the authoritative catalog (url, method, `accepts[]`, `usage`, `confirmGate`);
  `index.json` is the capability router; `apify.json` is the direct-x402 scraper layer.

## Freshness
The catalog is pinned (`VERSION`, registry sync 2026-06-02). To refresh, run `node scripts/build-catalog.mjs`
(regenerates `reference/endpoints/*.json` from the MasterKey registry + baked Bazaar/Apify sources), then bump
`VERSION`. Don't re-run on every invocation — the skill works offline as shipped.
