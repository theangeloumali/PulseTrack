'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { useAuthStore } from '@/lib/stores/auth';
import { useTicketStore } from '@/lib/stores/ticket';
import { getTicketById } from '@/lib/db/service';
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
	Loader2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
	params: {
		id: string; // project ID
		ticketId: string; // ticket ID
	};
}

export default function TicketDetailPage({ params }: Props) {
	const [ticket, setTicket] = useState<Ticket | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	
	const { user } = useAuthStore();
	const { setSelectedTicket } = useTicketStore();
	const router = useRouter();

	useEffect(() => {
		if (!user) {
			router.push('/login');
			return;
		}

		loadTicket();
	}, [user, params.ticketId]);

	const loadTicket = async () => {
		try {
			setIsLoading(true);
			const ticketData = await getTicketById(params.ticketId);
			
			// Security check: ensure ticket's project belongs to user's company (PRD requirement)
			if (ticketData.projects?.company_id !== user?.company_id) {
				setError('Ticket not found or access denied');
				return;
			}
			
			setTicket(ticketData);
			setSelectedTicket(ticketData);
		} catch (err: any) {
			setError(err.message || 'Failed to load ticket');
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
			<div className="min-h-screen bg-gray-50">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</div>
		);
	}

	if (error || !ticket) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="flex items-center justify-center py-12">
					<Card className="w-96">
						<CardHeader>
							<CardTitle>Error</CardTitle>
							<CardDescription>{error || 'Ticket not found'}</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href={`/projects/${params.id}`}>
								<Button className="w-full">Back to Project</Button>
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
							<Link href={`/projects/${params.id}/tickets`}>
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Tickets
								</Button>
							</Link>
							<div>
								<div className="flex items-center space-x-3">
									<div className="flex items-center space-x-2">
										{getPriorityIcon(ticket.priority)}
										<h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
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
								<p className="text-gray-600 mt-1">
									Project: {ticket.projects?.name || 'Unknown Project'}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<Link href={`/projects/${params.id}/tickets/${ticket.id}/edit`}>
								<Button variant="outline" size="sm">
									<Edit className="h-4 w-4 mr-2" />
									Edit
								</Button>
							</Link>
							<Button size="sm">
								<PlayCircle className="h-4 w-4 mr-2" />
								Start Timer
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
							{/* Description */}
							<Card>
								<CardHeader>
									<CardTitle>Description</CardTitle>
								</CardHeader>
								<CardContent>
									{ticket.description ? (
										<div className="prose max-w-none">
											<p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
										</div>
									) : (
										<p className="text-gray-500 italic">No description provided</p>
									)}
								</CardContent>
							</Card>

							{/* Time Tracking */}
							<Card>
								<CardHeader>
									<CardTitle>Time Tracking</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
											<div>
												<p className="font-medium">Current Timer</p>
												<p className="text-sm text-gray-600">No active timer</p>
											</div>
											<Button size="sm">
												<PlayCircle className="h-4 w-4 mr-2" />
												Start Timer
											</Button>
										</div>
										
										<div className="border-t pt-4">
											<h4 className="font-medium mb-3">Time Entries</h4>
											<div className="text-center py-8 text-gray-500">
												<Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
												<p>No time entries yet</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Comments */}
							<Card>
								<CardHeader>
									<CardTitle>Comments</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-center py-8 text-gray-500">
										<FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
										<p>No comments yet</p>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Ticket Details */}
							<Card>
								<CardHeader>
									<CardTitle>Details</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<dt className="text-sm font-medium text-gray-500">Status</dt>
										<dd className="mt-1">
											<Badge className={`${getStatusColor(ticket.status)} border-0`}>
												{ticket.status.replace('_', ' ')}
											</Badge>
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Priority</dt>
										<dd className="mt-1">
											<Badge className={`${getPriorityColor(ticket.priority)} border-0`}>
												{ticket.priority}
											</Badge>
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Assignee</dt>
										<dd className="mt-1 text-sm text-gray-900 flex items-center">
											<User className="h-4 w-4 mr-2" />
											{ticket.assignee ? (
												<span>{ticket.assignee.first_name} {ticket.assignee.last_name}</span>
											) : (
												<span className="text-gray-500">Unassigned</span>
											)}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Reporter</dt>
										<dd className="mt-1 text-sm text-gray-900 flex items-center">
											<User className="h-4 w-4 mr-2" />
											{ticket.reporter ? (
												<span>{ticket.reporter.first_name} {ticket.reporter.last_name}</span>
											) : (
												<span>Unknown</span>
											)}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Created</dt>
										<dd className="mt-1 text-sm text-gray-900 flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											{new Date(ticket.created_at).toLocaleDateString()}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-gray-500">Last Updated</dt>
										<dd className="mt-1 text-sm text-gray-900 flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											{new Date(ticket.updated_at).toLocaleDateString()}
										</dd>
									</div>
									{ticket.estimated_hours && (
										<div>
											<dt className="text-sm font-medium text-gray-500">Estimated Hours</dt>
											<dd className="mt-1 text-sm text-gray-900 flex items-center">
												<Clock className="h-4 w-4 mr-2" />
												{ticket.estimated_hours}h
											</dd>
										</div>
									)}
									{ticket.due_date && (
										<div>
											<dt className="text-sm font-medium text-gray-500">Due Date</dt>
											<dd className="mt-1 text-sm text-gray-900 flex items-center">
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
									<Link href={`/projects/${params.id}/tickets/${ticket.id}/edit`}>
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
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
