'use client';

import { useState, useEffect } from 'react';
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
import { AutoRefresh } from '@/components/auto-refresh';
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
	List,
	X,
	ChevronDown,
	ChevronUp
} from 'lucide-react';
import { 
	TicketFilters, 
	getDefaultFilters, 
	loadFiltersFromStorage, 
	saveFiltersToStorage, 
	clearFiltersFromStorage, 
	isFiltersActive, 
	getActiveFiltersCount 
} from '@/lib/utils';

export default function TicketsPage() {
	const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
	const [filters, setFilters] = useState<TicketFilters>(getDefaultFilters());
	const [showMobileFilters, setShowMobileFilters] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	
	const { user } = useAuthStore();

	// Load filters from localStorage on mount (only once)
	useEffect(() => {
		const storedFilters = loadFiltersFromStorage();
		setFilters(storedFilters);
		setIsInitialized(true);
	}, []);

	// Save filters to localStorage only after initialization and when filters change
	useEffect(() => {
		if (isInitialized) {
			saveFiltersToStorage(filters);
		}
	}, [filters, isInitialized]);

	// Helper function to update filters
	const updateFilter = (key: keyof TicketFilters, value: any) => {
		setFilters(prev => ({ ...prev, [key]: value }));
	};

	// Reset all filters to defaults
	const resetFilters = () => {
		const defaultFilters = getDefaultFilters();
		setFilters(defaultFilters);
		clearFiltersFromStorage();
		setShowMobileFilters(false);
	};

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
		const matchesSearch = !filters.searchTerm || 
			ticket.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
			(ticket.description && ticket.description.toLowerCase().includes(filters.searchTerm.toLowerCase()));
		
		const matchesStatus = filters.statusFilter === 'all' || ticket.status === filters.statusFilter;
		const matchesPriority = filters.priorityFilter === 'all' || ticket.priority === filters.priorityFilter;
		
		const project = Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects;
		const company = Array.isArray(project?.companies) ? project?.companies[0] : project?.companies;
		
		const matchesProject = filters.projectFilter === 'all' || project?.id === filters.projectFilter;
		const matchesCompany = filters.companyFilter === 'all' || company?.id === filters.companyFilter;
		
		return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesCompany;
	});

	// Check if any filters are active
	const filtersActive = isFiltersActive(filters);
	const activeFiltersCount = getActiveFiltersCount(filters);


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
		<div className="h-full bg-gray-50">
			{/* Auto-refresh component for tickets data */}
			<AutoRefresh 
				queryKeys={user?.company_id && user?.id && user?.role ? [
					['tickets', 'company', user.company_id, user.id, user.role]
				] : []} 
			/>
			
			<div className="h-full px-4 py-4">
				{/* Header */}
				<div className="flex justify-between items-center mb-4">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">All Tickets</h1>
						<p className="text-gray-600 mt-1">
							Manage all tickets across your projects
						</p>
					</div>
					<div className="flex items-center gap-3">
						{/* Mobile Filters Toggle - Only visible on mobile */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowMobileFilters(!showMobileFilters)}
							className="sm:hidden h-8 px-3 relative"
						>
							<Filter className="h-4 w-4 mr-1" />
							Filters
							{activeFiltersCount > 0 && (
								<Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs bg-blue-600 text-white">
									{activeFiltersCount}
								</Badge>
							)}
							{showMobileFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
						</Button>

						{/* View Toggle */}
						<div className="flex bg-gray-100 rounded-lg p-1">
							<Button
								variant={filters.viewMode === 'board' ? 'default' : 'ghost'}
								size="sm"
								onClick={() => updateFilter('viewMode', 'board')}
								className="h-8 px-3"
							>
								<LayoutGrid className="h-4 w-4 mr-1" />
								<span className="hidden sm:inline">Board</span>
							</Button>
							<Button
								variant={filters.viewMode === 'list' ? 'default' : 'ghost'}
								size="sm"
								onClick={() => updateFilter('viewMode', 'list')}
								className="h-8 px-3"
							>
								<List className="h-4 w-4 mr-1" />
								<span className="hidden sm:inline">List</span>
							</Button>
						</div>
						<Button onClick={() => setShowCreateTicketModal(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create Ticket
						</Button>
					</div>
				</div>

				{/* Filters */}
				<Card className={`mb-4 transition-all duration-200 ${showMobileFilters || !showMobileFilters ? '' : 'sm:block'}`}>
					<CardContent className="p-4">
						{/* Desktop Filters - Always visible on desktop */}
						<div className="hidden sm:block">
							<div className="flex flex-col lg:flex-row gap-4">
								<div className="flex-1 flex gap-2">
									<div className="relative flex-1">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
										<Input
											placeholder="Search tickets..."
											value={filters.searchTerm}
											onChange={(e) => updateFilter('searchTerm', e.target.value)}
											className="pl-10"
										/>
									</div>
									{filtersActive && (
										<Button
											variant="outline"
											size="sm"
											onClick={resetFilters}
											className="h-10 px-3 text-gray-600 hover:text-gray-900 border-gray-300"
										>
											<X className="h-4 w-4 mr-1" />
											Reset
										</Button>
									)}
								</div>
								<div className="flex flex-wrap gap-2">
									<select
										value={filters.statusFilter}
										onChange={(e) => updateFilter('statusFilter', e.target.value)}
										className="px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[40px]"
									>
										<option value="all">All Status</option>
										<option value="new">New</option>
										<option value="in_progress">In Progress</option>
										<option value="review">Review</option>
										<option value="done">Done</option>
									</select>
									<select
										value={filters.priorityFilter}
										onChange={(e) => updateFilter('priorityFilter', e.target.value)}
										className="px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[40px]"
									>
										<option value="all">All Priority</option>
										<option value="low">Low</option>
										<option value="medium">Medium</option>
										<option value="high">High</option>
										<option value="critical">Critical</option>
									</select>
									<select
										value={filters.projectFilter}
										onChange={(e) => updateFilter('projectFilter', e.target.value)}
										className="px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[40px]"
									>
										<option value="all">All Projects</option>
										{availableProjects.map((project) => (
											<option key={project.id} value={project.id}>
												{project.name}
											</option>
										))}
									</select>
									<select
										value={filters.companyFilter}
										onChange={(e) => updateFilter('companyFilter', e.target.value)}
										className="px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[40px]"
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
						</div>

						{/* Mobile Filters - Collapsible */}
						<div className={`sm:hidden transition-all duration-200 overflow-hidden ${
							showMobileFilters ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
						}`}>
							<div className="space-y-4 pt-4 border-t border-gray-200">
								{/* Mobile Search */}
								<div className="relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
									<Input
										placeholder="Search tickets..."
										value={filters.searchTerm}
										onChange={(e) => updateFilter('searchTerm', e.target.value)}
										className="pl-10 h-12"
									/>
								</div>
								
								{/* Mobile Filter Selects */}
								<div className="grid grid-cols-1 gap-3">
									<select
										value={filters.statusFilter}
										onChange={(e) => updateFilter('statusFilter', e.target.value)}
										className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm min-h-[44px]"
									>
										<option value="all">All Status</option>
										<option value="new">New</option>
										<option value="in_progress">In Progress</option>
										<option value="review">Review</option>
										<option value="done">Done</option>
									</select>
									<select
										value={filters.priorityFilter}
										onChange={(e) => updateFilter('priorityFilter', e.target.value)}
										className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm min-h-[44px]"
									>
										<option value="all">All Priority</option>
										<option value="low">Low</option>
										<option value="medium">Medium</option>
										<option value="high">High</option>
										<option value="critical">Critical</option>
									</select>
									<select
										value={filters.projectFilter}
										onChange={(e) => updateFilter('projectFilter', e.target.value)}
										className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm min-h-[44px]"
									>
										<option value="all">All Projects</option>
										{availableProjects.map((project) => (
											<option key={project.id} value={project.id}>
												{project.name}
											</option>
										))}
									</select>
									<select
										value={filters.companyFilter}
										onChange={(e) => updateFilter('companyFilter', e.target.value)}
										className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm min-h-[44px]"
									>
										<option value="all">All Companies</option>
										{availableCompanies.map((company) => (
											<option key={company.id} value={company.id}>
												{company.name}
											</option>
										))}
									</select>
								</div>

								{/* Mobile Reset Button */}
								{filtersActive && (
									<Button
										variant="outline"
										size="sm"
										onClick={resetFilters}
										className="w-full h-12 text-gray-600 hover:text-gray-900 border-gray-300"
									>
										<X className="h-4 w-4 mr-2" />
										Reset All Filters
									</Button>
								)}
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
								{filtersActive
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
						{filters.viewMode === 'board' ? (
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