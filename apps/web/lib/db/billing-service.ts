import { supabase } from '@/lib/db';
import type { NewBillingPeriod, NewBillingRate, NewCompanyBillingSettings, NewTimeEntryBilling } from '@/lib/db/schema';
import { getTimeEntriesForBilling } from './service';
import { format } from 'date-fns';

// Helper function to calculate billing for a single time entry
export async function calculateTimeEntryBilling(timeEntryId: string, companyId: string) {
    // Get the time entry with ticket and user information
    const { data: timeEntry, error: entryError } = await supabase
        .from('time_entries')
        .select(`
            id,
            user_id,
            start_time,
            duration,
            tickets (
                id,
                project_id,
                projects (
                    id,
                    company_id
                )
            ),
            users (
                id,
                hourly_rate
            )
        `)
        .eq('id', timeEntryId)
        .single();

    if (entryError || !timeEntry) {
        throw new Error(`Failed to fetch time entry: ${entryError?.message}`);
    }

    if (!timeEntry.duration || timeEntry.duration <= 0) {
        return null; // No billing for entries without duration
    }

    // Get billing rates and company settings
    const billingRates = await getBillingRatesByCompany(companyId);
    const companySettings = await getCompanyBillingSettings(companyId);

    // Determine applicable rate using same logic as billing report
    let applicableRate = 0;
    const ticket = Array.isArray(timeEntry.tickets) ? timeEntry.tickets[0] : timeEntry.tickets;
    const projectId = ticket?.project_id;
    const userId = timeEntry.user_id;
    const user = Array.isArray(timeEntry.users) ? timeEntry.users[0] : timeEntry.users;

    // Filter rates by effective_from and effective_to dates
    const relevantRates = billingRates.filter(rate =>
        new Date(timeEntry.start_time) >= new Date(rate.effective_from) &&
        (!rate.effective_to || new Date(timeEntry.start_time) <= new Date(rate.effective_to))
    );

    const projectRate = relevantRates.find(rate => rate.project_id === projectId && !rate.user_id);
    const userRate = relevantRates.find(rate => rate.user_id === userId && !rate.project_id);

    if (projectRate) {
        applicableRate = parseFloat(projectRate.hourly_rate);
    } else if (userRate) {
        applicableRate = parseFloat(userRate.hourly_rate);
    } else if (companySettings?.default_hourly_rate) {
        applicableRate = parseFloat(companySettings.default_hourly_rate);
    } else if (user?.hourly_rate) {
        applicableRate = parseFloat(user.hourly_rate);
    }

    const durationHours = timeEntry.duration || 0; // Duration is already in hours
    const billableAmount = durationHours * applicableRate;

    return {
        time_entry_id: timeEntryId,
        hourly_rate: applicableRate.toString(),
        billable_amount: billableAmount.toString(),
        is_billable: true
    };
}

