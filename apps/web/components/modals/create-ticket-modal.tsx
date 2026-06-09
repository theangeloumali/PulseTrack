'use client';

import {useState} from 'react';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {RichTextEditor} from '@/components/ui/rich-text-editor';
import {Modal} from '@/components/ui/modal';
import {useCreateTicketMutation} from '@/lib/hooks/useTickets';
import {useProjectsQuery} from '@/lib/hooks/useProjects';
import {useAssignableUsers} from '@/lib/hooks/useUsers';
import {useAuthStore} from '@/lib/stores/auth';
import {TicketPriority, TicketStatus} from '@/lib/db/schema';
import {Loader2, Save, User, Calendar, Clock} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export function CreateTicketModal({isOpen, onClose, defaultProjectId}: CreateTicketModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    status: 'new' as TicketStatus,
    project_id: defaultProjectId || '',
    assignee_id: '', // Empty means unassigned
    estimated_hours: '',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [createMore, setCreateMore] = useState(false);

  const {user} = useAuthStore();
  const {data: projects = []} = useProjectsQuery();
  const {data: assignableUsers = []} = useAssignableUsers();
  const createTicketMutation = useCreateTicketMutation();
  const {toast} = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setError('');

    // Validation according to PRD: tickets require title and project
    if (!formData.title.trim()) {
      setError('Ticket title is required');
      return;
    }

    if (!formData.project_id) {
      setError('Please select a project');
      return;
    }

    try {
      const ticketData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        project_id: formData.project_id,
        assignee_id: formData.assignee_id || null,
        reporter_id: user.id, // Current user is the reporter (PRD requirement)
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        actual_hours: null,
        due_date: formData.due_date || null,
      };

      const newTicket = await createTicketMutation.mutateAsync(ticketData);

      // Show success toast
      toast({
        title: 'Ticket created successfully!',
        description: `"${newTicket.title}" has been created.`,
      });

      // If "Create more" is checked, only reset form fields but keep project and assignee
      if (createMore) {
        setFormData((prev) => ({
          ...prev,
          title: '',
          description: '',
          priority: 'medium',
          status: 'new',
          estimated_hours: '',
          due_date: '',
          // Keep project_id and assignee_id as they were
        }));
      } else {
        // If "Create more" is not checked, reset everything and close modal
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          status: 'new',
          project_id: defaultProjectId || '',
          assignee_id: '',
          estimated_hours: '',
          due_date: '',
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    }
  };

  const handleClose = () => {
    if (!createTicketMutation.isPending) {
      setError('');
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'new',
        project_id: defaultProjectId || '',
        assignee_id: '',
        estimated_hours: '',
        due_date: '',
      });
      setCreateMore(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Ticket"
      description="Fill in the information for your new ticket"
      size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Project Selection */}
        <div className="space-y-2">
          <Label htmlFor="project_id">
            Project <span className="text-red-500">*</span>
          </Label>
          <select
            id="project_id"
            name="project_id"
            value={formData.project_id}
            onChange={(e) => handleSelectChange('project_id', e.target.value)}
            required
            disabled={createTicketMutation.isPending || !!defaultProjectId}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ticket Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            type="text"
            placeholder="Enter ticket title"
            value={formData.title}
            onChange={handleInputChange}
            required
            disabled={createTicketMutation.isPending}
          />
        </div>

        {/* Ticket Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <RichTextEditor
            id="description"
            name="description"
            placeholder="Describe the ticket in detail (optional). You can use **markdown** formatting!"
            value={formData.description}
            onChange={handleDescriptionChange}
            disabled={createTicketMutation.isPending}
            height={150}
            preview="edit"
          />
          <p className="text-xs text-muted-foreground">
            Supports markdown formatting: **bold**, *italic*, `code`, [links](url), lists, and more.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={(e) => handleSelectChange('priority', e.target.value)}
              disabled={createTicketMutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={(e) => handleSelectChange('status', e.target.value)}
              disabled={createTicketMutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* Assignee Selection */}
        <div className="space-y-2">
          <Label htmlFor="assignee_id">Assignee</Label>
          <select
            id="assignee_id"
            name="assignee_id"
            value={formData.assignee_id}
            onChange={(e) => handleSelectChange('assignee_id', e.target.value)}
            disabled={createTicketMutation.isPending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="">Unassigned</option>
            {assignableUsers.map((assignUser) => (
              <option key={assignUser.id} value={assignUser.id}>
                {assignUser.first_name && assignUser.last_name
                  ? `${assignUser.first_name} ${assignUser.last_name}`
                  : assignUser.email}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* Estimated Hours */}
          <div className="space-y-2">
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              name="estimated_hours"
              type="number"
              step="0.5"
              min="0"
              placeholder="0"
              value={formData.estimated_hours}
              onChange={handleInputChange}
              disabled={createTicketMutation.isPending}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              value={formData.due_date}
              onChange={handleInputChange}
              disabled={createTicketMutation.isPending}
            />
          </div>
        </div>

        {/* Create More Option */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="create_more"
            checked={createMore}
            onChange={(e) => setCreateMore(e.target.checked)}
            disabled={createTicketMutation.isPending}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor="create_more" className="text-sm text-muted-foreground">
            Create more
          </Label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createTicketMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              createTicketMutation.isPending || !formData.title.trim() || !formData.project_id
            }>
            {createTicketMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Ticket
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
