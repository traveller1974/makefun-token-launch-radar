# Round 7 Improvement Plan (`PLAN_R7.md`)

**Bounty:** `token-radar-01` ("Build the best token launch radar", 1325 USDC, deadline `2026-12-14T10:00:00Z`)
**Round:** R7 — FINAL iteration before submission. After this round: commit + push, rebuild bundle, SUBMIT.
**Baseline Verified (coordinator, direct VPS ssh):**
- `HEAD`: `8be434f` (R6), clean tree, 29 tracked files (28 entry files + `.makefun/owner.json`)
- `board.json`: `500040` bytes, sha256 `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277`, `289` rows
- `dossier.json`: `590374` bytes, sha256 `68be94bf163d1dc5750fa82a1afc20dacd940b443f4dce5715cb6c212fc4b935`
- `vendor/makefun-board.ts`: `19788` bytes, sha256 `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`
- `dashboard/app.js`: `27186` bytes, sha256 `0e3a0eb9058172eec9ecee3c7d04a26624eae852c426786b8acd1dc12509666e`
- `README.md`: `3789` bytes, sha256 `d92daf93ab4cf6e10e0c2258d9313bfa2e7b415ec658f44d6ecaf241ccc6774b`
- R6 review VERDICT: PASS (0 Critical/High/Medium, 1 Low). R6 bundle `submit-bundle-r6.tar.gz` sha256 `d1f666d8b369b947adf260311198363155784473d3a8ada9531fa1d2335b4b2c` — do NOT touch it; R7 builds a new bundle.
- Submissions left: 8 total (R6 record).

**Planning provenance:** Two Hydrogen planning runs (gemini-4-hydrogen, CLI 0.68.0) both produced the plan in stdout but the `PLAN_R7.md` file write did not land on disk either time (no file found anywhere under `/home/travellers1974` or `/tmp`; `git status` clean). The coordinator assembled this file from the two runs' captured stdout tails plus its own independently verified evidence below. Both runs' verdicts agree with the evidence: README:7 delete DO; regex NO code change; Docker re-run DO; nothing else.

---

## 1. Candidate Evaluation & Verdicts

### Candidate (1): Delete stale badge-placeholder note, `README.md:7` — DO
- **Evidence (coordinator-verified):** `README.md:7` reads `> Note: The badge placeholders \`traveller1974\` and \`makefun-token-launch-radar\` above must be updated with the actual GitHub organization or user and repository name once the GitHub repository is created.` Lines 3–5 badges already use the real `traveller1974/makefun-token-launch-radar` values (since commit `0b58b73`). This was the R6 review's only Low finding.
- **Change:** delete line 7 only. Lines 1–6 (title + 3 make.fun badges) untouched.
- **Effect on artifacts:** `README.md` is not packaged into `board.json` or `dossier.json` (per PLAN_R6; confirm from `main.ts` — dossier embeds dashboard source + screenshots only), so no regeneration is needed. Still re-run `node main.ts` twice to confirm determinism after the edit.
- **Benefit:** removes the last known review nit before submission; zero risk to scoring.

### Candidate (2): Alleged regex bug `/dex|yield|farm|liq/` intercepting Liquid Staking/Restaking — VERIFY-ONLY, NO CODE CHANGE
- **Claim:** an external (Pro) review said `dashboard/app.js` lines 93/108/123/138 contain `/dex|yield|farm|liq/`, which would match "Liquid Staking" (38 rows) and "Liquid Restaking" (3 rows) before the `/stak/` branch, so 41 rows of detail-popup copy would disagree with `board.json`; proposed changing it to `/liquidit/`.
- **Evidence (coordinator-verified, re-checked by both Hydrogen planning runs):**
  - `HEAD`, `dd0ab1d`, and `cab04a6` ALL show `/dex|yield|farm|liquidit/` at those lines (now 102/117/132/147 after R6 added 10 lines at the top). The string `/liq/` appears NOWHERE in the category branches of `dashboard/app.js`.
  - `lib/model.ts` uses `c.includes('liquidity')` at lines 343/379/415/451. `"liquid staking".includes("liquidity")` is false, and `/liquidit/.test("liquid staking")` is false — both sides agree: Liquid Staking / Liquid Restaking take the staking branch; "Liquidity Manager" (3 rows) contains `liquidit`/`liquidity` and takes the liquidity branch on both sides.
  - `board.json` category counts: `Liquid Staking` 38, `Liquid Restaking` 3, `Liquidity Manager` 3 — the 41 rows in the claim are real rows, but the bug is not.
  - The detail dialog at `dashboard/app.js:478` renders `getFarmSteps(row)` recomputed client-side, so `node .scratch/parity.mjs` (app.js steps vs `board.json` farm_steps) IS the popup-vs-board check.
