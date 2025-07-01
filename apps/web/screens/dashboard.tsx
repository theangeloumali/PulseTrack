'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Plus, Users, FolderOpen, Timer, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import MyWeeklySummary from '@/components/dashboard/my-weekly-summary';
import { ActivityFeed } from '@/components/activity/activity-feed';

export default function DashboardPage() {
	const { user, signOut } = useAuthStore();

	const handleSignOut = async () => {
		await signOut();
	};

	return (
		<div className='h-full bg-background'>
			{/* Header */}
			<header className='bg-card shadow-sm border-b border-border'>
				<div className='px-4'>
					<div className='flex justify-between items-center py-4'>
						<div>
							<h1 className='text-3xl font-bold text-foreground'>Dashboard</h1>
							<p className='text-muted-foreground'>Welcome back, {user?.first_name || 'User'}!</p>
						</div>
						<div className='flex items-center space-x-4'>
							<Button variant='outline' onClick={handleSignOut}>
								Sign Out
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className='px-4 py-4'>
				{/* Quick Stats */}
				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
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
				<div className='mb-6'>
					<MyWeeklySummary />
				</div>

				{/* Quick Actions */}
				<div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
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

						<div className='lg:col-span-1'>
							<ActivityFeed 
								limit={10} 
								title="Recent Activity"
								showFilters={false}
							/>
						</div>
					</div>

				{/* Getting Started Section */}
				<Card className='mt-6'>
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
										<p className='text-sm text-muted-foreground'>You&apos;ve successfully created your account and company workspace</p>
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
			</main>
		</div>
	);
}
