# decision-guide.md — the clarifying-question script

Like a good free assistant, **reach clarity before you spend.** Drive this with **AskUserQuestion**:
≤4 questions per call, ≤4 options each, **recommended option first**, each option with a one-line
consequence. Branch in-agent between calls. **Pre-fill smart defaults** so the user is *confirming*, not
authoring. Each answer **unlocks a specific set of paid calls** — so you only spend on what they want.

## Rules of the flow
- Ask Call 1, read answers, decide whether later calls are needed, then ask them. Users can always pick "Other".
- Never start a paid call before Call 1 is answered. **Sub-dollar data/generation runs without a per-call
  prompt** once the plan is agreed; **every RED action re-confirms at execution** (see `confirm-gate.md`).
- After the calls, **echo the plan + the estimated x402 spend** (sum of the sub-dollar data calls + any
  approved purchases) and let the user adjust before you begin.

## Call 1 — the essentials (always)
1. **When are you traveling?** (exact dates / rough month / "flexible — find the cheapest")
2. **How long?** (weekend / ~1 week / 2+ weeks)
3. **Who's going?** (solo / couple / family with kids / group)
4. **Cash or miles?** (cheapest cash / I have miles to burn / show me both)

## Call 2 — vibe & priorities (always)
1. **Main vibe?** (food & nightlife / culture & sights / nature & outdoors / relax & recharge)
2. **How should I judge "good"?** (aggregated ratings & reviews / what locals say on social / hidden gems off
   the tourist path / all of it)
3. **Budget posture?** (shoestring / mid / no cap — book the best)
4. **Home base + currency?** (confirm origin city/airport + home currency)

## Call 3 — prep & deliverables (ALWAYS ask; don't silently drop options)
> Surface **all** of these — especially **gear-buy** and **reminders**, which are easy to forget. They're
> valuable even for a "plan only" trip. Reason about the destination first (plug type/voltage, climate,
> connectivity) so the gear suggestions are specific.
1. **Want me to buy the travel gear you'll need?** *(multi-select — real purchases via Purch, confirm each)* —
   power/plug adaptor (only if the plug type actually differs) · portable charger / power bank · pocket wifi or
   other connectivity · packing/comfort items (cubes, walking shoes) · nothing, just tell me what to bring
2. **Other prep?** *(multi-select)* — buy a destination **eSIM/data plan** · fund a **prepaid card** for the trip ·
   generate a **spoken phrasebook** (audio you can play)
3. **Reminders before you fly?** *(multi-select)* — **flight-reminder SMS** · an **AI wake-up call** before
   departure · none
4. **Book, or just plan?** (plan only / book hotel+transfers when I approve / book everything bookable with my approval)
5. **How do you want the final plan?** *(multi-select)* — hosted PDF itinerary · illustrated map + day-by-day
   calendar image · emailed to me

> Note on gear: even when **no adaptor is needed** (e.g. US↔Japan are both Type A), still offer *other* useful
> gear — don't skip the question. If the user says yes, use Purch (search → confirm exact item + total +
> shipping address → buy). Plug/voltage/climate reasoning itself is free (no endpoint).

## Answer → which paid calls unlock
| Answer | Unlocks (endpoints file) |
|---|---|
| **When / dates** | flights `price_insights`, weather forecast, news-on-dates (`flights`/`weather`/`news-safety`) |
| **How long / who** | sizes itinerary; sets `adults`/`children` on flight + hotel search |
| **Cash or miles → miles/both** | award-seat search (`flights`: Seats.aero) |
| **Vibe** | steers `places-reviews` + `social-sentiment` + Apify queries |
| **Judge good → ratings** | Tripadvisor/Google Maps reviews (`places-reviews`) |
| **Judge good → social / hidden gems** | Reddit/X + Apify TikTok/IG/YouTube (`social-sentiment` + `apify`) |
| **Budget posture** | sets confirm-gate ceilings + FX budgeting (`fx-budget`) |
| **Home base + currency** | origin airport for flight search; FX pair (`fx-budget`) |
| **Buy gear → any item** | `purch-search`/`purch-shop` (find) → `purch-buy` 🔴 buy+ship (`prepare-buy`; plug/voltage/climate reasoning is free) |
| **Prep → eSIM** | Bitrefill eSIM buy 🔴 (`prepare-buy`) |
| **Prep → prepaid card** | Laso card 🔴 (`prepare-buy`) — also enables card-funded bookings |
| **Prep → phrasebook** | TTS 🟢 → host on StableUpload → deliver playable links + table in PDF (`deliverables`; translate the phrases free) |
| **Reminders → SMS / wake-up call** | AgentPhone SMS + AI call 🔴 (`deliverables`); StablePhone/Textbelt fallback |
| **Book → hotel/transfers** | `lodging` booking 🔴 (Travala or StableTravel + Laso card) |
| **Deliver → PDF** | Markdown/HTML→PDF + StableUpload host (`deliverables`) |
| **Deliver → map/calendar** | GPT Image 2 / Nano Banana (`deliverables`) |
| **Deliver → email** | AgentMail/StableEmail 🔴 (`deliverables`; reuse owned inbox) |

## Worked example
> *"Can you plan a trip to Tokyo for me, I'm based in San Francisco."*
Ask Call 1 (dates? length? who? cash/miles?) → Call 2 (vibe? judge-good? budget? confirm SFO + USD) → Call 3
(prep? book? deliverables?). Then echo: "Here's the plan and it'll cost about ~$0.X in live-data calls; I'll
confirm before any booking or purchase." Proceed on approval.
