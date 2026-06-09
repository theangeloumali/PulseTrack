'use client';

import {useEffect, useState, use, Suspense} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {Button} from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {Badge} from '@workspace/ui/components/badge';
import {useAuthStore} from '@/lib/stores/auth';
import {useProjectStore} from '@/lib/stores/project';
import {useProjectQuery} from '@/lib/hooks/useProjects';
import {useRecentProjectTicketsQuery, useProjectTicketCountQuery} from '@/lib/hooks/useTickets';
import {CreateTicketModal} from '@/components/modals/create-ticket-modal';
import {
  ArrowLeft,
  Calendar,
  Edit,
  Settings,
  Plus,
  MoreVertical,
  Archive,
  Trash2,
  Loader2,
  FolderOpen,
  User,
  Building2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

function ProjectDetailContent({params}: Props) {
  const resolvedParams = use(params);

  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);

  const {user} = useAuthStore();
  const {setSelectedProject} = useProjectStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use React Query for project data
  const {data: project, isLoading, error, isError} = useProjectQuery(resolvedParams.id);

  // Use React Query for recent tickets
  const {data: recentTickets = [], isLoading: ticketsLoading} = useRecentProjectTicketsQuery(
    resolvedParams.id,
    5,
  );

  // Use React Query for ticket count
  const {data: ticketCount = 0, isLoading: countLoading} = useProjectTicketCountQuery(
    resolvedParams.id,
  );

  // Combine all effects for better performance
  useEffect(() => {
    // Handle URL parameter for opening ticket creation modal
    const openCreateTicket = searchParams.get('openCreateTicket');
    if (openCreateTicket === 'true') {
      setShowCreateTicketModal(true);
      // Clean up URL
      router.replace(`/projects/${resolvedParams.id}`, {scroll: false});
    }

    // Update Zustand store when project data changes
    if (project) {
      setSelectedProject(project);

      // Security check: ensure project belongs to user's company (PRD requirement)
      if (user && project.company_id !== user.company_id) {
        router.push('/projects');
        return;
      }
    }
  }, [searchParams, resolvedParams.id, router, project, setSelectedProject, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTicketPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-12">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error?.message || 'Project not found'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/projects">
                <Button className="w-full">Back to Projects</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                  <Badge className={`${getStatusColor(project.status)} border-0`}>
                    {project.status}
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-muted-foreground mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link href={`/projects/${project.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {countLoading ? (
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        ) : (
                          ticketCount
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Tickets</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {recentTickets.filter((t) => t.status === 'done').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {recentTickets.filter((t) => t.status === 'in_progress').length}
                      </div>
                      <div className="text-sm text-muted-foreground">In Progress</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">0h</div>
                      <div className="text-sm text-muted-foreground">Time Tracked</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Tickets */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Tickets</CardTitle>
                    <Button size="sm" onClick={() => setShowCreateTicketModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Ticket
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="text-muted-foreground mt-2">Loading tickets...</p>
                    </div>
                  ) : recentTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No tickets yet</p>
                      <p className="text-sm">Create your first ticket to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentTickets.map((ticket) => (
                        <Link
                          key={ticket.id}
                          href={`/projects/${project.id}/tickets/${ticket.id}`}
                          className="block p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {ticket.title}
                              </h4>
                              <div className="flex items-center mt-1 space-x-2">
                                <Badge className={`text-xs ${getTicketStatusColor(ticket.status)}`}>
                                  {ticket.status.replace('_', ' ')}
                                </Badge>
                                <Badge
                                  className={`text-xs ${getTicketPriorityColor(ticket.priority)}`}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </Link>
                      ))}
                      <div className="pt-3 border-t border-border">
                        <Link href={`/projects/${project.id}/tickets`}>
                          <Button variant="outline" className="w-full">
                            View All Tickets ({ticketCount})
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <Badge className={`${getStatusColor(project.status)} border-0`}>
                        {project.status}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Client</dt>
                    <dd className="mt-1 text-sm text-foreground flex items-center">
                      <Building2 className="h-4 w-4 mr-2 shrink-0" />
                      {project.client ? (
                        <Link
                          href={`/clients/${project.client.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400">
                          {project.client.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Internal</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                    <dd className="mt-1 text-sm text-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                    <dd className="mt-1 text-sm text-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(project.updated_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Owner</dt>
                    <dd className="mt-1 text-sm text-foreground flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      {/* TODO: Load and display owner name */}
                      Owner
                    </dd>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href={`/projects/${project.id}/tickets/new`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Ticket
                    </Button>
                  </Link>
                  <Link href={`/projects/${project.id}/edit`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Project
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Project
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateTicketModal}
        onClose={() => setShowCreateTicketModal(false)}
        defaultProjectId={resolvedParams.id}
      />
    </div>
  );
}

export default function ProjectDetailPage({params}: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}
