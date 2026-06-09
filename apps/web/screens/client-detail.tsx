'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  CircleDollarSign,
  FolderOpen,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Repeat,
  Save,
  Trash2,
  User,
  Users,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import {Modal} from '@/components/ui/modal';
import {
  useClientDetail,
  useCreateClientContact,
  useUpdateClientContact,
  useDeleteClientContact,
} from '@/lib/hooks/useClients';
import {useClientInvoices, useInvoiceSchedules} from '@/lib/hooks/useClientInvoices';
import {useAuthStore} from '@/lib/stores/auth';
import {useRoleAccess} from '@/lib/hooks/useRoleAccess';
import {InvoiceList} from '@/components/invoicing/invoice-list';
import {InvoiceGenerateModal} from '@/components/invoicing/invoice-generate-modal';
import {InvoiceScheduleForm} from '@/components/invoicing/invoice-schedule-form';
import {CreateProjectModal} from '@/components/modals/create-project-modal';
import type {ClientContact, ClientStatus, ProjectStatus} from '@/lib/db/schema';

const SEMANTIC_PILL =
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium';

function StatusPill({
  label,
  toneClassName,
  dotClassName,
}: {
  label: string;
  toneClassName: string;
  dotClassName: string;
}) {
  return (
    <span className={cn(SEMANTIC_PILL, toneClassName)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClassName)} aria-hidden="true" />
      {label}
    </span>
  );
}

const CLIENT_STATUS_CONFIG: Record<
  ClientStatus,
  {label: string; toneClassName: string; dotClassName: string}
> = {
  active: {
    label: 'Active',
    toneClassName:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    dotClassName: 'bg-emerald-500',
  },
  inactive: {
    label: 'Inactive',
    toneClassName: 'bg-muted text-muted-foreground border-border',
    dotClassName: 'bg-muted-foreground',
  },
};

const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  {label: string; toneClassName: string; dotClassName: string}
> = {
  active: {
    label: 'Active',
    toneClassName:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    dotClassName: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    toneClassName:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    dotClassName: 'bg-blue-500',
  },
  archived: {
    label: 'Archived',
    toneClassName: 'bg-muted text-muted-foreground border-border',
    dotClassName: 'bg-muted-foreground',
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  contact: ClientContact | null;
}

function ContactModal({isOpen, onClose, clientId, contact}: ContactModalProps) {
  const isEditing = !!contact;
  const [formData, setFormData] = useState({
    name: contact?.name ?? '',
    title: contact?.title ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    is_primary: contact?.is_primary ?? false,
  });
  const [error, setError] = useState('');

  const createContact = useCreateClientContact();
  const updateContact = useUpdateClientContact();
  const isPending = createContact.isPending || updateContact.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Contact name is required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      title: formData.title.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      is_primary: formData.is_primary,
    };

    try {
      if (isEditing && contact) {
        await updateContact.mutateAsync({id: contact.id, clientId, updates: payload});
      } else {
        await createContact.mutateAsync({client_id: clientId, ...payload});
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title={isEditing ? 'Edit Contact' : 'Add Contact'}
      description="Person in charge for this client.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="contact-name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact-name"
            placeholder="Jane Doe"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({...prev, name: e.target.value}))}
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-title">Title</Label>
          <Input
            id="contact-title"
            placeholder="Account Manager"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({...prev, title: e.target.value}))}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="jane@client.com"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({...prev, email: e.target.value}))}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            placeholder="+1 555 000 0000"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({...prev, phone: e.target.value}))}
            disabled={isPending}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={formData.is_primary}
            onChange={(e) => setFormData((prev) => ({...prev, is_primary: e.target.checked}))}
            disabled={isPending}
            className="h-4 w-4 cursor-pointer rounded border-input"
          />
          Mark as primary contact
        </label>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="cursor-pointer">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !formData.name.trim()}
            className="cursor-pointer">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Save Contact' : 'Add Contact'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface ClientDetailScreenProps {
  clientId: string;
}

