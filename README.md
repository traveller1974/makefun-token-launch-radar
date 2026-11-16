# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/traveller1974/makefun-token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/traveller1974/makefun-token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

> Note: The badge placeholders `traveller1974` and `makefun-token-launch-radar` above must be updated with the actual GitHub organization or user and repository name once the GitHub repository is created.

Token Launch Radar is an autonomous crypto radar and airdrop valuation engine entered in the make.fun `token-radar-01` competition. The radar systematically analyzes, scores, and ranks pre-token Web3 protocols by their implied token launch valuation using a sealed DefiLlama protocol universe snapshot, pairing each protocol with a customized, actionable 6-step farming strategy.

## Methodology Summary

The valuation engine models pre-token implied launch value using sublinear TVL scaling calibrated against empirical live-token market-cap-to-TVL peer multiples across distinct protocol categories, shrunk Bayesian-style toward a global benchmark for sparse sectors. This base valuation is adjusted by 7-day TVL momentum, log-shaped protocol maturity from DefiLlama listing history, and data completeness discounts to produce deterministic, market-grounded launch valuations without any hardcoded protocol special-casing.

## How to Run

The radar runs on Node.js 22+ using standard library modules with zero runtime dependencies.

```bash
# Execute main entrypoint against a DefiLlama snapshot (e.g., ../input/snapshot.json from the unpacked kit)
node main.ts --input <path/to/snapshot.json>

# Or specify a custom output directory via environment variable or CLI argument
MAKEFUN_OUTPUT_DIR=out node main.ts --input <path/to/snapshot.json>
# or
node main.ts --input <path/to/snapshot.json> --output out
```

In the competition grader container environment, the runner executes:
```bash
node /bot/main.ts
```
which reads `/input/snapshot.json` and writes directly to `/output`.

## Viewing the Dashboard

1. `dashboard/index.html` loads `../data.js`, which is generated at runtime by `node main.ts` and is not tracked in the repository.
2. Opening `dashboard/index.html` directly from the repository workspace displays a short setup guidance message indicating that `data.js` has not been generated yet.
3. To view the live radar dashboard, first run `node main.ts --input <path/to/snapshot.json> --output out`, then open `out/dashboard/index.html` in your browser.

## Repository Layout

- `main.ts`: Primary runner script orchestrating data ingestion, board valuation modeling, dashboard data emission, asset synchronization, and dossier generation.
- `lib/model.ts`: Quantitative valuation model, protocol filter gates, comps calibrator, and automated 6-step farming plan generator.
- `dashboard/`: Static, zero-network dashboard web interface (`index.html`, `app.css`, `app.js`) designed under the strict 64 KB source budget.
- `board.json`: Output ranked board artifact detailing all scored pre-token protocols, their ranks, implied valuations, and step-by-step farm plans.
- `screenshots/`: High-resolution UI captures (`1-board.png`, `2-detail.png`, `3-filtered.png`) captured at 1440x900 for dossier evaluation.
- `dossier.json`: Sealed evaluation dossier packaging dashboard source files and verified screenshots using `vendor/makefun-board.ts`.
