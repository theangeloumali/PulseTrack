import { supabase } from '@/lib/db';
import type { NewBillingPeriod, NewBillingRate, NewCompanyBillingSettings, NewTimeEntryBilling } from '@/lib/db/schema';
import { getTimeEntriesForBilling } from './service';
import { format } from 'date-fns';

// Billing Period operations
export async function getBillingPeriodById(id: string) {
    const { data, error } = await supabase
        .from('billing_periods')
        .select('*')
        .eq('id', id)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function getBillingPeriodsByCompany(companyId: string) {
    const { data, error } = await supabase
        .from('billing_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createBillingPeriod(data: NewBillingPeriod) {
    const { data: result, error } = await supabase
        .from('billing_periods')
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function updateBillingPeriod(id: string, updates: Partial<NewBillingPeriod>) {
    const { data, error } = await supabase
        .from('billing_periods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// Billing Rate operations
export async function getBillingRateById(id: string) {
    const { data, error } = await supabase
        .from('billing_rates')
        .select('*')
        .eq('id', id)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function getBillingRatesByCompany(companyId: string) {
    const { data, error } = await supabase
        .from('billing_rates')
        .select('*')
        .eq('company_id', companyId)
        .order('effective_from', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createBillingRate(data: NewBillingRate) {
    const { data: result, error } = await supabase
        .from('billing_rates')
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function updateBillingRate(id: string, updates: Partial<NewBillingRate>) {
    const { data, error } = await supabase
        .from('billing_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// Company Billing Settings operations
export async function getCompanyBillingSettings(companyId: string) {
    const { data, error } = await supabase
        .from('company_billing_settings')
        .select('*, currency')
        .eq('company_id', companyId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function createCompanyBillingSettings(data: NewCompanyBillingSettings) {
    const { data: result, error } = await supabase
        .from('company_billing_settings')
        .insert({
            company_id: data.company_id,
            currency: data.currency,
            billing_frequency: data.billing_frequency,
            invoice_prefix: data.invoice_prefix,
        })
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function updateCompanyBillingSettings(companyId: string, updates: Partial<NewCompanyBillingSettings>) {
    const { data, error } = await supabase
        .from('company_billing_settings')
        .update({
            currency: updates.currency,
            billing_frequency: updates.billing_frequency,
            invoice_prefix: updates.invoice_prefix,
        })
        .eq('company_id', companyId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// Time Entry Billing operations
export async function createTimeEntryBilling(data: NewTimeEntryBilling) {
    const { data: result, error } = await supabase
        .from('time_entry_billing')
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function generateBillingReport(companyId: string, startDate: string, endDate: string) {
    const timeEntries = await getTimeEntriesForBilling(companyId, startDate, endDate);
    const billingRates = await getBillingRatesByCompany(companyId);

    const report: { 
        [date: string]: { 
            [userId: string]: { 
                userFirstName: string; 
                userLastName: string; 
                totalHours: number; 
                totalAmount: number; 
                projects: { 
                    [projectId: string]: { 
                        projectName: string; 
                        totalHours: number; 
                        totalAmount: number; 
                        tickets: { 
                            ticketId: string; 
                            ticketTitle: string; 
                            hours: number; 
                            amount: number; 
                            description?: string; 
                        }[]; 
                    }; 
                }; 
            }; 
        }; 
    } = {};

    timeEntries.forEach(entry => {
        if (!entry.user || !entry.user[0] || !entry.project || !entry.ticket) return; // Skip if essential data is missing

        const entryDate = format(new Date(entry.start_time), 'yyyy-MM-dd');
        const userId = entry.user[0].id;
        const projectId = entry.project?.[0]?.id;
        const ticketId = entry.ticket?.[0]?.id;
        const ticketTitle = entry.ticket?.[0]?.title;
        const durationHours = entry.duration ? entry.duration / 3600 : 0;

        let applicableRate = 0;

        // Determine applicable rate: Project > User > Company Default
        const projectRate = billingRates.find(rate => rate.project_id === projectId && !rate.user_id && new Date(entry.start_time) >= new Date(rate.effective_from) && (!rate.effective_to || new Date(entry.start_time) <= new Date(rate.effective_to)));
        const userRate = billingRates.find(rate => rate.user_id === userId && !rate.project_id && new Date(entry.start_time) >= new Date(rate.effective_from) && (!rate.effective_to || new Date(entry.start_time) <= new Date(rate.effective_to)));

        if (projectRate) {
            applicableRate = parseFloat(projectRate.hourly_rate);
        } else if (userRate) {
            applicableRate = parseFloat(userRate.hourly_rate);
        } else if (entry.user[0].hourly_rate) {
            applicableRate = parseFloat(entry.user[0].hourly_rate);
        }

        const billableAmount = durationHours * applicableRate;

        if (!report[entryDate]) {
            report[entryDate] = {};
        }
        if (!report[entryDate][userId]) {
            report[entryDate][userId] = {
                userFirstName: entry.user[0].first_name || '',
                userLastName: entry.user[0].last_name || '',
                totalHours: 0,
                totalAmount: 0,
                projects: {},
            };
        }
        if (!report[entryDate][userId].projects[projectId]) {
            report[entryDate][userId].projects[projectId] = {
                projectName: entry.project?.[0]?.name,
                totalHours: 0,
                totalAmount: 0,
                tickets: [],
            };
        }

        report[entryDate][userId].totalHours += durationHours;
        report[entryDate][userId].totalAmount += billableAmount;
        report[entryDate][userId].projects[projectId].totalHours += durationHours;
        report[entryDate][userId].projects[projectId].totalAmount += billableAmount;
        report[entryDate][userId].projects[projectId].tickets.push({
            ticketId,
            ticketTitle,
            hours: durationHours,
            amount: billableAmount,
            description: entry.description || undefined,
        });
    });

    return report;
}