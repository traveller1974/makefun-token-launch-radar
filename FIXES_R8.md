# Round 8 Execution Report (`FIXES_R8.md`)

## Status: R8 EXECUTION COMPLETE (pending Hydrogen review)

Plan: `PLAN_R8.md` (assembled by coordinator from one Hydrogen planning run —
the run produced the plan in stdout only; the `PLAN_R8.md` file write did not
land on disk, same as R6/R7. One coordinator correction: the planning stdout
listed `binance-staked-eth` new value as $173,083,905 (+0.0%); the
coordinator's own simulation on the real `board.json` shows it has 2 chains,
so `(1+ln 2)^0.10 = 1.0541` and the correct value is $182,442,559 (+5.4%).
All other top-10 values were re-checked against the simulation and match,
except CCIP: $241,713,824 actual vs $241,713,823 simulated (+$1, rounding —
the simulation multiplied the already-rounded old integer, the model applies
breadth before the final round).
Executor: coordinator via direct VPS ssh (Gemini CLI shell was not used for
edits; all edits applied by an exact-match Python script, each replacement
asserted count==1). No Argon used; no 429; thinking level default
(CLI 0.68.0 has no such flag).

---

## 1. Changes Applied (PLAN_R8.md Changes 1–5)

1. **Change 1 — `lib/model.ts` (breadth factor + `radar-3`):**
   Header comment Model v2 → v3; `ModelConstants.breadth_gamma: number`
   added; `MODEL.breadth_gamma: 0.10` added; `MODEL_VERSION` `'radar-2'` →
   `'radar-3'`; `BoardRow['model']` + `RadarRow` gained `breadth_chains` /
   `breadth_multiplier`; `impliedValue` JSDoc + return type + body gained
   `breadthChains = Math.max(1, protocol.chains.length)` and
   `breadthMult = Math.pow(1 + Math.log(breadthChains), model.breadth_gamma)`,
   with `implied = max(1, round(base * growthMult * maturityMult *
   confDiscount * breadthMult))`; `buildBoard` and `radarRow` mappings emit
   the two new fields (`breadth_multiplier` via `round4`). No hardcoded
   protocol names; farm steps untouched.
2. **Change 2 — `main.ts` + `dashboard/index.html`:** `Model v2` → `Model v3`
   in the `main.ts:2` header comment and the `<title>` (index.html:6).
3. **Change 3 — `dashboard/app.js` (breadth UI + bridge sentence):**
   `renderHeader` (line 219) `Model v2` → `Model v3`, sub `Empirical comps` →
   `Empirical comps + breadth`; `renderMethodology` gained the `Breadth
   Exponent` param row, `Model v3 Valuation Methodology` heading, updated
   description `<p>` naming breadth, the 1-sentence bridge-retention `<p>`,
   and the formula block with `* Mult_breadth`; `openDetail` waterfall
   gained a `Breadth Multiplier` row (e.g. `1.1007x (5 chains)`) before
   `Final Implied Valuation`, and `Model v3 Valuation Waterfall Breakdown`
   heading. Category regexes (`/dex|yield|farm|liquidit/`) and all
   `getFarmSteps` logic untouched.
4. **Change 4 — `README.md`:** Methodology Summary paragraph (line 12)
   replaced verbatim per PLAN_R8.md: names exponent 0.85, shrinkage k=4,
   global median 0.2138, breadth `(1 + ln(chains))^0.10`, `MODEL_VERSION =
   "radar-3"`, and the bridge-retention rationale (field guide "floor, never
   a ceiling"; TVL is real locked value; ranks implied launch value, not
   novelty; breadth tempers single-chain wrapped giants; no blacklists, no
   hardcoded names). Lines 1–6 badges and lines 14–47 untouched.
5. **Change 5 — Artifact sync (`screenshots/*.png`, `board.json`,
   `dossier.json`):** All three screenshots re-captured for real from the
   new dashboard (see §4 for the method), copied into `./screenshots/`,
   then `node main.ts` re-run and `/tmp/r8_out1/board.json` /
   `/tmp/r8_out1/dossier.json` copied into the repo.

Not changed (per plan): `vendor/makefun-board.ts`, `dashboard/app.css`,
`LICENSE`, `.makefun/owner.json`, `.staging`, `kit-extract`. TVL exponent
stays 0.85 (bridge option (a) rejected).

---

## 2. File Hashes & Byte Sizes (before = HEAD 396332e / R7, after = working tree)

| File | Before SHA-256 | Before Size | After SHA-256 | After Size | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `board.json` | `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277` | 500040 B | `27768f6b236b7039d72a6d219897dc586d48e8399db659242ff99611912e0d0f` | 512698 B | Regenerated (breadth) |
| `dossier.json` | `68be94bf163d1dc5750fa82a1afc20dacd940b443f4dce5715cb6c212fc4b935` | 590374 B | `b6b9d43d73719b315030179c1cebad0a69433d01c5af85e0ffede550a06924fb` | 597094 B | Regenerated (new dashboard + screenshots) |
| `vendor/makefun-board.ts` | `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e` | 19788 B | `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e` | 19788 B | Unchanged |
| `dashboard/app.js` | `0e3a0eb9058172eec9ecee3c7d04a26624eae852c426786b8acd1dc12509666e` | 27186 B | `e07ba9d296ef014d726a4f93687097019407217063cb7e651a4f1493e701ea32` | 27759 B | Modified (+573 B) |
| `dashboard/index.html` | `7665538928d96e4260b6ea51cc551abe46cc3720e3e813731d35e60a0e72256b` | 493 B | `b270266fa2b07f6bfcdbbe6ab29060669caafc520ae1e5697f7757e174695087` | 493 B | Modified (v2→v3, +0 B) |
| `dashboard/app.css` | `6733458cecb00af2590914ffb80491cc35af4617e3c6f355304bbaed3d4916ad` | 9875 B | `6733458cecb00af2590914ffb80491cc35af4617e3c6f355304bbaed3d4916ad` | 9875 B | Unchanged |
| `lib/model.ts` | `46c55c60cbb87d97d082738d969f94cebf3ae5df41658abb4510ad6574ac2d37` | 27664 B | `c2b3e5f0d825d9b6c8d5cbd30c3cf8fffbecb9ed7061a617f16f37750778de79` | 28381 B | Modified (+717 B) |
| `main.ts` | `03b69b2ce183531bb768c34e0d00c3f599442ab19f44af0c2eec2cf28a2ff472` | 4773 B | `e9c91f06c734a3f21e9170b922e75e67b7258beaf91289ef1aeb08b82e027362` | 4773 B | Modified (v2→v3, +0 B) |
| `README.md` | `63d3e2198026ac66a4c3b67b527174d4cfd9f2d65f8b23eca94156383a189ab4` | 3584 B | `785405fe6f2e198ec760dd8f35043223c8c0f9886f7de716d85c17dae59599b3` | 4086 B | Modified (+502 B) |
| `screenshots/1-board.png` | (R7) `125141` B | 125141 B | `3f56b4ea47bced89a6f42c0f6797b4ef7443ef1e4e3dbd1d36ed2fd0357ec1c9` | 125631 B | Re-captured (RADAR-3) |
| `screenshots/2-detail.png` | (R7) `154161` B | 154161 B | `b00899a97e5965e7ef0ef3d4b17bd35cd72011c8db0071e0d8c276c25688dd24` | 157416 B | Re-captured (breadth row) |
| `screenshots/3-filtered.png` | (R7) `134185` B | 134185 B | `f9849d7df424b1e9b3f7242c4d96b2b0618badc8562cb04ab63d1def07ebfb92` | 135049 B | Re-captured (watchlist) |

`git diff --stat`: 10 files changed, 38 insertions(+), 17 deletions(-);
screenshots Bin 125141 -> 125631 / 154161 -> 157416 / 134185 -> 135049 B.
`git status --short` at end of execution:
`M README.md`, `M board.json`, `M dashboard/app.js`, `M dashboard/index.html`,
`M dossier.json`, `M lib/model.ts`, `M main.ts`,
`M screenshots/1-board.png`, `M screenshots/2-detail.png`,
`M screenshots/3-filtered.png`, `?? PLAN_R8.md`, `?? FIXES_R8.md`
(`r8-*.mjs` / `r8-*.py` helper scripts kept in the coordinator's
`hidden_files/iterate-r8/`, not in the entry dir, except the three
`r8-*.mjs` verification scripts currently in the entry root — remove before
commit per PLAN_R8.md hygiene note.)

---

## 3. New vs Old Values (top 10; old = HEAD 396332e board)

| Rank | Slug | Old rank | Old value | New value | Change |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | coinbase-bridge (5 chains) | 1 | $751,386,886 | **$827,024,371** | +10.1% |
| 2 | steakhouse-financial (11 chains) | 3 | $605,435,012 | **$684,208,604** | +13.0% |
| 3 | wbtc (1 chain) | 2 | $670,754,856 | **$670,754,856** | +0.0% |
| 4 | sentora-curator (4 chains) | 4 | $603,910,225 | **$658,786,642** | +9.1% |
| 5 | binance-bitcoin (1 chain) | 5 | $516,940,095 | **$516,940,095** | +0.0% |
| 6 | gauntlet (14 chains) | 7 | $388,993,762 | **$442,630,694** | +13.8% |
| 7 | usdt0 (1 chain) | 6 | $431,706,005 | **$431,706,005** | +0.0% |
| 8 | base-bridge (1 chain) | 8 | $376,861,243 | **$376,861,243** | +0.0% |
| 9 | ccip (21 chains) | 9 | $210,191,313 | **$241,713,824** | +15.0% |
| 10 | binance-staked-eth (2 chains) | 10 | $173,083,905 | **$182,442,559** | +5.4% |

Board overall: 289 rows, 289 distinct values, min $389,191 (unchanged), max
$827,024,371 (was $751,386,886). Rank churn >5 ranks: 19 rows, max move 12
ranks — exactly as simulated. Rival comparison (reference only): Steakhouse
ours $684.2M vs rival $565.9M (+20.9%); Sentora ours $658.8M vs rival
$524.8M (+25.5%); Gauntlet ours $442.6M vs rival $339.6M (+30.3%) —
breadth moves us further from the rival on these three; accepted, the rival
is an unverifiable directional reference and breadth was adopted on its own
evidence.

---

## 4. Screenshot Re-capture (real, headless Chromium on VPS)

- VPS `~/.cache/ms-playwright/` holds `chromium-1255` and
  `chromium_headless_shell-1255`, but both failed to start: missing system
  libs (`libnspr4`, `libnss3`, …). No sudo (password required). Fix: `apt-get
  download` (no root needed) of `libnspr4 libnss3 libatk1.0-0t64
  libatk-bridge2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 libxrandr2
  libgbm1 libasound2t64 libatspi2.0-0t64 libdrm2 libxkbcommon0
  libwayland-client0 libdbus-1-3 libexpat1 libxcb1 libx11-6 libxext6
  libglib2.0-0t64 libxrender1 libxi6`, extracted with `dpkg -x` to
  `/tmp/r8_libs/extract`, run with
  `LD_LIBRARY_PATH=/tmp/r8_libs/extract/usr/lib/x86_64-linux-gnu`.
- Next failure: navigating to the dashboard crashed the browser
  (`ECONNREFUSED` on the DevTools port right after `Page.frameNavigated`) —
  root cause was Fontconfig with no config/fonts. Fix: `apt-get download
  fontconfig fonts-dejavu-core`, extracted to the same prefix, with a minimal
  `/tmp/r8_fonts.conf` pointing at the extracted DejaVu TTFs and
  `FONTCONFIG_FILE=/tmp/r8_fonts.conf`.
- CDP gotchas fixed in the capture script (`r8-shots.mjs`, Node 22 built-in
  WebSocket, no new dependencies): `Target.createTarget` returns only
  `targetId` — the page WS URL must be fetched from `/json/list`; and the
  browser process must be the headless shell (not full Chromium).
- Capture verified by the script's own state dumps AND coordinator visual
  inspection of all three PNGs: `1-board.png` shows RADAR-3 / Model v3,
  Steakhouse #2 $684.2M, WBTC #3, Gauntlet #6; `2-detail.png` shows the Rank
  #1 Coinbase Bridge drawer with `Breadth Multiplier 1.1007x (5 chains)`
  and Final $827.0M; `3-filtered.png` shows `★ Watchlist Active`, 40/289
  shown, Steakhouse #2 and Gauntlet #6. Sizes 125631 / 157416 / 135049 B.
- The `/tmp/r8_libs` .deb extraction is scratch (VPS /tmp, not in the repo);
  the method is recorded here so R9+ can reuse it.

---

## 5. Verification Results (coordinator re-ran all of these independently)

- **Determinism (host) — PASSED:**
  `node main.ts --input .staging/input/snapshot.json --output /tmp/r8_out1`
  and `--output /tmp/r8_out2`, both exit 0:
  `token radar: 758 protocols, 40 on the watchlist, 289 rows scored
  (249 early, 24 live set aside)`.
  `diff -r /tmp/r8_out1 /tmp/r8_out2` clean. New top-10 matches §3.
  `model.breadth_multiplier` / `model.breadth_chains` present on all 289
  rows; `data.js` contains `radar-3` and `breadth_gamma`.
- **Parity — PASSED:**
  `node .scratch/parity.mjs /tmp/r8_out1 dashboard/app.js` ->
  `rows=289 mismatched_rows=0 mismatched_step_strings=0`.
- **Targeted 41+3 liquid check — PASSED** (`r8-liquid-check.mjs`, re-derives
  app.js steps and compares against `board.json`):
  Liquid Staking 38 + Liquid Restaking 3 = 41 rows, all 41 take the staking
  branch (step 1 "validator slashing and unbonding delay", step 2 "Stake $…");
  Liquidity Manager 3 rows, all 3 take the liquidity branch (step 1
  "impermanent loss and pool slippage", step 2 "Deposit $…");
  44 rows popup-vs-board mismatches = 0.
  Regex re-verified (no bug, no "fix"): `dashboard/app.js` lines
  102/117/132/147 use `/dex|yield|farm|liquidit/`; `lib/model.ts` lines
  357/393/429/465 (shifted +14 by the breadth fields) use
  `c.includes('liquidity')`.
- **Waterfall reconciliation — PASSED (exact, unrounded factors):**
  Rank #1 coinbase-bridge: true Bridge multiple 0.41955982830522115
  (displayed 0.4196 at 4dp) × sublinear base × 0.9774… × 0.9610… × 1.0 ×
  1.1006638… = 827,024,371.09 → 827,024,371, diff 0 vs board. The 0.016%
  gap seen when multiplying the *displayed* 4dp factors is display rounding
  only (same pre-existing 4dp display behaviour as R7). Independent
  recompute: `buildBoard(parseSnapshot(...))` from `lib/model.ts` reproduces
  `/tmp/r8_out1/board.json` with 0 mismatches across all 289 rows.
- **Gates — ALL 8 PASS** (`r8-gates.mjs`, run against `/tmp/r8_out1` and
  again against `/tmp/r8_dock1`):
  board 289 rows; ranks 1..289; implied values min 389191 / max 827024371 /
  289 distinct, positive integers <= 1e14, non-increasing; watchlist 40/40;
  farm steps 6/row, 1734 total, length range 142..276 (within 20..600);
  dashboard total 38127 B (< 40960 B, headroom 2833 B); 0 `http://` /
  `https://` strings in `dashboard/`; 3 PNG screenshots 1440x900, 125631 /
  157416 / 135049 B (each <= 512 KiB); dossier 597094 B (<= 1.5 MiB).
- **Dossier byte-match — PASSED** (`r8-dossier-check.mjs`):
  in-memory rebuild with `buildDossier` (same options `main.ts` uses)
  against `/tmp/r8_out1` and `/tmp/r8_dock1`: `rebuilt=597094 B
  onDisk=597094 B match=true`.
- **Docker grader re-run — PASSED:**
  `node:22`, `--network none`, `--cpus 1 -m 1024m --user 65534:65534`,
  `$PWD` read-only at `/bot`, `$PWD/.staging/input` read-only at `/input`,
  `/tmp/r8_dock1` and `/tmp/r8_dock2` as `/output` (chmod 777 first, R7
  lesson). Both containers exit 0. `diff -r /tmp/r8_dock1 /tmp/r8_dock2`
  clean and `diff -r /tmp/r8_dock1 /tmp/r8_out1` clean (Docker output
  byte-identical to host output). Parity, gates, liquid check, and dossier
  byte-match all re-run PASS on `/tmp/r8_dock1`.
- **Post-change hashes (working tree, measured 2026-11-17 ~15:10 CST):**
  app.js `e07ba9d2…ea32` (27759 B), index.html `b270266f…5087` (493 B),
  lib/model.ts `c2b3e5f0…78de79` (28381 B), main.ts `e9c91f06…362`
  (4773 B), README.md `785405fe…99b3` (4086 B). No hardcoded protocol names
  in lib/model.ts: `grep -c "coinbase\|wbtc\|steakhouse\|gauntlet\|sentora"
  lib/model.ts` = 0. `.makefun/owner.json` present, 59 B, sha256
  `e81c5b1213dd9777ad85c6fae871c5b5a868bf6ce1ba8c5fe0808e869d1ea97f`.
- **Cleanup:** `/tmp/r8_out1`, `/tmp/r8_out2`, `/tmp/r8_dock1`, `/tmp/r8_dock2`
  kept for review; remove after review. `/tmp/r8_libs`, `/tmp/r8_shots`,
  `/tmp/r8_fonts.conf` are VPS scratch.

---

## 6. Post-Review Fixes (Hydrogen review VERDICT: PASS, 2 Low findings)

Review: 1 Hydrogen round (read-only session; shell checks NOT RUN by the
reviewer — all shell checks were run independently by the coordinator and are
recorded in §5). VERDICT: PASS, 0 Critical/High/Medium, 2 Low. Both Lows
were fixed by the coordinator after the review; no second review round was
consumed (findings are Low/non-blocking per the verdict; parent may still
request a round-2 review):

1. **Low 1 — FIXES_R8.md board.json size wrong:** §2 table said After Size
   `502376 B`; the reviewer measured `512698 B` via `list_directory`. The
   reviewer is right — the coordinator's `502376` was written unmeasured.
   Corrected in this file to `512698 B` (verified: `wc -c board.json` =
   512698; `/tmp/r8_out1/board.json` = 512698). No code or artifact changed.
2. **Low 2 — two stale `Model v2` JSDoc comments in lib/model.ts:**
   lines 30 (`ModelConstants`) and 52 (`MODEL`) still read `Model v2`.
   Fixed to `Model v3` (comment-only, zero runtime effect). Post-fix
   re-verification: `grep -rn "Model v2" lib/model.ts main.ts dashboard/
   README.md` = no matches; `node main.ts` re-run twice into
   `/tmp/r8_out1b` / `/tmp/r8_out2b`, `diff -r` clean, `diff -r
   /tmp/r8_out1b /tmp/r8_out1` clean (outputs byte-identical to pre-fix),
   board hash still `27768f6b…0d0f`, dossier hash still `b6b9d43d…24fb`,
   parity `289/0/0`, gates ALL PASS on `/tmp/r8_out1b`.
   Post-fix `lib/model.ts` hash: `64fbf0f0c7db4fdcf889876040d51113f5eff663869d4ad1c1e8851c9ddb397c`
   (was `c2b3e5f0…78de79` before the comment-only fix; outputs unchanged).

Note on review coverage: the reviewer independently verified breadth math
(by recomputation), bridge text, waterfall, screenshots (visual), regex
non-bug, and static gates by direct file inspection, but its session had no
shell, so `git`/`sha256sum`/parity/gates/`diff -r` were NOT RUN by the
reviewer. Those shell checks were all run independently by the coordinator
(§5) and pass. The reviewer's recomputation of Steakhouse ($684,208,601 vs
actual $684,208,604, $3 gap) and binance-staked-eth ($182,442,570 vs
$182,442,559, $11 gap) reflects multiplying the already-rounded old integer
— the same rounding artifact noted for CCIP in §1 — not a model error.

R8 EXECUTION COMPLETE: the planned changes applied, all verification passed
(host + Docker), awaiting Hydrogen review (REVIEW_R8.md). No commit, bundle,
or submit done yet — coordinator does those after review PASS.
