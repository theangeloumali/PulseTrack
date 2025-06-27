'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { useProjectsWithTicketCountsQuery } from '@/lib/hooks/useProjects';
import { useAuthStore } from '@/lib/stores/auth';
import { CreateProjectModal } from '@/components/modals/create-project-modal';
import { ProjectMembersModal } from '@/components/modals/project-members-modal';
import { Plus, Search, Loader2, FolderOpen, Calendar, AlertCircle, User, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'completed'>('all');
	const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
	const [membersModalProject, setMembersModalProject] = useState<{ id: string; name: string } | null>(null);
	
	const { user } = useAuthStore();
	const router = useRouter();
	const searchParams = useSearchParams();
	
	// Use React Query for projects with ticket counts
	const {
		data: projects = [],
		isLoading,
		error,
		isError
	} = useProjectsWithTicketCountsQuery();

	// Handle URL parameter for opening project creation modal
	useEffect(() => {
		const openCreateProject = searchParams.get('openCreateProject');
		if (openCreateProject === 'true') {
			setShowCreateProjectModal(true);
			// Clean up URL
			router.replace('/projects', { scroll: false });
		}
	}, [searchParams, router]);

	// Filter projects based on search and status
	const filteredProjects = (projects || []).filter(project => {
		const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
		
		const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
		
		return matchesSearch && matchesStatus;
	});

	// Sort projects by recent activity (updated_at desc)
	const sortedProjects = filteredProjects.sort((a, b) => 
		new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800';
			case 'archived':
				return 'bg-yellow-100 text-yellow-800';
			case 'completed':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Card className="w-96">
					<CardHeader>
						<CardTitle className="flex items-center text-red-600">
							<AlertCircle className="h-5 w-5 mr-2" />
							Error
						</CardTitle>
						<CardDescription>{error?.message || 'Failed to load projects'}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button 
							className="w-full" 
							onClick={() => window.location.reload()}
						>
							Retry
						</Button>
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
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Projects</h1>
							<p className="text-gray-600">
								Manage your team's projects and track progress
							</p>
						</div>
						<Button 
							onClick={() => setShowCreateProjectModal(true)}
						>
							<Plus className="h-4 w-4 mr-2" />
							New Project
						</Button>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					{/* Search and Filter Controls */}
					<div className="mb-6 flex flex-col sm:flex-row gap-4">
						{/* Search */}
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
							<Input
								type="text"
								placeholder="Search projects by name or description..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10"
							/>
						</div>
						
						{/* Status Filter */}
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value as any)}
							className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="archived">Archived</option>
							<option value="completed">Completed</option>
						</select>
					</div>

					{/* Projects Grid */}
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin" />
						</div>
					) : sortedProjects.length === 0 ? (
						<div className="text-center py-12">
							<FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								{(projects || []).length === 0 ? 'No projects yet' : 'No projects match your search'}
							</h3>
							<p className="text-gray-500 mb-6">
								{(projects || []).length === 0 
									? 'Get started by creating your first project'
									: 'Try adjusting your search criteria'
								}
							</p>
							{(projects || []).length === 0 && (
								<Link href="/projects/new">
									<Button>
										<Plus className="h-4 w-4 mr-2" />
										Create Your First Project
									</Button>
								</Link>
							)}
						</div>
					) : (
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{sortedProjects.map((project) => (
								<Card key={project.id} className="hover:shadow-lg transition-shadow">
									<CardHeader>
										<div className="flex items-start justify-between">
											<Link href={`/projects/${project.id}`} className="flex-1">
												<CardTitle className="text-lg hover:text-blue-600 transition-colors">
													{project.name}
												</CardTitle>
											</Link>
											<Badge className={`${getStatusColor(project.status)} border-0 ml-2`}>
												{project.status}
											</Badge>
										</div>
										{project.description && (
											<Link href={`/projects/${project.id}`}>
												<CardDescription className="line-clamp-2 hover:text-gray-700 transition-colors">
													{project.description}
												</CardDescription>
											</Link>
										)}
									</CardHeader>
									<CardContent>
										<div className="flex items-center justify-between text-sm text-gray-500 mb-4">
											<div className="flex items-center">
												<Calendar className="h-4 w-4 mr-1" />
												{new Date(project.created_at).toLocaleDateString()}
											</div>
											<div className="flex items-center">
												<User className="h-4 w-4 mr-1" />
												{project.ticket_count || 0} tickets
											</div>
										</div>
										
										{/* Action buttons */}
										<div className="flex gap-2">
											<Link href={`/projects/${project.id}`} className="flex-1">
												<Button variant="outline" size="sm" className="w-full">
													View Project
												</Button>
											</Link>
											<Button 
												variant="outline" 
												size="sm"
												onClick={(e) => {
													e.preventDefault();
													setMembersModalProject({ id: project.id, name: project.name });
												}}
												className="flex items-center gap-1"
											>
												<Users className="h-4 w-4" />
												Members
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			</main>
			
			{/* Create Project Modal */}
			<CreateProjectModal 
				isOpen={showCreateProjectModal} 
				onClose={() => setShowCreateProjectModal(false)} 
			/>
			
			{/* Project Members Modal */}
			{membersModalProject && (
				<ProjectMembersModal
					isOpen={!!membersModalProject}
					onClose={() => setMembersModalProject(null)}
					projectId={membersModalProject.id}
					projectName={membersModalProject.name}
				/>
			)}
		</div>
	);
}
