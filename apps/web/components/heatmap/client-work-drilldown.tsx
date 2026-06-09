'use client';

import {format} from 'date-fns';
import {AlertTriangle, CalendarClock, CheckCircle2, Inbox, ShieldCheck} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Badge} from '@workspace/ui/components/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@workspace/ui/components/tabs';
import {cn} from '@workspace/ui/lib/utils';
import {Modal} from '@/components/ui/modal';
import {useClientWorkBreakdown} from '@/lib/hooks/useClientHeatmap';
import type {ClientWorkItem} from '@/lib/db/client-heatmap-service';
import type {TicketPriority, TicketStatus} from '@/lib/db/schema';

const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

function priorityVariant(
  priority: TicketPriority,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (priority === 'critical' || priority === 'high') return 'destructive';
  if (priority === 'medium') return 'default';
  return 'secondary';
}

function CountPill({count}: {count: number}) {
  return (
    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
      {count}
    </span>
  );
}

function WorkItemRow({item}: {item: ClientWorkItem}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{STATUS_LABELS[item.status]}</span>
          {item.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                item.overdue && 'font-medium text-red-600 dark:text-red-400',
              )}>
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              <span className="tabular-nums">{format(new Date(item.dueDate), 'MMM d')}</span>
              {item.overdue && ' · overdue'}
            </span>
          )}
        </div>
      </div>
      <Badge variant={priorityVariant(item.priority)} className="shrink-0">
        {PRIORITY_LABELS[item.priority]}
      </Badge>
    </div>
  );
}

function EmptyHint({icon: Icon, label}: {icon: LucideIcon; label: string}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function WorkItemList({
  items,
  emptyIcon,
  emptyLabel,
}: {
  items: ClientWorkItem[];
  emptyIcon: LucideIcon;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <EmptyHint icon={emptyIcon} label={emptyLabel} />;
  }
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <WorkItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-label="Loading work breakdown">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

interface ClientWorkDrilldownProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientWorkDrilldown({
  clientId,
  clientName,
  isOpen,
  onClose,
}: ClientWorkDrilldownProps) {
  const {data, isLoading, error} = useClientWorkBreakdown(clientId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clientName}
      description="Open work and coverage gaps"
      size="lg">
      {isLoading ? (
        <LoadingRows />
      ) : error || !data ? (
        <EmptyHint icon={AlertTriangle} label="Failed to load work breakdown. Please try again." />
      ) : (
        <Tabs defaultValue="todo">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todo" className="gap-1.5">
              To do <CountPill count={data.toDo.length} />
            </TabsTrigger>
            <TabsTrigger value="deliver" className="gap-1.5">
              To deliver <CountPill count={data.toDeliver.length} />
            </TabsTrigger>
            <TabsTrigger value="gaps" className="gap-1.5">
              Gaps <CountPill count={data.gaps.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todo" className="mt-4">
            <WorkItemList
              items={data.toDo}
              emptyIcon={Inbox}
              emptyLabel="No new or in-progress work."
            />
          </TabsContent>
          <TabsContent value="deliver" className="mt-4">
            <WorkItemList
              items={data.toDeliver}
              emptyIcon={CheckCircle2}
              emptyLabel="Nothing waiting to ship."
            />
          </TabsContent>
          <TabsContent value="gaps" className="mt-4">
            {data.gaps.length === 0 ? (
              <EmptyHint icon={ShieldCheck} label="No coverage gaps detected." />
            ) : (
              <ul className="space-y-2 py-2">
                {data.gaps.map((gap) => (
                  <li
                    key={gap}
                    className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {gap}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </Modal>
  );
}
