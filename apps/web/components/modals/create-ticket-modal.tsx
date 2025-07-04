'use client';

import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Textarea } from '@workspace/ui/components/textarea';
import { Modal } from '@/components/ui/modal';
import { useCreateTicketMutation } from '@/lib/hooks/useTickets';
import { useProjectsQuery } from '@/lib/hooks/useProjects';
import { useAuthStore } from '@/lib/stores/auth';
import { TicketPriority, TicketStatus } from '@/lib/db/schema';
import { Loader2, Save } from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export function CreateTicketModal({ 
  isOpen, 
  onClose, 
  defaultProjectId 
}: CreateTicketModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    status: 'new' as TicketStatus,
    project_id: defaultProjectId || '',
    assignee_id: '', // Empty means unassigned
  });
  const [error, setError] = useState('');
  
  const { user } = useAuthStore();
  const { data: projects = [] } = useProjectsQuery();
  const createTicketMutation = useCreateTicketMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
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
        estimated_hours: null,
        actual_hours: null,
        due_date: null,
      };

      await createTicketMutation.mutateAsync(ticketData);
      
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'new',
        project_id: defaultProjectId || '',
        assignee_id: '',
      });
      onClose();
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
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Ticket"
      description="Fill in the information for your new ticket"
      size="lg"
    >
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
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
          <Textarea
            id="description"
            name="description"
            placeholder="Describe the ticket in detail (optional)"
            value={formData.description}
            onChange={handleInputChange}
            disabled={createTicketMutation.isPending}
            rows={4}
          />
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* TODO: Add assignee selection - requires loading team members */}
        
        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={createTicketMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createTicketMutation.isPending || !formData.title.trim() || !formData.project_id}
          >
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
