# confirm-gate.md — the spend-confirmation policy (non-negotiable)

This is the **safety authority** for the skill. It wins over any convenience or "the user seemed to want it".
Every endpoint in `reference/endpoints/*.json` carries a `confirmGate` field derived from this policy.
**When in doubt, treat an action as RED.**

## Two tiers

### 🟢 GREEN — auto, no per-call prompt
Read-only data + content generation, each typically **< $0.20**. Proceed without asking, once the overall plan
is agreed in `decision-guide.md`. This covers:
- All lookups: flights search/status/award, hotel *search/offers* (not book), activities/transfers *search*,
  routing, places/reviews, weather, news, web/semantic research, FX, gift-card/eSIM *search*.
- Generation/rendering: image (map/calendar), PDF, TTS, hosting the file.
- **Apify scrapes** — read-only (GREEN). Set `maxTotalChargeUsd` on **every** Apify call (it caps the upfront
  hold). Apify's `exact` scheme **holds ~$1.00 upfront then auto-refunds ~97%+ within ~1h** (net ≈ a few cents),
  so don't treat the $1 hold as spend — report it net-after-refund (see `knowledge.md` §13). If a needed cap
  would exceed **~$1.00**, soft-confirm with the user first.

Still: keep a running spend tally and respect the budget ceiling from `decision-guide.md` Call 2.

### 🔴 RED — STOP and get explicit user confirmation before executing
Anything **outward, irreversible, or that spends on a real good/reservation**. These are flagged
`needsApproval: true` / `confirmGate: "RED"` in the catalog. The RED set:
- **Bookings:** hotel (`stabletravel-hotel-booking`), transfer book/cancel (`stabletravel-transfers-book`,
  `stabletravel-transfers-cancel`), and any Travala `travala_book`/`travala_cancel_booking`.
- **Purchases:** travel-gear buy+ship (`purch-buy` — **x402 charge equals the product total incl. tax/shipping**;
  needs shipping address + email), gift-card/eSIM buy (`stablegiftcards-buy`), prepaid-card funding
  (`laso-finance-order-usa-prepaid-card`, `laso-finance-order-international-prepaid-card` — **the x402 charge
  equals the card value**), custom merch (`stablemerch-custom-merch`).
- **Sends / calls:** email (`agentmail-send-email`, `stableemail-send`), SMS (`send-sms`, and `agentphone-messaging-calls`
  → AgentPhone `/x402/v1/messages`), AI phone call (`ai-phone-call`, and `agentphone-messaging-calls` → `/x402/v1/calls`).
- **Provisioning billable resources:** phone number (`agentphone-number`, `buy-phone-number`), paid inbox
  (`agentmail-create-inbox`, $2).
- **Variable-cost data** that can run high: `honcho-agent-memory` query (up to $0.50).

## What a RED confirmation must show
Before executing, tell the user, in plain language:
1. **What will happen** (e.g. "book the Shinjuku hotel, 3 nights, non-refundable after Aug 10").
2. **The exact USDC amount** — from the live 402 quote or the known price — **and the network** (Base/Solana).
3. **The recipient / effect** (who gets paid, what real-world thing happens, refundability).
Then wait for an explicit "yes". **Never auto-escalate a GREEN plan into a RED action.**

## Idempotency (RED calls only)
Pass an idempotency / client key wherever supported so a retry never double-charges:
- AgentMail: `client_id` on create-inbox / send.
- Gift cards: one `cart_items` submission; if unsure whether a buy went through, poll `stablegiftcards-invoice-status`
  before re-submitting.
- Travala booking: on any unclear result, call `travala_book_status` (same ids) — **never blind-retry** `travala_book`.
- Laso card: if a card order is ambiguous, poll `laso-finance-get-card-data` before re-ordering.

## The credit-card / PCI note (important)
`stabletravel-hotel-booking` and `stabletravel-transfers-book` split into **two** charges:
- the tiny **x402 API fee** (~$0.002) — paid in USDC; and
- the **actual room/transfer cost**, which Amadeus charges to a **real credit-card number placed in the booking
  payload** — this is **not** x402/USDC.

So a StableTravel booking is not payable in pure USDC by itself. Resolve it one of two ways (see
`wallet-payment.md`):
1. **Card-funds-the-booking:** fund a **Laso prepaid card via USDC** (charge = card value), read PAN/CVV from
   `laso-finance-get-card-data`, and use those as the booking card → the whole booking is paid in USDC, no human card.
2. **Travala:** books hotels and settles the room cost itself over x402 USDC — **no card in the payload**.

Never put the user's real card in a payload without explicit, informed consent — and prefer the USDC paths above.

## Charge-then-fail awareness
Some endpoints **charge even on a bad request** (see `pitfalls.md`): `x402-deployer-weather` (name string → 400,
still charged), `stabletravel-transfers-search` (validation error → still ~$0.003), AgentPhone `/messages`
(flat/unwrapped body → 422, still ~$0.02). Build the request correctly the first time; read `pitfalls.md` before
calling these.
