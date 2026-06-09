'use client';

import {useState, type KeyboardEvent} from 'react';
import {cn} from '@workspace/ui/lib/utils';
import type {ClientHeat, HeatTier} from '@/lib/db/client-heatmap-service';
import {HEAT_TIER_STYLES, type HeatTierStyle} from './heat-card';

type TierShapeKind = HeatTierStyle['shape'];

// Fixed viewBox — the SVG scales responsively via `w-full h-auto`.
const WIDTH = 800;
const HEIGHT = 480;
const PAD = {top: 24, right: 28, bottom: 56, left: 68};
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const MIN_R = 7;
const MAX_R = 22;
// Transparent hit/focus target — keeps the keyboard + pointer target ≥44px on
// desktop regardless of the (size-encoded) visible marker.
const HIT_R = 26;

// Tier band boundaries (mirror client-heatmap-score thresholds).
const TIER_BANDS: {score: number; tier: HeatTier}[] = [
  {score: 67, tier: 'hot'},
  {score: 34, tier: 'warm'},
];

const TIER_ORDER: HeatTier[] = ['hot', 'warm', 'cool'];
const SCORE_TICKS = [0, 50, 100];

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

interface PlotPoint {
  client: ClientHeat;
  cx: number;
  cy: number;
  r: number;
}

function scoreToY(score: number): number {
  return PAD.top + (1 - score / 100) * PLOT_H;
}

/** A color-independent shape per tier — pairs with the fill so tier survives in grayscale. */
function TierShape({
  cx,
  cy,
  r,
  shape,
  className,
}: {
  cx: number;
  cy: number;
  r: number;
  shape: TierShapeKind;
  className: string;
}) {
  if (shape === 'triangle') {
    const points = `${cx},${cy - r * 1.15} ${cx - r * 1.05},${cy + r * 0.75} ${cx + r * 1.05},${cy + r * 0.75}`;
    return <polygon points={points} className={className} strokeWidth={1.5} />;
  }
  if (shape === 'diamond') {
    const points = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
    return <polygon points={points} className={className} strokeWidth={1.5} />;
  }
  return <circle cx={cx} cy={cy} r={r} className={className} strokeWidth={1.5} />;
}

interface HeatMatrixProps {
  clients: ClientHeat[];
  onSelect: (client: ClientHeat) => void;
}

