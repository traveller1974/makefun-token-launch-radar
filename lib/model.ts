// Token Launch Radar Model v3: empirical comps with Bayesian shrinkage,
// sublinear TVL base scaling, clamped 7-day TVL momentum, log-shaped protocol maturity,
// data completeness confidence discounts, and multi-chain breadth scaling.
//
// Pure deterministic valuation with zero network dependencies and zero hardcoded protocol names.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The complete sealed snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** Model v3 valuation and calibration constants. */
export interface ModelConstants {
  shrinkage_k: number;
  exponent: number;
  winsor_lower: number;
  winsor_upper: number;
  clamp_lower: number;
  clamp_upper: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_days: number;
  unknown_age_days: number;
  confidence_discount_growth: number;
  confidence_discount_listed: number;
  global_median?: number;
  base_multiple?: number;
  maturity_floor?: number;
  maturity_range?: number;
  breadth_gamma: number;
}

/** House valuation parameters for Model v3. */
export const MODEL: ModelConstants = {
  shrinkage_k: 4,
  exponent: 0.85,
  winsor_lower: 0.01,
  winsor_upper: 5.0,
  clamp_lower: 0.03,
  clamp_upper: 1.50,
  growth_weight: 0.40,
  growth_floor: -60,
  growth_cap: 120,
  maturity_days: 1095,
  unknown_age_days: 365,
  confidence_discount_growth: 0.92,
  confidence_discount_listed: 0.88,
  global_median: 0.2138,
  base_multiple: 0.2138,
  maturity_floor: 0.50,
  maturity_range: 0.50,
  breadth_gamma: 0.10,
};

/** Active model version identifier. */
export const MODEL_VERSION = 'radar-3';

/** Maximum count of live-token protocols retained for the comparison view. */
export const LIVE_ROWS = 24;

/** A structured farming action step with cost and time estimates. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One scored row for the official output board.json. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    base_multiple?: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    confidence_discount: number;
    breadth_chains: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** Dashboard compact representation of a scored protocol row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  category_multiple: number;
  confidence_discount: number;
  breadth_chains: number;
  breadth_multiplier: number;
}

/** A live trading protocol row used for peer comps and market sanity. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Complete client-side payload emitted into data.js. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Error raised when snapshot input is invalid or violates schema. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const LN_1096 = Math.log(1096);

/** DefiLlama version marker regex: a release suffix denotes an isolated pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Round number to four decimal places. */
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** Compute elapsed calendar days between asOf and listedAt, bounded below at 0. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const tAsOf = Date.parse(`${asOf}T00:00:00Z`);
  const tListed = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(tAsOf) || !Number.isFinite(tListed)) return null;
  return Math.max(0, Math.floor((tAsOf - tListed) / DAY_MS));
}

/** Check if protocol possesses no circulating token metadata. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Check if protocol is eligible for radar board ranking: pre-token, non-CEX, unversioned. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** Compute the interpolated median of a sorted numerical array. */
function medianOfSorted(sorted: number[]): number {
  const len = sorted.length;
  if (len === 0) return 0;
  const mid = len / 2;
  if (len % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[Math.floor(mid)]!;
}

/**
 * Compute empirical category multiples with Bayesian shrinkage toward the global median.
 * Live peers: mcap_usd > 0 and tvl_usd > 0.
 * Ratios are winsorized to [winsor_lower, winsor_upper].
 */
export function computeCategoryMultiples(protocols: SnapshotProtocol[], model: ModelConstants = MODEL): {
  globalMedian: number;
  categoryMultiples: Map<string, number>;
  categoryMedians: Map<string, number>;
  categoryCounts: Map<string, number>;
  livePeerCount: number;
} {
  const livePeers = protocols.filter((p) => typeof p.mcap_usd === 'number' && p.mcap_usd > 0 && p.tvl_usd > 0);
  const allRatios: number[] = [];
  const byCategory = new Map<string, number[]>();

  for (const p of livePeers) {
    const rawRatio = p.mcap_usd! / p.tvl_usd;
    const winsorized = Math.min(model.winsor_upper, Math.max(model.winsor_lower, rawRatio));
    allRatios.push(winsorized);

    if (p.category !== null) {
      let catList = byCategory.get(p.category);
      if (catList === undefined) {
        catList = [];
        byCategory.set(p.category, catList);
      }
      catList.push(winsorized);
    }
  }

  allRatios.sort((a, b) => a - b);
  const globalMedian = medianOfSorted(allRatios);

  const categoryMultiples = new Map<string, number>();
  const categoryMedians = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const [cat, ratios] of byCategory.entries()) {
    ratios.sort((a, b) => a - b);
    const n_c = ratios.length;
    const M_c = medianOfSorted(ratios);
    const rawMultiple = (n_c * M_c + model.shrinkage_k * globalMedian) / (n_c + model.shrinkage_k);
    const clampedMultiple = Math.min(model.clamp_upper, Math.max(model.clamp_lower, rawMultiple));

    categoryCounts.set(cat, n_c);
    categoryMedians.set(cat, M_c);
    categoryMultiples.set(cat, clampedMultiple);
  }

  return {
    globalMedian,
    categoryMultiples,
    categoryMedians,
    categoryCounts,
    livePeerCount: livePeers.length,
  };
}

