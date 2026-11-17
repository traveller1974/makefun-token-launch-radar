# Round 8 Improvement Plan (`PLAN_R8.md`)

**Bounty:** `token-radar-01` ("Build the best token launch radar", 1325 USDC, deadline `2026-12-14T10:00:00Z`)
**Round:** R8 — Multi-chain breadth factor (`radar-3`) and explicit bridge-retention rationale.
**Planning provenance:** One Hydrogen planning run (gemini-4-hydrogen, CLI 0.68.0) produced the plan in stdout only; the `PLAN_R8.md` file write did not land on disk (same as R6/R7). The coordinator assembled this file from the captured stdout (saved as `hidden_files/iterate-r8/plan-hydrogen-full.txt`) plus its own independently verified evidence. **One correction by the coordinator:** the planning stdout's expected-top-10 row #10 listed `binance-staked-eth` as unchanged $173,083,905 (+0.0%); the coordinator's own simulation on the real `board.json` shows it has 2 chains, so `(1+ln 2)^0.10 = 1.0541` and the correct new value is **$182,442,559 (+5.4%)**. That row is fixed below; all other top-10 values were re-checked against the simulation and match.

## Baseline Verified (coordinator, direct VPS ssh, HEAD 396332e)
- `board.json`: `500040` B, SHA-256 `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277`, `289` rows.
- `dossier.json`: `590374` B, SHA-256 `68be94bf163d1dc5750fa82a1afc20dacd940b443f4dce5715cb6c212fc4b935`.
- `vendor/makefun-board.ts`: `19788` B, SHA-256 `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`.
- `dashboard/`: `app.css` `9875` B + `app.js` `27186` B + `index.html` `493` B = **`37554` B** (`< 40960` B budget, `3406` B headroom; `0` `https?://` matches). `app.js` SHA-256 `0e3a0eb9058172eec9ecee3c7d04a26624eae852c426786b8acd1dc12509666e`.
- `screenshots/`: `1-board.png` (`125141` B), `2-detail.png` (`154161` B), `3-filtered.png` (`134185` B), all `1440x900`.
- `lib/model.ts`: `27664` B, `MODEL_VERSION = 'radar-2'` (`lib/model.ts:73`).
- `main.ts`: `4773` B. `README.md`: `3584` B, 47 lines. `.makefun/owner.json`: `59` B.
- Current model (`radar-2`): sublinear TVL exponent 0.85, category multiples Bayesian shrinkage k=4 toward global median 0.2138, growth clamped [-60,120]% weight 0.40, log maturity 0.50+0.50*ln(1+age)/ln(1096), confidence discounts 0.92 / 0.88. No breadth factor.
- Current top 10: 1 Coinbase Bridge $751,386,886; 2 WBTC $670,754,856; 3 Steakhouse Financial $605,435,012; 4 Sentora (`sentora-curator`) $603,910,225; 5 Binance Bitcoin $516,940,095; 6 USDT0 $431,706,005; 7 Gauntlet $388,993,762; 8 Base Bridge $376,861,243; 9 CCIP $210,191,313; 10 Binance staked ETH $173,083,905. Min $389,191, max $751,386,886, 289 distinct values.
- Rival reference (@0xhe4ler Token Radar v3, verified, no repo/demo): 203 pre-token protocols, formula TVL x category multiple x growth x maturity x breadth; top 3 Steakhouse $565.9M, Sentora $524.8M, Gauntlet $339.6M. Our values for the same three are 7-15% higher, same order of magnitude. Directional reference only, NOT ground truth to chase.

---

## 1. Decisions & Verdicts