- **Verdict:** NO code change. Plan only the targeted 41+3 verification (see §3 step 4): all 41 Liquid Staking/Restaking rows must take the staking branch (step 1 mentions "validator slashing and unbonding delay"), all 3 Liquidity Manager rows must take the liquidity branch (step 1 mentions "impermanent loss and pool slippage"), 0 mismatches vs `board.json`.
- **Do NOT** change `/liquidit/` to anything else; do NOT touch `lib/model.ts`.

### Candidate (3): Docker grader re-run — DO
- Re-run scoring inside `node:22` with `--network none`, 1 CPU / 1024 MB, after the R6 `app.js`/`dossier.json` changes, as the last pre-submit environment check.
- Exact commands (executor):
  ```bash
  rm -rf /tmp/r7_dock1 /tmp/r7_dock2
  mkdir -p /tmp/r7_dock1 /tmp/r7_dock2
  timeout 120 docker run --rm --network none \
    -v "$PWD":/bot:ro \
    -v "$PWD/.staging/input":/input:ro \
    -v /tmp/r7_dock1:/output:rw \
    --cpus 1 -m 1024m --user 65534:65534 \
    node:22 node /bot/main.ts
  timeout 120 docker run --rm --network none \
    -v "$PWD":/bot:ro \
    -v "$PWD/.staging/input":/input:ro \
    -v /tmp/r7_dock2:/output:rw \
    --cpus 1 -m 1024m --user 65534:65534 \
    node:22 node /bot/main.ts
  diff -r /tmp/r7_dock1 /tmp/r7_dock2
  diff -r /tmp/r7_dock1 /tmp/r7_out1
  node .scratch/parity.mjs /tmp/r7_dock1 dashboard/app.js
  ```
  Expected: both container runs exit `0`, all diffs clean, parity `rows=289 mismatched_rows=0 mismatched_step_strings=0`, all 8 gates pass on `/tmp/r7_dock1`. Clean up `/tmp/r7_*` after review.

### Candidate (4): Other small improvements — NOT DOING
- No other high-value, zero-risk improvement was found by either planning run. Default: do nothing else. No new features, no ranking/model changes, no dashboard polish (the ~3.4 KB dashboard headroom stays unused rather than risking a last-minute regression).

---

## 2. Chosen Changes (exact)

### Change 1 — `README.md` line 7 deletion (only change this round)
- Delete line 7 (the stale blockquote). Keep the surrounding blank lines as-is (lines 6 and 8 stay blank); do not reflow any other text.
- Verify with `git diff README.md`: exactly 1 line removed, lines 1–6 badges byte-identical.

### No other file edits
- `dashboard/app.js`, `lib/model.ts`, `main.ts`, `dashboard/app.css`, `dashboard/index.html`, `screenshots/*.png`, `board.json`, `dossier.json`, `LICENSE`, `vendor/makefun-board.ts` all untouched.

---

## 3. Verification Plan for Executor

Run all commands with Node 22 on PATH:
```bash
export PATH="/home/travellers1974/.local/bin:/home/travellers1974/.local/node/bin:/usr/local/bin:/usr/bin:/bin"
```

