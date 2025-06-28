'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { useBillingSettings, useUpdateBillingSettings, useBillingReport } from '@/lib/hooks/useBilling';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import type { BillingFrequency } from '@/lib/db/schema';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, format } from 'date-fns';

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD'];

const BillingPage = () => {
    const { user } = useAuthStore();
    const companyId = user?.company_id;

    const { data: settings, isLoading, isError } = useBillingSettings(companyId || '');
    const { mutate: updateSettings, isPending: isUpdating } = useUpdateBillingSettings(companyId || '');

    const [currency, setCurrency] = useState('');
    const [billingFrequency, setBillingFrequency] = useState<BillingFrequency | ''>('');
    const [invoicePrefix, setInvoicePrefix] = useState('');

    const [reportFilter, setReportFilter] = useState('weekly'); // New state for filter type
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [showReport, setShowReport] = useState(false);

    const { data: billingReport, isLoading: isReportLoading, isError: isReportError } = useBillingReport(
        companyId || '',
        reportStartDate,
        reportEndDate
    );

    useEffect(() => {
        if (settings) {
            setCurrency(settings.currency || '');
            setBillingFrequency(settings.billing_frequency || '');
            setInvoicePrefix(settings.invoice_prefix || '');
        }
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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

    if (isLoading) return <div>Loading...</div>;
    if (isError) return <div>Error loading billing settings.</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Billing Settings</h1>
            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
                <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency">
                            <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="billingFrequency">Billing Frequency</Label>
                    <Select value={billingFrequency} onValueChange={(value) => setBillingFrequency(value as BillingFrequency)}>
                        <SelectTrigger id="billingFrequency">
                            <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi_monthly">Bi-monthly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                    <Input
                        id="invoicePrefix"
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value)}
                    />
                </div>
                <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Save Settings'}
                </Button>
            </form>

            <h2 className="text-xl font-bold mb-4">Billing Reports</h2>
            <div className="flex space-x-4 mb-4">
                <div>
                    <Label htmlFor="reportFilter">Report Filter</Label>
                    <Select value={reportFilter} onValueChange={setReportFilter}>
                        <SelectTrigger id="reportFilter">
                            <SelectValue placeholder="Select filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi_monthly">Bi-monthly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                            <SelectItem value="overall">Overall</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {reportFilter === 'custom' && (
                    <>
                        <div>
                            <Label htmlFor="reportStartDate">Start Date</Label>
                            <Input
                                id="reportStartDate"
                                type="date"
                                value={reportStartDate}
                                onChange={(e) => setReportStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="reportEndDate">End Date</Label>
                            <Input
                                id="reportEndDate"
                                type="date"
                                value={reportEndDate}
                                onChange={(e) => setReportEndDate(e.target.value)}
                            />
                        </div>
                    </>
                )}
                <Button onClick={handleGenerateReport} disabled={isReportLoading}>
                    {isReportLoading ? 'Generating...' : 'Generate Report'}
                </Button>
            </div>

            {showReport && (isReportLoading ? (
                <div>Loading report...</div>
            ) : isReportError ? (
                <div>Error loading report.</div>
            ) : billingReport && Object.keys(billingReport).length > 0 ? (
                <div className="space-y-6">
                    {Object.entries(billingReport).map(([date, usersData]: [string, any]) => (
                        <div key={date} className="border p-6 rounded-lg shadow-sm bg-white">
                            <h3 className="font-bold text-xl mb-4 text-gray-800">Report for {date}</h3>
                            {Object.entries(usersData).map(([userId, userData]: [string, any]) => (
                                <div key={userId} className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                                    <h4 className="font-semibold text-lg mb-3 text-gray-700">
                                        {userData.userFirstName} {userData.userLastName} (Total: {userData.totalHours.toFixed(2)} hrs, {settings?.currency || '$'}{userData.totalAmount.toFixed(2)})
                                    </h4>
                                    {Object.entries(userData.projects).map(([projectId, projectData]: [string, any]) => (
                                        <div key={projectId} className="ml-4 mb-4 p-3 bg-white rounded-md border border-gray-100">
                                            <h5 className="font-medium text-md mb-2 text-gray-600">
                                                Project: {projectData.projectName} (Total: {projectData.totalHours.toFixed(2)} hrs, {settings?.currency || '$'}{projectData.totalAmount.toFixed(2)})
                                            </h5>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {projectData.tickets.map((ticket: any) => (
                                                    <li key={ticket.ticketId} className="text-sm">
                                                        Ticket: {ticket.ticketTitle} - {ticket.hours.toFixed(2)} hrs - {settings?.currency || '$'}{ticket.amount.toFixed(2)}
                                                        {ticket.description && <span className="text-gray-500"> ({ticket.description})</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                    <div className="border p-6 rounded-lg shadow-sm bg-white mt-6">
                        <h3 className="font-bold text-xl mb-4 text-gray-800">Weekly Summary</h3>
                        {Object.entries(calculateWeeklyTotal(billingReport)).map(([userId, weeklyData]: [string, any]) => (
                            <div key={userId} className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                                <h4 className="font-semibold text-lg text-gray-700">
                                    {weeklyData.userName} (Total: {weeklyData.totalHours.toFixed(2)} hrs, {settings?.currency || '$'}{weeklyData.totalAmount.toFixed(2)})
                                </h4>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div>No billing data available for the selected date range.</div>
            ))}
        </div>
    );
};

const calculateWeeklyTotal = (billingReport: any) => {
    const weeklyTotals: { [userId: string]: { userName: string, totalHours: number, totalAmount: number } } = {};

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