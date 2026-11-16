# Review Round 4 - Verification & Audit (Token Launch Radar)

## 1. Review Verdict
- **Verdict:** **PASS**
- **Findings Count:** ZERO (0 Critical, 0 High, 0 Medium, 0 Low)
- **Review Scope:** Full end-to-end audit of pre-token protocol scoring, farm plan parity, gate compliance, deterministic packaging, and container grader emulation.
- **Reviewer Model:** `gemini-3.1-pro-preview`
- **Executor Model:** `gemini-3.8-flash`
- **Source Code Status:** **UNCHANGED**. No code modifications made during Round 4. Source files (`lib/model.ts`, `main.ts`, `dashboard/`, `vendor/`, `screenshots/`, `README.md`, `PLAN.md`) remain 100% invariant.

---

## 2. Verification Suite Results

### Step 1: Full Run
- **Command:** `export PATH="$HOME/.local/bin:$HOME/.local/node/bin:$PATH" && MAKEFUN_OUTPUT_DIR=out node main.ts --input .staging/input/snapshot.json`
- **Exit Code:** `0`
- **Console Output:**
  ```text
  token radar: 758 protocols, 40 on the watchlist, 289 rows scored (249 early, 24 live set aside)
  token radar: wrote out/board.json, out/data.js, out/dashboard (3 files), out/screenshots (3 images) and out/dossier.json
  ```
- **Output Artifacts & File Sizes:**
  - `out/board.json`: 500,040 bytes
  - `out/data.js`: 106,247 bytes
  - `out/dashboard/`: 3 files (`app.css`: 9,875 B, `app.js`: 26,699 B, `index.html`: 493 B)
  - `out/screenshots/`: 3 PNG images (`1-board.png`: 125,141 B, `2-detail.png`: 154,161 B, `3-filtered.png`: 134,185 B)
  - `out/dossier.json`: 589,878 bytes
- **Row Counts & Coverage:**
  - Board rows: 289 scored rows
  - Watchlist coverage: 40 / 40 (100.0%)
- **Cryptographic Hashes:**
  - `out/board.json`: `553e5120b365a77187930d9e982c6936ad938a0323fe3f5c2efbd9a53ddf2277` (Matches baseline)
  - `out/dossier.json`: `e8281753f5f95b81a0e55e3a351d2445b16487caa21860b9e14618af7feca270` (Matches baseline)

### Step 2: Parity Check
- **Command:** `node .scratch/parity.mjs out dashboard/app.js`
- **Exit Code:** `0`
- **Exact Output:**
  ```text
  rows=289 mismatched_rows=0 mismatched_step_strings=0
  ```
- **Parity Status:** 100% exact semantic and syntactic parity between `lib/model.ts` and `dashboard/app.js` across all 289 rows and all 1,734 farm steps.

### Step 3: Dossier Rebuild & Byte-for-Byte Match
- **Verification Method:** In-memory execution of `buildDossier('out', { text_max_bytes: 65536, screenshots: { max: 4, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } })` from `vendor/makefun-board.ts`.
- **Result:** `MATCH`
- **Dossier Size:** 589,878 bytes
- **Byte Comparison:** Exactly 0 byte differences between rebuilt dossier bytes and `out/dossier.json`.

### Step 4: Gate Checks Compliance
All competition gate limits verified against `out/board.json`, `.staging/input/snapshot.json`, `out/dashboard/`, and `out/screenshots/`:

| Check | Gate Constraint | Measured Result | Status |
| :--- | :--- | :--- | :--- |
| **Board Rows** | 100 - 4,000 rows | 289 rows | **PASS** |
| **Ranks** | Strictly sequential 1..N | 1..289 (0 rank discontinuities) | **PASS** |
| **Implied Values** | Positive integers <= 1e14, monotonically non-increasing, non-identical | Min: $389,191, Max: $751,386,886; 289 unique whole integers, non-increasing | **PASS** |
| **Watchlist Coverage** | 40 / 40 watchlist protocols covered | 40 / 40 (100.0%) | **PASS** |
| **Farm Steps** | 6 steps per row, 20-600 characters each | Exactly 6 steps per row across all 289 rows; min length 142 chars, max length 276 chars | **PASS** |
| **Dashboard Budget** | Source budget < 40 KB (40,960 bytes) | `app.css` (9,875 B) + `app.js` (26,699 B) + `index.html` (493 B) = 37,067 bytes (~36.20 KB) | **PASS** |
| **No-Network Rule** | 0 `http://` or `https://` occurrences in dashboard files | 0 occurrences across all dashboard files | **PASS** |
| **Screenshots Gate** | 3 PNG images, each <= 512 KiB, long side <= 1440, short side >= 800 | 3 PNG images (1440x900 from IHDR headers): `1-board.png` (125,141 B), `2-detail.png` (154,161 B), `3-filtered.png` (134,185 B) | **PASS** |

### Step 5: Determinism Verification
- **Execution:** Consecutive runs into `out1/` and `out2/` using identical input snapshot.
- **Tree Diff:** `diff -r out1 out2` returned 0 (identical byte-for-byte across all files).
- **Dossier Checksums:**
  - `sha256sum out1/dossier.json`: `e8281753f5f95b81a0e55e3a351d2445b16487caa21860b9e14618af7feca270`
  - `sha256sum out2/dossier.json`: `e8281753f5f95b81a0e55e3a351d2445b16487caa21860b9e14618af7feca270`
- **Status:** **DETERMINISTIC**

### Step 6: Docker Grader Emulation
- **Image:** `node:22` (standard pinned Node runtime).
- **Security & Sandbox Parameters:**
  - Network: disabled (`--network none`)
  - Mounts: repo at `/bot` (read-only), `.staging/input` at `/input` (read-only), `/output` (empty writable)
  - Resources: `--cpus 1 -m 1024m`
  - User: `--user 65534:65534` (nobody:nogroup)
  - Timeout: 120 seconds
- **Command:**
  ```bash
  timeout 120 docker run --rm --network none \
    -v "$PWD":/bot:ro \
    -v "$PWD/.staging/input":/input:ro \
    -v "$PWD/dock1":/output:rw \
    --cpus 1 -m 1024m --user 65534:65534 \
    node:22 node /bot/main.ts
  ```
- **Results:**
  - `dock1` exit code: 0
  - `dock2` exit code: 0
  - `diff -r dock1 dock2`: 0 (clean)
  - `diff -r dock1 out`: 0 (clean)
  - Docker `dossier.json` sha256: `e8281753f5f95b81a0e55e3a351d2445b16487caa21860b9e14618af7feca270`

---

## 3. Conclusion
The entry fully conforms to all sealed gate scorer checks, AI judge requirements, and container constraints. The verdict is **PASS** with zero remaining findings.