export function HeatMatrix({clients, onSelect}: HeatMatrixProps) {
  const [active, setActive] = useState<number | null>(null);

  const maxValue = Math.max(1, ...clients.map((c) => Number(c.value) || 0));
  const maxTickets = Math.max(1, ...clients.map((c) => Number(c.counts.openTickets) || 0));

  const points: PlotPoint[] = clients.map((client) => {
    const value = Number(client.value) || 0;
    const score = Number(client.score) || 0;
    const tickets = Number(client.counts.openTickets) || 0;
    return {
      client,
      cx: PAD.left + (value / maxValue) * PLOT_W,
      cy: scoreToY(score),
      r: MIN_R + (tickets / maxTickets) * (MAX_R - MIN_R),
    };
  });

  const activePoint = active !== null ? points[active] : null;
  const midX = PAD.left + PLOT_W / 2;

  function handleKey(event: KeyboardEvent<SVGGElement>, client: ClientHeat) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(client);
    }
  }

  return (
    <div className="w-full">
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="Client attention scatter plot — client value on the x-axis, attention score on the y-axis. Tab between clients to drill in."
          className="h-auto w-full min-w-[600px]">
          {/* Horizontal gridlines */}
          {[25, 50, 75].map((score) => (
            <line
              key={`grid-${score}`}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={scoreToY(score)}
              y2={scoreToY(score)}
              className="stroke-border"
              strokeOpacity={0.5}
            />
          ))}

          {/* Vertical quadrant divider (value midpoint) */}
          <line
            x1={midX}
            x2={midX}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            className="stroke-border"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />

          {/* Tier threshold bands */}
          {TIER_BANDS.map((band) => {
            const y = scoreToY(band.score);
            return (
              <g key={band.tier}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  className={cn('stroke-current', HEAT_TIER_STYLES[band.tier].score)}
                  strokeDasharray="5 4"
                  strokeOpacity={0.6}
                />
                <text
                  x={WIDTH - PAD.right}
                  y={y - 5}
                  textAnchor="end"
                  className={cn('text-[11px] font-medium', HEAT_TIER_STYLES[band.tier].score)}
                  fill="currentColor">
                  {HEAT_TIER_STYLES[band.tier].label} ≥ {band.score}
                </text>
              </g>
            );
          })}

          {/* Quadrant guide labels */}
          <text
            x={WIDTH - PAD.right - 4}
            y={PAD.top + 16}
            textAnchor="end"
            className="fill-muted-foreground text-[11px] font-medium"
            opacity={0.55}>
            High value · needs attention
          </text>
          <text
            x={PAD.left + 6}
            y={PAD.top + PLOT_H - 8}
            textAnchor="start"
            className="fill-muted-foreground text-[11px] font-medium"
            opacity={0.55}>
            Low value · healthy
          </text>

          {/* Axes */}
          <line
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            className="stroke-border"
          />
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            className="stroke-border"
          />

          {/* Y tick labels */}
          {SCORE_TICKS.map((score) => (
            <text
              key={`y-${score}`}
              x={PAD.left - 10}
              y={scoreToY(score) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px] tabular-nums">
              {score}
            </text>
          ))}

          {/* X tick labels */}
          <text
            x={PAD.left}
            y={PAD.top + PLOT_H + 18}
            textAnchor="start"
            className="fill-muted-foreground text-[11px] tabular-nums">
            $0
          </text>
          <text
            x={WIDTH - PAD.right}
            y={PAD.top + PLOT_H + 18}
            textAnchor="end"
            className="fill-muted-foreground text-[11px] tabular-nums">
            {formatMoney(maxValue)}
          </text>

          {/* Axis titles */}
          <text
            x={PAD.left + PLOT_W / 2}
            y={HEIGHT - 12}
            textAnchor="middle"
            className="fill-muted-foreground text-xs font-medium">
            Client value (invoiced, $) →
          </text>
          <text
            x={-(PAD.top + PLOT_H / 2)}
            y={18}
            textAnchor="middle"
            transform="rotate(-90)"
            className="fill-muted-foreground text-xs font-medium">
            Attention score (0–100) →
          </text>

          {/* Points */}
          {points.map((point, index) => {
            const {client, cx, cy, r} = point;
            const style = HEAT_TIER_STYLES[client.tier];
            const isActive = active === index;
            return (
              <g
                key={client.clientId}
                role="button"
                tabIndex={0}
                aria-label={`${client.name}: ${style.label} tier, score ${client.score}, ${formatMoney(client.value)} invoiced, ${client.counts.openTickets} open ${client.counts.openTickets === 1 ? 'task' : 'tasks'}`}
                onClick={() => onSelect(client)}
                onKeyDown={(event) => handleKey(event, client)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive((prev) => (prev === index ? null : prev))}
                onFocus={() => setActive(index)}
                onBlur={() => setActive((prev) => (prev === index ? null : prev))}
                className="cursor-pointer outline-none">
                {/* Invisible ≥44px hit/focus target */}
                <circle cx={cx} cy={cy} r={HIT_R} className="fill-transparent" />
                {isActive && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 5}
                    className="fill-none stroke-foreground"
                    strokeWidth={2}
                  />
                )}
                <TierShape
                  cx={cx}
                  cy={cy}
                  r={r}
                  shape={style.shape}
                  className={cn(
                    'stroke-background transition-opacity duration-150 motion-reduce:transition-none',
                    style.fill,
                    isActive ? 'opacity-100' : 'opacity-80',
                  )}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover/focus tooltip */}
        {activePoint && (
          <div
            role="tooltip"
            style={{
              left: `${(activePoint.cx / WIDTH) * 100}%`,
              top: `${(activePoint.cy / HEIGHT) * 100}%`,
            }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
            <p className="font-semibold text-foreground">{activePoint.client.name}</p>
            <dl className="mt-1 space-y-0.5 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <dt>Attention</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {activePoint.client.score}/100
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Value</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {formatMoney(activePoint.client.value)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Open work</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {activePoint.client.counts.openTickets}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Legend — tier color + shape + meaning (color is never the only signal) */}
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {TIER_ORDER.map((tier) => {
          const style = HEAT_TIER_STYLES[tier];
          return (
            <li key={tier} className="flex items-center gap-1.5 text-xs">
              <svg width={14} height={14} viewBox="-7 -7 14 14" aria-hidden="true">
                <TierShape cx={0} cy={0} r={5} shape={style.shape} className={style.fill} />
              </svg>
              <span className="font-medium text-foreground">{style.label}</span>
              <span className="text-muted-foreground">· {style.meaning}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Bubble size = open tasks · select a point to drill into the client&apos;s work
      </p>
    </div>
  );
}
