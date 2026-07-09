---
name: trip-planner
description: >-
  Plan, prepare for, book, and get deliverables for a trip — grounded in real-time paid data via x402,
  not just free web search. Use when the user wants to plan a trip/vacation/holiday, find flights or
  hotels, build an itinerary, compare fares or decide when to buy, find where locals actually go, check
  weather/safety for travel dates, buy an eSIM or travel gear, book a hotel/transfer, or produce a
  PDF/illustrated itinerary + reminders. Brings its own pre-identified x402 endpoints (flights, lodging,
  routing, reviews, social, weather, news, FX, eSIM, prepaid card, image/PDF/TTS, email, SMS, AI calls)
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
   bad request** (weather-by-name, transfers-search, delay-predictor, deep-research, AgentPhone SMS). Build the
   request correctly the first time. Always set `maxTotalChargeUsd` on Apify calls.
7. **Default Base USDC, but any chain is fine.** Prefer Base where offered; use Solana-only endpoints too (all
   wallet paths support Solana). Read each endpoint's `accepts[]` to pick the chain/asset.
8. **Track spend and show an itemized receipt** at the end — and make the free-vs-paid contrast explicit.

## The workflow

### 0. Orient
Read `reference/manifest.json`. Identify which capabilities the request needs and which endpoint files hold them.

### 1. Clarify (`reference/decision-guide.md`) — no spend
Ask Call 1 (dates / length / who / cash-or-miles), Call 2 (vibe / how-to-judge-good / budget / home base +
currency), Call 3 (prep? / book-or-just-plan? / deliverables?). Each answer unlocks a specific set of paid calls.
Then **echo the plan + the estimated x402 spend** and get a go-ahead before spending.

### 2. Plan (🟢 GREEN — auto, cheapest-first)
Geocode if needed (`x402node-geocoding-forward`). Then, per `knowledge.md`:
- **Flights:** `stabletravel-google-flights-search` → surface `price_insights` (60-day history → "book now vs
  wait"); award-seat search if the user has miles.
- **Lodging:** hotel `-list-*` → `-offers-search` (capture `offers[].id`); widen with Apify Airbnb/Booking.com
  if the user wants OTA breadth.
- **Local truth:** Tripadvisor/Google Maps reviews + Reddit/X + Apify TikTok/IG/YouTube; **you** summarize
  sentiment (don't pay for it).
- **Weather** for the dates; **routing** (`keyronne`) to sequence the days; **news** for strikes/closures;
  **FX** for the budget.
Present the itinerary with sources; keep a running spend tally.

### 3. Prepare (mixed)
Plug/voltage note = free reasoning. Then (🔴, confirm each): buy a destination **eSIM** (Bitrefill), fund a
**prepaid card** (Laso) if needed for bookings, and generate a **spoken phrasebook** (TTS 🟢 — translate the
phrases yourself).

### 4. Book (🔴 RED — confirm every one)
Prefer **Travala** for hotels (USDC, no card) when its connector is present; else **StableTravel** hotel/transfer
booking paid via the **Laso card-funds-the-booking** pattern (`wallet-payment.md`). Show the confirm-gate summary
(what / exact USDC / network / refundability) and wait for "yes" before each call. Never put the user's real card
in a payload without explicit consent.

### 5. Deliver
Generate an illustrated **map + day-by-day calendar** (`gpt-image-2-generate` / `nano-banana-2`), render a **PDF
itinerary** (`makespdf-markdown-to-pdf`), **host** it (`stableupload-file-upload`, hand over the link). Then
(🔴, confirm): **email** the plan (reuse the owned AgentMail inbox), and schedule an **AgentPhone** flight-reminder
SMS + AI **wake-up call** (you fire it at the right time).

### 6. Close — itemized receipt
Show what was spent (data/generation total + each approved purchase) and the contrast: *"A free assistant gives a
plausible plan; this one is grounded in live prices, real reviews, and JMA forecasts — and it's booked, the eSIM's
bought, and the PDF's in your inbox."*

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
