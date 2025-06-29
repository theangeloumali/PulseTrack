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
import { TicketBoard } from '@/components/tickets/ticket-board';
import { TicketList } from '@/components/tickets/ticket-list';
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
	FolderOpen,
	LayoutGrid,
	List
} from 'lucide-react';

export default function TicketsPage() {
	const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [priorityFilter, setPriorityFilter] = useState('all');
	const [projectFilter, setProjectFilter] = useState('all');
	const [companyFilter, setCompanyFilter] = useState('all');
	const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
	
	const { user } = useAuthStore();

	// Use React Query for tickets data
	const {
		data: tickets = [],
		isLoading: ticketsLoading,
		error: ticketsError,
		isError: isTicketsError
	} = useCompanyTicketsQuery(user?.company_id);

	// Extract unique projects and companies for filter options
	const availableProjects = Array.from(
		new Map((tickets || []).map(ticket => {
			const project = Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects;
			return [
				project?.id,
				{ id: project?.id, name: project?.name }
			];
		})).values()
	).filter((p): p is { id: string; name: string } => p.id && p.name);

	const availableCompanies = Array.from(
		new Map((tickets || []).map(ticket => {
			const project = Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects;
			const company = Array.isArray(project?.companies) ? project?.companies[0] : project?.companies;
			return [
				company?.id,
				{ id: company?.id, name: company?.name }
			];
		})).values()
	).filter((c): c is { id: string; name: string } => c.id && c.name);

	// Filter tickets based on search and filters
	const filteredTickets = (tickets || []).filter(ticket => {
		const matchesSearch = !searchTerm || 
			ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(ticket.description && ticket.description.toLowerCase().includes(searchTerm.toLowerCase()));
		
		const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
		const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
		
		const project = Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects;
		const company = Array.isArray(project?.companies) ? project?.companies[0] : project?.companies;
		
		const matchesProject = projectFilter === 'all' || project?.id === projectFilter;
		const matchesCompany = companyFilter === 'all' || company?.id === companyFilter;
		
		return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesCompany;
	});


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
					<div className="flex items-center gap-3">
						{/* View Toggle */}
						<div className="flex bg-gray-100 rounded-lg p-1">
							<Button
								variant={viewMode === 'board' ? 'default' : 'ghost'}
								size="sm"
								onClick={() => setViewMode('board')}
								className="h-8 px-3"
							>
								<LayoutGrid className="h-4 w-4 mr-1" />
								Board
							</Button>
							<Button
								variant={viewMode === 'list' ? 'default' : 'ghost'}
								size="sm"
								onClick={() => setViewMode('list')}
								className="h-8 px-3"
							>
								<List className="h-4 w-4 mr-1" />
								List
							</Button>
						</div>
						<Button onClick={() => setShowCreateTicketModal(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create Ticket
						</Button>
					</div>
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
							<div className="flex flex-wrap gap-2">
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
								<select
									value={projectFilter}
									onChange={(e) => setProjectFilter(e.target.value)}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm"
								>
									<option value="all">All Projects</option>
									{availableProjects.map((project) => (
										<option key={project.id} value={project.id}>
											{project.name}
										</option>
									))}
								</select>
								<select
									value={companyFilter}
									onChange={(e) => setCompanyFilter(e.target.value)}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm"
								>
									<option value="all">All Companies</option>
									{availableCompanies.map((company) => (
										<option key={company.id} value={company.id}>
											{company.name}
										</option>
									))}
								</select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Tickets Display */}
				{filteredTickets.length === 0 && !ticketsLoading ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<FileText className="h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
							<p className="text-gray-500 text-center mb-4">
								{searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all' || companyFilter !== 'all'
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
					<>
						{viewMode === 'board' ? (
							<TicketBoard tickets={filteredTickets} isLoading={ticketsLoading} />
						) : (
							<TicketList tickets={filteredTickets} isLoading={ticketsLoading} />
						)}
					</>
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
