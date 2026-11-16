# Review Round 2 - Token Launch Radar

## Verdict
**FAIL** - The submission is blocked by a High severity issue introduced by Fix 3. Semantic parity between `lib/model.ts` and `dashboard/app.js` is broken for specific categories. The `dashboard/app.js` frontend script uses the regex `/liq/` which incorrectly intercepts "Liquid Staking" protocols before the `/stak/` rule. This causes the dashboard to display completely different and nonsensical farming steps (impermanent loss/pool slippage) compared to the correct validator slashing steps written to the official `board.json`.

## Finding 1 Re-assessment (Rejection Verdict)
**Verdict:** The rejection of Finding 1 is **CORRECT**.
**Evidence:** The official field guide (`.staging/input/README.md`) explicitly clarifies that protocols outside the house's watchlist filters are completely valid subjects for the radar:
> *"It is a floor, never a ceiling. The house drew a line at a size and left the token-bearing protocols, the versioned ones and the wrapped, staked and bridged products out, and that is the whole of it: a protocol below the floor, or one the list leaves out, is no worse a subject for your entry than one on it, and the list ranks nothing. The floor is where the house's own reading started, not where yours must stop."*
Preserving wrapped/bridged assets as valid ranked rows perfectly aligns with the competition rules.

## Verification of Fixes

| Fix | Component | Verification Status | Details |
| :--- | :--- | :--- | :--- |
| **Fix 2** | Detail Modal Valuation | **PASS** | Checked `dashboard/app.js` and confirmed it directly renders `fmtUsd(row.implied_value_usd)`. Spot checked 3 rows (`coinbase-bridge` $751,386,886; `wbtc` $670,754,856; `valdora-finance` $389,191) running the entry; the modal logic accurately traces the exact `board.json` values with no rounding drift. |
| **Fix 3** | Farm Steps Semantic Parity | **FAIL** | Length bounds are met (142 to 276 chars). However, semantic parity between `model.ts` and `app.js` fails. In `model.ts`, Liquid Staking protocols match `.includes('stak')`. In `app.js`, they incorrectly match `/dex\|yield\|farm\|liq/.test(c)` due to the `liq` substring. Spot checking `valdora-finance` (Liquid Staking) revealed the board farm steps discuss "validator slashing", but the UI modal displays steps for "impermanent loss and pool slippage". |

## Gate Checks

| Check | Status | Details / Numbers |
| :--- | :--- | :--- |
| `boardIssue` | PASS | Returns `null`; runner execution exits with 0. |
| Ranks & Scope | PASS | 289 rows scored. Watchlist coverage 40 / 40. |
| Determinism | PASS | Two consecutive executions diffed with 0 byte differences. |
| Farm Step Lengths | PASS | 6 steps per protocol; step lengths range from 142 to 276 characters, within the 20 to 600 character limit. |
| Dashboard Size | PASS | 3 files totaling 37,047 bytes (~36.1 KB), well under the 40 KB source budget. |
| No-Network Rule | PASS | 0 instances of `http://` or `https://` string found across all dashboard files. |
| Dossier Byte Match | PASS | `buildDossier` runs correctly; output structurally matches and builds a valid 589,858 bytes dossier. |
| Screenshots | PASS | 3 PNG files verified. Dimensions: 1440x900. Sizes: 125,141 bytes, 154,161 bytes, 134,185 bytes (all <= 512 KiB). |

## Remaining Findings

| Severity | File | Evidence | Fix |
| :--- | :--- | :--- | :--- |
| High | `dashboard/app.js` | The regex `/dex\|yield\|farm\|liq/.test(c)` within `categoryRisk`, `weeklyActionFor`, `exitActionFor`, and `actionFor` incorrectly matches "Liquid Staking" protocols. It intercepts the category routing before it reaches the `/stak/` rule. This destroys semantic parity with `lib/model.ts` (which checks `.includes('liquidity')`), causing the dashboard to display completely wrong farming advice for multiple protocols. | Replace `/dex\|yield\|farm\|liq/` with `/dex\|yield\|farm\|liquidit/` (or strictly match the string patterns used in `model.ts`) across all helper functions in `dashboard/app.js`. |