'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@workspace/ui/components/button';
import { useAuthStore } from '@/lib/stores/auth';
import { CreateTicketModal } from '@/components/modals/create-ticket-modal';
import { CreateProjectModal } from '@/components/modals/create-project-modal';
import { LayoutDashboard, FolderOpen, Ticket, Clock, Settings, LogOut, Menu, X, Plus, Search, Bug, Users, CreditCard, Shield, Building2 } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { ThemeToggle } from './theme-toggle';

interface SidebarLayoutProps {
	children: React.ReactNode;
}

const navigation = [
	{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
	{ name: 'Projects', href: '/projects', icon: FolderOpen, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
	{ name: 'Tickets', href: '/tickets', icon: Ticket, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
	{ name: 'Time Tracking', href: '/time-tracking', icon: Clock, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
	{ name: 'Company', href: '/company/users', icon: Users, roles: ['super_admin', 'system_admin', 'company_admin', 'manager'] },
	{ name: 'Billing', href: '/billing', icon: CreditCard, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
	{ name: 'All Companies', href: '/admin/companies', icon: Building2, roles: ['super_admin'] },
	{ name: 'User Management', href: '/admin/users', icon: Shield, roles: ['super_admin'] },
	{ name: 'Diagnostics', href: '/diagnostics', icon: Bug, roles: ['super_admin', 'system_admin', 'company_admin', 'manager'] },
	{ name: 'Settings', href: '/settings', icon: Settings, roles: ['super_admin', 'system_admin', 'company_admin', 'manager'] },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
	const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { user, signOut } = useAuthStore();

	const handleLogout = async () => {
		await signOut();
		router.push('/login');
	};

	// Don't show sidebar on auth pages
	const authPages = ['/login', '/signup', '/forgot-password', '/verify-email', '/reset-password', '/auth/accept-invitation'];
	const isAuthPage = authPages.some((page) => pathname.startsWith(page));

	if (!user || isAuthPage) {
		return <>{children}</>;
	}

	return (
		<div className='flex h-screen bg-background'>
			{/* Mobile sidebar backdrop */}
			{sidebarOpen && <div className='fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden' onClick={() => setSidebarOpen(false)} />}

			{/* Sidebar */}
			<div className={cn('fixed inset-y-0 left-0 z-50 w-56 bg-sidebar shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
				<div className='flex flex-col h-full'>
					{/* Logo/Header */}
					<div className='flex items-center justify-between h-14 px-4 border-b border-sidebar-border'>
						<Link href='/dashboard' className='flex items-center space-x-2'>
							<div className='w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center'>
								<Ticket className='h-5 w-5 text-sidebar-primary-foreground' />
							</div>
							<span className='text-xl font-bold text-sidebar-foreground'>PulseTrack</span>
						</Link>
						<Button variant='ghost' size='sm' className='lg:hidden' onClick={() => setSidebarOpen(false)}>
							<X className='h-5 w-5' />
						</Button>
					</div>

					{/* Quick Actions */}
					<div className='px-4 py-3 border-b border-sidebar-border'>
						<div className='space-y-2'>
							<Button size='sm' className='w-full justify-start' onClick={() => setShowCreateProjectModal(true)}>
								<Plus className='h-4 w-4 mr-2' />
								New Project
							</Button>
							<Button size='sm' variant='outline' className='w-full justify-start' onClick={() => setShowCreateTicketModal(true)}>
								<Plus className='h-4 w-4 mr-2' />
								New Ticket
							</Button>
							<Button variant='outline' size='sm' className='w-full justify-start'>
								<Search className='h-4 w-4 mr-2' />
								Search
							</Button>
						</div>
					</div>

					{/* Navigation */}
					<nav className='flex-1 px-3 py-3 space-y-1 overflow-y-auto'>
						{navigation
							.filter((item) => item.roles.includes(user.role as string))
							.map((item) => {
								const isActive =
									pathname === item.href || (item.href === '/company/users' && pathname.startsWith('/company')) || (item.href === '/admin/users' && pathname === '/admin/users') || (item.href === '/admin/companies' && pathname === '/admin/companies');
								return (
									<Link
										key={item.name}
										href={item.href}
										className={cn('flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-primary border-r-2 border-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}
										onClick={() => setSidebarOpen(false)}
									>
										<item.icon className={cn('mr-3 h-5 w-5', isActive ? 'text-sidebar-primary' : 'text-muted-foreground')} />
										{item.name}
									</Link>
								);
							})}
					</nav>

					{/* User Profile & Logout */}
					<div className='px-3 py-3 border-t border-sidebar-border'>
						<div className='flex items-center space-x-3 px-3 py-2'>
							<div className='w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center'>
								<span className='text-sm font-medium text-sidebar-accent-foreground'>{user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}</span>
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-medium text-sidebar-foreground truncate'>
									{user.first_name || 'User'} {user.last_name || ''}
								</p>
								<p className='text-xs text-muted-foreground truncate'>{user.email}</p>
								<div className='flex items-center mt-1'>
									<span
										className={cn(
											'text-xs px-2 py-0.5 rounded-full font-medium',
											user.role === 'super_admin'
												? 'bg-purple-100 text-purple-800'
												: user.role === 'system_admin'
													? 'bg-red-100 text-red-800'
													: user.role === 'company_admin'
														? 'bg-blue-100 text-blue-800'
														: user.role === 'manager'
															? 'bg-green-100 text-green-800'
															: 'bg-gray-100 text-gray-800'
										)}
									>
										{user.role === 'super_admin' ? 'Super Admin' : user.role === 'system_admin' ? 'System Admin' : user.role === 'company_admin' ? 'Company Admin' : user.role === 'manager' ? 'Manager' : 'User'}
									</span>
								</div>
							</div>
						</div>
						
						{/* Theme Toggle */}
						<div className='mt-2'>
							<ThemeToggle />
						</div>
						
						<Button variant='ghost' size='sm' className='w-full justify-start mt-2 text-destructive hover:text-destructive hover:bg-destructive-foreground/10' onClick={handleLogout}>
							<LogOut className='h-4 w-4 mr-2' />
							Logout
						</Button>
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className='flex-1 flex flex-col overflow-hidden'>
				{/* Top bar for mobile */}
				<div className='lg:hidden bg-background border-b border-border px-4 py-2'>
					<Button variant='ghost' size='sm' onClick={() => setSidebarOpen(true)}>
						<Menu className='h-5 w-5' />
					</Button>
				</div>

				{/* Page content */}
				<main className='flex-1 overflow-auto'>{children}</main>
			</div>

			{/* Modals */}
			<CreateTicketModal isOpen={showCreateTicketModal} onClose={() => setShowCreateTicketModal(false)} />
			<CreateProjectModal isOpen={showCreateProjectModal} onClose={() => setShowCreateProjectModal(false)} />
		</div>
	);
}
