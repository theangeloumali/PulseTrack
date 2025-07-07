"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import {
  Plus,
  Zap,
  Check,
  AlertCircle,
  Target,
  Clock,
  User,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useProjectsQuery } from "@/lib/hooks/useProjects";

interface QuickTicketCreatorProps {
  userId: string;
  companyId: string;
}

interface QuickTicketData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  projectId: string;
}

// Mock function - replace with actual API call
const createQuickTicket = async (
  data: QuickTicketData & { userId: string; companyId: string },
) => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate occasional failures for demo
  if (Math.random() > 0.8) {
    throw new Error("Failed to create ticket");
  }

  return {
    id: Date.now().toString(),
    ...data,
    status: "new",
    created_at: new Date().toISOString(),
  };
};

export function QuickTicketCreator({
  userId,
  companyId,
}: QuickTicketCreatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<QuickTicketData>({
    title: "",
    description: "",
    priority: "medium",
    projectId: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's projects
  const { data: projects, isLoading: projectsLoading } = useProjectsQuery();

  const createTicketMutation = useMutation({
    mutationFn: (data: QuickTicketData) =>
      createQuickTicket({ ...data, userId, companyId }),
    onSuccess: (newTicket) => {
      toast({
        title: "Task created successfully!",
        description: `"${newTicket.title}" has been added to your project.`,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        projectId: "",
      });
      setIsExpanded(false);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create task",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your task.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.projectId) {
      toast({
        title: "Project required",
        description: "Please select a project for this task.",
        variant: "destructive",
      });
      return;
    }

    createTicketMutation.mutate(formData);
  };

  const handleQuickCreate = (template: {
    title: string;
    priority: "low" | "medium" | "high";
  }) => {
    if (!projects?.length) {
      toast({
        title: "No projects available",
        description: "Create a project first to add tasks.",
        variant: "destructive",
      });
      return;
    }

    setFormData({
      title: template.title,
      description: "",
      priority: template.priority,
      projectId: projects[0].id, // Use first project as default
    });
    setIsExpanded(true);
  };

  const priorityIcons = {
    low: <Clock className="h-3 w-3" />,
    medium: <Target className="h-3 w-3" />,
    high: <AlertCircle className="h-3 w-3" />,
  };

  const priorityColors = {
    low: "secondary",
    medium: "outline",
    high: "destructive",
  } as const;

  // Quick action templates
  const quickTemplates = [
    { title: "Fix bug", priority: "high" as const },
    { title: "Code review", priority: "medium" as const },
    { title: "Update documentation", priority: "low" as const },
    { title: "Research task", priority: "medium" as const },
  ];

  if (projectsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Task Creator</CardTitle>
          <CardDescription>
            Create tasks without leaving the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded mb-3"></div>
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projects?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Task Creator</CardTitle>
          <CardDescription>
            Create tasks without leaving the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FolderOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              You need at least one project to create tasks
            </p>
            <Button asChild size="sm">
              <a href="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Task Creator
        </CardTitle>
        <CardDescription>
          Create tasks without leaving the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isExpanded ? (
          <>
            {/* Quick Input */}
            <div className="space-y-3">
              <Input
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && formData.title.trim()) {
                    setIsExpanded(true);
                  }
                }}
              />

              {formData.title.trim() && (
                <Button
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Details & Create
                </Button>
              )}
            </div>

            {/* Quick Templates */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Quick templates:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickTemplates.map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickCreate(template)}
                    className="text-xs h-8 justify-start"
                  >
                    <div className="flex items-center gap-1">
                      {priorityIcons[template.priority]}
                      <span className="truncate">{template.title}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Expanded Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title</label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter task title..."
                autoFocus
              />
            </div>

            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select
                value={formData.projectId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, projectId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((priority) => (
                  <Button
                    key={priority}
                    type="button"
                    variant={
                      formData.priority === priority ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, priority }))
                    }
                    className="flex-1"
                  >
                    <div className="flex items-center gap-1">
                      {priorityIcons[priority]}
                      <span className="capitalize">{priority}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add any additional details..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={createTicketMutation.isPending}
                className="flex-1"
              >
                {createTicketMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpanded(false)}
                disabled={createTicketMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
