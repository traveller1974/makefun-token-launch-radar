# PLAN.md: Token Launch Radar

## Executive Summary
This document outlines the final signed-off architecture, empirical data findings, valuation methodology (Model v2), farming strategy engine, dashboard interface design, and end-to-end execution workflow for our entry in the `token-radar-01` competition.

The objective is to produce a state-of-the-art token launch radar that reads the sealed snapshot (`/input/snapshot.json`), estimates market-calibrated launch valuations for all pre-token protocols, provides 6-step farming instructions, and delivers an intuitive, zero-network dashboard evaluated via a source dossier and three high-fidelity screenshots.

**STATUS: SIGNED OFF**
**Date:** 2026-11-16
**Planner Model ID:** gemini-3.1-pro-preview

---

## 1. Goal & Deliverables Checklist

The entry is evaluated against the sealed gate scorer and the superbot AI judge. All requirements below are hard constraints:

*   **`dashboard_files`**: 3 files (`index.html`, `app.css`, `app.js`) in `/output/dashboard/`, total ~35 KB (limit: 400 files, 4 MiB).
*   **No-Network Rule**: 100% self-contained; pure client-side JS/CSS; no remote fonts/APIs. 0 `http://` or `https://` in HTML attributes, inline scripts, CSS, or JS imports.
*   **Dossier Source Limit**: Dashboard source kept under 40 KB total so the judge reads 100% of code (truncates at 64 KB).
*   **`board_file`**: Ranked board in `/output/board.json` with exactly 289 rows (limit: 100 to 4,000 rows).
*   **`sorted_by_value`**: Monotonically non-increasing implied value; stable tie-breaking by slug. Ranks 1 to 289.
*   **`coverage`**: 40 / 40 watchlist protocols covered (100.0% coverage).
*   **`farm_steps`**: Exactly 6 steps per protocol; each 80-220 characters with explicit Cost & Time (limit: 3 to 12 steps, 20-600 chars).
*   **`screenshots`**: 3 pre-captured PNGs (`1-board.png`, `2-detail.png`, `3-filtered.png`) at 1440x900, roughly 150-250 KB each (limit: <= 512 KiB, long side <= 1440px, short side >= 800px).
*   **`dossier_matches`**: Cryptographic package verification matching `buildDossier`.
*   **Execution Sandbox**: Zero npm dependencies; standard library only. Execution must finish in < 120s (expected < 2s).
*   **Determinism**: Output files and hashes byte-identical across consecutive executions. Pure deterministic sorting, seeded/zero-entropy computations, no clock drift.

---

## 2. Value Model v2 Final Formula

The valuation engine applies an empirical comps multiple with Bayesian shrinkage, sublinear TVL base scaling, a clamped growth multiplier, a log-shaped protocol maturity multiplier, and a data completeness confidence discount.

### Formula in Plain Algebra
All variables evaluate deterministically based purely on snapshot data, with no protocol name special-casing.

**A. Empirical Comps Multiple (Bayesian Shrinkage)**
Let `n_c` be the number of live peers in category `c` (`mcap_usd > 0` and `tvl_usd > 0`).
Let `M_c` be the category empirical median ratio of `Mcap / TVL` (ratios winsorized to `[0.01, 5.0]`).
Let `M_global` = `0.2138` (the true interpolated median of all 128 live peers).
Let `k` = `4` (shrinkage parameter).

`M_category(c) = (n_c * M_c + 4 * 0.2138) / (n_c + 4)`
*Clamp:* `M_category` is clamped to the range `[0.03, 1.50]`.
*Null Fallback:* If category is null, `M_category` = `0.2138`.

**B. Sublinear TVL Base Scaling**
Base valuation scales sublinearly (exponent 0.85) to resist TVL spoofing/inflation:
`Base = 10^6 * (TVL_USD / 10^6)^0.85 * M_category`

**C. Clamped 7-Day TVL Growth Multiplier**
`GrowthClamped = max(-60, min(120, change_7d))` (If `change_7d` is null, use `0`)
`Mult_growth = 1.0 + (GrowthClamped / 100) * 0.40`
*(Multiplier bounds: 0.76x to 1.48x)*

**D. Log-Shaped Protocol Maturity Multiplier**
`AgeEffective = min(1095, age_in_days)` (If `listed_at` is null, use `365` days)
`Mult_maturity = 0.50 + 0.50 * (ln(1 + AgeEffective) / ln(1 + 1095))`
*(Multiplier bounds: 0.50x to 1.00x)*

