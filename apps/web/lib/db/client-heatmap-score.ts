// Pure heat-scoring logic — NO I/O, NO supabase, NO env. Kept in its own module
// so it is unit-testable in isolation (the service re-exports everything here).

export interface ClientHeatSignals {
  /** Sum of overdue/sent-past-due invoice totals (dollars). */
  overdueAmount: number;
  /** Open tickets (status != 'done', not deleted) on the client's projects. */
  openTickets: number;
  /** Subset of open tickets whose due_date is in the past (weighted x2). */
  overdueTickets: number;
  /** Days since the most recent time entry or activity (max = no activity). */
  lastActivityDays: number;
  /** Open tickets due within the next 7 days. */
  dueSoon: number;
  /** Activities + tickets created on the client's projects in the last 14 days. */
  recentActivity: number;
}

export interface HeatWeights {
  financialRisk: number;
  deliveryBacklog: number;
  staleness: number;
  upcomingDeadlines: number;
  demand: number;
}

export type HeatSignalKey = keyof HeatWeights;

export type HeatTier = 'hot' | 'warm' | 'cool';

export interface HeatReason {
  signal: HeatSignalKey;
  /** Human-readable text, e.g. "$4,200 overdue", "4 open tasks (2 overdue)". */
  label: string;
  /** Weighted contribution to the score, 0..1 (higher = more impactful). */
  contribution: number;
}

export const DEFAULT_WEIGHTS: HeatWeights = {
  financialRisk: 0.3,
  deliveryBacklog: 0.25,
  staleness: 0.2,
  upcomingDeadlines: 0.15,
  demand: 0.1,
};

/** Fixed normalization caps — the value at which each signal saturates to 1. */
export const HEAT_CAPS = {
  overdueAmount: 10_000,
  backlog: 20,
  stalenessDays: 30,
  dueSoon: 10,
  demand: 30,
} as const;

const HOT_THRESHOLD = 67;
const WARM_THRESHOLD = 34;
/** Lookback window (days) for staleness/recent-activity queries + reason text. */
export const STALE_WINDOW_DAYS = 90;

function clamp01(value: number): number {
  if (Number.isNaN(value) || value <= 0) return 0;
  return value > 1 ? 1 : value;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function normalizeSignals(signals: ClientHeatSignals): Record<HeatSignalKey, number> {
  return {
    financialRisk: clamp01(signals.overdueAmount / HEAT_CAPS.overdueAmount),
    // Overdue tickets are also open, so adding them again applies the x2 weight.
    deliveryBacklog: clamp01((signals.openTickets + signals.overdueTickets) / HEAT_CAPS.backlog),
    staleness: clamp01(signals.lastActivityDays / HEAT_CAPS.stalenessDays),
    upcomingDeadlines: clamp01(signals.dueSoon / HEAT_CAPS.dueSoon),
    demand: clamp01(signals.recentActivity / HEAT_CAPS.demand),
  };
}

function buildReasons(
  signals: ClientHeatSignals,
  normalized: Record<HeatSignalKey, number>,
  weights: HeatWeights,
): HeatReason[] {
  const labels: Record<HeatSignalKey, string | null> = {
    financialRisk:
      signals.overdueAmount > 0 ? `${formatMoney(signals.overdueAmount)} overdue` : null,
    deliveryBacklog:
      signals.openTickets > 0
        ? `${plural(signals.openTickets, 'open task')}${
            signals.overdueTickets > 0 ? ` (${signals.overdueTickets} overdue)` : ''
          }`
        : null,
    staleness:
      signals.lastActivityDays > 0
        ? `no activity for ${
            signals.lastActivityDays >= STALE_WINDOW_DAYS
              ? `${STALE_WINDOW_DAYS}+`
              : signals.lastActivityDays
          } days`
        : null,
    upcomingDeadlines:
      signals.dueSoon > 0 ? `${plural(signals.dueSoon, 'task')} due within 7 days` : null,
    demand:
      signals.recentActivity > 0
        ? `${plural(signals.recentActivity, 'update')} in last 14 days`
        : null,
  };

  return (Object.keys(labels) as HeatSignalKey[])
    .map((signal) => ({
      signal,
      label: labels[signal],
      contribution: normalized[signal] * weights[signal],
    }))
    .filter((r): r is HeatReason => r.label !== null && r.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);
}

/**
 * PURE scoring function — no I/O. Normalizes each signal to 0..1, applies the
 * weighted sum, scales to 0..100, and derives a tier + ranked reasons.
 */
export function computeClientHeat(
  signals: ClientHeatSignals,
  weights: HeatWeights = DEFAULT_WEIGHTS,
): {score: number; tier: HeatTier; reasons: HeatReason[]} {
  const normalized = normalizeSignals(signals);

  const weightedSum = (Object.keys(normalized) as HeatSignalKey[]).reduce(
    (sum, key) => sum + normalized[key] * weights[key],
    0,
  );

  const score = Math.min(100, Math.max(0, Math.round(weightedSum * 100)));
  const tier: HeatTier = score >= HOT_THRESHOLD ? 'hot' : score >= WARM_THRESHOLD ? 'warm' : 'cool';

  return {score, tier, reasons: buildReasons(signals, normalized, weights)};
}
