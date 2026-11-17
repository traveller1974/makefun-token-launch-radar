# Review Round 8 — Independent Verification Report (`token-radar-01`)

- **Reviewer:** Independent Read-Only Review (Round 8)
- **Scope:** Round 8 multi-chain breadth factor (`radar-3`), bridge-retention methodology rationale, detail waterfall & UI updates, screenshot/board/dossier synchronization, and regression/gate checks
- **Tooling Note:** This session provides read-only workspace tools only (`read_file`, `list_directory`, `grep_search`, `glob`); `run_shell_command` and `write_file` are unavailable, and paths outside the workspace (`/tmp/r8_out1`, `/tmp/r8_out2`, `/tmp/r8_dock1`, `/tmp/r8_dock2`) cannot be read. All source, size, math, regex, visual screenshot, and static workspace gate checks were verified directly. Shell-only checks (`git status`, `git diff`, `sha256sum`, `node .scratch/parity.mjs`, `node r8-*.mjs`, `diff -r /tmp/r8_*`) could not be executed here and are explicitly marked **NOT RUN** below.

---

## 1. Per-Area Verification Results

1. **Diff Scope & Untouched Files:** **PARTIAL DIRECT PASS (`git` commands NOT RUN)**
   - **Directly verified (`list_directory`, `read_file`):**
     - Untouched core files match R7 baseline byte sizes exactly: `vendor/makefun-board.ts` (`19788` B), `dashboard/app.css` (`9875` B), `LICENSE` (`1074` B), `.makefun/owner.json` (`59` B).
     - Modified/regenerated files observed at expected updated sizes: `README.md` (`4086` B, +502 B), `board.json` (`512698` B, +12658 B), `dashboard/app.js` (`27759` B, +573 B), `dashboard/index.html` (`493` B, +0 B), `dossier.json` (`597094` B, +6720 B), `lib/model.ts` (`28381` B, +717 B), `main.ts` (`4773` B, +0 B), `screenshots/1-board.png` (`125631` B), `screenshots/2-detail.png` (`157416` B), `screenshots/3-filtered.png` (`135049` B).
     - Untracked files in repo root: `PLAN_R8.md` (`26324` B), `FIXES_R8.md` (`14617` B), and temporary verification scripts `r8-dossier-check.mjs` (`939` B), `r8-gates.mjs` (`3102` B), `r8-liquid-check.mjs` (`2768` B) (to be removed/excluded by coordinator before commit per `PLAN_R8.md` / `FIXES_R8.md`).
   - **Not run (no shell tool):** `git status --short` and `git diff --stat`.

