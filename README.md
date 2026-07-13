# trip-planner

A standalone agent **skill** that plans, prepares for, books, and delivers a trip — and is **noticeably
better than a free assistant** because it pays tiny amounts of USDC over **x402** for real-time,
proprietary-grade travel data and can take real actions (book, buy, send, call).

Free assistants give a *plausible* plan from generic, point-in-time data and can't act. `trip-planner`
spends cents to get what they structurally can't — **60-day flight price history ("book now or wait")**,
**award/miles seat availability**, **real Reddit/TikTok/YouTube traveler chatter**, **aggregated review
truth**, **hyperlocal weather**, **live transit + routed day-plans**, **dated safety/strike news** — then
**makes it real**: books the hotel/transfer, buys the eSIM, and delivers a hosted PDF itinerary, an
illustrated map + calendar, a spoken phrasebook, and an AI wake-up call before your flight.

## What it is (and isn't)
- **Is** a folder of *intelligence + instructions*: it knows **when** a paid call is worth it, **which**
  x402 endpoint to hit, **exactly how** to call it, **what it costs**, and **when to stop and ask** before
  spending on anything real.
- **Is not** a payment library. It **never holds keys or moves money.** The agent's own wallet settles each
  x402 charge.
- **Runs offline** — all ~104 endpoints + the Apify scraper layer are pre-baked into `reference/endpoints/`.
  No live MasterKey connection needed. Works in **Claude Code, Codex, or Cursor**.

## Install
Clone into your agent's skills directory (Claude Code shown):
```bash
git clone <this-repo> ~/.claude/skills/trip-planner
```
Codex / Cursor: point your skill/rules loader at this folder. That's it — it's self-contained.

## What you need
- **A funded wallet on Base with USDC** (a little Solana USDC helps for the few Solana-only endpoints).
- **One x402 settlement path** the agent can drive:
  - Coinbase **AgentKit / `awal` CLI** (CDP/EOA wallet), or
  - **Sponge MCP** (`paid_fetch` / `checkout`; can swap to USDC), or
  - **agentcash MCP** (`fetch` / `bridge`; auto-handles x402 + SIWX), or
  - **MasterKey MCP** (`run_service`) — optional.
- Nothing else. No provider API keys; the skill pays per call.

## How to use it
Open your agent in a working folder and say something like:
> **Plan a trip to Tokyo for me — I'm based in San Francisco.**

The skill takes over: it asks a few clarifying questions, plans with live data (spending sub-dollar amounts
automatically), and **always confirms with you before any booking, purchase, send, or call** — showing the
exact USDC amount and effect first. It ends with an itemized receipt of what it spent.

## Safety model (important)
- 🟢 **GREEN** (sub-$ data + generation) runs automatically once you approve the plan.
- 🔴 **RED** (hotel/transfer booking, eSIM/gift-card/card purchase, email, SMS, AI call, provisioning a
  billable resource) **always stops for your explicit confirmation** — see `reference/confirm-gate.md`.
- **Only spends when it beats what the model does free** — it won't pay to translate text/photos or score
  review sentiment; those are free.

## What's inside
```
SKILL.md                     the agent playbook (rules + workflow)
reference/
  manifest.json              route here first — where everything lives
  knowledge.md               which endpoint for which need + why it beats free
  decision-guide.md          the clarifying-question script
  confirm-gate.md            the spend-confirmation authority (GREEN/RED)
  wallet-payment.md          how the wallet pays + owned assets + card-funds-booking
  pitfalls.md                per-endpoint gotchas & charge-then-fail traps
  gaps.md                    what it can't do yet + fallbacks
  DESIGN.md                  the FIXED visual design system (tokens, rules, guardrails)
  deliverable-design.md      how to build the good-looking interactive HTML + PDF deliverable
  endpoints/*.json           the pre-baked x402 catalog (url/method/accepts/usage/confirmGate)
examples/
  itinerary-template.html    ready-to-fill interactive itinerary page (day tabs, pinned map, weather cards, audio)
scripts/
  build-catalog.mjs          regenerate the catalog from the MasterKey registry (+ Bazaar/Apify)
  validate-endpoints.mjs     dry-run, no-spend check that every endpoint is callable (402)
VERSION                      pinned registry sync date
```

## Keeping it fresh
The catalog is pinned (`VERSION`, registry sync 2026-06-02) and works offline as shipped. To refresh:
```bash
node scripts/build-catalog.mjs        # rebuild reference/endpoints/*.json (needs the MasterKey registry)
node scripts/validate-endpoints.mjs   # confirm every endpoint still returns a clean 402 (no spend)
```
Then bump `VERSION`.

---
<sub>Self-contained: curated guidance in `reference/`, a machine-readable x402 endpoint catalog, and a
no-spend validator. The skill pays with your wallet; it never holds keys.</sub>
