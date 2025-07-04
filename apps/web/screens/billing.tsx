'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { useBillingSettings, useUpdateBillingSettings, useBillingReport, useBillingRates, useCreateBillingRate, useDeleteBillingRate } from '@/lib/hooks/useBilling';
import { useCompanyUsers } from '@/lib/hooks/useUsers';
import { useAllCompanyProjectsQuery } from '@/lib/hooks/useProjects';
import { formatISO } from 'date-fns';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import type { BillingFrequency, NewBillingRate } from '@/lib/db/schema';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { Clock, DollarSign, Calendar, Users, Settings } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { BillingFilters, getDefaultBillingFilters, saveBillingFiltersToStorage, loadBillingFiltersFromStorage } from '@/lib/utils';

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD'];

const BillingPage = () => {
	const { user } = useAuthStore();
	const companyId = user?.company_id;
	const isAdmin = user?.role === 'company_admin' || user?.role === 'system_admin' || user?.role === 'super_admin';

	// Helper function to format duration hours to HH:MM:SS
	const formatDuration = (hours: number | null) => {
		if (!hours) return '00:00:00'
		
		const totalSeconds = Math.round(hours * 3600) // Convert hours to seconds
		const wholeHours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		
		return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
	}

	const { data: settings, isLoading, isError } = useBillingSettings(companyId || '');
	const { mutate: updateSettings, isPending: isUpdating } = useUpdateBillingSettings(companyId || '');

	const [currency, setCurrency] = useState<string | undefined>(undefined);
	const [billingFrequency, setBillingFrequency] = useState<BillingFrequency | undefined>(undefined);
	const [invoicePrefix, setInvoicePrefix] = useState('');

	const [filters, setFilters] = useState<BillingFilters>(getDefaultBillingFilters());
	const [isInitialized, setIsInitialized] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const [activeTab, setActiveTab] = useState('timesheet');

	const { data: billingReport, isLoading: isReportLoading, isError: isReportError, error: reportError } = useBillingReport(companyId || '', filters.reportStartDate, filters.reportEndDate);

	const { data: billingRates, isLoading: isRatesLoading, isError: isRatesError } = useBillingRates(companyId || '');
	const { mutate: createRate, isPending: isCreatingRate } = useCreateBillingRate(companyId || '');
	const { mutate: deleteRate } = useDeleteBillingRate(companyId || '');

	const { data: users } = useCompanyUsers();
	const { data: projects } = useAllCompanyProjectsQuery();
	console.log('BillingPage rendered with companyId:',  billingReport);
	const filteredBillingReport = React.useMemo(() => {
		if (!billingReport) return null;
		if (isAdmin && filters.selectedUserId === 'all') {
			return billingReport;
		}
		const filteredReport: typeof billingReport = {};
		const targetUserId = isAdmin ? filters.selectedUserId : user?.id || '';
		
		for (const date in billingReport) {
			if (billingReport[date][targetUserId]) {
				filteredReport[date] = {
					[targetUserId]: billingReport[date][targetUserId],
				};
			}
		}
		return filteredReport;
	}, [billingReport, filters.selectedUserId, isAdmin, user?.id]);

	// Calculate dashboard statistics
	const dashboardStats = React.useMemo(() => {
		if (!filteredBillingReport) return { totalHours: 0, totalAmount: 0, totalUsers: 0, avgHourlyRate: 0 };
		
		let totalHours = 0;
		let totalAmount = 0;
		let userIds = new Set<string>();
		
		Object.values(filteredBillingReport).forEach((usersData: any) => {
			Object.entries(usersData).forEach(([userId, userData]: [string, any]) => {
				totalHours += userData.totalHours || 0;
				totalAmount += userData.totalAmount || 0;
				userIds.add(userId);
			});
		});
		
		const avgHourlyRate = totalHours > 0 ? totalAmount / totalHours : 0;
		
		return {
			totalHours,
			totalAmount,
			totalUsers: userIds.size,
			avgHourlyRate
		};
	}, [filteredBillingReport]);

	const [newRateType, setNewRateType] = useState<'company' | 'user' | 'project'>('company');
	const [newRateValue, setNewRateValue] = useState<string>('');
	const [newRateUserId, setNewRateUserId] = useState<string | undefined>(undefined);
	const [newRateProjectId, setNewRateProjectId] = useState<string | undefined>(undefined);
	const [newRateEffectiveFrom, setNewRateEffectiveFrom] = useState<string>(formatISO(new Date(), { representation: 'date' }));
	const [newRateEffectiveTo, setNewRateEffectiveTo] = useState<string | undefined>(undefined);

	const handleCreateRate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!companyId || !newRateValue || !newRateEffectiveFrom) return;

		if (!companyId || !newRateValue || !newRateEffectiveFrom || !user?.id) return;

		const rateData: NewBillingRate = {
			company_id: companyId,
			hourly_rate: parseFloat(newRateValue),
			effective_from: newRateEffectiveFrom,
			effective_to: newRateEffectiveTo || null,
			created_by: user.id,
		};

		if (newRateType === 'user' && newRateUserId) {
			rateData.user_id = newRateUserId;
		} else if (newRateType === 'project' && newRateProjectId) {
			rateData.project_id = newRateProjectId;
		}

		createRate(rateData, {
			onSuccess: () => {
				setNewRateValue('');
				setNewRateUserId(undefined);
				setNewRateProjectId(undefined);
				setNewRateEffectiveFrom(formatISO(new Date(), { representation: 'date' }));
				setNewRateEffectiveTo(undefined);
			},
			onError: (error) => {
				console.error('Failed to create billing rate:', error);
				alert('Failed to create billing rate.');
			},
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!currency) {
			// TODO: Add user-friendly validation
			alert('Currency is required.');
			return;
		}
		updateSettings({
			currency: currency,
			billing_frequency: billingFrequency || null,
			invoice_prefix: invoicePrefix,
		});
	};

	const handleGenerateReport = () => {
		const today = new Date();
		let start: Date;
		let end: Date;

		switch (filters.reportFilter) {
			case 'weekly':
				start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
				end = endOfWeek(today, { weekStartsOn: 1 });
				break;
			case 'bi_monthly':
				// This is a simplified bi-monthly, you might need more complex logic
				// For example, 1st-15th and 16th-end of month
				if (today.getDate() <= 15) {
					start = new Date(today.getFullYear(), today.getMonth(), 1);
					end = new Date(today.getFullYear(), today.getMonth(), 15);
				} else {
					start = new Date(today.getFullYear(), today.getMonth(), 16);
					end = endOfMonth(today);
				}
				break;
			case 'monthly':
				start = startOfMonth(today);
				end = endOfMonth(today);
				break;
			case 'yearly':
				start = startOfYear(today);
				end = endOfYear(today);
				break;
			case 'overall':
				start = new Date(2000, 0, 1); // A very old date to get all data
				end = today;
				break;
			default:
				// Validate custom dates, fallback to this week if invalid
				if (filters.reportStartDate && filters.reportEndDate) {
					const startDate = new Date(filters.reportStartDate);
					const endDate = new Date(filters.reportEndDate);
					if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
						start = startDate;
						end = endDate;
					} else {
						// Fallback to this week if dates are invalid
						start = startOfWeek(today, { weekStartsOn: 1 });
						end = endOfWeek(today, { weekStartsOn: 1 });
					}
				} else {
					// Fallback to this week if dates are empty
					start = startOfWeek(today, { weekStartsOn: 1 });
					end = endOfWeek(today, { weekStartsOn: 1 });
				}
				break;
		}

		try {
			setFilters(prev => ({
				...prev,
				reportStartDate: format(start, 'yyyy-MM-dd'),
				reportEndDate: format(end, 'yyyy-MM-dd')
			}));
			setShowReport(true);
		} catch (error) {
			console.error('Error formatting dates:', error);
			// Fallback to this week on error
			const fallbackStart = startOfWeek(today, { weekStartsOn: 1 });
			const fallbackEnd = endOfWeek(today, { weekStartsOn: 1 });
			setFilters(prev => ({
				...prev,
				reportStartDate: format(fallbackStart, 'yyyy-MM-dd'),
				reportEndDate: format(fallbackEnd, 'yyyy-MM-dd')
			}));
			setShowReport(true);
		}
	};

	// Load filters from localStorage on mount
	useEffect(() => {
		const storedFilters = loadBillingFiltersFromStorage();
		// Set default user selection based on role if not already set
		if (!storedFilters.selectedUserId || storedFilters.selectedUserId === 'all') {
			storedFilters.selectedUserId = isAdmin ? 'all' : user?.id || 'all';
		}
		setFilters(storedFilters);
		setIsInitialized(true);
	}, [isAdmin, user?.id]);

	// Save filters to localStorage when they change (after initialization)
	useEffect(() => {
		if (isInitialized) {
			saveBillingFiltersToStorage(filters);
		}
	}, [filters, isInitialized]);

	useEffect(() => {
		if (settings) {
			setTimeout(() => {
				setCurrency(settings.currency ?? undefined);
				setBillingFrequency(settings.billing_frequency ?? undefined);
				setInvoicePrefix(settings.invoice_prefix ?? '');
			}, 200);
		}
	}, [settings]);

	// Generate report on initial load and when filters change
	useEffect(() => {
		if (companyId && isInitialized) {
			handleGenerateReport();
		}
    }, [companyId, filters.reportFilter, isInitialized]); // Re-run when companyId or reportFilter changes
    
	if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
	if (isError) return <div className="min-h-screen bg-background flex items-center justify-center text-red-600 dark:text-red-400">Error loading billing settings.</div>;
