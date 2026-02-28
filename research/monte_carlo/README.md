# Market Monte Carlo (Python/JAX)

This module runs Monte Carlo simulations for the market state machine to detect potentially unfair strategic edge.

## Files

- `market_mcs.ipynb`: Main notebook with transition kernel, policy sweeps, metrics, and exports.
- `scenarios.json`: Stage and sweep configuration.

## Workflow

1. Run notebook top-to-bottom.
2. Calibration checks execute first and must pass.
3. Staged experiments run in order: sanity, stability, stress, search.
4. Results are exported to `research/monte_carlo/results/latest_results.json`.

## Notes

- The notebook mirrors logic from `domain/workflows/exchange.ts` and `domain/workflows/liquidity.ts` at simulation level.
- Metrics focus on expected PnL, risk-adjusted return, win-rate, and downside tails.