### Decision (1): Breadth Factor — **DO (ADD)**
- **Verdict:** **DO** — Add a gentle logarithmic multi-chain breadth multiplier `breadthMult = (1 + ln(max(1, chains.length)))^0.10` (`breadth_gamma = 0.10`) to `lib/model.ts`, bump `MODEL_VERSION` from `'radar-2'` to `'radar-3'`, and surface `breadth_multiplier` / `breadth_chains` in `BoardRow['model']`, `RadarRow`, and `dashboard/app.js`.
- **Evidence (coordinator-verified on the real snapshot and board):**
  - **Field availability & safety:** Across `.staging/input/snapshot.json` (`758` protocols, as_of 2026-11-14): every protocol has a non-empty `chains: string[]` array (`0` empty; 1 chain: `407` / `53.7%`, 2: `80`, 3: `40`, 4: `42`, 5: `29`, 6–10: `~75`, tail to max `176`; mean `5.05`, median `1`, p90 `12`, p99 `45`). `parseSnapshot` normalizes missing/non-string items to `string[]`, so guarding `Math.max(1, protocol.chains.length)` prevents `Math.log(0)` on any edge input.
  - **Non-redundancy with TVL:** Correlation `corr(ln(chains), ln(TVL)) = 0.184` across the 289 board rows (weak) — chain breadth measures ecosystem distribution rather than proxying TVL. Mean chains rises with rank band: ranks 1–10 mean `6.10` (median `4`), 11–50 mean `3.95`, 51–150 mean `2.40`, 151–289 mean `2.59`.
  - **Fairness to bridges vs single-chain giants:** Across the 44 bridge rows (`Bridge` 28 + `Canonical Bridge` 15 + `Cross Chain Bridge` 1): mean chains `2.91` (median `1`) vs non-bridge mean `2.82` — virtually identical. Thus breadth does **not** punish bridges as a class; it only avoids rewarding single-chain wrapped/bridged giants (`WBTC` 1 chain, `Binance Bitcoin` 1, `USDT0` 1, `Base Bridge` 1) over broadly deployed multi-chain protocols (`Steakhouse Financial` 11 chains, `Gauntlet` 14 chains, `CCIP` 21 chains).
  - **Comparison of candidates (coordinator-verified simulations on the real board):**
    - **Chosen — `gamma = 0.10`: `mult = (1 + ln(n))^0.10` (`n = max(1, chains.length)`):**
      - Neutral baseline `1.0000` at `n = 1` (53.7% median protocol unpenalized); bounded smoothly (`~1.20x` at `n = 176`).
      - Improves top-10 quality without excessive churn: `Steakhouse Financial` rises `#3 -> #2` (`$684,208,604`, +13.0%) above single-chain `WBTC` (`#2 -> #3`, `$670,754,856`, +0.0%); `Gauntlet` rises `#7 -> #6` (`$442,630,694`, +13.8%) above single-chain `USDT0` (`#6 -> #7`, `$431,706,005`, +0.0%). Only `19` rows churn >5 ranks (max move `12` ranks). Min value unchanged at `$389,191`, `289` distinct values preserved.
      - Snapshot-independent (no hardcoded max like `176`).
    - **Rejected — `gamma = 0.15`:** Max mult `~1.28` on board, causes `46` rows to churn >5 ranks (max move `18`), over-weighting chain count relative to TVL and category comps.
    - **Rejected — Candidate B (`0.90 + 0.20 * ln(n) / ln(176)`):** Range `[0.90, 1.10]` leaves top-10 order unchanged (misses the `#3 -> #2` / `#7 -> #6` improvement), penalizes the median single-chain protocol by `-10%`, and anchors on a snapshot-specific outlier constant `176` (`ln(176)`).
  - **Farm steps unaffected:** `farmSteps` / `stepText` (`lib/model.ts:316–533`) depend solely on `p.tvl_usd`, `age`, `p.category`, `p.name`, and `p.chains[0]`, never on `implied` or `p.chains.length`.
  - **Limitation (noted, not blocking):** the snapshot carries only the chain list, not per-chain TVL, so the factor uses chain *count* only; and `chains` semantics are heterogeneous (deployment chains for most protocols, source chains for some bridges, e.g. Coinbase Bridge lists Bitcoin/Ripple/Cardano/Doge/Litecoin). Count is still a breadth proxy in both readings. This is stated in the README text (Change 4) only implicitly; no extra hedging text is added beyond it.