// Function to create or update billing record for a time entry
export async function createOrUpdateTimeEntryBilling(timeEntryId: string, companyId: string) {
    try {
        // Calculate billing data
        const billingData = await calculateTimeEntryBilling(timeEntryId, companyId);
        
        if (!billingData) {
            return null; // No billing for entries without duration
        }

        // Check if billing record already exists
        const { data: existingBilling } = await supabase
            .from('time_entry_billing')
            .select('id')
            .eq('time_entry_id', timeEntryId)
            .single();

        if (existingBilling) {
            // Update existing billing record
            const { data, error } = await supabase
                .from('time_entry_billing')
                .update({
                    hourly_rate: billingData.hourly_rate,
                    billable_amount: billingData.billable_amount,
                    is_billable: billingData.is_billable
                })
                .eq('time_entry_id', timeEntryId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } else {
            // Create new billing record
            const { data, error } = await supabase
                .from('time_entry_billing')
                .insert(billingData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error creating/updating time entry billing:', error);
        throw error;
    }
}

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

export async function deleteBillingRate(id: string) {
    const { error } = await supabase
        .from('billing_rates')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// Company Billing Settings operations
export async function getCompanyBillingSettings(companyId: string) {
    const { data, error } = await supabase
        .from('company_billing_settings')
        .select('*, currency')
        .eq('company_id', companyId)
        .maybeSingle();
    if (error) throw error;
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
        .maybeSingle();
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
        .maybeSingle();
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
    console.log('📊 Starting billing report generation:', { companyId, startDate, endDate });
    
    try {
        // Fetch all required data
        const timeEntries = await getTimeEntriesForBilling(companyId, startDate, endDate);
        const billingRates = await getBillingRatesByCompany(companyId);
        const companySettings = await getCompanyBillingSettings(companyId);
        
        console.log('📋 Data fetched:');
        console.log(`  - Time Entries: ${timeEntries?.length || 0}`);
        console.log(`  - Billing Rates: ${billingRates?.length || 0}`);
        console.log(`  - Company Settings: ${companySettings ? 'Found' : 'Not found'}`);

        if (!timeEntries || timeEntries.length === 0) {
            console.log('⚠️ No time entries found, returning empty report');
            return {};
        }

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

        let processedEntries = 0;
        let skippedEntries = 0;

        timeEntries.forEach((entry, index) => {
            try {
                if (!entry.user || !entry.ticket || !entry.project) {
                    console.warn(`⚠️ Skipping entry ${index} due to missing data:`, {
                        id: entry.id,
                        hasUser: !!entry.user,
                        hasTicket: !!entry.ticket,
                        hasProject: !!entry.project
                    });
                    skippedEntries++;
                    return;
                }

                const entryDate = format(new Date(entry.start_time), 'yyyy-MM-dd');
                const user = entry.user;
                const userId = user.id;
                const project = Array.isArray(entry.project) ? entry.project[0] : entry.project;
                if (!project) {
                    console.warn(`⚠️ Skipping entry ${index} due to missing project:`, entry.id);
                    skippedEntries++;
                    return;
                }
                const projectId = project.id;
                const ticketId = entry.ticket.id;
                const ticketTitle = entry.ticket.title;
                const durationHours = entry.duration || 0;

                if (durationHours <= 0) {
                    console.warn(`⚠️ Skipping entry ${index} due to zero duration:`, entry.id);
                    skippedEntries++;
                    return;
                }

                let applicableRate = 0;
                let rateSource = 'none';

                // Determine applicable rate: Project > User > Company Default
                const entryDateTime = new Date(entry.start_time);
                const relevantRates = billingRates.filter(rate => {
                    const effectiveFrom = new Date(rate.effective_from);
                    const effectiveTo = rate.effective_to ? new Date(rate.effective_to) : null;
                    return entryDateTime >= effectiveFrom && (!effectiveTo || entryDateTime <= effectiveTo);
                });

                const projectRate = relevantRates.find(rate => rate.project_id === projectId && !rate.user_id);
                const userRate = relevantRates.find(rate => rate.user_id === userId && !rate.project_id);

                if (projectRate) {
                    applicableRate = parseFloat(projectRate.hourly_rate);
                    rateSource = 'project';
                } else if (userRate) {
                    applicableRate = parseFloat(userRate.hourly_rate);
                    rateSource = 'user';
                } else if (companySettings?.default_hourly_rate) {
                    applicableRate = parseFloat(companySettings.default_hourly_rate);
                    rateSource = 'company_default';
                } else if (user.hourly_rate) {
                    applicableRate = parseFloat(user.hourly_rate);
                    rateSource = 'user_fallback';
                }

                if (applicableRate <= 0) {
                    console.warn(`⚠️ No valid rate found for entry ${index}:`, {
                        id: entry.id,
                        userId,
                        projectId,
                        rateSource,
                        relevantRatesCount: relevantRates.length
                    });
                }

                const billableAmount = durationHours * applicableRate;

                // Build report structure
                if (!report[entryDate]) {
                    report[entryDate] = {};
                }
                if (!report[entryDate][userId]) {
                    report[entryDate][userId] = {
                        userFirstName: user.first_name || '',
                        userLastName: user.last_name || '',
                        totalHours: 0,
                        totalAmount: 0,
                        projects: {},
                    };
                }
                if (!report[entryDate][userId].projects[projectId]) {
                    report[entryDate][userId].projects[projectId] = {
                        projectName: project.name || 'Unknown Project',
                        totalHours: 0,
                        totalAmount: 0,
                        tickets: [],
                    };
                }

                // Add to totals
                report[entryDate][userId].totalHours += durationHours;
                report[entryDate][userId].totalAmount += billableAmount;
                report[entryDate][userId].projects[projectId].totalHours += durationHours;
                report[entryDate][userId].projects[projectId].totalAmount += billableAmount;
                report[entryDate][userId].projects[projectId].tickets.push({
                    ticketId,
                    ticketTitle: ticketTitle || 'Untitled Ticket',
                    hours: durationHours,
                    amount: billableAmount,
                    description: entry.description || undefined,
                });

                processedEntries++;
            } catch (entryError) {
                console.error(`❌ Error processing entry ${index}:`, entryError, entry);
                skippedEntries++;
            }
        });

        console.log(`✅ Billing report generated:`, {
            totalDates: Object.keys(report).length,
            processedEntries,
            skippedEntries,
            sampleDate: Object.keys(report)[0]
        });

        return report;
    } catch (error) {
        console.error('❌ Error generating billing report:', error);
        throw new Error(`Failed to generate billing report: ${(error as Error).message}`);
    }
}