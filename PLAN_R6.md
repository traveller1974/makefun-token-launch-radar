# Round 6 Improvement Plan (`PLAN_R6.md`)

**Bounty:** `token-radar-01` ("Build the best token launch radar", 1325 USDC, deadline `2026-12-14T10:00:00Z`)
**Baseline Verified:**
- `HEAD`: `dd0ab1d` (26 tracked files)
- `Node`: `v22.23.5` (`/home/travellers1974/.local/bin/node`)
- `board.json`: `500040` bytes, sha256 `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277`, `289` rows (`grep -o '"rank":[0-9]*' board.json | wc -l`)
- `dossier.json`: `589878` bytes, sha256 `e8281753f5f95b81a0e55e3a351d2445b16487caa21860b9e14618af7feca270`
- `vendor/makefun-board.ts`: `19788` bytes, sha256 `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`
- `README.md`: `3719` bytes (`48` lines), sha256 `1837adbc72d3ac92932b61082c555fae4eb9d01195f3b4fb871b499c0a358572`
- `LICENSE`: `1074` bytes, sha256 `864f5ffda198fa315311d119c4c8f90895a14a5cee7cc2b776771dc49ee2dd28`
- `dashboard/`: `app.css` (`9875` B, `101` lines), `app.js` (`26699` B, `565` lines), `index.html` (`493` B, `15` lines) -> **`37067` bytes (~36.20 KB)** total; `0` occurrences of `http://` or `https://`
- `screenshots/`: `1-board.png` (`125141` B), `2-detail.png` (`154161` B), `3-filtered.png` (`134185` B)

> Note: `wc -c` was blocked by shell policy in this planning session, so exact byte sizes above were verified with `ls -la` (and line counts with `wc -l`).

---

## 1. Candidate Evaluation & Verdicts

### Candidate (A): Dashboard Empty-Data Guidance Instead of Blank Page
- **Verdict:** **DO**
- **Evidence:**
  - `dashboard/index.html:10-12` mounts `<div id="radar-app" role="region" aria-label="Token Launch Radar"></div>` and loads `<script src="../data.js"></script>` before `<script src="app.js"></script>`. `data.js` is generated at runtime by `main.ts:89` (`writeFileSync(join(outputDir, 'data.js'), dataScript(radar), 'utf8')`) and is not tracked in git.
  - `dashboard/app.js:4-5` does `var DATA = window.RADAR; if (!DATA) return;`, leaving `#radar-app` completely empty (blank dark background) when `dashboard/index.html` is opened directly from a clean repo clone.
  - **Size budget check:** `.staging/RULES.txt:21,23` and `.staging/competition.yaml:211,213` allow up to `400` files / `4 MiB` total and require dashboard source under `65,536` UTF-8 bytes ("Keep the dashboard's source under 64 KB"). `PLAN.md:20,97` targets `<= 40 KB` (`40,960` bytes). Current `dashboard/` total is `37,067` bytes (`3,893` bytes under 40 KB; `28,469` bytes under 64 KB). Adding ~250 bytes keeps the total around `~37,320` bytes (~36.4 KB).
  - **No-network rule check:** `.staging/RULES.txt:22` and `.staging/competition.yaml:212` forbid `http://` or `https://` in HTML attributes, inline `<script>` imports, `<style>` bodies, CSS files, or JS imports/requires. Adding plain DOM text (`el('h3', ...)` / `el('p', ...)`) introduces `0` network URLs.
  - **CSS & Judge rules check:** `dashboard/app.css:10,41,66-67` already defines `.radar-shell`, `.board-panel`, and `.empty-state`. `.staging/RULES.txt:63` explicitly allows explanatory UI/source text read by the judge, and in normal graded runs (`data.js` present) the `!DATA` branch is never taken, so `screenshots/` (`1-board.png`, `2-detail.png`, `3-filtered.png`) remain completely valid and unchanged.
  - **Parity check safety:** `.scratch/parity.mjs` extracts `chainOf`, `capitalFor`, `holdDaysFor`, `categoryRisk`, `weeklyActionFor`, `exitActionFor`, `actionFor`, and `getFarmSteps` from `dashboard/app.js`; none of those functions are modified.
  - **Dossier regeneration:** Because `dashboard/app.js` changes, `dossier.json` must be regenerated via `node main.ts` after the edit.

