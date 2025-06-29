'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { useBillingSettings, useUpdateBillingSettings, useBillingReport, useBillingRates, useCreateBillingRate, useDeleteBillingRate } from '@/lib/hooks/useBilling';
import { useCompanyUsers } from '@/lib/hooks/useUsers';
import { useProjectsQuery } from '@/lib/hooks/useProjects';
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

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD'];

const BillingPage = () => {
	const { user } = useAuthStore();
	const companyId = user?.company_id;
	const isAdmin = user?.role === 'company_admin' || user?.role === 'system_admin' || user?.role === 'super_admin';

	const { data: settings, isLoading, isError } = useBillingSettings(companyId || '');
	const { mutate: updateSettings, isPending: isUpdating } = useUpdateBillingSettings(companyId || '');

	const [currency, setCurrency] = useState<string | undefined>(undefined);
	const [billingFrequency, setBillingFrequency] = useState<BillingFrequency | undefined>(undefined);
	const [invoicePrefix, setInvoicePrefix] = useState('');

	const [reportFilter, setReportFilter] = useState('weekly');
	const [reportStartDate, setReportStartDate] = useState('');
	const [reportEndDate, setReportEndDate] = useState('');
	const [showReport, setShowReport] = useState(false);
	const [activeTab, setActiveTab] = useState('timesheet');
	// Set default user selection based on role
	const [selectedUserId, setSelectedUserId] = useState(isAdmin ? 'all' : user?.id || '');

	const { data: billingReport, isLoading: isReportLoading, isError: isReportError } = useBillingReport(companyId || '', reportStartDate, reportEndDate);

	const { data: billingRates, isLoading: isRatesLoading, isError: isRatesError } = useBillingRates(companyId || '');
	const { mutate: createRate, isPending: isCreatingRate } = useCreateBillingRate(companyId || '');
	const { mutate: deleteRate } = useDeleteBillingRate(companyId || '');

	const { data: users } = useCompanyUsers();
	const { data: projects } = useProjectsQuery();

	const filteredBillingReport = React.useMemo(() => {
		if (!billingReport) return null;
		if (isAdmin && selectedUserId === 'all') {
			return billingReport;
		}
		const filteredReport: typeof billingReport = {};
		const targetUserId = isAdmin ? selectedUserId : user?.id || '';
		
		for (const date in billingReport) {
			if (billingReport[date][targetUserId]) {
				filteredReport[date] = {
					[targetUserId]: billingReport[date][targetUserId],
				};
			}
		}
		return filteredReport;
	}, [billingReport, selectedUserId, isAdmin, user?.id]);

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

		switch (reportFilter) {
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
				start = new Date(reportStartDate);
				end = new Date(reportEndDate);
				break;
		}

		setReportStartDate(format(start, 'yyyy-MM-dd'));
		setReportEndDate(format(end, 'yyyy-MM-dd'));
		setShowReport(true);
	};

	useEffect(() => {
		if (settings) {
			setTimeout(() => {
				setCurrency(settings.currency ?? undefined);
				setBillingFrequency(settings.billing_frequency ?? undefined);
				setInvoicePrefix(settings.invoice_prefix ?? '');
			}, 200);
		}
	}, [settings]);

	// Generate report on initial load and when reportFilter changes
	useEffect(() => {
		if (companyId) {
			handleGenerateReport();
		}
    }, [companyId, reportFilter]); // Re-run when companyId or reportFilter changes
    
	if (isLoading) return <div>Loading...</div>;
	if (isError) return <div>Error loading billing settings.</div>;

	return (
		<div className='p-6 space-y-6'>
			<div className='flex justify-between items-center'>
				<h1 className='text-3xl font-bold text-gray-900'>
					{isAdmin ? 'Company Billing Dashboard' : 'My Timesheet'}
				</h1>
				<Badge variant="outline" className="text-sm">
					{format(new Date(), 'MMM dd, yyyy')}
				</Badge>
			</div>

			{/* Dashboard Stats Cards */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Hours</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{dashboardStats.totalHours.toFixed(1)}</div>
						<p className="text-xs text-muted-foreground">
							{reportFilter} period
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
							{reportFilter} period
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
			<div className="flex border-b border-gray-200 mb-6">
				<button 
					className={`px-4 py-2 font-medium ${activeTab === 'timesheet' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
					onClick={() => setActiveTab('timesheet')}
				>
					Timesheet
				</button>
				<button 
					className={`px-4 py-2 font-medium ml-4 ${activeTab === 'rates' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
					onClick={() => setActiveTab('rates')}
				>
					Billing Rates
				</button>
				{isAdmin && (
					<button 
						className={`px-4 py-2 font-medium ml-4 ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
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
								<div className="flex gap-4 items-end">
									<div>
										<Label htmlFor='reportFilter'>Period</Label>
										<Select value={reportFilter} onValueChange={setReportFilter}>
											<SelectTrigger id='reportFilter' className="w-32">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='weekly'>Weekly</SelectItem>
												<SelectItem value='bi_monthly'>Bi-monthly</SelectItem>
												<SelectItem value='monthly'>Monthly</SelectItem>
												<SelectItem value='yearly'>Yearly</SelectItem>
												<SelectItem value='overall'>Overall</SelectItem>
												<SelectItem value='custom'>Custom</SelectItem>
											</SelectContent>
										</Select>
									</div>
									{reportFilter === 'custom' && (
										<>
											<div>
												<Label htmlFor='reportStartDate'>Start Date</Label>
												<Input id='reportStartDate' type='date' value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
											</div>
											<div>
												<Label htmlFor='reportEndDate'>End Date</Label>
												<Input id='reportEndDate' type='date' value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
											</div>
										</>
									)}
									{isAdmin && (
										<div>
											<Label htmlFor='userFilter'>User</Label>
											<Select value={selectedUserId} onValueChange={setSelectedUserId}>
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
						</CardHeader>
						<CardContent>
							{isReportLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-center">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
										<p className="text-sm text-gray-600">Loading timesheet data...</p>
									</div>
								</div>
							) : isReportError ? (
								<div className="text-center py-8">
									<p className="text-sm text-red-600">Error loading timesheet data.</p>
								</div>
							) : filteredBillingReport && Object.keys(filteredBillingReport).length > 0 ? (
								<div className="space-y-6">
									{/* Timesheet Table */}
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
													{isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>}
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{Object.entries(filteredBillingReport).map(([date, usersData]: [string, any]) =>
													Object.entries(usersData).map(([userId, userData]: [string, any]) =>
														Object.entries(userData.projects).map(([projectId, projectData]: [string, any]) =>
															projectData.tickets.map((ticket: any, ticketIndex: number) => (
																<tr key={`${date}-${userId}-${projectId}-${ticketIndex}`} className="hover:bg-gray-50">
																	<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
																		{format(new Date(date), 'MMM dd')}
																	</td>
																	{isAdmin && (
																		<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
																			{userData.userFirstName} {userData.userLastName}
																		</td>
																	)}
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
																		<div className="font-medium">{projectData.projectName}</div>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
																		<div className="font-medium">{ticket.ticketTitle}</div>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
																		<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
																			{ticket.hours.toFixed(1)}h
																		</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
																		{settings?.currency || '$'}{(ticket.amount / ticket.hours).toFixed(2)}/hr
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
																		{settings?.currency || '$'}{ticket.amount.toFixed(2)}
																	</td>
																	<td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
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
																<div className="text-2xl font-bold">{weeklyData.totalHours.toFixed(1)}h</div>
																<div className="text-lg font-semibold text-green-600">
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
									<p className="text-sm text-gray-600">No time entries found for the selected period.</p>
									<p className="text-xs text-gray-500 mt-1">Try selecting a different date range or period.</p>
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
									<div className="text-center py-4 text-red-600">Error loading rates.</div>
								) : billingRates && billingRates.length > 0 ? (
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Period</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{billingRates.map((rate) => (
													<tr key={rate.id} className="hover:bg-gray-50">
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
																{rate.project_id ? 'Project' : rate.user_id ? 'User' : 'Company'}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															{rate.project_id && projects?.find((p) => p.id === rate.project_id)?.name}
															{rate.user_id && `${users?.find((u) => u.id === rate.user_id)?.first_name} ${users?.find((u) => u.id === rate.user_id)?.last_name}`}
															{!rate.project_id && !rate.user_id && 'Default Rate'}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
															{settings?.currency || '$'}{rate.hourly_rate}/hr
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															{format(new Date(rate.effective_from), 'MMM dd, yyyy')}
															{rate.effective_to && ` - ${format(new Date(rate.effective_to), 'MMM dd, yyyy')}`}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
									<div className="text-center py-8 text-gray-600">No billing rates configured.</div>
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