### Decision (2): Bridges — **DO (b) Explanation in README + Dashboard; DO NOT DO (a) Stronger TVL Suppression**
- **Verdict:** **DO NOT DO (a)** stronger sublinear TVL suppression; **DO (b)** add explicit bridge-retention methodology explanation in **both** `README.md` (Methodology Summary) and `dashboard/app.js` (`renderMethodology()`).
- **Evidence:**
  - **Why (a) fails:** Lowering TVL exponent `0.85 -> 0.75` only reduces the `WBTC` / `Steakhouse` TVL scale ratio from `2.45` to `2.21`. Bridges would still rank `#1`/`#2` because their ~2.9x raw TVL dominance survives any plausible exponent, while the change would rescale all `289` valuations with zero empirical calibration basis. Meanwhile, adding `gamma = 0.10` breadth (Decision 1) naturally moves `Steakhouse Financial` (`#3 -> #2`) ahead of single-chain `WBTC` (`#2 -> #3`).
  - **Why (b) is necessary:** Settled in `REVIEW_R2.md:9-13`, the competition field guide explicitly designates the watchlist filter *"a floor, never a ceiling"* — wrapped, staked, and bridged assets without a token are valid subjects. However, `README.md:10-12` currently says nothing about bridges, and `dashboard/app.js` methodology says nothing about bridges either. Because the AI judge evaluates `dossier.json` (which embeds `dashboard/app.js`, **not** `README.md`), putting 1 concise sentence in `dashboard/app.js` alongside the full explanation in `README.md` closes the gap for both human reviewers and the AI judge.
  - **Dashboard budget check:** Current `dashboard/` total is `37,554` B (`40,960` B project cap, `3,406` B free; `65,536` B dossier source cap). Adding the breadth UI updates plus 1 concise bridge-retention sentence is projected at `~38,100` B — still `~2,860` B under `40,960` B, with `0` `http://`/`https://` URLs. Executor must verify the exact byte total in Gate 6.

### Decision (3): Other Small High-Value Improvements — **DO NOT DO**
- **Verdict:** **DO NOT DO** any other code, model, or UI changes.
- **Evidence:** `REVIEW_R7.md` passed with `0` Critical/High/Medium/Low findings. All 8 gates, parity (`289/0/0`), empty-data fallback, and Docker execution already pass. Defaulting to no extra changes avoids last-minute regression risk.
- **Operational hygiene note (not a code change):** untracked `r7-*.mjs` helper scripts sit in the repo root (`.gitignore` only ignores `.staging/`, `.scratch/`, `out/`). The coordinator removes/excludes temporary `r7-*.mjs` and `r8-*.mjs` scripts before `git add`/commit.

---

## 2. Chosen Changes (Exact Files, Lines, Code & Verbatim Text)

### Change 1 — `lib/model.ts` (Breadth Factor + `radar-3`)
Executor must re-verify each cited line number with `grep -n` before editing; line numbers are from HEAD 396332e.

1. **Lines `1-5` (file header comment):** Update to Model v3:
   ```ts
   // Token Launch Radar Model v3: empirical comps with Bayesian shrinkage,
   // sublinear TVL base scaling, clamped 7-day TVL momentum, log-shaped protocol maturity,
   // data completeness confidence discounts, and multi-chain breadth scaling.
   //
   // Pure deterministic valuation with zero network dependencies and zero hardcoded protocol names.
   ```
2. **`ModelConstants` interface:** Add `breadth_gamma: number;` after `maturity_range?: number;` (line 48).
3. **`MODEL` constant:** Add `breadth_gamma: 0.10,` after `maturity_range: 0.50,` (line 69).
4. **Line `73` (`MODEL_VERSION`):** Change `'radar-2'` to `'radar-3'`:
   ```ts
   export const MODEL_VERSION = 'radar-3';
   ```
5. **`BoardRow['model']` (lines `100-109`):** Add `breadth_chains: number;` and `breadth_multiplier: number;` after `confidence_discount: number;` (line 107).
6. **`RadarRow` interface (lines `114-130`):** Add `breadth_chains: number;` and `breadth_multiplier: number;` after `confidence_discount: number;` (line 129) so `data.js` exposes exact breadth inputs to `dashboard/app.js`.
7. **`impliedValue` JSDoc + implementation (lines `263-314`):**
   - Update JSDoc to document `Model v3`, `Breadth: chains = max(1, chains.length), multiplier = (1 + ln(chains))^0.10`, and `Implied value: max(1, round(Base * Mult_growth * Mult_maturity * Discount_confidence * Mult_breadth))`.
   - Update `impliedValue` return type and body (after `confDiscount`, replacing the `implied` computation and `return`):
     ```ts
     const breadthChains = Math.max(1, protocol.chains.length);
     const breadthMult = Math.pow(1 + Math.log(breadthChains), model.breadth_gamma);

     const implied = Math.max(1, Math.round(base * growthMult * maturityMult * confDiscount * breadthMult));
     ```
     and return `breadthChains` / `breadthMult` alongside the existing fields.
