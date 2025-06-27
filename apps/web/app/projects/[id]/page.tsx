'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { useAuthStore } from '@/lib/stores/auth';
import { useProjectStore } from '@/lib/stores/project';
import { useProjectQuery } from '@/lib/hooks/useProjects';
import { CreateTicketModal } from '@/components/modals/create-ticket-modal';
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
	User
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
	params: Promise<{
		id: string;
	}>;
}

export default function ProjectDetailPage({ params }: Props) {
	const resolvedParams = use(params);
	const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
	
	const { user } = useAuthStore();
	const { setSelectedProject } = useProjectStore();
	const router = useRouter();
	const searchParams = useSearchParams();
	
	// Use React Query for project data
	const {
		data: project,
		isLoading,
		error,
		isError
	} = useProjectQuery(resolvedParams.id);

	// Handle URL parameter for opening ticket creation modal
	useEffect(() => {
		const openCreateTicket = searchParams.get('openCreateTicket');
		if (openCreateTicket === 'true') {
			setShowCreateTicketModal(true);
			// Clean up URL
			router.replace(`/projects/${resolvedParams.id}`, { scroll: false });
		}
	}, [searchParams, resolvedParams.id, router]);

	// Update Zustand store when project data changes
	useEffect(() => {
		if (project) {
			setSelectedProject(project);
		}
	}, [project, setSelectedProject]);

	// Security check: ensure project belongs to user's company (PRD requirement)
	useEffect(() => {
		if (project && user && project.company_id !== user.company_id) {
			router.push('/projects');
		}
	}, [project, user, router]);

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
			<div className="min-h-screen bg-gray-50">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</div>
		);
	}

	if (isError || !project) {
		return (
			<div className="min-h-screen bg-gray-50">
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
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
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
									<h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
									<Badge className={`${getStatusColor(project.status)} border-0`}>
										{project.status}
									</Badge>
								</div>
								{project.description && (
									<p className="text-gray-600 mt-1">{project.description}</p>
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
										<div className="text-center p-4 bg-gray-50 rounded-lg">
											<div className="text-2xl font-bold text-gray-900">0</div>
											<div className="text-sm text-gray-500">Total Tickets</div>
										</div>
										<div className="text-center p-4 bg-gray-50 rounded-lg">
											<div className="text-2xl font-bold text-green-600">0</div>
											<div className="text-sm text-gray-500">Completed</div>
										</div>
										<div className="text-center p-4 bg-gray-50 rounded-lg">
											<div className="text-2xl font-bold text-blue-600">0</div>
											<div className="text-sm text-gray-500">In Progress</div>
										</div>
										<div className="text-center p-4 bg-gray-50 rounded-lg">
											<div className="text-2xl font-bold text-orange-600">0h</div>
											<div className="text-sm text-gray-500">Time Tracked</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Recent Tickets */}
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>Recent Tickets</CardTitle>
										<Button 
											size="sm"
											onClick={() => setShowCreateTicketModal(true)}
										>
											<Plus className="h-4 w-4 mr-2" />
											New Ticket
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-center py-8 text-gray-500">
										<FolderOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
										<p>No tickets yet</p>
										<p className="text-sm">Create your first ticket to get started</p>
									</div>
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
										<dt className="text-sm font-medium text-gray-500">Status</dt>
										<dd className="mt-1">
											<Badge className={`${getStatusColor(project.status)} border-0`}>
												{project.status}
											</Badge>
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Created</dt>
										<dd className="mt-1 text-sm text-gray-900 flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											{new Date(project.created_at).toLocaleDateString()}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Last Updated</dt>
										<dd className="mt-1 text-sm text-gray-900 flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											{new Date(project.updated_at).toLocaleDateString()}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Owner</dt>
										<dd className="mt-1 text-sm text-gray-900 flex items-center">
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
									<Button 
										variant="outline" 
										className="w-full justify-start"
										disabled
									>
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
