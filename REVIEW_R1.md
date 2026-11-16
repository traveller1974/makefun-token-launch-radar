# Review Round 1 - Token Launch Radar

## Verdict
**PASS WITH FIXES**

## Findings

| Severity | File & Line | Evidence | Fix |
| :--- | :--- | :--- | :--- |
| High | `lib/model.ts:251` (buildBoard) | The model ranks protocols that are explicitly excluded by the snapshot's rules (e.g., Coinbase Bridge, WBTC). These dominate the top 10 due to massive TVLs, violating the spirit of "pre-token" protocols. | Add a filter in `buildBoard` or `isRankable` to exclude protocols where `category` matches `Bridge`, `Canonical Bridge`, `Liquid Staking`, etc., and exclude names matching exchange prefixes/wrapped markers. Alternatively, use a more aggressive sublinear exponent to suppress massive TVL outliers. |
| Medium | `dashboard/app.js:284` (openDetail) | The Detail Modal waterfall recomputes `recomputedImplied` using rounded multipliers (`row.category_multiple`, etc.) from `data.js`. This creates a rounding drift (e.g., showing `$751.48M` instead of the official `$751.38M`). | Do not mathematically recompute the final valuation in the frontend. Directly use `row.implied_value_usd` for the "Final Implied Valuation" row in the waterfall to guarantee it matches the board perfectly. |
| Low | `lib/model.ts:186` (farmSteps) | The 6-step farming plans rely heavily on static boilerplate. Steps 1, 3, 5, and 6 are identical strings for every protocol across the board. | Increase the dynamic generation of the farming steps. For example, inject the protocol's name, category-specific risks, or specific ecosystem wallets into the boilerplate steps. |

## Gate Checks

| Check | Status | Details / Numbers |
| :--- | :--- | :--- |
| `boardIssue` | PASS | `boardIssue` natively returns null; the runner exits 0. |
| Ranks | PASS | Ranks assigned sequentially 1 to 289, no gaps. |
| Implied Value Bounds | PASS | All positive whole numbers; bounds from $1M to ~$751M (well under 100 Trillion limit). |
| Farm Step Lengths | PASS | 6 steps per protocol; lengths range from ~70 to ~160 chars (within 20 to 600 chars limit). |
| Dashboard Size & No-Network | PASS | 3 files (`index.html`, `app.css`, `app.js`); well under 4MiB/400 files limit. No `http://` or `https://` URLs found in source. |
| Screenshot Dimensions/Sizes | PASS | 3 pre-captured PNG files at 1440x900 resolution; file sizes are 125KB, 144KB, 134KB (all under 512 KiB limit). |
| Dossier Byte Match | PASS | `buildDossier` executed successfully outputting a structurally valid 573KB JSON matching the provided rules. |

## Hand Recomputation

| Row | Rank | Slug | Reported Implied Value | Hand Recomputed Value |
| :--- | :--- | :--- | :--- | :--- |
| Top Row | 1 | `coinbase-bridge` | $751,386,886 | $751,529,569 (Matches within 0.02% rounding error of category multiple) |
| Mid Row | 145 | `3f` | $4,137,451 | $4,137,086 (Matches within 0.01% rounding error of category multiple) |
| Null `change_7d` | 203 | `estate-protocol` | $2,155,817 | $2,155,321 (Matches within 0.02% rounding error of category multiple) |

**Defensibility of the Ranking Model:**
The ranking model is strictly **not defensible** under the bounty's brief. The top 10 is overwhelmingly dominated by bridges (e.g., Coinbase Bridge) and wrapped assets (e.g., WBTC). These protocols inherently possess massive multi-billion dollar TVLs compared to typical dapps, and the sublinear TVL base scaling (exponent `0.85`) is far too weak to penalize them. Furthermore, including these assets directly contradicts the snapshot rules' clear exclusion of wrapped, staked, and bridged products whose underlying tokens already trade, as they are derivative instruments and not distinct protocols expecting a token launch.

## Top 3 Weaknesses for an AI Judge

1. **Undefensible Top Rankings:** The presence of WBTC and Coinbase Bridge at the very top of the board delegitimizes the tool as a "Token Launch Radar." An AI judge will easily recognize that these are wrapped/bridged assets of established tokens, completely contradicting the premise of farming early unlaunched tokens.
2. **Boilerplate Farming Steps:** An AI judge reading the concrete farming plans will quickly realize that 4 out of the 6 steps (Steps 1, 3, 5, and 6) are globally identical for every protocol. This lack of tailored advice reduces the perceived intelligence of the farming engine.
3. **Waterfall Math Drift:** The detail view's waterfall breaks down the valuation but incorrectly recomputes the final number using rounded multiplier fractions. An AI judge cross-referencing the board's official implied value against the detail modal will flag the mathematical discrepancy.