/**
 * Model v3 valuation calculation for an individual protocol:
 * Base: 1,000,000 * (TVL / 1,000,000)^0.85 * M_category
 * Growth: clamp change_7d to [-60, 120]%, multiplier = 1 + (growth / 100) * 0.40
 * Maturity: age bounded [0, 1095], multiplier = 0.50 + 0.50 * ln(1 + age) / ln(1096)
 * Confidence discount: (change_7d null ? 0.92 : 1.0) * (listed_at null ? 0.88 : 1.0)
 * Breadth: chains = max(1, chains.length), multiplier = (1 + ln(chains))^0.10
 * Implied value: max(1, round(Base * Mult_growth * Mult_maturity * Discount_confidence * Mult_breadth))
 */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants = MODEL,
  categoryMultiple?: number,
): {
  implied: number;
  categoryMultiple: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  confidenceDiscount: number;
  breadthChains: number;
  breadthMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const effectiveAge = Math.min(model.maturity_days, Math.max(0, age ?? model.unknown_age_days));
  const maturityMult = 0.50 + 0.50 * (Math.log(1 + effectiveAge) / LN_1096);

  const rawGrowth = protocol.change_7d ?? 0;
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1.0 + (growthPct / 100) * model.growth_weight;

  const catMult = categoryMultiple ?? model.global_median ?? 0.2138;
  const tvlPositive = Math.max(0, protocol.tvl_usd);
  const base = 1_000_000 * Math.pow(tvlPositive / 1_000_000, model.exponent) * catMult;

  const confDiscount =
    (protocol.change_7d === null ? model.confidence_discount_growth : 1.0) *
    (protocol.listed_at === null ? model.confidence_discount_listed : 1.0);

  const breadthChains = Math.max(1, protocol.chains.length);
  const breadthMult = Math.pow(1 + Math.log(breadthChains), model.breadth_gamma);

  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * confDiscount * breadthMult));

  return {
    implied,
    categoryMultiple: catMult,
    growthPct,
    growthMult,
    maturityMult,
    confidenceDiscount: confDiscount,
    breadthChains,
    breadthMult,
    age,
  };
}

/** Determine capital requirement tier based on TVL scale. */
function capitalFor(tvl: number): number {
  if (tvl >= 5_000_000_000) return 250;
  if (tvl >= 1_000_000_000) return 150;
  if (tvl >= 100_000_000) return 100;
  return 50;
}

/** Determine position holding requirement based on protocol age. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** Resolve the primary deployment network from protocol chains. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its primary network';
}

/** Generate category-tailored action instruction for Step 2. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Supply $${capital} in USDC or primary collateral on ${name} (${chain}) and keep the health factor comfortably above liquidation.`;
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('farm') || c.includes('liquidity')) {
    return `Deposit $${capital} of liquidity into ${name}'s core pool on ${chain} and maintain active LP range.`;
  }
  if (c.includes('bridge')) {
    return `Route $${capital} in stablecoins across ${chain} via ${name} and interact with an ecosystem dapp.`;
  }
  if (c.includes('stak')) {
    return `Stake $${capital} of native assets through ${name} on ${chain} and hold the yield-bearing receipt token.`;
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('option') || c.includes('basis')) {
    return `Deposit $${capital} of collateral into ${name} on ${chain} and maintain a low-leverage hedging position.`;
  }
  if (c.includes('prediction')) {
    return `Allocate $${capital} into an active prediction market contract on ${name} to register protocol participation.`;
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return `Allocate $${capital} into a verified ${name} vault strategy on ${chain} and hold vault shares.`;
  }
  if (c.includes('stable')) {
    return `Mint or provide $${capital} of stablecoin liquidity through ${name} on ${chain} and retain custody.`;
  }
  if (c.includes('rwa')) {
    return `Deposit $${capital} into ${name}'s tokenized real-world asset pool on ${chain} and accrue onchain yield.`;
  }
  if (c.includes('insurance')) {
    return `Underwrite or purchase $${capital} in protocol risk coverage via ${name} on ${chain} and retain policy proof.`;
  }
  return `Deposit $${capital} of assets into ${name}'s verified protocol smart contracts on ${chain} and hold position.`;
}

/** Resolve category-specific risk factor for Step 1. */
function categoryRisk(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return 'collateral liquidation and oracle latency';
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('farm') || c.includes('liquidity')) {
    return 'impermanent loss and pool slippage';
  }
  if (c.includes('bridge')) {
    return 'cross-chain bridge relay and message finality';
  }
  if (c.includes('stak')) {
    return 'validator slashing and unbonding delay';
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('option') || c.includes('basis')) {
    return 'margin liquidation and counterparty volatility';
  }
  if (c.includes('prediction')) {
    return 'oracle resolution disputes and market settlement';
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return 'vault rebalancing drawdown and manager';
  }
  if (c.includes('stable')) {
    return 'collateral depeg and redemption spread';
  }
  if (c.includes('rwa')) {
    return 'asset attestation and offchain issuer';
  }
  if (c.includes('insurance')) {
    return 'underwriting capital lockup and claim shortfall';
  }
  return 'smart contract vulnerability and protocol integration';
}

