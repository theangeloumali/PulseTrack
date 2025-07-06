"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Modal } from "@/components/ui/modal";
import { useCreateProjectMutation } from "@/lib/hooks/useProjects";
import { useAuthStore } from "@/lib/stores/auth";
import { Loader2, Save } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "archived" | "completed",
  });
  const [error, setError] = useState("");

  const { user } = useAuthStore();
  const createProjectMutation = useCreateProjectMutation();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
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

    setError("");

    // Validation
    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        company_id: user.company_id,
        owner_id: user.id,
      };

      await createProjectMutation.mutateAsync(projectData);

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        status: "active",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    }
  };

  const handleClose = () => {
    if (!createProjectMutation.isPending) {
      setFormData({
        name: "",
        description: "",
        status: "active",
      });
      setError("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Project"
      description="Add a new project to organize your tickets and track progress."
    >
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
            disabled={createProjectMutation.isPending}
          />
        </div>

        {/* Project Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <RichTextEditor
            id="description"
            name="description"
            placeholder="Describe your project (optional). You can use **markdown** formatting!"
            value={formData.description}
            onChange={handleDescriptionChange}
            disabled={createProjectMutation.isPending}
            height={150}
            preview="edit"
          />
          <p className="text-xs text-muted-foreground">
            Supports markdown formatting: **bold**, *italic*, `code`,
            [links](url), lists, and more.
          </p>
        </div>

        {/* Project Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={(e) => handleSelectChange("status", e.target.value)}
            disabled={createProjectMutation.isPending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="completed">Completed</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Set the initial status for this project
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createProjectMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createProjectMutation.isPending || !formData.name.trim()}
          >
            {createProjectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
