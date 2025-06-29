'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { useAuthStore } from '@/lib/stores/auth';
import { useCompanyTicketsQuery } from '@/lib/hooks/useTickets';
import { CreateTicketModal } from '@/components/modals/create-ticket-modal';
import { 
	Plus, 
	Search,
	Filter,
	Loader2,
	FileText,
	User,
	Calendar,
	AlertCircle,
	CheckCircle2,
	FolderOpen
} from 'lucide-react';

export default function TicketsPage() {
	const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [priorityFilter, setPriorityFilter] = useState('all');
	
	const { user } = useAuthStore();

	// Use React Query for tickets data
	const {
		data: tickets = [],
		isLoading: ticketsLoading,
		error: ticketsError,
		isError: isTicketsError
	} = useCompanyTicketsQuery(user?.company_id);

	// Filter tickets based on search and filters
	const filteredTickets = (tickets || []).filter(ticket => {
		const matchesSearch = !searchTerm || 
			ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(ticket.description && ticket.description.toLowerCase().includes(searchTerm.toLowerCase()));
		
		const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
		const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
		
		return matchesSearch && matchesStatus && matchesPriority;
	});

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

	if (ticketsLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</div>
		);
	}

	if (isTicketsError || !user) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="flex items-center justify-center py-12">
					<Card className="w-96">
						<CardHeader>
							<CardTitle>Error</CardTitle>
							<CardDescription>
								{!user ? 'Please log in to view tickets.' : 'Failed to load tickets.'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/login">
								<Button>Go to Login</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">All Tickets</h1>
						<p className="text-gray-600 mt-1">
							Manage all tickets across your projects
						</p>
					</div>
					<Button onClick={() => setShowCreateTicketModal(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Create Ticket
					</Button>
				</div>

				{/* Filters */}
				<Card className="mb-6">
					<CardContent className="p-6">
						<div className="flex flex-col sm:flex-row gap-4">
							<div className="flex-1">
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
							<div className="flex gap-2">
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm"
								>
									<option value="all">All Status</option>
									<option value="new">New</option>
									<option value="in_progress">In Progress</option>
									<option value="review">Review</option>
									<option value="done">Done</option>
								</select>
								<select
									value={priorityFilter}
									onChange={(e) => setPriorityFilter(e.target.value)}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm"
								>
									<option value="all">All Priority</option>
									<option value="low">Low</option>
									<option value="medium">Medium</option>
									<option value="high">High</option>
									<option value="critical">Critical</option>
								</select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Tickets Grid */}
				{filteredTickets.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<FileText className="h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
							<p className="text-gray-500 text-center mb-4">
								{searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
									? 'Try adjusting your search or filters.'
									: 'Get started by creating your first ticket.'}
							</p>
							<Button onClick={() => setShowCreateTicketModal(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Create Ticket
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{filteredTickets.map((ticket) => (
							<Link
								key={ticket.id}
								href={`/projects/${ticket.project_id}/tickets/${ticket.id}`}
							>
								<Card className="hover:shadow-md transition-shadow cursor-pointer">
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex-1 min-w-0">
												<CardTitle className="text-lg font-medium text-gray-900 truncate">
													{ticket.title}
												</CardTitle>
												<div className="flex items-center mt-1 text-sm text-gray-500">
													<FolderOpen className="h-3 w-3 mr-1" />
													<span className="truncate">
														{(ticket.projects as any)?.name || 'Unknown Project'}
													</span>
												</div>
											</div>
											<div className="flex items-center ml-2">
												{getPriorityIcon(ticket.priority)}
											</div>
										</div>
									</CardHeader>
									<CardContent className="pt-0">
										{ticket.description && (
											<p className="text-sm text-gray-600 mb-3 line-clamp-2">
												{ticket.description}
											</p>
										)}
										
										<div className="flex flex-wrap gap-2 mb-3">
											<Badge className={getStatusColor(ticket.status)}>
												{ticket.status.replace('_', ' ')}
											</Badge>
											<Badge className={getPriorityColor(ticket.priority)}>
												{ticket.priority}
											</Badge>
										</div>

										<div className="flex items-center justify-between text-xs text-gray-500">
											<div className="flex items-center">
												<User className="h-3 w-3 mr-1" />
												<span>{(ticket.assignee as any)?.first_name || 'Unassigned'}</span>
											</div>
											<div className="flex items-center">
												<Calendar className="h-3 w-3 mr-1" />
												<span>{new Date(ticket.created_at).toLocaleDateString()}</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>

			{/* Create Ticket Modal */}
			<CreateTicketModal 
				isOpen={showCreateTicketModal}
				onClose={() => setShowCreateTicketModal(false)}
			/>
		</div>
	);
}