1. **Record pre-change baseline hashes** (`sha256sum board.json dossier.json vendor/makefun-board.ts dashboard/app.js README.md`) — must match the baselines above.
2. **Apply Change 1** (delete `README.md:7`); confirm `git status --short` shows only `M README.md` (plus untracked `PLAN_R7.md` / `FIXES_R7.md`).
3. **Run `node main.ts` twice & verify determinism:**
   ```bash
   rm -rf /tmp/r7_out1 /tmp/r7_out2
   node main.ts --input .staging/input/snapshot.json --output /tmp/r7_out1
   node main.ts --input .staging/input/snapshot.json --output /tmp/r7_out2
   diff -r /tmp/r7_out1 /tmp/r7_out2
   ```
   Expected: exit 0, zero diff, console reports `289 rows scored (249 early, 24 live set aside)`; `/tmp/r7_out1/board.json` sha256 still `553e5120…ddf2277`; `/tmp/r7_out1/dossier.json` byte-identical to repo `dossier.json` (`68be94bf…4b935`).
4. **Parity + targeted 41+3 check:**
   ```bash
   node .scratch/parity.mjs /tmp/r7_out1 dashboard/app.js
   ```
   Expected: `rows=289 mismatched_rows=0 mismatched_step_strings=0`. Then run a targeted check over `board.json`: the 41 Liquid Staking (38) + Liquid Restaking (3) rows must have farm step 1 mentioning "validator slashing and unbonding delay" (staking branch) and steps 2–6 consistent with the staking branch; the 3 Liquidity Manager rows must have step 1 mentioning "impermanent loss and pool slippage" (liquidity branch); mismatches 0. (This re-derives the app.js functions and compares against `board.json`, i.e. the detail-popup text the judge sees.)
5. **All 8 gate checks** (reuse the R6 gate-script approach against `/tmp/r7_out1`): board 289 rows; ranks 1..289; implied values min 389191 / max 751386886 / 289 distinct, positive integers ≤1e14, non-increasing; watchlist 40/40; farm steps 6/row ×289, length 142..276 (within 20..600); dashboard total 37554 B (< 40960 B); 0 `http://`/`https://` strings in `dashboard/`; 3 PNGs 1440x900 each ≤512 KiB; dossier 590374 B (≤1.5 MiB) and in-memory `buildDossier` byte-match.
6. **Docker re-run** per Candidate (3) above; gates + parity on `/tmp/r7_dock1`.
7. **Hydrogen review round (max 2 rounds):** independent Hydrogen review (`REVIEW_R7.md`) confirming the README change (badges intact), no unintended edits, parity (289/0/0), targeted 41+3 check, all 8 gates, Docker PASS.
8. **Coordinator handoff (NOT executor):** after review PASS, the coordinator commits + pushes (must keep `.makefun/owner.json`), rebuilds the submit bundle with the R6 flags, and submits.

---

## 4. Explicit NOT-DOING List & Submission Notes

- Do NOT touch `vendor/makefun-board.ts` (must remain sha256 `9ca51b6e…dc326e`, 19788 B).
- Do NOT edit `dashboard/app.js` (regex already `/dex|yield|farm|liquidit/`), `lib/model.ts`, `main.ts`, `dashboard/app.css`, `dashboard/index.html`, `screenshots/*.png`, `board.json`, `dossier.json`, `LICENSE`.
- Do NOT remove bridges, wrapped assets, or staked assets; do NOT expand board to 313 rows; 24 live protocols stay in `radar.live`.
- Do NOT add referral links, entry fees, fake screenshots, or any `http://`/`https://` strings in `dashboard/`.
- Do NOT touch `.staging`, `kit-extract`, or `.makefun/owner.json`.
- Executor does NOT commit, push, bundle, or submit. Coordinator does that after review PASS.
- Bundle flags (R6, reuse for R7): `--system-prompt ~/makefun-token-radar/work/system-prompt-withheld.txt --mcp none --harness gemini-cli --harness-version 0.68.0 --provider google --effort default`; submit with `--competition token-radar-01 --repo-url https://github.com/traveller1974/makefun-token-launch-radar --commit <new-sha> --bundle <new-bundle> --keypair ~/makefun-token-radar/kit-extract/makefun-keypair.json`. Never read the keypair file contents. Old bundles untouched.