**E. Data Completeness Confidence Discount**
`Discount_confidence = (change_7d is null ? 0.92 : 1.0) * (listed_at is null ? 0.88 : 1.0)`

**F. Final Implied Value**
`ImpliedValue = max(1, round(Base * Mult_growth * Mult_maturity * Discount_confidence))`

---

## 3. Final Board Scope

*   **Total Scored Rows:** Exactly 289 rows.
*   **Eligible Population:** All rankable pre-token protocols from the snapshot:
    *   Pre-Token: `mcap_usd === null && gecko_id === null && symbol === null`
    *   Category exclusion: `category !== 'CEX'`
    *   Name exclusion: Name does not end in version markers (`\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$`).
*   **Watchlist Coverage:** All 40 watchlist protocols are fully represented (100% coverage).
*   **Ranking Order:** Sorted strictly by `implied_value_usd` descending, breaking ties deterministically by `slug` ascending. Ranks assigned sequentially 1 to 289.

---

## 4. Farm Plan Rules

Every ranked row includes a dynamically generated 6-step farming plan, strictly bounded between 20 and 600 characters per step:
1.  **Wallet Hygiene:** Initialize a dedicated farming wallet.
2.  **Core Action:** A category-specific action (e.g., provide concentrated LP, supply collateral) on the protocol's primary chain. Capital allocation scales by TVL Tier (Tier 1: $250, Tier 2: $150, Tier 3: $100, Tier 4: $50).
3.  **Weekly Cadence:** Execute one qualifying weekly transaction (swap, borrow, or vote) to build non-linear activity footprints.
4.  **Holding Period:** Maintain the position across snapshot intervals. Holding days scale by protocol age (<180d: 60 days, 180-365d: 45 days, older: 30 days).
5.  **Verification:** Check point allocations solely via official verified interfaces to avoid phishing.
6.  **Unwinding:** Record all transaction hashes and cleanly withdraw post-snapshot.

---

## 5. Dashboard Specification

*   **Architecture:** Zero network dependency. Total source budget <= 40 KB. Ingests local `data.js`.
*   **Theme:** Polished Web3 Terminal Dark Mode (slate/panel backgrounds, monospace tabular numbers, cyan/emerald/coral accents).
*   **Layout:**
    *   Header: Branding, model version, stats (Watchlist coverage, Scored rows).
    *   Filter Bar: Debounced search, Category/Chain dropdowns, "Watchlist Only" toggle.
    *   Interactive Table: Rank, Name, Category, Chains, TVL, 7d Change, Maturity, Implied Value, Action button. Multi-column sorting.
    *   Detail Modal: Valuation waterfall breakdown, interactive 6-step farming guide with copy buttons.
    *   Live Peers Tab: Comparison view of live trading protocols and empirical multiples.
    *   Methodology Drawer: Explanation of Model v2 mathematical formulas.

---

## 6. Build Order for Execution

1.  **Step 1: Quantitative Engine (`lib/model.ts`)**
    *   Implement Bayesian shrinkage logic, sublinear base math, and the farm step generator without any external dependencies.
2.  **Step 2: Dashboard Implementation (`dashboard/`)**
    *   Author `index.html`, `app.css` (<= 10 KB), and `app.js` (vanilla JS, <= 22 KB). Ensure zero remote assets.
3.  **Step 3: Primary Runner (`main.ts`)**
    *   Adapt runner to ingest snapshot, compute Model v2 radar, emit `output/board.json` and `output/data.js`.
4.  **Step 4: Screenshot Capture & Commit**
    *   **MANUAL STEP:** Render the local dashboard in a browser, capture 3 standard images (`1-board.png`, `2-detail.png`, `3-filtered.png`) at 1440x900.
    *   Commit these to the `screenshots/` directory. The automated `main.ts` runner will merely copy them to `/output/screenshots/` to respect execution limits and avoid heavy headless browser dependencies.
5.  **Step 5: Local Execution & Gate Validation**
    *   Execute `main.ts`, validating deterministic outputs and size limits against the sealed scorer gate. Verify dossier hash matching.

---

## 7. Decisions Log

See `PLAN_DECISIONS.md` for a complete log of changes versus the original draft plan and reasoning for each final decision.