export function ClientDetailScreen({clientId}: ClientDetailScreenProps) {
  const router = useRouter();
  const {data: client, isLoading, error} = useClientDetail(clientId);

  const {user: currentUser} = useAuthStore();
  const {canAccessCompany} = useRoleAccess();

  const [contactModal, setContactModal] = useState<{
    isOpen: boolean;
    contact: ClientContact | null;
  }>({isOpen: false, contact: null});
  const [deleteTarget, setDeleteTarget] = useState<ClientContact | null>(null);
  const deleteContact = useDeleteClientContact();

  const [showGenerateInvoice, setShowGenerateInvoice] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const {
    data: invoices,
    isLoading: invoicesLoading,
    error: invoicesError,
  } = useClientInvoices({clientId});
  const {data: schedules} = useInvoiceSchedules();
  const activeScheduleCount = (schedules ?? []).filter(
    (schedule) => schedule.client_id === clientId && schedule.active,
  ).length;

  // Redirect users without company access
  useEffect(() => {
    if (currentUser && !canAccessCompany()) {
      router.push('/dashboard');
    }
  }, [currentUser, canAccessCompany, router]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContact.mutateAsync({id: deleteTarget.id, clientId});
    } finally {
      setDeleteTarget(null);
    }
  };

  if (currentUser && !canAccessCompany()) {
    return <div></div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" aria-busy="true">
        <span className="sr-only">Loading client…</span>
        <header className="border-b border-border bg-card shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="h-8 w-32 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            <div className="mt-4 flex items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
              <div className="space-y-2">
                <div className="h-7 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({length: 4}).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
              />
            ))}
          </div>
          {Array.from({length: 2}).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
            />
          ))}
        </main>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Client not found</CardTitle>
            <CardDescription>
              This client may have been removed or you don&apos;t have access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => router.push('/clients')}
              className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invoiceList = invoices ?? [];
  const invoiceCurrency = invoiceList[0]?.currency || 'USD';
  const outstandingTotal = invoiceList
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0);
  const outstandingDisplay = invoicesLoading
    ? '—'
    : new Intl.NumberFormat('en-US', {style: 'currency', currency: invoiceCurrency}).format(
        outstandingTotal,
      );
  const activeProjectCount = client.projects.filter(
    (project) => project.status === 'active',
  ).length;
  const clientStatus = CLIENT_STATUS_CONFIG[client.status];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/clients')}
            aria-label="Back to clients"
            className="mb-4 -ml-2 cursor-pointer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">
                  {client.name}
                </h1>
                <StatusPill
                  label={clientStatus.label}
                  toneClassName={clientStatus.toneClassName}
                  dotClassName={clientStatus.dotClassName}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {client.ownerName || 'Unassigned'}
                </span>
                {client.contact_email && (
                  <a
                    href={`mailto:${client.contact_email}`}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
                    <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {client.contact_email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* KPI summary */}
        <section aria-label="Client summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Contacts" value={String(client.contacts.length)} />
          <StatCard
            icon={FolderOpen}
            label="Projects"
            value={String(client.projects.length)}
            hint={`${activeProjectCount} active`}
          />
          <StatCard icon={Receipt} label="Invoices" value={String(invoiceList.length)} />
          <StatCard
            icon={CircleDollarSign}
            label="Outstanding"
            value={outstandingDisplay}
            hint="Sent + overdue"
          />
        </section>

        {/* Persons in charge */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Persons in charge
                <span className="tabular-nums text-muted-foreground">
                  ({client.contacts.length})
                </span>
              </CardTitle>
              <CardDescription>Contacts responsible for this client</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setContactModal({isOpen: true, contact: null})}
              className="shrink-0 cursor-pointer">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Contact
            </Button>
          </CardHeader>
          <CardContent>
            {client.contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-foreground">No contacts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the first person responsible for this client.
                </p>
                <Button
                  size="sm"
                  onClick={() => setContactModal({isOpen: true, contact: null})}
                  className="mt-4 cursor-pointer">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Contact
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {client.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-4 transition-colors first:pt-0 last:pb-0 hover:bg-muted/40 motion-reduce:transition-none">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {contact.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {contact.name}
                          </span>
                          {contact.is_primary && (
                            <StatusPill
                              label="Primary"
                              toneClassName="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                              dotClassName="bg-amber-500"
                            />
                          )}
                        </div>
                        {contact.title && (
                          <div className="text-sm text-muted-foreground">{contact.title}</div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="inline-flex cursor-pointer items-center gap-1 rounded transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
                              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="inline-flex cursor-pointer items-center gap-1 rounded transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
                              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              {contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${contact.name}`}
                        onClick={() => setContactModal({isOpen: true, contact})}
                        className="cursor-pointer text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${contact.name}`}
                        className="cursor-pointer text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        onClick={() => setDeleteTarget(contact)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Projects
                <span className="tabular-nums text-muted-foreground">
                  ({client.projects.length})
                </span>
              </CardTitle>
              <CardDescription>Projects associated with this client</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateProject(true)}
              className="shrink-0 cursor-pointer">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Project
            </Button>
          </CardHeader>
          <CardContent>
            {client.projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-foreground">No projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Projects linked to this client will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {client.projects.map((project) => {
                  const projectStatus = PROJECT_STATUS_CONFIG[project.status];
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => router.push(`/projects/${project.id}`)}
                      aria-label={`Open project ${project.name}`}
                      className="group -mx-2 flex w-full items-center justify-between gap-3 rounded-md px-2 py-4 text-left transition-colors first:pt-0 last:pb-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer motion-reduce:transition-none">
                      <div className="flex min-w-0 items-center gap-3">
                        <FolderOpen
                          className="h-5 w-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm font-medium text-foreground group-hover:underline">
                          {project.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusPill
                          label={projectStatus.label}
                          toneClassName={projectStatus.toneClassName}
                          dotClassName={projectStatus.dotClassName}
                        />
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Invoices
                <span className="tabular-nums text-muted-foreground">({invoiceList.length})</span>
              </CardTitle>
              <CardDescription>
                Generate and track invoices for this client
                {activeScheduleCount > 0
                  ? ` · ${activeScheduleCount} active recurring schedule${
                      activeScheduleCount > 1 ? 's' : ''
                    }`
                  : ''}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleForm(true)}
                className="cursor-pointer">
                <Repeat className="h-4 w-4" aria-hidden="true" />
                Recurring
              </Button>
              <Button
                size="sm"
                onClick={() => setShowGenerateInvoice(true)}
                className="cursor-pointer">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Generate Invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <InvoiceList
              invoices={invoiceList}
              isLoading={invoicesLoading}
              error={invoicesError}
              onGenerate={() => setShowGenerateInvoice(true)}
            />
          </CardContent>
        </Card>
      </main>

      {showGenerateInvoice && (
        <InvoiceGenerateModal
          isOpen={showGenerateInvoice}
          onClose={() => setShowGenerateInvoice(false)}
          clientId={clientId}
          clientName={client.name}
        />
      )}

      {showScheduleForm && (
        <InvoiceScheduleForm
          isOpen={showScheduleForm}
          onClose={() => setShowScheduleForm(false)}
          clientId={clientId}
          clientName={client.name}
        />
      )}

      {showCreateProject && (
        <CreateProjectModal
          isOpen={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          defaultClientId={clientId}
        />
      )}

      {contactModal.isOpen && (
        <ContactModal
          isOpen={contactModal.isOpen}
          onClose={() => setContactModal({isOpen: false, contact: null})}
          clientId={clientId}
          contact={contactModal.contact}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="cursor-pointer bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
