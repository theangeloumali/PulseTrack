'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Loader2, Plus, Users, FolderOpen, Timer, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MyWeeklySummary from '@/components/dashboard/my-weekly-summary';

export default function DashboardPage() {
	const { user, isLoading, signOut, initialize } = useAuthStore();
	const [isInitialized, setIsInitialized] = useState(false);
	const router = useRouter();

	useEffect(() => {
		// Ensure auth store is initialized when dashboard loads
		const initAuth = async () => {
			await initialize();
			setIsInitialized(true);
		};
		initAuth();
	}, [initialize]);

	// Show loading while auth store is initializing
	if (!isInitialized || isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		);
	}

	const handleSignOut = async () => {
		await signOut();
	};

	return (
		<div className='min-h-screen bg-gray-50'>
			{/* Header */}
			<header className='bg-white shadow'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex justify-between items-center py-6'>
						<div>
							<h1 className='text-3xl font-bold text-gray-900'>Dashboard</h1>
							<p className='text-gray-600'>Welcome back, {user?.first_name || 'User'}!</p>
						</div>
						<div className='flex items-center space-x-4'>
							<Button variant='outline' onClick={handleSignOut}>
								Sign Out
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
				<div className='px-4 py-6 sm:px-0'>
					{/* Quick Stats */}
					<div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>Total Projects</CardTitle>
								<FolderOpen className='h-4 w-4 text-muted-foreground' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold'>0</div>
								<p className='text-xs text-muted-foreground'>No projects yet</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>Active Tickets</CardTitle>
								<AlertCircle className='h-4 w-4 text-muted-foreground' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold'>0</div>
								<p className='text-xs text-muted-foreground'>No tickets yet</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>Time Tracked Today</CardTitle>
								<Timer className='h-4 w-4 text-muted-foreground' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold'>0h 0m</div>
								<p className='text-xs text-muted-foreground'>No time tracked today</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>Team Members</CardTitle>
								<Users className='h-4 w-4 text-muted-foreground' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold'>1</div>
								<p className='text-xs text-muted-foreground'>Just you for now</p>
							</CardContent>
						</Card>
					</div>

					{/* My Weekly Summary */}
					<div className='mb-8'>
						<MyWeeklySummary />
					</div>

					{/* Quick Actions */}
					<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
						<Card>
							<CardHeader>
								<CardTitle>Quick Actions</CardTitle>
								<CardDescription>Get started with creating your first project</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<Link href='/projects/new'>
									<Button className='w-full justify-start'>
										<Plus className='mr-2 h-4 w-4' />
										Create New Project
									</Button>
								</Link>
								<Link href='/tickets/new'>
									<Button variant='outline' className='w-full justify-start' disabled>
										<Plus className='mr-2 h-4 w-4' />
										Create New Ticket
									</Button>
								</Link>
								<p className='text-xs text-muted-foreground'>Create a project first to add tickets</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Recent Activity</CardTitle>
								<CardDescription>Your latest project and ticket updates</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='text-center py-8 text-muted-foreground'>
									<AlertCircle className='mx-auto h-12 w-12 mb-4 opacity-50' />
									<p>No recent activity</p>
									<p className='text-sm'>Start by creating your first project</p>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Getting Started Section */}
					<Card className='mt-8'>
						<CardHeader>
							<CardTitle>Getting Started</CardTitle>
							<CardDescription>Follow these steps to set up your workspace</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								<div className='flex items-center space-x-3'>
									<div className='flex-shrink-0'>
										<div className='w-6 h-6 bg-green-100 rounded-full flex items-center justify-center'>
											<span className='text-green-600 text-sm font-medium'>✓</span>
										</div>
									</div>
									<div>
										<p className='font-medium'>Create your account</p>
										<p className='text-sm text-muted-foreground'>You've successfully created your account and company workspace</p>
									</div>
								</div>

								<div className='flex items-center space-x-3'>
									<div className='flex-shrink-0'>
										<div className='w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center'>
											<span className='text-blue-600 text-sm font-medium'>2</span>
										</div>
									</div>
									<div>
										<p className='font-medium'>Create your first project</p>
										<p className='text-sm text-muted-foreground'>Organize your work by creating projects</p>
									</div>
								</div>

								<div className='flex items-center space-x-3'>
									<div className='flex-shrink-0'>
										<div className='w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center'>
											<span className='text-gray-600 text-sm font-medium'>3</span>
										</div>
									</div>
									<div>
										<p className='font-medium'>Add your first ticket</p>
										<p className='text-sm text-muted-foreground'>Break down your project into manageable tasks</p>
									</div>
								</div>

								<div className='flex items-center space-x-3'>
									<div className='flex-shrink-0'>
										<div className='w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center'>
											<span className='text-gray-600 text-sm font-medium'>4</span>
										</div>
									</div>
									<div>
										<p className='font-medium'>Start tracking time</p>
										<p className='text-sm text-muted-foreground'>Monitor time spent on your tasks</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