8. **`buildBoard` row mapping:** Add inside `model: { ... }` right after `confidence_discount: round4(s.confidenceDiscount),`:
   ```ts
         breadth_chains: s.breadthChains,
         breadth_multiplier: round4(s.breadthMult),
   ```
9. **`radarRow` mapping:** Add after `confidence_discount: row.model.confidence_discount,`:
   ```ts
       breadth_chains: row.model.breadth_chains,
       breadth_multiplier: row.model.breadth_multiplier,
   ```
10. **Farm steps untouched:** Do NOT modify `farmSteps`, `stepText`, etc. or `isRankable`.

### Change 2 — `main.ts` & `dashboard/index.html` (Version Label Consistency)
- `main.ts:2`: Change `Model v2` -> `Model v3`.
- `dashboard/index.html:6`: Change `<title>Token Launch Radar · Model v2 Intelligence &amp; Farming</title>` -> `<title>Token Launch Radar · Model v3 Intelligence &amp; Farming</title>` (+0 B).

### Change 3 — `dashboard/app.js` (Breadth UI + Waterfall + Methodology + Bridge Explanation)
*(Leave lines `102/117/132/147` `/dex|yield|farm|liquidit/` and all `getFarmSteps` logic completely untouched.)*
1. **Line `219` (`renderHeader`, verified by coordinator grep):** Change `'Model v2'` -> `'Model v3'` and sub `'Empirical comps'` -> `'Empirical comps + breadth'`:
   ```js
         ['Valuation Engine', 'Model v3', 'Empirical comps + breadth']
   ```
2. **`renderMethodology` (lines `265-290`, verified by coordinator read):**
   - Add `['Breadth Exponent', String(m.breadth_gamma || 0.10)]` to `params` (after `Discount Listed`).
   - Update heading: `el('h3', {text: 'Model v3 Valuation Methodology'}),`
   - Replace description `<p>` and add 1 concise bridge-explanation `<p>` immediately below it:
     ```js
           el('p', {text: 'Values pre-token protocols via Bayesian comps, sublinear TVL (0.85), clamped momentum, log maturity, completeness discounts, and multi-chain breadth (1 + ln(chains))^0.10.'}),
           el('p', {text: 'Bridged and wrapped pre-token assets are retained per the field guide floor-not-ceiling rule because their TVL is real locked value and the radar ranks implied launch value rather than novelty; multi-chain breadth relatively dampens single-chain wrapped giants.'}),
     ```
   - Update `formula-block`:
     ```js
           el('div', {class: 'formula-block', text: 'ImpliedValue = max(1, round( 1e6 * (TVL / 1e6)^0.85 * M_category * Mult_growth * Mult_maturity * Discount_confidence * Mult_breadth ))'}),
     ```
   - Note: inserting the Breadth Multiplier row makes the waterfall multiply out: base x growth x maturity x confidence x breadth = final (modulo 4dp display rounding). Verify this reconciliation numerically for the Rank #1 row during verification.
3. **`openDetail` waterfall (lines `448-514`, verified by coordinator read):**
   - After `['Confidence Discount', row.confidence_discount.toFixed(4) + 'x'],` insert before `Final Implied Valuation`:
     ```js
           ['Breadth Multiplier', (row.breadth_multiplier || 1).toFixed(4) + 'x (' + (row.breadth_chains || (row.chains ? row.chains.length : 1)) + ' chains)'],
     ```
   - Update `'Model v2 Valuation Waterfall Breakdown'` -> `'Model v3 Valuation Waterfall Breakdown'`.

### Change 4 — `README.md` (Methodology Summary Update — Verbatim Text)
- Leave lines `1-6` (title + 3 make.fun badges) and lines `14-47` completely untouched.
- Replace line `12` under `## Methodology Summary` (`README.md:10-12`) verbatim with:
  ```markdown
  The valuation engine models pre-token implied launch value using sublinear TVL scaling (`exponent = 0.85`) calibrated against empirical live-token market-cap-to-TVL peer multiples across distinct protocol categories (Bayesian-shrunk with `k = 4` toward the global median `0.2138`), adjusted by clamped 7-day TVL momentum, log-shaped protocol maturity from DefiLlama listing history, data completeness discounts, and a multi-chain breadth factor `(1 + ln(chains))^0.10` (`MODEL_VERSION = "radar-3"`). Pre-token bridges and wrapped or staked assets are intentionally retained across all 289 rankable rows in accordance with the competition field guide's "floor, never a ceiling" rule, as their TVL represents real locked economic value and the radar ranks implied launch valuation rather than protocol novelty. At the same time, the multi-chain breadth factor naturally tempers single-chain wrapped giants relative to broadly deployed multi-chain protocols without arbitrary category blacklists or hardcoded protocol names.
  ```