console.log('filteredBillingReport:', filteredBillingReport);
	return (
		<div className='p-4 space-y-4 bg-background min-h-screen'>
			<div className='flex justify-between items-center'>
				<h1 className='text-3xl font-bold text-foreground'>
					{isAdmin ? 'Company Billing Dashboard' : 'My Timesheet'}
				</h1>
				<Badge variant="outline" className="text-sm">
					{format(new Date(), 'MMM dd, yyyy')}
				</Badge>
			</div>

			{/* Dashboard Stats Cards */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Hours</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold font-mono">{formatDuration(dashboardStats.totalHours)}</div>
						<p className="text-xs text-muted-foreground">
							{filters.reportFilter} period
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Amount</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{settings?.currency || '$'}{dashboardStats.totalAmount.toFixed(2)}
						</div>
						<p className="text-xs text-muted-foreground">
							{filters.reportFilter} period
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Average Rate</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{settings?.currency || '$'}{dashboardStats.avgHourlyRate.toFixed(2)}
						</div>
						<p className="text-xs text-muted-foreground">
							per hour
						</p>
					</CardContent>
				</Card>
				{isAdmin && (
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Active Users</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{dashboardStats.totalUsers}</div>
							<p className="text-xs text-muted-foreground">
								with time entries
							</p>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Navigation Tabs */}
			<div className="flex border-b border-border mb-6">
				<button 
					className={`px-4 py-2 font-medium ${activeTab === 'timesheet' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
					onClick={() => setActiveTab('timesheet')}
				>
					Timesheet
				</button>
				<button 
					className={`px-4 py-2 font-medium ml-4 ${activeTab === 'rates' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
					onClick={() => setActiveTab('rates')}
				>
					Billing Rates
				</button>
				{isAdmin && (
					<button 
						className={`px-4 py-2 font-medium ml-4 ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
						onClick={() => setActiveTab('settings')}
					>
						Settings
					</button>
				)}
			</div>

			{/* Timesheet Tab */}
			{activeTab === 'timesheet' && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<div className="flex justify-between items-center">
								<div>
									<CardTitle>Time Tracking Report</CardTitle>
									<CardDescription>
										View detailed time entries and billing information
									</CardDescription>
								</div>
								<div className="flex flex-col gap-4">
									{/* Date Range Filter Section */}
									<div className="bg-muted/50 p-4 rounded-lg border border-border">
										<h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
											<Calendar className="h-4 w-4" />
											Date Range Filter
										</h4>
										<div className="space-y-4">
											{/* Quick Period Selection */}
											<div className="flex gap-4 items-end flex-wrap">
												<div>
													<Label htmlFor='reportFilter'>Quick Periods</Label>
													<Select value={filters.reportFilter} onValueChange={(value) => setFilters(prev => ({ ...prev, reportFilter: value }))}>
														<SelectTrigger id='reportFilter' className="w-36">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value='weekly'>This Week</SelectItem>
															<SelectItem value='bi_monthly'>Bi-monthly</SelectItem>
															<SelectItem value='monthly'>This Month</SelectItem>
															<SelectItem value='yearly'>This Year</SelectItem>
															<SelectItem value='overall'>All Time</SelectItem>
															<SelectItem value='custom'>Custom Range</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div className="text-sm text-muted-foreground bg-card px-3 py-2 rounded border border-border">
													<div className="flex items-center gap-2">
														<span className="font-medium">Current Range:</span>
														<span>{filters.reportStartDate && filters.reportEndDate ? 
															`${format(new Date(filters.reportStartDate), 'MMM dd')} - ${format(new Date(filters.reportEndDate), 'MMM dd, yyyy')}` : 
															'Loading...'}</span>
													</div>
												</div>
											</div>
											
											{/* Combined Date Range Picker */}
											<div className="max-w-xs">
												<DateRangePicker
													startDate={filters.reportStartDate}
													endDate={filters.reportEndDate}
													onStartDateChange={(date) => {
														setFilters(prev => ({ ...prev, reportStartDate: date, reportFilter: 'custom' }));
													}}
													onEndDateChange={(date) => {
														setFilters(prev => ({ ...prev, reportEndDate: date, reportFilter: 'custom' }));
													}}
													onRangeChange={(startDate, endDate) => {
														setFilters(prev => ({ ...prev, reportStartDate: startDate, reportEndDate: endDate, reportFilter: 'custom' }));
														// Auto-refresh the report when range is applied
														setTimeout(() => {
															handleGenerateReport();
														}, 100);
													}}
												/>
											</div>
											{isAdmin && (
												<div>
													<Label htmlFor='userFilter'>User</Label>
													<Select value={filters.selectedUserId} onValueChange={(value) => setFilters(prev => ({ ...prev, selectedUserId: value }))}>
														<SelectTrigger id='userFilter' className="w-40">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value='all'>All Users</SelectItem>
															{users?.map((user) => (
																<SelectItem key={user.id} value={user.id}>
																	{user.first_name} {user.last_name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}
											<Button onClick={handleGenerateReport} disabled={isReportLoading}>
												{isReportLoading ? 'Loading...' : 'Refresh'}
											</Button>
										</div>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{isReportLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-center">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
										<p className="text-sm text-muted-foreground">Loading timesheet data...</p>
									</div>
								</div>
							) : isReportError ? (
								<div className="text-center py-8">
									<p className="text-sm text-red-600 dark:text-red-400">Error loading timesheet data.</p>
									{reportError && (
										<p className="text-xs text-muted-foreground mt-2">
											{(reportError as Error).message || 'Unknown error occurred'}
										</p>
									)}
									<Button 
										onClick={handleGenerateReport} 
										className="mt-4"
										variant="outline"
										size="sm"
									>
										Retry
									</Button>
								</div>
							) : filteredBillingReport && Object.keys(filteredBillingReport).length > 0 ? (
								<div className="space-y-6">
									{/* Timesheet Table */}
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-border">
											<thead className="bg-muted/50">
												<tr>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
													{isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>}
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Hours</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
												</tr>
											</thead>
											<tbody className="bg-card divide-y divide-border">
												{Object.entries(filteredBillingReport).map(([date, usersData]: [string, any]) =>
													Object.entries(usersData).map(([userId, userData]: [string, any]) =>
														Object.entries(userData.projects).map(([projectId, projectData]: [string, any]) =>
															projectData.tickets.map((ticket: any, ticketIndex: number) => (
																<tr key={`${date}-${userId}-${projectId}-${ticketIndex}`} className="hover:bg-muted/50">
																	<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
																		{format(new Date(date), 'MMM dd')}
																	</td>
																	{isAdmin && (
																		<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
																			{userData.userFirstName} {userData.userLastName}
																		</td>
																	)}
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
																		<div className="font-medium">{projectData.projectName}</div>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
																		<div className="font-medium">{ticket.ticketTitle}</div>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
																		<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono bg-muted text-foreground">
																			{formatDuration(ticket.hours)}
																		</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
																		{settings?.currency || '$'}{(ticket.amount / ticket.hours).toFixed(2)}/hr
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
																		{settings?.currency || '$'}{ticket.amount.toFixed(2)}
																	</td>
																	<td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
																		{ticket.description || '-'}
																	</td>
																</tr>
															))
														)
													)
												)}
											</tbody>
										</table>
									</div>

									{/* Summary Section */}
									<div className="border-t pt-6">
										<h4 className="text-lg font-semibold mb-4">Period Summary</h4>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											{Object.entries(calculateWeeklyTotal(filteredBillingReport)).map(([userId, weeklyData]: [string, any]) => (
												<Card key={userId}>
													<CardContent className="pt-6">
														<div className="text-center">
															<h5 className="font-medium">{weeklyData.userName}</h5>
															<div className="mt-2 space-y-1">
																<div className="text-2xl font-bold font-mono">{formatDuration(weeklyData.totalHours)}</div>
																<div className="text-lg font-semibold text-green-600 dark:text-green-400">
																	{settings?.currency || '$'}{weeklyData.totalAmount.toFixed(2)}
																</div>
															</div>
														</div>
													</CardContent>
												</Card>
											))}
										</div>
									</div>
								</div>
							) : (
								<div className="text-center py-8">
									<p className="text-sm text-muted-foreground">No time entries found for the selected period.</p>
									<p className="text-xs text-muted-foreground mt-1">Try selecting a different date range or period.</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{/* Billing Rates Tab */}
			{activeTab === 'rates' && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Manage Billing Rates</CardTitle>
							<CardDescription>
								Set hourly rates for users, projects, or company defaults
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleCreateRate} className='space-y-4 mb-8'>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<Label htmlFor='rateType'>Rate Type</Label>
										<Select value={newRateType} onValueChange={(value: 'company' | 'user' | 'project') => setNewRateType(value)}>
											<SelectTrigger id='rateType'>
												<SelectValue placeholder='Select rate type' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='company'>Company Default</SelectItem>
												<SelectItem value='user'>User Specific</SelectItem>
												<SelectItem value='project'>Project Specific</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor='hourlyRate'>Hourly Rate</Label>
										<Input id='hourlyRate' type='number' step='0.01' value={newRateValue} onChange={(e) => setNewRateValue(e.target.value)} required />
									</div>
								</div>

								{newRateType === 'user' && (
									<div>
										<Label htmlFor='userSelect'>Select User</Label>
										<Select value={newRateUserId} onValueChange={setNewRateUserId}>
											<SelectTrigger id='userSelect'>
												<SelectValue placeholder='Select a user' />
											</SelectTrigger>
											<SelectContent>
												{users?.map((user) => (
													<SelectItem key={user.id} value={user.id}>
														{user.first_name} {user.last_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{newRateType === 'project' && (
									<div>
										<Label htmlFor='projectSelect'>Select Project</Label>
										<Select value={newRateProjectId} onValueChange={setNewRateProjectId}>
											<SelectTrigger id='projectSelect'>
												<SelectValue placeholder='Select a project' />
											</SelectTrigger>
											<SelectContent>
												{projects?.map((project) => (
													<SelectItem key={project.id} value={project.id}>
														{project.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<Label htmlFor='effectiveFrom'>Effective From</Label>
										<Input id='effectiveFrom' type='date' value={newRateEffectiveFrom} onChange={(e) => setNewRateEffectiveFrom(e.target.value)} required />
									</div>
									<div>
										<Label htmlFor='effectiveTo'>Effective To (Optional)</Label>
										<Input id='effectiveTo' type='date' value={newRateEffectiveTo || ''} onChange={(e) => setNewRateEffectiveTo(e.target.value || undefined)} />
									</div>
								</div>

								<Button type='submit' disabled={isCreatingRate}>
									{isCreatingRate ? 'Adding...' : 'Add Billing Rate'}
								</Button>
							</form>

							<div className="space-y-4">
								<h3 className='text-lg font-semibold'>Existing Billing Rates</h3>
								{isRatesLoading ? (
									<div className="text-center py-4">Loading rates...</div>
								) : isRatesError ? (
									<div className="text-center py-4 text-red-600 dark:text-red-400">Error loading rates.</div>
								) : billingRates && billingRates.length > 0 ? (
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-border">
											<thead className="bg-muted/50">
												<tr>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Target</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Effective Period</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
												</tr>
											</thead>
											<tbody className="bg-card divide-y divide-border">
												{billingRates.map((rate) => (
													<tr key={rate.id} className="hover:bg-muted/50">
														<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
															<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
																{rate.project_id ? 'Project' : rate.user_id ? 'User' : 'Company'}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
															{rate.project_id && projects?.find((p) => p.id === rate.project_id)?.name}
															{rate.user_id && `${users?.find((u) => u.id === rate.user_id)?.first_name} ${users?.find((u) => u.id === rate.user_id)?.last_name}`}
															{!rate.project_id && !rate.user_id && 'Default Rate'}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
															{settings?.currency || '$'}{rate.hourly_rate}/hr
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
															{format(new Date(rate.effective_from), 'MMM dd, yyyy')}
															{rate.effective_to && ` - ${format(new Date(rate.effective_to), 'MMM dd, yyyy')}`}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
															<Button 
																variant="destructive" 
																size="sm" 
																onClick={() => {
																	if (window.confirm('Are you sure you want to delete this rate?')) {
																		deleteRate(rate.id);
																	}
																}}
															>
																Delete
															</Button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className="text-center py-8 text-muted-foreground">No billing rates configured.</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Settings Tab (Admin Only) */}
			{isAdmin && activeTab === 'settings' && (
				<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Settings className="h-5 w-5" />
									Company Billing Settings
								</CardTitle>
								<CardDescription>
									Configure billing preferences for your company
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmit} className='space-y-6'>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<Label htmlFor='currency'>Currency</Label>
											<Select value={currency} onValueChange={setCurrency}>
												<SelectTrigger id='currency'>
													<SelectValue placeholder='Select currency' />
												</SelectTrigger>
												<SelectContent>
													{currencies.map((c) => (
														<SelectItem key={c} value={c}>
															{c}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div>
											<Label htmlFor='billingFrequency'>Billing Frequency</Label>
											<Select value={billingFrequency} onValueChange={(value) => setBillingFrequency(value as BillingFrequency)}>
												<SelectTrigger id='billingFrequency'>
													<SelectValue placeholder='Select frequency' />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='weekly'>Weekly</SelectItem>
													<SelectItem value='bi_monthly'>Bi-monthly</SelectItem>
													<SelectItem value='monthly'>Monthly</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<div>
										<Label htmlFor='invoicePrefix'>Invoice Prefix</Label>
										<Input id='invoicePrefix' value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="e.g., INV-" />
									</div>
									<Button type='submit' disabled={isUpdating}>
										{isUpdating ? 'Saving...' : 'Save Settings'}
									</Button>
								</form>
							</CardContent>
						</Card>
					</div>
				)}
		</div>
	);
};

const calculateWeeklyTotal = (billingReport: any) => {
	if (!billingReport) return {};
	const weeklyTotals: { [userId: string]: { userName: string; totalHours: number; totalAmount: number } } = {};

	Object.values(billingReport).forEach((usersData: any) => {
		Object.entries(usersData).forEach(([userId, userData]: [string, any]) => {
			if (!weeklyTotals[userId]) {
				weeklyTotals[userId] = {
					userName: `${userData.userFirstName} ${userData.userLastName}`,
					totalHours: 0,
					totalAmount: 0,
				};
			}
			weeklyTotals[userId].totalHours += userData.totalHours;
			weeklyTotals[userId].totalAmount += userData.totalAmount;
		});
	});

	return weeklyTotals;
};

export default BillingPage;