/** Generate category-tailored weekly maintenance action for Step 3. */
function weeklyActionFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return 'rebalance collateral, accrue borrow interest or claim lending points';
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('farm') || c.includes('liquidity')) {
    return 'rebalance LP price bounds, compound fee revenue or harvest yield';
  }
  if (c.includes('bridge')) {
    return 'route a test volume transfer or verify cross-chain message proofs';
  }
  if (c.includes('stak')) {
    return 'claim staking yield, compound receipt tokens or re-delegate votes';
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('option') || c.includes('basis')) {
    return 'roll open hedge positions, adjust margin levels or record a small trade';
  }
  if (c.includes('prediction')) {
    return 'place a prediction trade, claim settled outcome shares or update market votes';
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return 'reinvest strategy yield, review vault allocations or cast curator votes';
  }
  if (c.includes('stable')) {
    return 'mint or redeem stability pool tokens and record stability adjustments';
  }
  if (c.includes('rwa')) {
    return 'rebalance tokenized pool units or claim onchain yield distributions';
  }
  if (c.includes('insurance')) {
    return 'inspect coverage pool reserves or renew policy risk tranches';
  }
  return 'execute a qualifying protocol transaction, harvest rewards or submit a governance signal';
}

/** Generate category-tailored clean exit instruction for Step 6. */
function exitActionFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return 'repay outstanding debt obligations and withdraw supplied collateral';
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('farm') || c.includes('liquidity')) {
    return 'remove pool liquidity, burn LP shares and claim all trading fee yields';
  }
  if (c.includes('bridge')) {
    return 'verify cross-chain transaction completions, claim destination funds and bridge assets back';
  }
  if (c.includes('stak')) {
    return 'unstake locked assets, observe unbonding cooldowns and redeem native tokens';
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('option') || c.includes('basis')) {
    return 'close open perpetual or hedging positions and withdraw account margin';
  }
  if (c.includes('prediction')) {
    return 'settle active predictions, redeem market payout balances and claim rewards';
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return 'exit vault strategies, redeem allocator shares and withdraw base deposits';
  }
  if (c.includes('stable')) {
    return 'redeem stablecoins against issuer reserves and withdraw underlying collateral';
  }
  if (c.includes('rwa')) {
    return 'liquidate tokenized pool positions and withdraw verified RWA proceeds';
  }
  if (c.includes('insurance')) {
    return 'withdraw risk underwriting capital and redeem policy shares';
  }
  return 'redeem all deposited capital, settle outstanding protocol balances and claim rewards';
}

/** Formulate complete 6-step protocol farming strategy derived purely from protocol metrics. */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p.tvl_usd);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const gasEstimate = capital >= 150 ? 8 : 4;

  return [
    {
      text: `Generate a dedicated, isolated airdrop wallet on ${chain} funded with native gas to interact with ${p.name}, isolating ${categoryRisk(p)} risk from primary holdings.`,
      cost: 'approx $2-3 gas for initial funding',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} capital plus approx $${gasEstimate} gas`,
      time: '15 minutes setup',
    },
    {
      text: `Execute weekly onchain interactions on ${chain} (${weeklyActionFor(p)}) to establish consistent organic usage on ${p.name}.`,
      cost: 'approx $1-2 in network gas weekly',
      time: '5-10 minutes weekly',
    },
    {
      text: `Maintain active capital deployed for at least ${hold} days across multiple snapshot cutoff dates.`,
      cost: `$${capital} capital stays locked`,
      time: `${hold} days duration`,
    },
    {
      text: `Monitor points and eligibility strictly through ${p.name}'s verified official domain on ${chain} and bookmark authentic portal links.`,
      cost: 'zero additional cost',
      time: '5 minutes',
    },
    {
      text: `Log all transaction hashes, ${exitActionFor(p)} from ${p.name} on ${chain}, and revoke all smart contract allowances.`,
      cost: 'standard network fee to withdraw and revoke',
      time: '10 minutes',
    },
  ];
}

