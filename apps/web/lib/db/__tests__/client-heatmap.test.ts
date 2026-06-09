import {describe, it, expect} from 'vitest';
import {
  computeClientHeat,
  DEFAULT_WEIGHTS,
  HEAT_CAPS,
  type ClientHeatSignals,
  type HeatWeights,
} from '../client-heatmap-score';

function signals(overrides: Partial<ClientHeatSignals> = {}): ClientHeatSignals {
  return {
    overdueAmount: 0,
    openTickets: 0,
    overdueTickets: 0,
    lastActivityDays: 0,
    dueSoon: 0,
    recentActivity: 0,
    ...overrides,
  };
}

describe('computeClientHeat', () => {
  it('returns cool/zero with no signal data and no reasons', () => {
    const {score, tier, reasons} = computeClientHeat(signals());
    expect(score).toBe(0);
    expect(tier).toBe('cool');
    expect(reasons).toEqual([]);
  });

  it('returns hot/high when every signal is saturated (overdue + stale)', () => {
    const {score, tier, reasons} = computeClientHeat(
      signals({
        overdueAmount: HEAT_CAPS.overdueAmount,
        openTickets: HEAT_CAPS.backlog,
        overdueTickets: HEAT_CAPS.backlog, // pushes backlog past cap → clamped to 1
        lastActivityDays: HEAT_CAPS.stalenessDays,
        dueSoon: HEAT_CAPS.dueSoon,
        recentActivity: HEAT_CAPS.demand,
      }),
    );
    expect(score).toBe(100);
    expect(tier).toBe('hot');
    expect(reasons.length).toBeGreaterThan(0);
  });

  it('clamps the score to 0..100', () => {
    const {score} = computeClientHeat(
      signals({overdueAmount: HEAT_CAPS.overdueAmount * 10, dueSoon: HEAT_CAPS.dueSoon * 5}),
    );
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  describe('tier thresholds', () => {
    it('maps the hot boundary (score 67)', () => {
      // 0.30 (financial) + 0.25 (backlog) + 18/30*0.20 = 0.67 → 67
      const {score, tier} = computeClientHeat(
        signals({
          overdueAmount: HEAT_CAPS.overdueAmount,
          openTickets: HEAT_CAPS.backlog,
          lastActivityDays: 18,
        }),
      );
      expect(score).toBe(67);
      expect(tier).toBe('hot');
    });

    it('stays warm just below the hot threshold (score 66)', () => {
      // 0.30 + 0.25 + 17/30*0.20 = 0.6633 → 66
      const {score, tier} = computeClientHeat(
        signals({
          overdueAmount: HEAT_CAPS.overdueAmount,
          openTickets: HEAT_CAPS.backlog,
          lastActivityDays: 17,
        }),
      );
      expect(score).toBe(66);
      expect(tier).toBe('warm');
    });

    it('maps the warm floor (score 35) vs cool just below (score 25)', () => {
      const warm = computeClientHeat(
        signals({openTickets: HEAT_CAPS.backlog, recentActivity: HEAT_CAPS.demand}),
      );
      expect(warm.score).toBe(35);
      expect(warm.tier).toBe('warm');

      const cool = computeClientHeat(signals({openTickets: HEAT_CAPS.backlog}));
      expect(cool.score).toBe(25);
      expect(cool.tier).toBe('cool');
    });
  });

  it('changes the score when weights are overridden', () => {
    const input = signals({overdueAmount: HEAT_CAPS.overdueAmount}); // financialRisk normalizes to 1
    const withDefaults = computeClientHeat(input);
    expect(withDefaults.score).toBe(Math.round(DEFAULT_WEIGHTS.financialRisk * 100)); // 30

    const financialOnly: HeatWeights = {
      financialRisk: 1,
      deliveryBacklog: 0,
      staleness: 0,
      upcomingDeadlines: 0,
      demand: 0,
    };
    const overridden = computeClientHeat(input, financialOnly);
    expect(overridden.score).toBe(100);
    expect(overridden.score).not.toBe(withDefaults.score);
  });

  it('populates ranked, human-readable reasons sorted by contribution', () => {
    const {reasons} = computeClientHeat(
      signals({overdueAmount: 4200, openTickets: 4, overdueTickets: 2, lastActivityDays: 21}),
    );
    expect(reasons.length).toBeGreaterThan(0);

    const labels = reasons.map((r) => r.label);
    expect(labels).toContain('$4,200 overdue');
    expect(labels).toContain('4 open tasks (2 overdue)');
    expect(labels).toContain('no activity for 21 days');

    const contributions = reasons.map((r) => r.contribution);
    expect([...contributions].sort((a, b) => b - a)).toEqual(contributions);
  });

  it('uses singular wording for a single open task', () => {
    const {reasons} = computeClientHeat(signals({openTickets: 1}));
    expect(reasons.map((r) => r.label)).toContain('1 open task');
  });
});
