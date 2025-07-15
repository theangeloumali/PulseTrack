'use client';

import {useEffect, useState, use, Suspense} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {RichTextEditor} from '@/components/ui/rich-text-editor';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {useAuthStore} from '@/lib/stores/auth';
import {useTicketStore} from '@/lib/stores/ticket';
import {getTicketById, updateTicket} from '@/lib/db/service';
import {Ticket, TicketStatus, TicketPriority} from '@/lib/db/schema';
import {ArrowLeft, Loader2, Save} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string; // project ID
    ticketId: string; // ticket ID
  }>;
}

function EditTicketContent({params}: Props) {
  const resolvedParams = use(params);
  const [ticket, setTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'new' as TicketStatus,
    priority: 'medium' as TicketPriority,
    estimated_hours: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {user} = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadTicket();
  }, [resolvedParams.ticketId]);

  const loadTicket = async () => {
    try {
      setIsLoading(true);
      const ticketData = await getTicketById(resolvedParams.ticketId);

      if (!ticketData) {
        setError('Ticket not found');
        return;
      }

      // Security check: ensure ticket's project belongs to user's company
      const projectData = ticketData.projects as any;
      const projectCompanyId =
        projectData?.company_id || (Array.isArray(projectData) ? projectData[0]?.company_id : null);

      if (!projectCompanyId || projectCompanyId !== user?.company_id) {
        setError('Ticket not found or access denied');
        return;
      }

      setTicket(ticketData);
      setFormData({
        title: ticketData.title || '',
        description: ticketData.description || '',
        status: ticketData.status || 'new',
        priority: ticketData.priority || 'medium',
        estimated_hours: ticketData.estimated_hours?.toString() || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      };

      await updateTicket(resolvedParams.ticketId, updateData);

      // Redirect back to ticket detail page
      router.push(`/projects/${resolvedParams.id}/tickets/${resolvedParams.ticketId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/projects/${resolvedParams.id}`}>
              <Button className="w-full">Back to Project</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href={`/projects/${resolvedParams.id}/tickets/${resolvedParams.ticketId}`}>
                <Button variant="outline" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Ticket
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Ticket</h1>
                <p className="text-gray-600">Update ticket details and settings</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href={`/projects/${resolvedParams.id}/tickets/${resolvedParams.ticketId}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
              <CardDescription>Update the ticket details below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter ticket title"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="estimated_hours">Estimated Hours</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.estimated_hours}
                      onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <div className="mt-1">
                      <RichTextEditor
                        id="description"
                        value={formData.description}
                        onChange={handleDescriptionChange}
                        placeholder="Enter ticket description. You can use **markdown** formatting!"
                        height={200}
                        preview="edit"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports markdown formatting: **bold**, *italic*, `code`, [links](url), lists,
                      and more.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Link href={`/projects/${resolvedParams.id}/tickets/${resolvedParams.ticketId}`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function EditTicketPage({params}: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
      <EditTicketContent params={params} />
    </Suspense>
  );
}
