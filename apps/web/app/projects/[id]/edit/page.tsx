'use client';

import {useEffect, useState, use} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {Textarea} from '@workspace/ui/components/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {useAuthStore} from '@/lib/stores/auth';
import {useProjectStore} from '@/lib/stores/project';
import {useClients} from '@/lib/hooks/useClients';
import {getProjectById, updateProject, deleteProject} from '@/lib/db/service';
import {Project} from '@/lib/db/schema';
import {ArrowLeft, Loader2, Save, Trash2} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default function EditProjectPage({params}: Props) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'archived' | 'completed',
    client_id: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {user} = useAuthStore();
  const {updateProject: updateProjectInStore, deleteProjectById} = useProjectStore();
  const {data: clients = []} = useClients();
  const router = useRouter();

  useEffect(() => {
    loadProject();
  }, [resolvedParams.id]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const projectData = await getProjectById(resolvedParams.id);

      // Security check: ensure project belongs to user's company (PRD requirement)
      if (projectData.company_id !== user?.company_id) {
        setError('Project not found or access denied');
        return;
      }

      setProject(projectData);
      setFormData({
        name: projectData.name,
        description: projectData.description || '',
        status: projectData.status,
        client_id: projectData.client_id ?? '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      status: value as 'active' | 'archived' | 'completed',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project || !user) return;

    setIsSubmitting(true);
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Project name is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const updates = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        client_id: formData.client_id || null,
      };

      const updatedProject = await updateProject(project.id, updates);
      updateProjectInStore(project.id, updatedProject);

      // Redirect back to project details
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !user) return;

    try {
      // Delete from database and update store
      await deleteProjectById(project.id);

      // Redirect to projects list after successful deletion
      router.push('/projects');
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-12">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || 'Project not found'}</CardDescription>
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
          <div className="flex items-center py-6">
            <Link href={`/projects/${project.id}`} className="mr-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Edit Project</h1>
              <p className="text-muted-foreground">Update project information and settings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>Update your project details and status</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Project Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Project Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your project (optional)"
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    rows={4}
                  />
                </div>

                {/* Project Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isSubmitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="completed">Completed</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Change the project status to reflect its current state
                  </p>
                </div>

                {/* Client */}
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
                  <select
                    id="client_id"
                    name="client_id"
                    value={formData.client_id}
                    onChange={(e) => setFormData((prev) => ({...prev, client_id: e.target.value}))}
                    disabled={isSubmitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">No client (internal)</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Assign this project to a client, or leave as internal
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700"
                    disabled={isSubmitting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </Button>

                  <div className="flex items-center space-x-4">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" disabled={isSubmitting}>
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
              <Card className="w-96">
                <CardHeader>
                  <CardTitle className="text-red-600">Delete Project</CardTitle>
                  <CardDescription>
                    Are you sure you want to delete this project? This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-end space-x-3">
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