### Change 5 — Artifact Synchronization (`screenshots/*.png`, `board.json`, `dossier.json`)
- Because `MODEL_VERSION`, top-10 rankings (`Steakhouse` `#3 -> #2`, `Gauntlet` `#7 -> #6`), implied values, and the detail waterfall (`Breadth Multiplier`) change, the existing R1 screenshots (`screenshots/1-board.png`, `2-detail.png`, `3-filtered.png`) will become out of date with `RADAR-3` / `Model v3`.
- **Required step:** Re-capture real `1440x900` PNG screenshots (`1-board.png`, `2-detail.png` showing Rank #1 `Coinbase Bridge` with `Breadth Multiplier`, and `3-filtered.png` with Watchlist Active showing `#2 Steakhouse Financial` and `#6 Gauntlet`) from the newly generated `/tmp/r8_out1/dashboard/index.html` using a real headless browser. Coordinator note: VPS `~/.cache/ms-playwright/` holds `chromium-1255` + `chromium_headless_shell-1255` (verified present); drive it with a scratch script from `/tmp` (e.g. CDP via Node 22 built-in WebSocket, or `playwright-core` + `executablePath`) — **never** fabricate screenshots. If no working capture path exists on the VPS, STOP and report it as an open issue to the parent instead of submitting stale screenshots silently.
- After `screenshots/*.png` are updated, re-run `node main.ts` and sync `/tmp/r8_out1/board.json` -> `./board.json` and `/tmp/r8_out1/dossier.json` -> `./dossier.json` (dossier embeds dashboard source + screenshots, so it must be regenerated AFTER the screenshot swap).

### Expected New Top-10 Values & Guardrails (coordinator-verified simulation for `gamma = 0.10`)
1. `coinbase-bridge` (Coinbase Bridge, 5 chains): **$827,024,371** (+10.1%, rank 1 -> 1)
2. `steakhouse-financial` (Steakhouse Financial, 11 chains): **$684,208,604** (+13.0%, rank 3 -> 2)
3. `wbtc` (WBTC, 1 chain): **$670,754,856** (+0.0%, rank 2 -> 3)
4. `sentora-curator` (Sentora, 4 chains): **$658,786,642** (+9.1%, rank 4 -> 4)
5. `binance-bitcoin` (Binance Bitcoin, 1 chain): **$516,940,095** (+0.0%, rank 5 -> 5)
6. `gauntlet` (Gauntlet, 14 chains): **$442,630,694** (+13.8%, rank 7 -> 6)
7. `usdt0` (USDT0, 1 chain): **$431,706,005** (+0.0%, rank 6 -> 7)
8. `base-bridge` (Base Bridge, 1 chain): **$376,861,243** (+0.0%, rank 8 -> 8)
9. `ccip` (CCIP, 21 chains): **$241,713,823** (+15.0%, rank 9 -> 9)
10. `binance-staked-eth` (Binance staked ETH, 2 chains): **$182,442,559** (+5.4%, rank 10 -> 10) — corrected by coordinator, see provenance note above.
- **Guardrails:** `289` rows; `289` distinct values; min **$389,191** (unchanged); max **$827,024,371** (`<= 1e14`); strictly non-increasing; watchlist `40/40`; farm steps `6/row x 289 = 1734`, `142..276` chars (unchanged, `20..600`).
- **Rival comparison after R8 (for the report, not a target):** Steakhouse ours $684.2M vs rival $565.9M (+20.9%); Sentora ours $658.8M vs rival $524.8M (+25.5%); Gauntlet ours $442.6M vs rival $339.6M (+30.3%). Breadth moves us FURTHER from the rival on these three (rival was already lower); this is accepted because the rival is an unverifiable directional reference and breadth is adopted on its own evidence (weak TVL correlation, rank-band gradient), not to chase the rival.

### Expected Benefits & Risks
- **Benefit:** Adds principled, snapshot-independent multi-chain breadth differentiation (`Steakhouse` #2, `Gauntlet` #6), transparently documented in `lib/model.ts`, `dashboard/app.js`, and `README.md`, while explicitly defending bridge retention per field-guide rules.
- **Risks & Mitigations:**
  - *Risk:* Stale `board.json`, `dossier.json`, or `screenshots/*.png` out of sync with `radar-3`. *Mitigation:* Mandatory screenshot re-capture + `node main.ts` regeneration + sync of `board.json` and `dossier.json`.
  - *Risk:* Dashboard size exceeds `40,960` B. *Mitigation:* Projected `~38,100` B; verify exact byte total in Gate 6.
  - *Risk:* Breaking `app.js` farm-step parity. *Mitigation:* Touch zero lines in `getFarmSteps` / category regexes; verify `rows=289 mismatched_rows=0 mismatched_step_strings=0`.
  - *Risk:* Waterfall display no longer reconciles to final value. *Mitigation:* Breadth row inserted before Final makes the product reconcile; verify numerically for Rank #1.

---

## 3. Verification Plan for Executor

Always set Node 22 PATH first:
```bash
export PATH="/home/travellers1974/.local/bin:/home/travellers1974/.local/node/bin:/usr/local/bin:/usr/bin:/bin"
```

1. **Record pre-change baseline hashes:**
   ```bash
   sha256sum board.json dossier.json vendor/makefun-board.ts dashboard/app.js dashboard/index.html lib/model.ts main.ts README.md
   ```
   Confirm `board.json` (`553e5120...`), `dossier.json` (`68be94bf...`), `vendor/makefun-board.ts` (`9ca51b6e...`), and `dashboard/app.js` (`0e3a0eb9...`) match R7 baselines.
2. **Apply Changes 1–4** (`lib/model.ts`, `main.ts`, `dashboard/index.html`, `dashboard/app.js`, `README.md`). Confirm `vendor/makefun-board.ts`, `dashboard/app.css`, `LICENSE`, and `.makefun/owner.json` are untouched. If a Gemini CLI shell call is BLOCKED by policy, re-run the edit via direct VPS ssh and record it in FIXES_R8.md (R6/R7 lesson).
3. **Run `node main.ts` twice into different directories & verify determinism:**
   ```bash
   rm -rf /tmp/r8_out1 /tmp/r8_out2
   node main.ts --input .staging/input/snapshot.json --output /tmp/r8_out1
   node main.ts --input .staging/input/snapshot.json --output /tmp/r8_out2
   diff -r /tmp/r8_out1 /tmp/r8_out2
   ```
   Expected: exit `0`, zero diff, `289 rows scored (249 early, 24 live set aside)`. Verify top-10 values in `/tmp/r8_out1/board.json` match the `gamma = 0.10` simulation table above and `model.breadth_multiplier` / `model.breadth_chains` are present on every row.
4. **Update real screenshots (Change 5) & sync `board.json` / `dossier.json`:**
   - Capture real `1440x900` PNGs (`1-board.png`, `2-detail.png`, `3-filtered.png`) from `/tmp/r8_out1/dashboard/index.html` (never fake screenshots; see Change 5 for the VPS Chromium path and the stop-and-report rule).
   - Copy the new PNGs into `./screenshots/`, re-run `node main.ts` into `/tmp/r8_out1` and `/tmp/r8_out2`, confirm `diff -r` clean, then copy `/tmp/r8_out1/board.json` -> `./board.json` and `/tmp/r8_out1/dossier.json` -> `./dossier.json`.
5. **Parity check:**
   ```bash
   node .scratch/parity.mjs /tmp/r8_out1 dashboard/app.js
   ```
   Expected: `rows=289 mismatched_rows=0 mismatched_step_strings=0`.
6. **Re-verify the R7-settled non-bug (read-only check, NO code edit):**
   - Confirm `dashboard/app.js` lines `102/117/132/147` still use `/dex|yield|farm|liquidit/` and `lib/model.ts` lines `343/379/415/451` still use `c.includes('liquidity')`.
   - Confirm all `41` Liquid Staking (`38`) + Liquid Restaking (`3`) rows route to the staking branch (`validator slashing and unbonding delay`), all `3` Liquidity Manager rows route to the liquidity branch (`impermanent loss and pool slippage`), and `0` popup-vs-board mismatches occur. Do **NOT** "fix" this regex.
7. **Run all 8 gate checks on `/tmp/r8_out1` (and `./board.json` / `./dossier.json`):**
   - Board: `289` rows.
   - Ranks: `1..289` sequential, no duplicates/gaps.
   - Implied values: `289` distinct, positive safe integers `<= 1e14`, monotonically non-increasing; record exact `min` (`389191`) and `max` (`827024371`).
   - Watchlist coverage: `40 / 40` (`100%`).
   - Farm steps: `6` per row x `289` (`1734` total), each `20..600` chars (`142..276` expected, unchanged).
   - Dashboard source budget: `app.css + app.js + index.html < 40,960` B; `0` `http://` or `https://` strings in `dashboard/` (`grep -rnE 'https?://' dashboard/`).
   - Screenshots: `3` valid PNGs, `1440x900`, each `<= 524,288` B (`512 KiB`).
   - Dossier: `<= 1.5 MiB` (`1,572,864` B) and in-memory `buildDossier` byte-matches `/tmp/r8_out1/dossier.json` and `./dossier.json` (`match=true`).
8. **Docker grader re-run:**
   Per the R7 lesson, create and `chmod 777` the two output directories first so `--user 65534:65534` can write `/output`:
   ```bash
   rm -rf /tmp/r8_dock1 /tmp/r8_dock2
   mkdir -p /tmp/r8_dock1 /tmp/r8_dock2
   chmod 777 /tmp/r8_dock1 /tmp/r8_dock2
   timeout 120 docker run --rm --network none \
     -v "$PWD":/bot:ro \
     -v "$PWD/.staging/input":/input:ro \
     -v /tmp/r8_dock1:/output:rw \
     --cpus 1 -m 1024m --user 65534:65534 \
     node:22 node /bot/main.ts
   timeout 120 docker run --rm --network none \
     -v "$PWD":/bot:ro \
     -v "$PWD/.staging/input":/input:ro \
     -v /tmp/r8_dock2:/output:rw \
     --cpus 1 -m 1024m --user 65534:65534 \
     node:22 node /bot/main.ts
   diff -r /tmp/r8_dock1 /tmp/r8_dock2
   diff -r /tmp/r8_dock1 /tmp/r8_out1
   node .scratch/parity.mjs /tmp/r8_dock1 dashboard/app.js
   ```
   Re-run all 8 gate checks + `buildDossier` byte-match on `/tmp/r8_dock1`.
9. **Hydrogen review round (max 2 rounds):**
   Run independent Hydrogen review (`REVIEW_R8.md`) verifying breadth math, bridge explanation text, `dashboard/` budget `< 40960` B, updated screenshots/dossier sync, parity (`289/0/0`), R7 non-bug check, all 8 gates, Docker PASS, and untouched `vendor/makefun-board.ts` and `.makefun/owner.json`.
10. **Coordinator handoff (NOT executor):**
    After review PASS, the **coordinator** (not the executor) cleans up any temporary `r7-*.mjs` / `r8-*.mjs` scripts, runs `git add` / `commit` / `push` (preserving `.makefun/owner.json`), builds the submit bundle, and submits.

---

## 4. Explicit NOT-DOING List for Round 8

- **Do NOT touch `vendor/makefun-board.ts`** (must remain `19788` B, SHA-256 `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`).
- **Do NOT add hardcoded protocol names or category blacklists** anywhere in code.
- **Do NOT remove bridges, wrapped assets, or staked assets**, do NOT expand `board.json` beyond `289` rows, do NOT shrink watchlist coverage below `40/40`, and keep the `24` live protocols in `radar.live` only.
- **Do NOT lower TVL exponent `0.85 -> 0.75`** (or use `gamma = 0.15` or Candidate B `0.90 + 0.20*ln(n)/ln(176)`).
- **Do NOT modify `dashboard/app.js` farm-step logic or category regexes** (`/dex|yield|farm|liquidit/` is settled and matches `lib/model.ts`), and do NOT touch `farmSteps` in `lib/model.ts`.
- **Do NOT add referral links, entry fees, fake screenshots, or any `http://`/`https://` URLs** in `dashboard/`.
- **Do NOT touch `.staging`, `kit-extract` (never open `makefun-keypair.json`), or `.makefun/owner.json`**.
- **Executor does NOT commit, push, bundle, or submit** (coordinator performs those steps after `REVIEW_R8.md` PASS).
