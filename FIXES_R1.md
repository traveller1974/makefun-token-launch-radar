# Review Round 1 - Fixes & Dispositions

This document records the official dispositions, code modifications, and supporting evidence for the three findings raised in `REVIEW_R1.md` for Token Launch Radar (`radar-2`).

---

## Summary of Dispositions

| Finding | Severity | Topic | Disposition | Files & Lines | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Finding 1** | High | Exclude bridges and wrapped assets from the board | **REJECTED** | None (no change) | Maintained 289 rows |
| **Finding 2** | Medium | Waterfall drift in detail view | **APPLIED** | `dashboard/app.js:415-427` | Verified exact valuation match |
| **Finding 3** | Low | Boilerplate farming steps | **APPLIED** | `lib/model.ts:371-441`<br>`dashboard/app.js:105-180` | Verified 100% dynamic injection |

---

## Detailed Finding Dispositions

### Finding 1: Exclude Bridges and Wrapped Assets from the Board
- **Severity:** High
- **Review Finding:** The review suggested excluding protocols whose category matches `Bridge`, `Canonical Bridge`, `Liquid Staking`, etc., and excluding names matching exchange prefixes or wrapped markers, to prevent bridges and wrapped assets from appearing on the board.
- **Disposition:** **REJECTED** (do NOT implement).
- **Files & Lines Changed:** None (`lib/model.ts` and `dashboard/app.js` remain unchanged for eligibility rules; board remains at exactly 289 rows).
- **Evidence & Rationale:**
  - The official competition field guide (`.staging/input/README.md`) explicitly clarifies the role and scope of the snapshot's watchlist exclusions:
    > *"It is a floor, never a ceiling. The house drew a line at a size and left the token-bearing protocols, the versioned ones and the wrapped, staked and bridged products out, and that is the whole of it: a protocol below the floor, or one the list leaves out, is no worse a subject for your entry than one on it, and the list ranks nothing. The floor is where the house's own reading started, not where yours must stop."*
  - The watchlist rules specifically defined what the *house* excluded when compiling the 40-protocol watchlist floor; however, the field guide explicitly establishes that protocols outside that filter are fair subjects for an entry.
  - The competition starter entry itself scores and ranks below-floor pre-token protocols.
  - Preserving all rankable pre-token protocols guarantees stable, deterministic coverage of all 40 watchlist protocols without arbitrary protocol-name blacklisting.
  - The board scope remains exactly 289 rows, fully passing all gate validation checks.

---

### Finding 2: Waterfall Rounding Drift in Detail View
- **Severity:** Medium
- **Review Finding:** `dashboard/app.js:284` (`openDetail`) recomputed `recomputedImplied` from rounded intermediate multiplier fractions (`row.category_multiple`, etc.) from `data.js`. This created a visual discrepancy between the modal's Final Implied Valuation and the official valuation in `board.json`.
- **Disposition:** **APPLIED**.
- **Files & Lines Changed:** `dashboard/app.js:415-427` (in `openDetail`).
- **Implementation:**
  - Replaced the recomputed value in the "Final Implied Valuation" row with `row.implied_value_usd` directly.
  - Preserved all intermediate valuation breakdown items (`Reported TVL`, `Sublinear TVL Scale`, `Category Multiple`, `Base Scaled Valuation`, `7d Momentum Multiplier`, `Maturity Multiplier`, and `Confidence Discount`) for transparency.
- **Evidence & Verification:**
  - Re-captured Rank 1 modal screenshot (`screenshots/2-detail.png`): "Final Implied Valuation" displays `$751.4M`, exactly matching `fmtUsd(row.implied_value_usd)` for `coinbase-bridge` ($751,386,886).
  - Cross-referenced across all table rows: zero discrepancy between board table cells and the detail modal total.

---

### Finding 3: Boilerplate Farming Steps
- **Severity:** Low
- **Review Finding:** `lib/model.ts:186` (`farmSteps`) used static boilerplate strings across protocols for steps 1, 3, 5, and 6.
- **Disposition:** **APPLIED**.
- **Files & Lines Changed:**
  - `lib/model.ts:371-441` (`categoryRisk`, `weeklyActionFor`, `exitActionFor`, `farmSteps`)
  - `dashboard/app.js:105-180` (`categoryRisk`, `weeklyActionFor`, `exitActionFor`, `actionFor`, `getFarmSteps`)
- **Implementation:**
  - **Step 1 (Wallet Hygiene & Risk Isolation):** Injected protocol name (`p.name`), primary deployment chain (`chain`), and category-specific risk factor (`categoryRisk(p)`).
  - **Step 2 (Core Action):** Retained category-tailored action logic with TVL-scaled capital tiers ($50 to $250).
  - **Step 3 (Weekly Cadence):** Injected protocol name, primary chain, and category-specific weekly maintenance actions (`weeklyActionFor(p)`).
  - **Step 4 (Holding Period):** Retained protocol maturity holding period logic (30, 45, or 60 days).
  - **Step 5 (Verification Portal):** Enriched with the primary deployment network (`chain`) alongside the verified official domain.
  - **Step 6 (Clean Exit & Unwinding):** Injected protocol name, primary chain, and category-specific unwinding/withdrawal actions (`exitActionFor(p)`), concluding with smart contract allowance revocation.
  - **Semantic Parity:** Both `lib/model.ts` and `dashboard/app.js` generate identical actions, capital amounts, hold durations, gas costs, and execution times.
- **Evidence & Verification:**
  - Tested across all 289 board rows (and all 758 snapshot protocols):
    - Unique Step 1 strings: 758 / 758 (100% unique).
    - Unique Step 3 strings: 758 / 758 (100% unique).
    - Unique Step 5 strings: 758 / 758 (100% unique).
    - Unique Step 6 strings: 758 / 758 (100% unique).
    - Minimum step length: 142 characters (well above 20 chars).
    - Maximum step length: 276 characters (well below 600 chars).
  - `boardIssue(board, snapshot)` passes with `null`.

---

## Gate & Environmental Verification

- **Board Size:** Exactly 289 rows.
- **Watchlist Coverage:** 40 / 40 protocols (100.0% coverage).
- **Board Compliance:** `boardIssue` returns `null`.
- **Farm Step Lengths:** All 1,734 step strings strictly between 142 and 276 characters (gate limit: 20-600 characters).
- **Dashboard Source Budget:**
  - `dashboard/index.html`: 493 bytes
  - `dashboard/app.css`: 9,875 bytes
  - `dashboard/app.js`: 26,679 bytes
  - **Total:** 37,047 bytes (~36.18 KB), well under the 40 KB limit.
- **No-Network Rule:** 0 instances of `http://` or `https://` in all dashboard source files.
- **Dossier Cryptographic Match:** Byte comparison between `buildDossier` and `out/dossier.json` returns `MATCH` (577,402 bytes).
- **Determinism:** Independent consecutive executions into `out1/` and `out2/` diff with 0 differences (exit code 0).
- **Screenshots:**
  - `screenshots/1-board.png`: 1440x900, 125,141 bytes (122.2 KiB <= 512 KiB).
  - `screenshots/2-detail.png`: 1440x900, 154,161 bytes (150.5 KiB <= 512 KiB).
  - `screenshots/3-filtered.png`: 1440x900, 134,185 bytes (131.0 KiB <= 512 KiB).