/** Render a single farm step string bounded strictly between 20 and 600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Maintain verified protocol activity.`;
  return s;
}

/**
 * Build the complete ranked board scoring all rankable pre-token protocols plus every watchlist slug.
 * Sorted descending by implied_value_usd, breaking ties by slug ascending. Sequential ranks 1..N.
 */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const comps = computeCategoryMultiples(snapshot.protocols, model);
  const index = new Map<string, SnapshotProtocol>();
  for (const p of snapshot.protocols) {
    index.set(p.slug, p);
  }

  const chosen = new Map<string, SnapshotProtocol>();

  // Ensure 100% mandatory coverage for watchlist protocols
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) {
      chosen.set(slug, p);
    }
  }

  // Rank all rankable pre-token protocols
  for (const p of snapshot.protocols) {
    if (isRankable(p) && !chosen.has(p.slug)) {
      chosen.set(p.slug, p);
    }
  }

  const scored = Array.from(chosen.values()).map((p) => {
    const catMult = p.category !== null ? (comps.categoryMultiples.get(p.category) ?? comps.globalMedian) : comps.globalMedian;
    const res = impliedValue(p, snapshot.as_of, model, catMult);
    return { p, ...res };
  });

  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));

  return scored.map((s, idx) => ({
    rank: idx + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: round4(s.categoryMultiple),
      base_multiple: round4(s.categoryMultiple),
      growth_pct: round4(s.growthPct),
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      confidence_discount: round4(s.confidenceDiscount),
      breadth_chains: s.breadthChains,
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** Top 24 live-token non-CEX protocols by market cap for comparative context. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** Transform BoardRow to compact RadarRow for dashboard presentation and waterfall reconstruction. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    category_multiple: row.model.category_multiple,
    confidence_discount: row.model.confidence_discount,
    breadth_chains: row.model.breadth_chains,
    breadth_multiplier: row.model.breadth_multiplier,
  };
}

/** Compile complete dashboard dataset and board output. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const watchlistSet = new Set(snapshot.watchlist);
  const early = board.filter((r) => !watchlistSet.has(r.slug)).length;

  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };

  return { board, radar };
}

/** Ingest and validate the sealed snapshot JSON document. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not valid JSON');
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SnapshotError('snapshot.json must be a JSON object');
  }

  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) {
    throw new SnapshotError('snapshot.json missing or invalid as_of date');
  }
  if (typeof o.source !== 'string') {
    throw new SnapshotError('snapshot.json missing source property');
  }
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) {
    throw new SnapshotError('snapshot.json missing or invalid floor_usd integer');
  }
  if (!Array.isArray(o.protocols)) {
    throw new SnapshotError('snapshot.json missing protocols array');
  }
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) {
    throw new SnapshotError('snapshot.json missing or invalid watchlist string array');
  }

  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw new SnapshotError(`snapshot protocol at index ${i} is not an object`);
    }
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot protocol at index ${i} missing valid slug, name, or tvl_usd`);
    }

    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });

  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Verify board compliance against competition gate criteria: coverage, ranks, monotonicity, variety, and steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) {
    return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  }

  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      return `expected rank ${i + 1} but found ${ranks[i]}`;
    }
  }

  for (let i = 1; i < board.length; i++) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) {
      return `row ${i + 1} (${board[i]!.slug}: $${board[i]!.implied_value_usd}) exceeds row ${i} (${board[i - 1]!.slug}: $${board[i - 1]!.implied_value_usd})`;
    }
  }

  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share identical implied value $${board[0]!.implied_value_usd}: board lacks discriminatory ranking`;
  }

  for (const r of board) {
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) {
      return `protocol ${r.slug} has invalid non-positive implied value ${r.implied_value_usd}`;
    }
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) {
      return `protocol ${r.slug} has ${steps.length} farm steps (allowed: 3 to 12)`;
    }
    for (const s of steps) {
      if (s.length < 20 || s.length > 600) {
        return `protocol ${r.slug} step length ${s.length} outside gate limit of 20 to 600 characters`;
      }
    }
  }

  return null;
}

/** Emit window.RADAR initialization script for self-contained zero-network client dashboard. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
