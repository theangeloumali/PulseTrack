'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  Flame,
  Layers,
  LayoutGrid,
  RotateCcw,
  ScatterChart,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {cn} from '@workspace/ui/lib/utils';
import {Button} from '@workspace/ui/components/button';
import {Card, CardContent} from '@workspace/ui/components/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {useClientHeatmap} from '@/lib/hooks/useClientHeatmap';
import {useAuthStore} from '@/lib/stores/auth';
import {useRoleAccess} from '@/lib/hooks/useRoleAccess';
import {HeatCard, HEAT_TIER_STYLES} from '@/components/heatmap/heat-card';
import {HeatMatrix} from '@/components/heatmap/heat-matrix';
import {ClientWorkDrilldown} from '@/components/heatmap/client-work-drilldown';
import {ClientAgentPanel} from '@/components/heatmap/client-agent-panel';
import type {ClientHeat, HeatTier} from '@/lib/db/client-heatmap-service';

type ViewMode = 'cards' | 'matrix';
type SortKey = 'score' | 'name';
type TierFilter = HeatTier | 'all';

const VIEW_OPTIONS: {value: ViewMode; label: string; icon: LucideIcon}[] = [
  {value: 'cards', label: 'Cards', icon: LayoutGrid},
  {value: 'matrix', label: 'Matrix', icon: ScatterChart},
];

interface StateMessageProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}

function StateMessage({icon: Icon, title, body, action}: StateMessageProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-16 text-center">
        <Icon className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  );
}

function HeatCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-l-4 border-l-muted bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
        <div className="h-9 w-12 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}

function ViewToggle({value, onChange}: {value: ViewMode; onChange: (next: ViewMode) => void}) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex items-center rounded-md border border-input bg-muted p-0.5">
      {VIEW_OPTIONS.map(({value: option, label, icon: Icon}) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 motion-reduce:transition-none',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface TierChipConfig {
  key: TierFilter;
  label: string;
  icon: LucideIcon;
  activeClass: string;
}

const TIER_CHIPS: TierChipConfig[] = [
  {key: 'all', label: 'All', icon: Layers, activeClass: 'bg-foreground/10 text-foreground'},
  {
    key: 'hot',
    label: HEAT_TIER_STYLES.hot.label,
    icon: HEAT_TIER_STYLES.hot.icon,
    activeClass: HEAT_TIER_STYLES.hot.pill,
  },
  {
    key: 'warm',
    label: HEAT_TIER_STYLES.warm.label,
    icon: HEAT_TIER_STYLES.warm.icon,
    activeClass: HEAT_TIER_STYLES.warm.pill,
  },
  {
    key: 'cool',
    label: HEAT_TIER_STYLES.cool.label,
    icon: HEAT_TIER_STYLES.cool.icon,
    activeClass: HEAT_TIER_STYLES.cool.pill,
  },
];

function TierChip({
  config,
  count,
  active,
  onClick,
}: {
  config: TierChipConfig;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = config.icon;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Filter: ${config.label} (${count})`}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 motion-reduce:transition-none',
        active
          ? cn('border-transparent', config.activeClass)
          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
      )}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

export function ClientHeatmapScreen() {
  const router = useRouter();
  const {user: currentUser} = useAuthStore();
  const {canAccessCompany} = useRoleAccess();

  const [view, setView] = useState<ViewMode>('cards');
  const [sort, setSort] = useState<SortKey>('score');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [selected, setSelected] = useState<ClientHeat | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const {data: clients, isLoading, error} = useClientHeatmap();

  useEffect(() => {
    if (currentUser && !canAccessCompany()) {
      router.push('/dashboard');
    }
  }, [currentUser, canAccessCompany, router]);

  const ranked = useMemo(() => clients ?? [], [clients]);

  const tierCounts = useMemo(() => {
    const base = {all: ranked.length, hot: 0, warm: 0, cool: 0};
    for (const client of ranked) base[client.tier] += 1;
    return base;
  }, [ranked]);

  const visible = useMemo(() => {
    const filtered = tierFilter === 'all' ? ranked : ranked.filter((c) => c.tier === tierFilter);
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b.score - a.score,
    );
  }, [ranked, tierFilter, sort]);

  if (currentUser && !canAccessCompany()) {
    return <div></div>;
  }

  function renderContent() {
    if (error) {
      return (
        <StateMessage
          icon={AlertTriangle}
          title="Failed to load heat map"
          body="Something went wrong while scoring your clients. Please try refreshing."
          action={
            <Button variant="outline" onClick={() => router.refresh()}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          }
        />
      );
    }

    if (isLoading) {
      return (
        <div
          aria-busy="true"
          aria-label="Loading client heat scores"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({length: 6}).map((_, i) => (
            <HeatCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (ranked.length === 0) {
      return (
        <StateMessage
          icon={Flame}
          title="No clients to score yet"
          body="Add clients with projects, tickets, or invoices and they'll appear here ranked by attention."
          action={
            <Button asChild>
              <Link href="/clients">
                <Users className="h-4 w-4" aria-hidden="true" />
                Add a client
              </Link>
            </Button>
          }
        />
      );
    }

    if (visible.length === 0) {
      return (
        <StateMessage
          icon={Layers}
          title="No clients match this filter"
          body="There are no clients in the selected tier right now."
          action={
            <Button variant="outline" onClick={() => setTierFilter('all')}>
              Show all clients
            </Button>
          }
        />
      );
    }

    if (view === 'cards') {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((client) => (
            <HeatCard key={client.clientId} client={client} onSelect={setSelected} />
          ))}
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <HeatMatrix clients={visible} onSelect={setSelected} />
        </CardContent>
      </Card>
    );
  }

  const showToolbar = !error && !isLoading && ranked.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Flame className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Client Heat Map</h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  Where attention is needed most — ranked by financial, delivery, and activity risk
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ViewToggle value={view} onChange={setView} />
              <Button
                variant="outline"
                onClick={() => setAiOpen(true)}
                aria-label="Open AI client assistant">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Ask AI
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {showToolbar && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Filter by tier"
              className="flex flex-wrap items-center gap-2">
              {TIER_CHIPS.map((config) => (
                <TierChip
                  key={config.key}
                  config={config}
                  count={tierCounts[config.key]}
                  active={tierFilter === config.key}
                  onClick={() => setTierFilter(config.key)}
                />
              ))}
            </div>
            {view === 'cards' && (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-muted-foreground sm:inline">Sort</span>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger size="sm" aria-label="Sort clients" className="w-[150px]">
                    <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Highest heat</SelectItem>
                    <SelectItem value="name">Name (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <h2 className="sr-only">Clients ranked by attention</h2>
        {renderContent()}
      </main>

      {selected && (
        <ClientWorkDrilldown
          clientId={selected.clientId}
          clientName={selected.name}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
        />
      )}

      <ClientAgentPanel
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        clientName={selected?.name}
      />
    </div>
  );
}
