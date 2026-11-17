# Round 7 Execution Report (`FIXES_R7.md`)

## Status: R7 EXECUTION COMPLETE (pending Hydrogen review)

Plan: `PLAN_R7.md` (assembled by coordinator from two Hydrogen planning runs —
both runs produced the plan in stdout but the file write did not land on disk;
verdicts agree with coordinator-verified evidence). Executor: coordinator via
direct VPS ssh (the only change is a 1-line README deletion; all verification
re-run independently with plain node/docker commands, no model calls).
Note the regex item below: the alleged bug did not exist — see §1 item 2.

---

## 1. Changes Applied (PLAN_R7.md Change 1 only)

1. **Change 1 — `README.md` line 7 deleted:**
   Removed the stale blockquote `> Note: The badge placeholders
   \`traveller1974\` and \`makefun-token-launch-radar\` above must be updated
   with the actual GitHub organization or user and repository name once the
   GitHub repository is created.` Badges at lines 1–6 untouched
   (`git diff README.md` shows exactly 1 line removed).
2. **Change 2 (regex) — NO CODE CHANGE:**
   The alleged bug (`/dex|yield|farm|liq/` at `dashboard/app.js` 93/108/123/138
   intercepting "Liquid Staking"/"Liquid Restaking" before `/stak/`) does not
   exist in any commit. Verified by coordinator grep in `HEAD` (8be434f),
   `dd0ab1d`, and `cab04a6`: all show `/dex|yield|farm|liquidit/` at those
   lines (now 102/117/132/147 after R6 added 10 lines). `lib/model.ts` uses
   `c.includes('liquidity')` (lines 343/379/415/451), which agrees:
   `"liquid staking"` contains neither `liquidit` nor `liquidity`.
   The string `/liq/` appears nowhere in the category branches.
   The detail dialog (`dashboard/app.js:478`) renders `getFarmSteps(row)`
   recomputed client-side, so the parity check IS the popup-vs-board check.
   Instead of an edit, a targeted 41+3 verification was run (see §3).

Not changed (per plan): `dashboard/app.js`, `lib/model.ts`, `main.ts`,
`dashboard/app.css`, `dashboard/index.html`, `screenshots/*.png`,
`board.json`, `dossier.json`, `LICENSE`, `vendor/makefun-board.ts`.

---

## 2. File Hashes & Byte Sizes (before = HEAD 8be434f, after = working tree)

| File | Before SHA-256 | Before Size | After SHA-256 | After Size | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `board.json` | `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277` | 500040 B | `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277` | 500040 B | Unchanged |
| `vendor/makefun-board.ts` | `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e` | 19788 B | `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e` | 19788 B | Unchanged |
| `dashboard/app.js` | `0e3a0eb9058172eec9ecee3c7d04a26624eae852c426786b8acd1dc12509666e` | 27186 B | `0e3a0eb9058172eec9ecee3c7d04a26624eae852c426786b8acd1dc12509666e` | 27186 B | Unchanged |
| `dossier.json` | `68be94bf163d1dc5750fa82a1afc20dacd940b443f4dce5715cb6c212fc4b935` | 590374 B | `68be94bf163d1dc5750fa82a1afc20dacd940b443f4dce5715cb6c212fc4b935` | 590374 B | Unchanged |
| `README.md` | `d92daf93ab4cf6e10e0c2258d9313bfa2e7b415ec658f44d6ecaf241ccc6774b` | 3789 B | `63d3e2198026ac66a4c3b67b527174d4cfd9f2d65f8b23eca94156383a189ab4` | 3584 B | Modified (−205 B, 1 line) |

`git diff --stat`: `README.md` 1 line removed (48 → 47 lines).
`git status --short` at end of execution:
`M README.md`, `?? PLAN_R7.md`, `?? FIXES_R7.md`
(`r7-*.mjs` helper scripts removed from the entry dir before commit; copies
kept in the coordinator's `hidden_files/iterate-r7/`).

---

## 3. Verification Results (coordinator re-ran all of these independently)

- **Determinism (host) — PASSED:**
  `node main.ts --input .staging/input/snapshot.json --output /tmp/r7_out1`
  and `--output /tmp/r7_out2`, both exit 0:
  `token radar: 758 protocols, 40 on the watchlist, 289 rows scored
  (249 early, 24 live set aside)`.
  `diff -r /tmp/r7_out1 /tmp/r7_out2` clean.
  `/tmp/r7_out1/board.json` SHA-256 `553e5120...` and
  `/tmp/r7_out1/dossier.json` SHA-256 `68be94bf...` (both match baselines).
- **Parity — PASSED:**
  `node .scratch/parity.mjs /tmp/r7_out1 dashboard/app.js` ->
  `rows=289 mismatched_rows=0 mismatched_step_strings=0`.
- **Targeted 41+3 liquid check — PASSED** (`r7-liquid-check.mjs`,
  re-derives app.js steps and compares against `board.json`):
  Liquid Staking 38 + Liquid Restaking 3 = 41 rows, all 41 take the staking
  branch (step 1 "validator slashing and unbonding delay", step 2 "Stake $…");
  Liquidity Manager 3 rows, all 3 take the liquidity branch (step 1
  "impermanent loss and pool slippage", step 2 "Deposit $…");
  44 rows popup-vs-board mismatches = 0.
- **Gates — ALL 8 PASS** (`r7-gates.mjs`, run against `/tmp/r7_out1` and
  again against `/tmp/r7_dock1`):
  board 289 rows; ranks 1..289; implied values min 389191 / max 751386886 /
  289 distinct, positive integers <= 1e14, non-increasing; watchlist 40/40;
  farm steps 6/row, 1734 total, length range 142..276 (within 20..600);
  dashboard total 37554 B (< 40960 B); 0 `http://` / `https://` strings in
  `dashboard/`; 3 PNG screenshots 1440x900, 125141 / 154161 / 134185 B
  (each <= 512 KiB); dossier 590374 B (<= 1.5 MiB).
- **Dossier byte-match — PASSED** (`r7-dossier-check.mjs`):
  in-memory rebuild with `buildDossier` (same options `main.ts` uses)
  against `/tmp/r7_out1` and `/tmp/r7_dock1`: `rebuilt=590374 B
  onDisk=590374 B match=true`.
- **Docker grader re-run — PASSED:**
  `node:22`, `--network none`, `--cpus 1 -m 1024m --user 65534:65534`,
  `$PWD` read-only at `/bot`, `$PWD/.staging/input` read-only at `/input`,
  `/tmp/r7_dock1` and `/tmp/r7_dock2` as `/output`.
  First attempt failed with `EACCES: permission denied, open
  '/output/board.json'` — harness issue, not a code issue: the output dirs
  were created by uid 1000 but the container runs as 65534:65534.
  Fixed by `chmod 777` on the two output dirs and re-ran; both containers
  exit 0. `diff -r /tmp/r7_dock1 /tmp/r7_dock2` clean and
  `diff -r /tmp/r7_dock1 /tmp/r7_out1` clean (Docker output byte-identical
  to host output). Parity, gates, liquid check, and dossier byte-match all
  re-run PASS on `/tmp/r7_dock1`.
- **Cleanup:** `/tmp/r7_out1`, `/tmp/r7_out2`, `/tmp/r7_dock1`, `/tmp/r7_dock2`
  kept for review; remove after review.

R7 EXECUTION COMPLETE: the one planned change applied, all verification passed
(host + Docker), awaiting Hydrogen review (REVIEW_R7.md). No commit, bundle,
or submit done yet — coordinator does those after review PASS.
