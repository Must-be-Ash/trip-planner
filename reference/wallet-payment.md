# wallet-payment.md — how the agent pays (the skill never holds keys)

The skill is **payment-agnostic and offline-core**. It hands the agent a fully-formed request + the payment
metadata from the catalog; the **host's wallet** settles the x402 402 challenge. The skill never holds keys,
never moves money, and does **not** require the MasterKey MCP.

## The normalized call descriptor
For each call, the skill produces (from `reference/endpoints/*.json`):
```json
{
  "capability": "flights",
  "id": "stabletravel-google-flights-search",
  "method": "GET",
  "url": "https://stabletravel.dev/api/google-flights/search?departure_id=SFO&arrival_id=HND&outbound_date=2026-09-14&type=2",
  "body": null,
  "priceUsd": 0.02,
  "networks": ["Base", "Solana"],
  "accepts": [{ "scheme": "exact", "network": "eip155:8453", "asset": "0x8335…2913", "amount": "20000", "payTo": "0xDd25…2ec0" }],
  "confirmGate": "GREEN",
  "resultPull": "sync",
  "outputShape": "best_flights[], price_insights.price_history[][]"
}
```
The agent makes the HTTP call and satisfies the 402 with its wallet. For a RED `confirmGate`, run
`confirm-gate.md` first.

## Settlement paths (agent picks whichever it has)
1. **Coinbase AgentKit / `awal` CLI** — sign the x402 payment from a CDP/EOA wallet (Base + Solana).
2. **Sponge MCP** — `paid_fetch` / `checkout` (Base + Solana; can swap if the wallet lacks USDC).
3. **agentcash MCP** — `fetch` / `bridge` (auto-handles x402 **and** SIWX; has registered origins for
   stabletravel, stableenrich, stablestudio, etc.).
4. **MasterKey MCP** — `run_service` (optional; registry-native 402 + async polling + SIWX). Nice to have,
   never required.

**Apify** uses a header, not a body signature: send `X402-PAYMENT-SIGNATURE: <proof>` on the run endpoint and
set `?maxTotalChargeUsd=N`. All four paths above can produce that proof.

## Network policy — default Base, but any chain is fine
Prefer **Base USDC** where an endpoint offers it (cheapest, most wallets). For **Solana-only** endpoints, use
them — AgentKit/`awal`, Sponge, and agentcash all support Solana. **Do not skip an endpoint for being off-Base.**
Read `accepts[]` to know which chain/asset to sign; pick the Base entry when present, else the endpoint's chain.
(A few endpoints list uncommon chains like `eip155:196`/`eip155:4326` alongside Base — just use the Base entry.)

## SIWX (free, identity-gated — a signature, not a payment)
Some endpoints are free but require a wallet **signature** (CAIP-122 sign-in), not USDC:
`stablegiftcards-search` / `-product-details` / `-invoice-status`, `laso-finance-auth`, `laso-finance-get-card-data`.
agentcash and MasterKey MCP handle SIWX automatically; with `awal`/AgentKit, sign the SIWX challenge.

## Async endpoints (⏳ — submit → poll → read)
For `resultPull: "poll"` / async run endpoints: submit, then poll the job/SIWX URL until complete, then read the
result path. Applies to: `parallel-deep-research-task`, `perplexity-sonar-deep-research-async`, StableStudio image
gen (`gpt-image-2-generate`, `nano-banana-pro-generate` → poll `/api/jobs/{id}`, SIWX, free), Apify
async runs, and the AI phone-call transcript (`ai-phone-call` → SIWX poll `GET /api/call/{id}`). Prefer the sync
variant when one exists (e.g. `gpt-image-2` on BlockRun is sync — returns the image URL inline).

## §owned-assets — reuse what the MasterKey wallet already owns
If the agent runs with the **MasterKey wallet** (`0xdd138e963E5f381ee525AeC30Da47E2904A45F62` Base ·
`B17DyGyVAGgMiijrcCQLtn1TJNBosncKJXYKrZuFzug8` Solana), reuse these durable assets instead of re-provisioning
(source: `MASTERKEY_ASSETS.md`):
- **AgentMail inbox `powerfulrule82@agentmail.to`** — use as the send-from inbox for the emailed itinerary.
  **Do NOT create a new inbox ($2 each).**
- **Laso US prepaid card** (`O-01KTN62GBAKT1VERAFMC962NYN`, ~$5) — PAN/CVV via `laso-finance-get-card-data`.
- **BlockRun US number `+1 816 750 6853`** — caller-ID for BlockRun voice; ⚠️ **lease expired 2026-07-09** — not
  needed (StablePhone brings/leases its own number for calls).

If the agent runs with a **different wallet**, provision fresh (confirm the spend) — none of the above is required.

## The card-funds-the-booking pattern (pay a card-required booking in USDC)
StableTravel hotel/transfer booking charges the room/transfer cost to a **card in the payload** (only the ~$0.002
API fee is x402). To pay entirely in USDC without a human card:
1. Fund a Laso prepaid card via x402: `laso-finance-order-usa-prepaid-card?amount=<total>&format=json` — the USDC
   charge **equals** the card value. (🔴 confirm — real money on a real card. `-order-international-prepaid-card` for non-US.)
2. Poll `laso-finance-get-card-data` (Bearer from `laso-finance-auth`) for PAN/CVV/expiry.
3. (Optional) `laso-finance-merchant-acceptance-search` to confirm the provider accepts the card.
4. Pass PAN/CVV/expiry as the booking `payment` card on `stabletravel-hotel-booking` / `-transfers-book`.

Alternative (cleaner, no card at all): book hotels via **Travala** (hotels-only MCP; OAuth + x402 USDC on Base,
paid via `payments-mcp:make_http_request_with_x402`; OTP-gated lookup/cancel; session chain from `travala_search_hotel`,
30-min expiry; on any unclear payment result call `travala_book_status`, never blind-retry).
