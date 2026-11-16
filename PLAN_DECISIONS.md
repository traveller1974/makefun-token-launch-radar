# Plan Decisions Log

1. **Global Median Discrepancy**: The true interpolated median of the 128 live peers (mcap > 0, tvl > 0) is 0.2138; the 0.205 value was the lower middle element (64th out of 128) resulting from not averaging the middle two values.
2. **Screenshot Automation**: Changed from Playwright automation to manual pre-capture; the execution sandbox has no network and strict limits, so the script must only copy pre-committed images from the repository.
3. **Category Multiple Clamping**: Approved clamping category multiples between 0.03x and 1.50x; this safely bounds outliers and prevents single-peer categories from skewing valuations uncontrollably.
4. **Null Category Handling**: Approved defaulting null categories to the global median (0.2138); this provides a robust, neutral baseline when category comps are unavailable.
5. **Scoring Universe Size**: Approved expanding the board to all 289 rankable pre-token protocols instead of 200; fully maps the eligible ecosystem and easily satisfies the 100 to 4,000 rows gate limit.
6. **Value Model Formula Validation**: Verified that all model components (winsorization, k=4 Bayesian shrinkage, sublinear 0.85 TVL scaling, growth clamps, log maturity curve, and confidence discounts) are mathematically sound, deterministic, and gate-compliant.
7. **No Name Special-Casing**: Confirmed the valuation engine is strictly data-driven with no hardcoded protocol names or manual overrides, ensuring fairness.
8. **Watchlist Coverage**: Verified the snapshot contains exactly 40 watchlist protocols and that all 40 are subsets of the 289 rankable pre-token protocols, ensuring 100% mandatory coverage.
