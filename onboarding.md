# Onboarding — set up a wallet + the trip-planner skill

**You are an AI coding agent (Claude Code, Codex, or Cursor). This file is your runbook.**
Follow it top-to-bottom to get the human set up with (1) a Coinbase **agentic wallet** and
(2) the **trip-planner** skill — so they can plan a real trip immediately, **without
restarting their session**.

Work step by step. **Pause and ask the human** wherever a step says so (email, OTP code,
funding). Never invent an email or code. Show each command before running it.

---

## Step 0 — Prerequisites

Check Node.js is v24+ (the wallet CLI requires it):

```bash
node --version
```

If it's below v24, tell the human to install Node 24+ (e.g. `nvm install 24 && nvm use 24`,
or from nodejs.org) and stop until they do. Everything else uses `npx`, so no global installs.

---

## Step 1 — Install the Coinbase agentic wallet skills

```bash
npx skills add coinbase/agentic-wallet-skills
```

This adds the `awal` (Coinbase agentic wallet) tooling. You'll drive it with `npx awal ...`
commands directly, so it's usable in **this** session immediately.

---

## Step 2 — Authenticate the wallet (needs the human)

The wallet uses email + one-time code.

**2a. Ask the human for their email address.** Then start login:

```bash
npx awal auth login <their-email>
```

This emails them a 6-digit code and prints a **Flow ID**. Capture the Flow ID from the output.

**2b. Ask the human to read you the 6-digit code** from their inbox, then verify:

```bash
npx awal auth verify <flowId> <6-digit-code>
```

**2c. Confirm you're signed in:**

```bash
npx awal status
```

If it shows authenticated, continue. If it errors, re-run 2a–2c (codes expire quickly).

---

## Step 3 — Get the address and check balance

```bash
npx awal address
npx awal balance
```

`balance` defaults to **Base mainnet USDC** — that's what the trip-planner spends. You can
also check `npx awal balance --chain solana` (a few endpoints are Solana-only).

---

## Step 4 — Fund the wallet if empty (needs the human)

The trip-planner pays tiny amounts of USDC per data call (typically well under $1 total for
planning; booking/purchases are separate and always confirmed first). If the Base USDC
balance is ~0:

- Try the built-in funding flow if available: `npx awal fund`
- Otherwise, give the human the address from Step 3 and ask them to **send USDC on Base**
  to it (a few dollars is plenty to plan a trip; more if they intend to book/buy).

Re-check with `npx awal balance` until USDC shows up. A small amount is fine to get started —
you can always ask them to top up later.

---

## Step 5 — Install the trip-planner skill

```bash
git clone https://github.com/Must-be-Ash/trip-planner ~/.claude/skills/trip-planner
```

(Codex / Cursor: clone it wherever your skill/rules loader looks, or into the working folder.)

**To use it right now without restarting the session:** read the skill playbook and follow it
directly —

```bash
cat ~/.claude/skills/trip-planner/SKILL.md
```

Read `~/.claude/skills/trip-planner/SKILL.md` and treat it as your instructions for any trip
task. It's self-contained (all ~104 x402 endpoints are pre-baked under `reference/`), so no
extra API keys are needed — the wallet from Steps 1–4 settles each paid call.

On the human's **next** session, Claude Code will also auto-register it as the `/trip-planner`
skill — but they don't need to wait for that.

---

## Step 6 — Confirm they're ready

Run a final sanity check and report status to the human:

```bash
npx awal status
npx awal balance
```

Then tell them, in plain language:
- ✅ Wallet is signed in and funded with `<X>` USDC on Base.
- ✅ trip-planner skill is installed and loaded (you've read its SKILL.md).
- 💡 They can now say something like: **"Plan a trip to Tokyo for me — I'm based in San Francisco."**

Remind them of the safety model: sub-dollar **data** calls run automatically once they approve
a plan, but any **booking, purchase, email, SMS, or AI call** will always stop for their
explicit confirmation showing the exact USDC amount first.

---

## Notes for you, the agent
- Don't proceed past a step that failed — surface the error and retry or ask the human.
- Never fabricate the email or OTP; those come from the human.
- Keep spending transparent: state costs before paid actions and confirm anything that books,
  buys, or sends.
