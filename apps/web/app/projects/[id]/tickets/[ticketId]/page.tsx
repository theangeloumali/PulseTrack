'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { MarkdownViewer } from '@/components/ui/markdown-viewer';
import { Badge } from '@workspace/ui/components/badge';
import { useAuthStore } from '@/lib/stores/auth';
import { useTicketStore } from '@/lib/stores/ticket';
import { useTicketQuery, useDeleteTicketMutation } from '@/lib/hooks/useTickets';
import { TimeTracker } from '@/components/time-tracker';
import { TimeEntriesList } from '@/components/time-entries-list';
import { TicketAssignment } from '@/components/ticket-assignment';
import { Ticket } from '@/lib/db/schema';
import { 
	ArrowLeft, 
	Edit, 
	Calendar, 
	User,
	FileText,
	Clock,
	AlertCircle,
	CheckCircle2,
	PlayCircle,
	Loader2,
	Trash2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
	params: Promise<{
		id: string; // project ID
		ticketId: string; // ticket ID
	}>;
}

export default function TicketDetailPage({ params }: Props) {
	const [projectId, setProjectId] = useState<string>('');
	const [ticketId, setTicketId] = useState<string>('');
	
	const { user } = useAuthStore();
	const { setSelectedTicketId } = useTicketStore();
	const router = useRouter();
	
	// Use React Query for ticket data
	const { data: ticket, isLoading, error } = useTicketQuery(ticketId);
	const deleteTicketMutation = useDeleteTicketMutation();

	// Resolve params on mount
	useEffect(() => {
		const resolveParams = async () => {
			const resolvedParams = await params;
			setProjectId(resolvedParams.id);
			setTicketId(resolvedParams.ticketId);
		};
		resolveParams();
	}, [params]);

	// Set selected ticket ID when ticket data is available
	useEffect(() => {
		if (ticket) {
			setSelectedTicketId(ticket.id);
		}
	}, [ticket, setSelectedTicketId]);
	
	// Handle ticket deletion
	const handleDeleteTicket = async () => {
		if (!ticket) return;
		
		const confirmed = confirm(`Are you sure you want to delete the ticket "${ticket.title}"? This action cannot be undone.`);
		if (!confirmed) return;
		
		try {
			await deleteTicketMutation.mutateAsync(ticket.id);
			router.push(`/projects/${projectId}/tickets`);
		} catch (error) {
			alert('Failed to delete ticket. Please try again.');
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
				return <AlertCircle className="h-5 w-5" />;
			case 'medium':
				return <FileText className="h-5 w-5" />;
			case 'low':
				return <CheckCircle2 className="h-5 w-5" />;
			default:
				return <FileText className="h-5 w-5" />;
		}
	};

	if (!user || isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</div>
		);
	}

	if (error || !ticket) {
		return (
			<div className="min-h-screen bg-background">
				<div className="flex items-center justify-center py-12">
					<Card className="w-96">
						<CardHeader>
							<CardTitle>Error</CardTitle>
							<CardDescription>{error?.message || 'Ticket not found'}</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href={`/projects/${projectId}`}>
								<Button className="w-full">Back to Project</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="bg-card border-b shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-6">
						<div className="flex items-center space-x-4">
							<Link href={`/projects/${projectId}/tickets`}>
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Tickets
								</Button>
							</Link>
							<div>
								<div className="flex items-center space-x-3">
									<div className="flex items-center space-x-2">
										{getPriorityIcon(ticket.priority)}
										<h1 className="text-3xl font-bold text-foreground">{ticket.title}</h1>
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
								<p className="text-muted-foreground mt-1">
									Project: {ticket.projects?.name || 'Unknown Project'}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<TimeTracker ticket={ticket} compact />
							<Link href={`/projects/${projectId}/tickets/${ticket.id}/edit`}>
								<Button variant="outline" size="sm">
									<Edit className="h-4 w-4 mr-2" />
									Edit
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Main Content */}
						<div className="lg:col-span-2 space-y-6">
							{/* Description */}
							<Card>
								<CardHeader>
									<CardTitle>Description</CardTitle>
								</CardHeader>
								<CardContent>
									<MarkdownViewer 
										content={ticket.description || ''} 
										mode="full" 
										className="max-w-none" 
									/>
								</CardContent>
							</Card>

							{/* Time Tracking */}
							<TimeTracker ticket={ticket} />
							
							{/* Time Entries List */}
							<TimeEntriesList ticketId={ticket.id} />

							{/* Comments */}
							<Card>
								<CardHeader>
									<CardTitle>Comments</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-center py-8 text-muted-foreground">
										<FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
										<p>No comments yet</p>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Assignment */}
							<TicketAssignment ticket={ticket} />
							
							{/* Ticket Details */}
							<Card>
								<CardHeader>
									<CardTitle>Details</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<dt className="text-sm font-medium text-muted-foreground">Status</dt>
										<dd className="mt-1">
											<Badge className={`${getStatusColor(ticket.status)} border-0`}>
												{ticket.status.replace('_', ' ')}
											</Badge>
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-muted-foreground">Priority</dt>
										<dd className="mt-1">
											<Badge className={`${getPriorityColor(ticket.priority)} border-0`}>
												{ticket.priority}
											</Badge>
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-muted-foreground">Assignee</dt>
										<dd className="mt-1 text-sm text-foreground flex items-center">
											<User className="h-4 w-4 mr-2" />
											{ticket.assignee ? (
												<span>{ticket.assignee.first_name} {ticket.assignee.last_name}</span>
											) : (
												<span className="text-muted-foreground">Unassigned</span>
											)}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-muted-foreground">Reporter</dt>
										<dd className="mt-1 text-sm text-foreground flex items-center">
											<User className="h-4 w-4 mr-2" />
											{ticket.reporter ? (
												<span>{ticket.reporter.first_name} {ticket.reporter.last_name}</span>
											) : (
												<span>Unknown</span>
											)}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-muted-foreground">Created</dt>
										<dd className="mt-1 text-sm text-foreground flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											{new Date(ticket.created_at).toLocaleDateString()}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
										<dd className="mt-1 text-sm text-foreground flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											{new Date(ticket.updated_at).toLocaleDateString()}
										</dd>
									</div>
									{ticket.estimated_hours && (
										<div>
											<dt className="text-sm font-medium text-muted-foreground">Estimated Hours</dt>
											<dd className="mt-1 text-sm text-foreground flex items-center">
												<Clock className="h-4 w-4 mr-2" />
												{ticket.estimated_hours}h
											</dd>
										</div>
									)}
									{ticket.due_date && (
										<div>
											<dt className="text-sm font-medium text-muted-foreground">Due Date</dt>
											<dd className="mt-1 text-sm text-foreground flex items-center">
												<Calendar className="h-4 w-4 mr-2" />
												{new Date(ticket.due_date).toLocaleDateString()}
											</dd>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Quick Actions */}
							<Card>
								<CardHeader>
									<CardTitle>Actions</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<Link href={`/projects/${projectId}/tickets/${ticket.id}/edit`}>
										<Button variant="outline" className="w-full justify-start">
											<Edit className="h-4 w-4 mr-2" />
											Edit Ticket
										</Button>
									</Link>
									<Button 
										variant="outline" 
										className="w-full justify-start"
									>
										<PlayCircle className="h-4 w-4 mr-2" />
										Start Timer
									</Button>
									<Button 
										variant="outline" 
										className="w-full justify-start"
										disabled
									>
										<FileText className="h-4 w-4 mr-2" />
										Add Comment
									</Button>
									<Button 
										variant="destructive" 
										className="w-full justify-start"
										onClick={handleDeleteTicket}
										disabled={deleteTicketMutation.isPending}
									>
										<Trash2 className="h-4 w-4 mr-2" />
										{deleteTicketMutation.isPending ? 'Deleting...' : 'Delete Ticket'}
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
