'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { useAuthStore } from '@/lib/stores/auth';
import { useTicketStore } from '@/lib/stores/ticket';
import { getProjectById, getTicketsByProject } from '@/lib/db/service';
import { Project, Ticket } from '@/lib/db/schema';
import { 
	ArrowLeft, 
	Plus, 
	Search,
	Filter,
	Loader2,
	FileText,
	User,
	Calendar,
	AlertCircle,
	CheckCircle2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
	params: {
		id: string; // project ID
	};
}

export default function ProjectTicketsPage({ params }: Props) {
	const [project, setProject] = useState<Project | null>(null);
	const [tickets, setTickets] = useState<Ticket[]>([]);
	const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [priorityFilter, setPriorityFilter] = useState('all');
	const [error, setError] = useState('');
	
	const { user } = useAuthStore();
	const router = useRouter();

	useEffect(() => {
		if (!user) {
			router.push('/login');
			return;
		}

		loadData();
	}, [user, params.id]);

	useEffect(() => {
		// Filter tickets based on search and filters
		let filtered = tickets;

		if (searchTerm) {
			filtered = filtered.filter(ticket => 
				ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(ticket.description && ticket.description.toLowerCase().includes(searchTerm.toLowerCase()))
			);
		}

		if (statusFilter !== 'all') {
			filtered = filtered.filter(ticket => ticket.status === statusFilter);
		}

		if (priorityFilter !== 'all') {
			filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
		}

		setFilteredTickets(filtered);
	}, [tickets, searchTerm, statusFilter, priorityFilter]);

	const loadData = async () => {
		try {
			setIsLoading(true);
			
			// Load project
			const projectData = await getProjectById(params.id);
			
			// Security check: ensure project belongs to user's company (PRD requirement)
			if (projectData.company_id !== user?.company_id) {
				setError('Project not found or access denied');
				return;
			}
			
			setProject(projectData);

			// Load tickets for this project
			const ticketsData = await getTicketsByProject(params.id);
			setTickets(ticketsData);
		} catch (err: any) {
			setError(err.message || 'Failed to load data');
		} finally {
			setIsLoading(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'new':
				return 'bg-gray-100 text-gray-800';
			case 'in_progress':
				return 'bg-blue-100 text-blue-800';
			case 'review':
				return 'bg-yellow-100 text-yellow-800';
			case 'done':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'low':
				return 'bg-green-100 text-green-800';
			case 'medium':
				return 'bg-yellow-100 text-yellow-800';
			case 'high':
				return 'bg-orange-100 text-orange-800';
			case 'critical':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getPriorityIcon = (priority: string) => {
		switch (priority) {
			case 'critical':
			case 'high':
				return <AlertCircle className="h-4 w-4" />;
			case 'medium':
				return <FileText className="h-4 w-4" />;
			case 'low':
				return <CheckCircle2 className="h-4 w-4" />;
			default:
				return <FileText className="h-4 w-4" />;
		}
	};

	if (!user || isLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="min-h-screen bg-gray-50">
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
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-6">
						<div className="flex items-center space-x-4">
							<Link href={`/projects/${project.id}`}>
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Project
								</Button>
							</Link>
							<div>
								<h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
								<p className="text-gray-600">Manage tickets for "{project.name}"</p>
							</div>
						</div>
						<Link href={`/projects/${project.id}/tickets/new`}>
							<Button>
								<Plus className="h-4 w-4 mr-2" />
								New Ticket
							</Button>
						</Link>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					{/* Search and Filters */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle>Filter Tickets</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{/* Search */}
								<div className="space-y-2">
									<label className="text-sm font-medium">Search</label>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
										<Input
											placeholder="Search tickets..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-10"
										/>
									</div>
								</div>

								{/* Status Filter */}
								<div className="space-y-2">
									<label className="text-sm font-medium">Status</label>
									<select
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value)}
										className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										<option value="all">All Statuses</option>
										<option value="new">New</option>
										<option value="in_progress">In Progress</option>
										<option value="review">Review</option>
										<option value="done">Done</option>
									</select>
								</div>

								{/* Priority Filter */}
								<div className="space-y-2">
									<label className="text-sm font-medium">Priority</label>
									<select
										value={priorityFilter}
										onChange={(e) => setPriorityFilter(e.target.value)}
										className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										<option value="all">All Priorities</option>
										<option value="low">Low</option>
										<option value="medium">Medium</option>
										<option value="high">High</option>
										<option value="critical">Critical</option>
									</select>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Tickets List */}
					<div className="space-y-4">
						{filteredTickets.length === 0 ? (
							<Card>
								<CardContent className="py-12">
									<div className="text-center text-gray-500">
										<FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
										{tickets.length === 0 ? (
											<>
												<p>No tickets yet</p>
												<p className="text-sm">Create your first ticket to get started</p>
											</>
										) : (
											<>
												<p>No tickets match your filters</p>
												<p className="text-sm">Try adjusting your search or filters</p>
											</>
										)}
									</div>
								</CardContent>
							</Card>
						) : (
							filteredTickets.map((ticket) => (
								<Card key={ticket.id} className="hover:shadow-md transition-shadow">
									<CardContent className="p-6">
										<div className="flex items-start justify-between">
											<div className="flex-1 space-y-2">
												<div className="flex items-center space-x-3">
													<div className="flex items-center space-x-2">
														{getPriorityIcon(ticket.priority)}
														<Link 
															href={`/projects/${project.id}/tickets/${ticket.id}`}
															className="text-lg font-semibold text-gray-900 hover:text-blue-600"
														>
															{ticket.title}
														</Link>
													</div>
													<div className="flex items-center space-x-2">
														<Badge className={`${getStatusColor(ticket.status)} border-0`}>
															{ticket.status.replace('_', ' ')}
														</Badge>
														<Badge className={`${getPriorityColor(ticket.priority)} border-0`}>
															{ticket.priority}
														</Badge>
													</div>
												</div>
												
												{ticket.description && (
													<p className="text-gray-600 text-sm line-clamp-2">
														{ticket.description}
													</p>
												)}

												<div className="flex items-center space-x-4 text-sm text-gray-500">
													<div className="flex items-center space-x-1">
														<Calendar className="h-4 w-4" />
														<span>Created {new Date(ticket.created_at).toLocaleDateString()}</span>
													</div>
													{ticket.assignee_id && (
														<div className="flex items-center space-x-1">
															<User className="h-4 w-4" />
															<span>Assigned</span>
														</div>
													)}
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							))
						)}
					</div>

					{/* Stats */}
					{tickets.length > 0 && (
						<Card className="mt-6">
							<CardHeader>
								<CardTitle>Statistics</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div className="text-center p-4 bg-gray-50 rounded-lg">
										<div className="text-2xl font-bold text-gray-900">{tickets.length}</div>
										<div className="text-sm text-gray-500">Total Tickets</div>
									</div>
									<div className="text-center p-4 bg-gray-50 rounded-lg">
										<div className="text-2xl font-bold text-green-600">
											{tickets.filter(t => t.status === 'done').length}
										</div>
										<div className="text-sm text-gray-500">Completed</div>
									</div>
									<div className="text-center p-4 bg-gray-50 rounded-lg">
										<div className="text-2xl font-bold text-blue-600">
											{tickets.filter(t => t.status === 'in_progress').length}
										</div>
										<div className="text-sm text-gray-500">In Progress</div>
									</div>
									<div className="text-center p-4 bg-gray-50 rounded-lg">
										<div className="text-2xl font-bold text-red-600">
											{tickets.filter(t => t.priority === 'critical' || t.priority === 'high').length}
										</div>
										<div className="text-sm text-gray-500">High Priority</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
