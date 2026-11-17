/**
 * Token Launch Radar - Primary Evaluation Runner (Model v3)
 *
 * Ingests sealed snapshot data, scores pre-token protocols via Bayesian empirical comps,
 * validates compliance against gate criteria, outputs ranked board and dashboard assets,
 * and compiles cryptographic dossier for evaluation.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));

const DOSSIER_TEXT_CAP = 65_536;
const SCREENSHOT_LIMITS = { max: 4, max_bytes: 524_288 };
const DASHBOARD_LIMITS = { max_files: 400, max_bytes: 4_194_304 };
const VALID_IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** Extract command line flag parameter supporting `--key value` and `--key=value` patterns. */
function parseFlag(flag: string, fallback: string): string {
  const argv = process.argv;
  const flagName = `--${flag}`;
  const idx = argv.indexOf(flagName);
  if (idx !== -1 && idx + 1 < argv.length) {
    return argv[idx + 1]!;
  }
  const prefix = `${flagName}=`;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i]!.startsWith(prefix)) {
      return argv[i]!.slice(prefix.length);
    }
  }
  return fallback;
}

/** Determine absolute or normalized path to target snapshot file. */
function resolveSnapshotPath(inputParam: string): string {
  if (inputParam.endsWith('.json')) {
    return inputParam;
  }
  return join(inputParam, 'snapshot.json');
}

/** Copy regular files within a directory to target destination, skipping dotfiles. */
function copyDirectoryFiles(sourceDir: string, destDir: string): string[] {
  if (!existsSync(sourceDir)) {
    return [];
  }
  mkdirSync(destDir, { recursive: true });
  const copiedFiles: string[] = [];
  const entries = readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isFile()) {
      const srcFile = join(sourceDir, entry.name);
      const dstFile = join(destDir, entry.name);
      copyFileSync(srcFile, dstFile);
      copiedFiles.push(entry.name);
    }
  }
  return copiedFiles;
}

function run(): void {
  const rawInput = parseFlag('input', '/input');
  const snapshotPath = resolveSnapshotPath(rawInput);
  if (!existsSync(snapshotPath)) {
    process.stderr.write(`token radar: no snapshot at ${snapshotPath}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
    process.exit(2);
  }

  const outputDir = parseFlag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

  const snapshotContent = readFileSync(snapshotPath, 'utf8');
  const snapshot = parseSnapshot(snapshotContent);
  const { board, radar } = buildRadar(snapshot);

  const verificationIssue = boardIssue(board, snapshot);
  if (verificationIssue !== null) {
    process.stderr.write(`token radar: the model wrote a board the gate refuses: ${verificationIssue}\n`);
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`, 'utf8');
  writeFileSync(join(outputDir, 'data.js'), dataScript(radar), 'utf8');

  copyDirectoryFiles(join(SCRIPT_DIR, 'dashboard'), join(outputDir, 'dashboard'));

  const capturedShots = copyDirectoryFiles(join(SCRIPT_DIR, 'screenshots'), join(outputDir, 'screenshots'));
  if (capturedShots.length < 3) {
    process.stderr.write(`token radar: screenshots/ holds ${capturedShots.length} image${capturedShots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`);
    process.exit(1);
  }

  for (const shot of capturedShots) {
    if (!VALID_IMAGE_NAME.test(shot)) {
      process.stderr.write(`token radar: screenshots/${shot}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
      process.exit(1);
    }
  }

  const dossierData = buildDossier(outputDir, {
    text_max_bytes: DOSSIER_TEXT_CAP,
    screenshots: SCREENSHOT_LIMITS,
    dashboard: DASHBOARD_LIMITS,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossierData);

  process.stdout.write(
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: wrote ${join(outputDir, 'board.json')}, ${join(outputDir, 'data.js')}, ${join(outputDir, 'dashboard')} (3 files), ${join(outputDir, 'screenshots')} (${capturedShots.length} images) and ${join(outputDir, 'dossier.json')}\n`,
  );
}

run();
