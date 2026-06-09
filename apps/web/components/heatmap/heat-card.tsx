'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  ListTodo,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import {cn} from '@workspace/ui/lib/utils';
import {STALE_WINDOW_DAYS, type ClientHeat, type HeatTier} from '@/lib/db/client-heatmap-service';

/**
 * Shared per-tier presentation tokens. Tailwind `fill-*` classes are written as
 * literal strings so the compiler keeps them; reused by the matrix + screen +
 * filter chips. Color is ALWAYS paired with an icon + text label so the tier is
 * never communicated by color alone.
 */
export interface HeatTierStyle {
  label: string;
  /** One-line meaning, surfaced in the matrix legend. */
  meaning: string;
  /** Lucide icon paired with the color so tier reads without color. */
  icon: LucideIcon;
  /** Matrix point shape — a second, color-independent tier encoding. */
  shape: 'triangle' | 'diamond' | 'circle';
  /** Card left accent border. */
  border: string;
  /** Tier pill background + text (≥4.5:1 contrast). */
  pill: string;
  /** Matrix bubble fill. */
  fill: string;
  /** Score number color. */
  score: string;
}

export const HEAT_TIER_STYLES: Record<HeatTier, HeatTierStyle> = {
  hot: {
    label: 'Hot',
    meaning: 'Needs attention now',
    icon: Flame,
    shape: 'triangle',
    border: 'border-l-red-500',
    pill: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    fill: 'fill-red-500',
    score: 'text-red-600 dark:text-red-400',
  },
  warm: {
    label: 'Warm',
    meaning: 'Watch closely',
    icon: AlertTriangle,
    shape: 'diamond',
    border: 'border-l-amber-500',
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    fill: 'fill-amber-500',
    score: 'text-amber-600 dark:text-amber-400',
  },
  cool: {
    label: 'Cool',
    meaning: 'Healthy',
    icon: CheckCircle2,
    shape: 'circle',
    border: 'border-l-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    fill: 'fill-emerald-500',
    score: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function formatActivityDays(days: number): string {
  if (days >= STALE_WINDOW_DAYS) return `${STALE_WINDOW_DAYS}+d`;
  if (days <= 0) return 'today';
  return `${days}d`;
}

type StatTone = 'default' | 'muted' | 'danger';

interface StatProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  ariaLabel: string;
  tone?: StatTone;
}

function Stat({icon: Icon, value, label, ariaLabel, tone = 'default'}: StatProps) {
  return (
    <div className="flex flex-col items-center gap-0.5" aria-label={ariaLabel}>
      <span
        className={cn(
          'inline-flex items-center gap-1 text-sm font-semibold tabular-nums',
          tone === 'danger'
            ? 'text-red-600 dark:text-red-400'
            : tone === 'muted'
              ? 'text-muted-foreground'
              : 'text-foreground',
        )}>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        {value}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

interface HeatCardProps {
  client: ClientHeat;
  onSelect: (client: ClientHeat) => void;
}

export function HeatCard({client, onSelect}: HeatCardProps) {
  const style = HEAT_TIER_STYLES[client.tier];
  const TierIcon = style.icon;
  const topReason = client.reasons[0]?.label ?? 'No active signals';
  const {openTickets, overdueInvoices, lastActivityDays} = client.counts;

  return (
    <button
      type="button"
      onClick={() => onSelect(client)}
      aria-label={`${client.name}. ${style.label} tier, attention score ${client.score} of 100. ${topReason}. View details.`}
      className={cn(
        'group relative w-full cursor-pointer overflow-hidden rounded-xl border border-l-4 bg-card p-5 text-left text-card-foreground shadow-sm',
        'transition-[transform,box-shadow,background-color] duration-200 ease-out',
        'hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        style.border,
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{client.name}</h3>
          <p
            className="mt-1.5 line-clamp-2 text-sm font-medium text-foreground/75"
            title={topReason}>
            {topReason}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-baseline gap-0.5">
            <span className={cn('text-3xl font-bold leading-none tabular-nums', style.score)}>
              {client.score}
            </span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">/100</span>
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              style.pill,
            )}>
            <TierIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {style.label}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Stat
          icon={ListTodo}
          value={openTickets}
          label="Open tasks"
          ariaLabel={`${openTickets} open ${openTickets === 1 ? 'task' : 'tasks'}`}
          tone={openTickets > 0 ? 'default' : 'muted'}
        />
        <Stat
          icon={Receipt}
          value={overdueInvoices}
          label="Overdue inv."
          ariaLabel={`${overdueInvoices} overdue ${overdueInvoices === 1 ? 'invoice' : 'invoices'}`}
          tone={overdueInvoices > 0 ? 'danger' : 'muted'}
        />
        <Stat
          icon={Clock}
          value={formatActivityDays(lastActivityDays)}
          label="Since activity"
          ariaLabel={`Last activity ${formatActivityDays(lastActivityDays)} ago`}
          tone="default"
        />
      </div>
    </button>
  );
}