2. **Breadth Math & Model v3 (`radar-3`):** **PASS (code & independent math verified; `/tmp/r8_out1/data.js` NOT READ)**
   - **Directly verified in `lib/model.ts`:**
     - `ModelConstants.breadth_gamma: number` (`lib/model.ts:49`), `MODEL.breadth_gamma = 0.10` (`lib/model.ts:70`), `MODEL_VERSION = 'radar-3'` (`lib/model.ts:74`).
     - `BoardRow['model']` (`lib/model.ts:108-109`) and `RadarRow` (`lib/model.ts:130-131`) include `breadth_chains: number` and `breadth_multiplier: number`.
     - `impliedValue` (`lib/model.ts:296-299`) computes:
       - `breadthChains = Math.max(1, protocol.chains.length)`
       - `breadthMult = Math.pow(1 + Math.log(breadthChains), model.breadth_gamma)`
       - `implied = Math.max(1, Math.round(base * growthMult * maturityMult * confDiscount * breadthMult))`
     - `buildBoard` (`lib/model.ts:581-582`) emits `breadth_chains: s.breadthChains` and `breadth_multiplier: round4(s.breadthMult)`; `radarRow` (`lib/model.ts:618-619`) forwards both; `buildRadar` (`lib/model.ts:635`) includes `model` (`breadth_gamma: 0.10`) and `model_version: 'radar-3'` in `RadarData` serialized to `data.js`.
     - Zero hardcoded protocol names: `grep_search` in `lib/` for `coinbase|wbtc|steakhouse|gauntlet|sentora` returned **0 matches**.
   - **Independent recomputation from snapshot / R7 baselines:**
     - `coinbase-bridge` (5 chains): `(1 + ln(5))^0.10 = (2.6094379)^0.10 = 1.1006638...` (`1.1007x` at 4dp); `751,386,886 * 1.1006638... = $827,024,371` — matches `board.json` rank #1 (`"implied_value_usd":827024371`, `"breadth_chains":5`, `"breadth_multiplier":1.1007`), `PLAN_R8.md`, and `screenshots/1-board.png` (`$827.0M`).
     - `steakhouse-financial` (11 chains): `(1 + ln(11))^0.10 = (3.3978953)^0.10 = 1.1301107...` (`1.1301x` at 4dp); `605,435,012 * 1.1301107... ≈ $684,208,601` (matches `$684,208,604` pre-round product in `PLAN_R8.md` and `$684.2M` at rank #2 in `screenshots/1-board.png`).
     - `wbtc` (1 chain): `(1 + ln(1))^0.10 = 1.0^0.10 = 1.0000x`; `$670,754,856` unchanged (rank #3, `$670.8M` in `screenshots/1-board.png`).
     - `binance-staked-eth` (2 chains): `(1 + ln(2))^0.10 = (1.6931472)^0.10 = 1.0540701...` (`1.0541x` at 4dp); `173,083,905 * 1.0540701... ≈ $182,442,570` (matches `$182,442,559` in `PLAN_R8.md` and `$182.4M` at rank #10 in `screenshots/1-board.png`).
   - **Not inspected directly:** `/tmp/r8_out1/data.js` (`Path not in workspace`); full 289-row `board.json` iteration (`read_file` truncated after row 1 due to single-line 512 KB formatting). Top-10 ranks and rounded valuations match `PLAN_R8.md` in `screenshots/1-board.png`.

3. **Bridge Explanation & Unchanged TVL Exponent:** **PASS (directly verified)**
   - `README.md:12` contains the exact verbatim Methodology Summary from `PLAN_R8.md` Change 4 (field guide `"floor, never a ceiling"`, TVL is real locked economic value, ranks implied launch valuation rather than protocol novelty, multi-chain breadth tempers single-chain wrapped giants without blacklists or hardcoded names).
   - `dashboard/app.js:287-288` (`renderMethodology`) includes the updated Model v3 summary and the 1-sentence bridge-retention `<p>`: `"Bridged and wrapped pre-token assets are retained per the field guide floor-not-ceiling rule because their TVL is real locked value and the radar ranks implied launch value rather than novelty; multi-chain breadth relatively dampens single-chain wrapped giants."`
   - TVL exponent remains `0.85` in `lib/model.ts:55` (`exponent: 0.85`) and `dashboard/app.js:270,287,289`.

4. **Detail Waterfall & Reconciliation:** **PASS (directly verified)**
   - `dashboard/app.js:480` (`openDetail`) inserts `['Breadth Multiplier', (row.breadth_multiplier || 1).toFixed(4) + 'x (' + (row.breadth_chains || (row.chains ? row.chains.length : 1)) + ' chains)']` immediately before `['Final Implied Valuation', fmtUsd(row.implied_value_usd)]`, with header `'Model v3 Valuation Waterfall Breakdown'` (`dashboard/app.js:507`).
   - `dashboard/app.js:219` (`renderHeader`) and `dashboard/index.html:6` and `main.ts:2` are updated to `Model v3` / `Empirical comps + breadth`.
   - **Rank #1 (`coinbase-bridge`) reconciliation:** Exact unrounded factors multiply to `$827,024,371` (`0` diff). Using the displayed 4dp values shown in `screenshots/2-detail.png` (`$1,906,730,680 * 0.4196 * 0.9774 * 0.9610 * 1.0000 * 1.1007`) yields `~$827,160,000` (a `~0.016%` display-rounding gap, predominantly from `category_multiple` rounded to `0.4196` at 4dp).

5. **File Hashes & Byte Sizes:** **PARTIAL DIRECT PASS (`sha256sum` NOT RUN; byte sizes verified via `list_directory`)**
   - `sha256sum` could not be executed (no shell tool).
   - Byte sizes directly observed via `list_directory`:
     - `board.json`: `512698` B (note: `FIXES_R8.md:54` reports `502376 B`, see Low finding #1 below)
     - `dossier.json`: `597094` B
     - `vendor/makefun-board.ts`: `19788` B (unchanged from R7)
     - `dashboard/app.js`: `27759` B
     - `dashboard/app.css`: `9875` B (unchanged from R7)
     - `dashboard/index.html`: `493` B
     - `lib/model.ts`: `28381` B
     - `main.ts`: `4773` B
     - `README.md`: `4086` B
     - `screenshots/1-board.png`: `125631` B; `screenshots/2-detail.png`: `157416` B; `screenshots/3-filtered.png`: `135049` B

6. **Parity (`parity.mjs` & `r8-liquid-check.mjs`):** **PASS BY SOURCE INSPECTION (shell scripts NOT RUN)**
   - `node .scratch/parity.mjs /tmp/r8_out1 dashboard/app.js` and `node r8-liquid-check.mjs /tmp/r8_out1 dashboard/app.js` could not be executed (no shell tool).
   - Verified by reading `dashboard/app.js:82-181` and `lib/model.ts:318-537` that `farmSteps`, `stepText`, `getFarmSteps`, thresholds (`5e9/1e9/1e8`, `180/365`, gas `8/4`), and all 10 category branches remain untouched and identical between server and client.

7. **Determinism (`/tmp/r8_out1`, `/tmp/r8_out2`, `/tmp/r8_dock1`):** **NOT RUN (no shell tool; `/tmp` outside workspace)**
   - `diff -r /tmp/r8_out1 /tmp/r8_out2`, `diff -r /tmp/r8_dock1 /tmp/r8_out1`, and `/tmp/r8_dock1/board.json` hash comparison could not be executed. Source inspection confirms `lib/model.ts` and `main.ts` remain deterministic.

8. **Gates (`r8-gates.mjs`):** **PARTIAL DIRECT PASS (static workspace gates PASS; runtime script NOT RUN)**
   - **Directly verified:**
     - Dashboard total: `9875` (`app.css`) + `27759` (`app.js`) + `493` (`index.html`) = **`38127` B** (`< 40960` B, `2833` B headroom).
     - Zero external URLs in `dashboard/`: `grep_search` for `https?://` returned **0 matches**.
     - Screenshots: 3 PNG files (`125631` B, `157416` B, `135049` B), each `<= 524288` B (`512` KiB).
     - Dossier: `597094` B (`<= 1572864` B / `1.5` MiB).
   - **Not run (no shell tool):** `node r8-gates.mjs /tmp/r8_out1 .` (full 289-row `board.json` rank/monotonicity/watchlist/farm-step length checks and PNG IHDR dimension check on `/tmp/r8_out1`).

9. **Dossier Byte-Match (`r8-dossier-check.mjs`):** **NOT RUN (no shell tool; options & size PASS)**
   - `node r8-dossier-check.mjs /tmp/r8_out1 .` could not be executed.
   - Directly verified `r8-dossier-check.mjs` passes identical `buildDossier` options as `main.ts:17-19,106-110` (`text_max_bytes: 65536`, `screenshots: { max: 4, max_bytes: 524288 }`, `dashboard: { max_files: 400, max_bytes: 4194304 }`), and `dossier.json` is `597094` B.

10. **Screenshots Visual Verification:** **PASS (visual inspection via `read_file`; `/tmp` sha256 match NOT RUN)**
    - `screenshots/1-board.png`: displays `RADAR-3`, `Model v3` (`Empirical comps + breadth`), `40 / 40`, `289`, `24`, `#1 Coinbase Bridge ($827.0M)`, `#2 Steakhouse Financial [WATCHLIST] ($684.2M)`, `#3 WBTC ($670.8M)`, `#4 Sentora Curator ($658.8M)`, `#5 Binance Bitcoin ($516.9M)`, `#6 Gauntlet [WATCHLIST] ($442.6M)`, `#7 USDT0 ($431.7M)`, `#8 Base Bridge ($376.9M)`, `#9 CCIP ($241.7M)`, `#10 Binance staked ETH ($182.4M)`.
    - `screenshots/2-detail.png`: displays `Rank #1 · Pre-Token Coinbase Bridge` drawer with `MODEL V3 VALUATION WATERFALL BREAKDOWN`, `Breadth Multiplier 1.1007x (5 chains)`, and `Final Implied Valuation $827.0M`.
    - `screenshots/3-filtered.png`: displays `★ Watchlist Active`, `40/289 shown`, led by `#2 Steakhouse Financial` and `#6 Gauntlet`.
    - Note: `sha256sum` comparison against `/tmp/r8_out1/screenshots/*.png` could not be run in this session.

11. **Regex Non-Bug Re-Check:** **PASS (directly verified)**
    - `grep_search` and `read_file` confirm `dashboard/app.js` lines `102`, `117`, `132`, `147` still use `/dex|yield|farm|liquidit/` (0 occurrences of `/liq/`), and `lib/model.ts` lines `357`, `393`, `429`, `465` still use `c.includes('liquidity')`. No unintended "fix" was applied.

12. **`.makefun/owner.json`:** **PASS (directly verified)**
    - Present in `.makefun/owner.json` (`59` B, `{"wallet": "HQfaXdqAh1Zi5ACK1edFGohLcdqpP6Zv5VSxQcBKUWvU"}`).

---

## 2. Findings by Severity

| Severity | File & Line(s) | Evidence | Concrete Fix Suggestion |
| :--- | :--- | :--- | :--- |
| Low | `FIXES_R8.md:54` | The size table reports `board.json` After Size as `502376 B`, whereas `list_directory` on the repo root shows `board.json` is `512698 bytes` (+12,658 B over R7's `500040 B`, consistent with adding `breadth_chains` and `breadth_multiplier` across 289 rows). | Update `FIXES_R8.md:54` to `512698 B` if keeping round logs exact (non-blocking; `FIXES_R8.md` is an untracked round note). |
| Low | `lib/model.ts:29,50` | JSDoc comments on `ModelConstants` (`/** Model v2 valuation and calibration constants. */`) and `MODEL` (`/** House valuation parameters for Model v2. */`) still read `Model v2` while the file header (`line 1`), `impliedValue` (`line 256`), and `MODEL_VERSION` (`'radar-3'`) are v3. | Update `Model v2` to `Model v3` in those two JSDoc comments in a future cleanup (optional; zero runtime or output effect). |

*(Pre-commit operational reminder: `r8-dossier-check.mjs`, `r8-gates.mjs`, and `r8-liquid-check.mjs` sit untracked in the repo root and should be removed or excluded by the coordinator before `git add`/commit, as noted in `PLAN_R8.md` and `FIXES_R8.md`.)*

---

## 3. Verdict

VERDICT: PASS — 0 Critical, 0 High, 0 Medium findings (2 Low documentation/comment items only). All Round 8 code, math, bridge-retention explanations, waterfall UI, static dashboard budget (`38127` B `< 40960` B), zero-URL policy, regex parity, `.makefun/owner.json`, and updated `RADAR-3` / `Model v3` screenshots pass direct inspection (note: shell-only checks `git`, `sha256sum`, `parity.mjs`, `r8-*.mjs`, and `diff -r /tmp/r8_*` were not executed in this read-only session because shell execution tools are unavailable).