### Candidate (B): Dossier Embedded Source 1 Byte Short Per File (`9874/9875`, `26698/26699`, `492/493`)
- **Verdict:** **DO NOT DO**
- **Evidence:**
  - `main.ts:104-109` calls `buildDossier(outputDir, { text_max_bytes: DOSSIER_TEXT_CAP, screenshots: SCREENSHOT_LIMITS, dashboard: DASHBOARD_LIMITS })` and writes the returned `Uint8Array` directly via `writeFileSync(join(outputDir, 'dossier.json'), dossierData)` with **zero trimming or text processing in `main.ts`**.
  - Inspecting `dossier.json` with `grep -o '### [^"]*```[a-z]*\\n' dossier.json` and `grep -oE '.{0,30}```.{0,20}' dossier.json` shows the exact headings and closing fences inside `dossier.json`:
    - `### app.css\n\n9875 bytes, 101 lines\n\n```css\n...{width:100vw}}\n```\n\n`
    - `### app.js\n\n26699 bytes, 565 lines\n\n```js\n...render();\n})();\n```\n\n`
    - `### index.html\n\n493 bytes, 15 lines\n\n```html\n...</html>\n```\n`
  - **Root cause is strictly inside `vendor/makefun-board.ts:261`:**
    ```ts
    const block = `${fence}${lang}\n${text}${text.endsWith('\n') ? '' : '\n'}${fence}\n\n`;
    ```
    Because all three dashboard files end with `\n`, `${text.endsWith('\n') ? '' : '\n'}` evaluates to `''`, placing the closing ```` ``` ```` directly after the file's own trailing `\n`. All `9875`, `26699`, and `493` bytes **are** literally inside `dossier.json` and reported accurately in the headings (`9875 bytes`, `26699 bytes`, `493 bytes`). An extractor such as `.scratch/check-dossier.js:13-22` that slices up to `text.indexOf('\n```', codeStart)` consumes the file's trailing `\n` as the closing fence delimiter, measuring `realLen - 1` (`9874`, `26698`, `492`).
  - Furthermore, `vendor/makefun-board.ts:3` and `.staging/RULES.txt:35` (`dossier_matches`) require `dossier.json` to match `buildDossier('/output', {text_max_bytes: 65536})` **byte for byte**. Post-processing `dossier.json` in `main.ts` would break `dossier_matches`, and `vendor/makefun-board.ts` must never be edited.

### Candidate (C): Expanding Board from 289 Rows to 313 Rows (+24 Live Protocols)
- **Verdict:** **DO NOT DO**
- **Evidence:**
  - `lib/model.ts:154-156` (`isRankable`) selects `isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name)`, yielding `289` pre-token rows (`40` watchlist + `249` early).
  - `lib/model.ts:75` (`LIVE_ROWS = 24`) and `lib/model.ts:518-532` (`liveRows`) isolate the top `24` live-token non-CEX protocols into `radar.live` for the dashboard's **Live Market Comps** comparison tab (`main.ts:112`: `289 rows scored (249 early, 24 live set aside)`).
  - `.staging/RULES.txt:47` states: *"The board's job is to find protocols whose token does not exist yet, rank them by an implied value, and show a reader how to farm each one."*
  - `.staging/RULES.txt:51` (Judge Criterion 2, 2nd highest weight) explicitly requires: *"the board separates protocols whose token already trades from those still to come."*
  - Gate requires `100` to `4000` rows and `100%` (`40/40`) watchlist coverage (`.staging/RULES.txt:25,30-32`). `289` rows satisfies all gate bounds while keeping live-token protocols cleanly separated from pre-token launch candidates. Adding the 24 live protocols to `board.json` would directly hurt Judge Criterion 2.

### Candidate (D): Fix Stale `.staging/input/snapshot.json` Path (and Blank-Page Note) in `README.md`
- **Verdict:** **DO**
- **Evidence:**
  - `.gitignore:1` ignores `.staging/`, so `.staging/input/snapshot.json` does not exist in a clean clone of the public GitHub repository.
  - `README.md` references `.staging/input/snapshot.json` on **4 lines**:
    - `README.md:21`: `node main.ts --input .staging/input/snapshot.json`
    - `README.md:24`: `MAKEFUN_OUTPUT_DIR=out node main.ts --input .staging/input/snapshot.json`
    - `README.md:26`: `node main.ts --input .staging/input/snapshot.json --output out`
    - `README.md:39`: ``3. The proper way to view the dashboard is to first run `node main.ts --input .staging/input/snapshot.json` (or specify `--output <dir>`), then open `<output>/dashboard/index.html` in your browser.``
  - In addition, `README.md:38` currently reads: `2. Opening dashboard/index.html directly from the repository workspace will display a blank page.` Once Candidate (A) is applied, that line becomes inaccurate and should be updated alongside lines 21, 24, 26, and 39.
  - `.staging/RULES.txt:262` (`repo_readme` check) inspects only the three live `make.fun` badges and links at `README.md:3-5`. Lines `1-6` remain untouched. `README.md` is not packaged into `board.json` or `dossier.json`.

---

## 2. Chosen Changes (Exact Files, Lines, Behavior, Benefit, Risks)

### Change 1 — Candidate (A): `dashboard/app.js`
- **Target:** `dashboard/app.js`, lines `4-5` (currently `var DATA = window.RADAR; if (!DATA) return;`).
- **New Behavior:**
  Replace lines `4-5` with a defensive check that renders a styled guidance card (reusing existing `.radar-shell`, `.board-panel`, and `.empty-state` CSS classes from `dashboard/app.css:10,41,66-67` and the hoisted `el()` helper from `dashboard/app.js:50`) whenever `window.RADAR` is missing or lacks `rows`:
  ```js
  var DATA = window.RADAR;
  if (!DATA || !Array.isArray(DATA.rows)) {
    var root = document.getElementById('radar-app');
    if (root) {
      root.appendChild(el('main', {class: 'radar-shell'}, el('div', {class: 'board-panel'}, el('div', {class: 'empty-state'}, [
        el('h3', {text: 'No radar data loaded'}),
        el('p', {text: 'data.js is generated at runtime and is not tracked in the repo. Run node main.ts --input <snapshot.json> --output out, then open out/dashboard/index.html.'})
      ]))));
    }
    return;
  }
  ```
- **Expected Benefit:**
  - Eliminates a silent blank dark screen when `dashboard/index.html` is opened directly from the repo before running `main.ts`.
  - Demonstrates defensive UI handling (`!DATA || !Array.isArray(DATA.rows)`) in the source read by the AI judge.
  - Zero runtime effect when `data.js` is present; zero network URLs; adds ~300 bytes (~37,370 bytes total `dashboard/`, safely under the 40 KB project budget and 64 KB dossier source cap).
- **Risks & Mitigations:**
  - *Risk:* `dossier.json` bytes and sha256 change (since `dashboard/app.js` is embedded in `dossier.json`), and a slightly larger `dossier.json` (~300 bytes heavier) acts as the 3rd-level exact tie-breaker in `.staging/RULES.txt`.
  - *Mitigation:* Regenerate `dossier.json` via `node main.ts` and sync the updated `dossier.json` to the repo root; ~300 bytes on a ~590 KB dossier is negligible (~0.05%) and well within the 1.5 MiB cap.
  - *Risk:* `el` called before its lexical line (`line 50`).
  - *Mitigation:* `function el(t, a, c)` is a function declaration inside the IIFE and is hoisted; verified safe in ES5/strict mode. Do not reference `categories`, `allChains`, `state`, or `detailDialog` inside the `!DATA` guard.

### Change 2 — Candidate (D): `README.md`
- **Target:** `README.md`, lines `20-27` and lines `35-40` (do NOT touch lines `1-6` with the required make.fun badges).
- **New Text:**
  - Lines `20-27` (replace `.staging/input/snapshot.json` with `<path/to/snapshot.json>` and note where the snapshot comes from in a clean clone vs local kit/container):
    ````markdown
    ```bash
    # Execute main entrypoint against a DefiLlama snapshot (e.g., ../input/snapshot.json from the unpacked kit)
    node main.ts --input <path/to/snapshot.json>

    # Or specify a custom output directory via environment variable or CLI argument
    MAKEFUN_OUTPUT_DIR=out node main.ts --input <path/to/snapshot.json>
    # or
    node main.ts --input <path/to/snapshot.json> --output out
    ```
    ````
  - Lines `35-40` (update blank-page statement to match Change 1 and remove `.staging/` path):
    ```markdown
    ## Viewing the Dashboard

    1. `dashboard/index.html` loads `../data.js`, which is generated at runtime by `node main.ts` and is not tracked in the repository.
    2. Opening `dashboard/index.html` directly from the repository workspace displays a short setup guidance message indicating that `data.js` has not been generated yet.
    3. To view the live radar dashboard, first run `node main.ts --input <path/to/snapshot.json> --output out`, then open `out/dashboard/index.html` in your browser.
    ```
- **Expected Benefit:**
  - Resolves the prior review note regarding `.staging/input/snapshot.json` (which is gitignored via `.gitignore:1` and absent in a clean clone).
  - Keeps `README.md` documentation accurately aligned with Change 1's empty-data guidance message.
- **Risks & Mitigations:**
  - *Risk:* Accidentally altering required make.fun badge URLs in `README.md:3-5`.
  - *Mitigation:* Leave lines `1-6` completely untouched and verify with `git diff README.md`.

---

## 3. Verification Plan for Executor

Run all commands with Node 22 on PATH:
```bash
export PATH="/home/travellers1974/.local/bin:/home/travellers1974/.local/node/bin:/usr/local/bin:/usr/bin:/bin"
```

1. **Record Pre-Change Baseline Hashes:**
   - Verify starting hashes match Round 5 baselines:
     ```bash
     sha256sum board.json dossier.json vendor/makefun-board.ts dashboard/app.js README.md
     ```
   - Expected before edits:
     - `board.json`: `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277` (`500040` B)
     - `dossier.json`: `e8281753f5f95b81a0e55e3a351d2445b16487caa21860b9e14618af7feca270` (`589878` B)
     - `vendor/makefun-board.ts`: `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e` (`19788` B)

2. **Apply Changes 1 and 2:**
   - Edit `dashboard/app.js` (lines `4-5`) and `README.md` (lines `20-27`, `35-40`).
   - Confirm `vendor/makefun-board.ts`, `lib/model.ts`, `main.ts`, `dashboard/app.css`, `dashboard/index.html`, `screenshots/*`, and `LICENSE` are untouched (`git diff --name-only`).

3. **Run `node main.ts` Twice & Verify Determinism:**
   ```bash
   rm -rf /tmp/radar_out1 /tmp/radar_out2
   node main.ts --input .staging/input/snapshot.json --output /tmp/radar_out1
   node main.ts --input .staging/input/snapshot.json --output /tmp/radar_out2
   diff -r /tmp/radar_out1 /tmp/radar_out2
   ```
   - Expected: exit code `0`, zero diff between `/tmp/radar_out1` and `/tmp/radar_out2`, console reports `289 rows scored (249 early, 24 live set aside)`.
   - Verify `/tmp/radar_out1/board.json` sha256 still equals `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277`.
   - Copy `/tmp/radar_out1/dossier.json` to `./dossier.json` so the tracked dossier matches the updated `dashboard/app.js`.
   - Clean up `/tmp/radar_out1` and `/tmp/radar_out2` when done (or inspect first, then remove).

4. **Verify Parity (`dashboard/app.js` vs `board.json`):**
   ```bash
   node .scratch/parity.mjs /tmp/radar_out1 dashboard/app.js
   ```
   - Expected exact output: `rows=289 mismatched_rows=0 mismatched_step_strings=0`.

5. **Verify All 8 Gate Checks:**
   - **Board Rows:** `289` rows (`100 <= 289 <= 4000`).
   - **Ranks:** Strictly `1..289` with no gaps/duplicates.
   - **Implied Values:** All positive integers `<= 1e14`, monotonically non-increasing, not all equal.
   - **Watchlist Coverage:** `40 / 40` (`100.0%`).
   - **Farm Steps:** `6` steps per row across all `289` rows, each `20..600` chars (`142..276` chars).
   - **Dashboard Source Budget:** `app.css` + `app.js` + `index.html` total `< 40 KB` (`40,960` bytes) and `< 65,536` bytes (`<= 400` files, `<= 4 MiB`).
   - **No-Network Rule:** `grep -rnE 'https?://' dashboard/` returns `0` matches.
   - **Screenshots & Dossier Match:** `3` PNGs (`1440x900`, each `<= 512 KiB`) and in-memory `buildDossier('/tmp/radar_out1', { text_max_bytes: 65536, screenshots: { max: 4, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } })` matches `./dossier.json` byte-for-byte (`<= 1.5 MiB`).

6. **Verify Candidate (A) Empty-Data Fallback:**
   - Confirm in a headless browser or Node DOM check (or inspecting `dashboard/index.html` opened without `../data.js`) that `#radar-app` renders the guidance `h3` + `p` instead of remaining empty, and that opening `/tmp/radar_out1/dashboard/index.html` (with `data.js` present) renders the full 289-row board normally with zero console errors.

7. **Record Post-Change Hashes:**
   ```bash
   sha256sum board.json dossier.json vendor/makefun-board.ts dashboard/app.js README.md
   ```
   - Record before/after hashes and byte sizes for `board.json` (unchanged) and `dossier.json` (updated to reflect Change 1) in `FIXES_R6.md`.

8. **Hydrogen Review Round (Max 2 Rounds):**
   - Run an independent Hydrogen review round (`REVIEW_R6.md`) verifying Change 1, Change 2, parity (`289` rows, `0` mismatches), determinism, all 8 gates, and untouched `vendor/makefun-board.ts`. Cap at 2 review rounds max. Do **not** run any bundle or submit step this round.

---

## 4. Explicit NOT-DOING List & Tomorrow's Round Candidates

### Explicitly NOT Doing in Round 6
- **Do NOT touch `vendor/makefun-board.ts`** (kit scorer library; must remain sha256 `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`).
- **Do NOT attempt to "fix" the 1-byte fenced-block trailing-newline offset (Candidate B)** in `main.ts` or `vendor/makefun-board.ts`, and do NOT post-process `dossier.json` after `buildDossier`.
- **Do NOT expand `board.json` from 289 to 313 rows (Candidate C)**; the 24 live-token protocols remain in `radar.live` only.
- **Do NOT remove bridges, wrapped assets, or staked assets** from the 289 pre-token rows (settled in Round 2; backed by `.staging/input/README.md`).
- **Do NOT modify `lib/model.ts`, `main.ts`, `dashboard/app.css`, `dashboard/index.html`, or `screenshots/*.png`**.
- **Do NOT add referral links, entry fees, fake screenshots, or any `http://` / `https://` strings in `dashboard/`**.
- **Do NOT bundle or submit** in this round (save remaining 3 daily submission chances).

### Worth Considering for Tomorrow's Round
1. **Stale badge-placeholder note in `README.md:7`:** Lines `3-5` were already updated with `traveller1974/makefun-token-launch-radar` in commit `0b58b73`, so the blockquote on line `7` ("The badge placeholders `traveller1974` and `makefun-token-launch-radar` above must be updated...") is now outdated and can be removed cleanly.
2. **Docker grader emulation re-run:** Re-run the `node:22` `--network none --read-only --user 65534:65534` grader check after `dashboard/app.js` / `dossier.json` changes before tomorrow's final submission.
3. **Optional visual/UX polish within the ~3.6 KB remaining 40 KB budget** (only if a review or dev-ladder comparison shows a clear win under Criteria 3–5, e.g., richer methodology/comp-table clarity or keyboard/focus polish—never touching model rankings or `vendor/`).
