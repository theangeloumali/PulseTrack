'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {format} from 'date-fns';
import {
  Building2,
  Plus,
  Search,
  Users,
  FolderOpen,
  Loader2,
  Save,
  Download,
  CheckCircle2,
  MinusCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  SearchX,
  type LucideIcon,
} from 'lucide-react';
import {Button} from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {cn} from '@workspace/ui/lib/utils';
import {Modal} from '@/components/ui/modal';
import {useClients, useCreateClient} from '@/lib/hooks/useClients';
import {useAuthStore} from '@/lib/stores/auth';
import {useRoleAccess} from '@/lib/hooks/useRoleAccess';
import {toCsv, downloadCsv} from '@/lib/utils/csv-export';
import type {ClientStatus} from '@/lib/db/schema';
import type {ClientWithCounts} from '@/lib/db/clients-service';

const STATUS_CONFIG: Record<ClientStatus, {label: string; icon: LucideIcon; className: string}> = {
  active: {
    label: 'Active',
    icon: CheckCircle2,
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  },
  inactive: {
    label: 'Inactive',
    icon: MinusCircle,
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

function ClientStatusPill({status}: {status: ClientStatus}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
      )}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

type SortKey = 'name' | 'contactsCount' | 'projectsCount';
type SortDirection = 'asc' | 'desc';

const TH_BASE =
  'sticky top-0 z-10 bg-muted border-b border-border px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground';

interface SortableHeaderProps {
  label: string;
  columnKey: SortKey;
  activeKey: SortKey | null;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}

function SortableHeader({label, columnKey, activeKey, direction, onSort}: SortableHeaderProps) {
  const isActive = activeKey === columnKey;
  const ariaSort: 'ascending' | 'descending' | 'none' = isActive
    ? direction === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';
  const Icon = isActive ? (direction === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th scope="col" aria-sort={ariaSort} className={TH_BASE}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="group inline-flex w-full items-center gap-1.5 rounded text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        aria-label={`Sort by ${label} ${isActive && direction === 'asc' ? 'descending' : 'ascending'}`}>
        <span>{label}</span>
        <Icon
          className={cn(
            'h-3.5 w-3.5 transition-colors',
            isActive
              ? 'text-foreground'
              : 'text-muted-foreground/50 group-hover:text-muted-foreground',
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddClientModal({isOpen, onClose}: AddClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const createClient = useCreateClient();

  const resetForm = () => {
    setFormData({name: '', contact_email: '', contact_phone: '', website: '', notes: ''});
    setError('');
  };

  const handleClose = () => {
    if (!createClient.isPending) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }

    try {
      await createClient.mutateAsync({
        name: formData.name.trim(),
        status: 'active',
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        website: formData.website.trim() || null,
        notes: formData.notes.trim() || null,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Client"
      description="Create a new client to track their contacts and projects.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">
            Client Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Acme Corp"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({...prev, name: e.target.value}))}
            required
            disabled={createClient.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input
            id="contact_email"
            type="email"
            placeholder="hello@acme.com"
            value={formData.contact_email}
            onChange={(e) => setFormData((prev) => ({...prev, contact_email: e.target.value}))}
            disabled={createClient.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            placeholder="+1 555 000 0000"
            value={formData.contact_phone}
            onChange={(e) => setFormData((prev) => ({...prev, contact_phone: e.target.value}))}
            disabled={createClient.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            placeholder="https://acme.com"
            value={formData.website}
            onChange={(e) => setFormData((prev) => ({...prev, website: e.target.value}))}
            disabled={createClient.isPending}
          />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createClient.isPending}
            className="cursor-pointer">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createClient.isPending || !formData.name.trim()}
            className="cursor-pointer">
            {createClient.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Client
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientsTableSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {Array.from({length: 6}).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-4 animate-pulse motion-reduce:animate-none">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded bg-muted" />
            <div className="h-3 w-56 rounded bg-muted" />
          </div>
          <div className="h-6 w-20 rounded-full bg-muted" />
          <div className="h-3.5 w-10 rounded bg-muted" />
          <div className="h-3.5 w-10 rounded bg-muted" />
          <div className="hidden h-3.5 w-24 rounded bg-muted sm:block" />
        </div>
      ))}
    </div>
  );
}

export function ClientsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const {user: currentUser} = useAuthStore();
  const {canAccessCompany} = useRoleAccess();

  const {data: clients, isLoading, error} = useClients();

  // Redirect users without company access
  useEffect(() => {
    if (currentUser && !canAccessCompany()) {
      router.push('/dashboard');
    }
  }, [currentUser, canAccessCompany, router]);

  if (currentUser && !canAccessCompany()) {
    return <div></div>;
  }

  const filteredClients = (clients ?? []).filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const sortedClients =
    sortKey === null
      ? filteredClients
      : [...filteredClients].sort((a, b) => {
          const comparison =
            sortKey === 'name' ? a.name.localeCompare(b.name) : a[sortKey] - b[sortKey];
          return sortDirection === 'asc' ? comparison : -comparison;
        });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleExportCsv = () => {
    const csv = toCsv<ClientWithCounts>(sortedClients, [
      {key: 'name', header: 'Name'},
      {key: 'status', header: 'Status'},
      {key: 'contactsCount', header: 'Contacts'},
      {key: 'projectsCount', header: 'Projects'},
      {key: 'ownerName', header: 'Owner', map: (client) => client.ownerName ?? 'Unassigned'},
    ]);
    downloadCsv(`clients-${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);
  };

  const hasResults = sortedClients.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Clients</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your clients, their contacts, and projects
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={!hasResults}
                className="flex items-center gap-2 cursor-pointer">
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Export CSV</span>
              </Button>
              <Button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 cursor-pointer">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Client</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label htmlFor="client-search" className="text-sm font-medium">
                Search clients
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="client-search"
                  type="search"
                  placeholder="Search by client name..."
                  aria-label="Search clients by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle className="tabular-nums">Clients ({sortedClients.length})</CardTitle>
            <CardDescription>Select a client to view contacts and projects</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <SearchX className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Failed to load clients. Please try again.
                </p>
              </div>
            ) : isLoading ? (
              <ClientsTableSkeleton />
            ) : !hasResults ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                {searchQuery ? (
                  <>
                    <h2 className="mb-1 text-base font-semibold text-foreground">
                      No clients match “{searchQuery}”
                    </h2>
                    <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                      Try a different name or clear the search to see all clients.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                      className="cursor-pointer">
                      Clear search
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="mb-1 text-base font-semibold text-foreground">No clients yet</h2>
                    <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                      Add your first client to start tracking their contacts and projects.
                    </p>
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 cursor-pointer">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Add your first client</span>
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <caption className="sr-only">
                    List of clients with status, contact and project counts, and owner. Use the
                    column headers to sort.
                  </caption>
                  <thead>
                    <tr>
                      <SortableHeader
                        label="Name"
                        columnKey="name"
                        activeKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <th scope="col" className={TH_BASE}>
                        Status
                      </th>
                      <SortableHeader
                        label="Contacts"
                        columnKey="contactsCount"
                        activeKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Projects"
                        columnKey="projectsCount"
                        activeKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <th scope="col" className={TH_BASE}>
                        Owner
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {sortedClients.map((client) => {
                      const goToClient = () => router.push(`/clients/${client.id}`);
                      return (
                        <tr
                          key={client.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`View ${client.name} details`}
                          onClick={goToClient}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              goToClient();
                            }
                          }}
                          className="cursor-pointer transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-sm font-medium text-primary">
                                  {client.name?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="ml-4 min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">
                                  {client.name}
                                </div>
                                {client.contact_email && (
                                  <div className="truncate text-sm text-muted-foreground">
                                    {client.contact_email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <ClientStatusPill status={client.status} />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                              <span className="tabular-nums font-medium">
                                {client.contactsCount}
                              </span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <FolderOpen
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                              />
                              <span className="tabular-nums font-medium">
                                {client.projectsCount}
                              </span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                            {client.ownerName || 'Unassigned'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AddClientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
