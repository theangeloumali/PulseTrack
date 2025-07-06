import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/db';
import type { NewBillingPeriod, NewBillingRate, NewCompanyBillingSettings, NewTimeEntryBilling, PaymentStatus, BillingFrequency, NewPaymentHistory } from '@/lib/db/schema';
import { getTimeEntriesForBilling, getTimeEntriesForBillingByUser } from './service';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths } from 'date-fns';

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

export async function createBillingPeriod(supabase: SupabaseClient, data: NewBillingPeriod) {
    const { data: result, error } = await supabase
        .from('billing_periods')
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function updateBillingPeriod(supabase: SupabaseClient, id: string, updates: Partial<NewBillingPeriod>) {
    const { data, error } = await supabase
        .from('billing_periods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteBillingPeriod(supabase: SupabaseClient, billingPeriodId: string) {
    // Get the current authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
        throw new Error('Authentication required to delete billing periods')
    }

    // Get user profile with role information
    const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('id, role, company_id')
        .eq('id', authUser.id)
        .single()
    
    if (userError || !currentUser) {
        throw new Error('User profile not found')
    }

    // First check if billing period exists and get its details
    const { data: billingPeriod, error: fetchError } = await supabase
        .from('billing_periods')
        .select('id, name, payment_status, company_id')
        .eq('id', billingPeriodId)
        .single();
    
    if (fetchError) {
        throw new Error('Billing period not found');
    }
    
    // Verify user has access to this billing period (company match unless super admin)
    const isSuperAdmin = currentUser.role === 'super_admin';
    if (!isSuperAdmin && billingPeriod.company_id !== currentUser.company_id) {
        throw new Error('You can only delete billing periods from your company');
    }
    
    // Check if it's safe to delete (not paid unless super admin)
    if (billingPeriod.payment_status === 'paid' && !isSuperAdmin) {
        throw new Error('Cannot delete a billing period that has been paid. Only super administrators can override this protection.');
    }
    
    // Delete the billing period (cascade will handle payment_history deletion)
    const { error: deleteError } = await supabase
        .from('billing_periods')
        .delete()
        .eq('id', billingPeriodId);
    
    if (deleteError) {
        throw new Error(`Failed to delete billing period: ${deleteError.message}`);
    }
    
    // Return deletion info for logging/audit purposes
    return { 
        success: true, 
        deletedPeriod: billingPeriod,
        deletedByUserId: currentUser.id,
        deletedByRole: currentUser.role,
        wasPaidPeriod: billingPeriod.payment_status === 'paid'
    };
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
    // Filter out undefined values
    const filteredData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
            filteredData[key] = value;
        }
    });

    const { data: result, error } = await supabase
        .from('company_billing_settings')
        .insert(filteredData)
        .select()
        .maybeSingle();
    if (error) throw error;
    return result;
}

export async function updateCompanyBillingSettings(companyId: string, updates: Partial<NewCompanyBillingSettings>) {
    // Filter out undefined values and company_id from updates
    const filteredUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'company_id') {
            filteredUpdates[key] = value;
        }
    });

    const { data, error } = await supabase
        .from('company_billing_settings')
        .update(filteredUpdates)
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

// Payment Status Management Functions

export async function updateBillingPeriodPaymentStatus(
    supabase: SupabaseClient,
    billingPeriodId: string, 
    paymentStatus: PaymentStatus,
    additionalData?: {
        payment_amount?: number;
        payment_reference?: string;
        payment_due_date?: string;
        invoice_sent_date?: string;
        notes?: string;
    }
) {
    const updateData: any = { payment_status: paymentStatus };
    
    // Add payment received date when status is set to paid
    if (paymentStatus === 'paid') {
        updateData.payment_received_date = new Date().toISOString();
    }
    
    // Add invoice sent date when status is set to sent
    if (paymentStatus === 'sent' && !additionalData?.invoice_sent_date) {
        updateData.invoice_sent_date = new Date().toISOString();
    }
    
    // Add any additional data
    if (additionalData) {
        Object.assign(updateData, additionalData);
    }
    
    const { data, error } = await supabase
        .from('billing_periods')
        .update(updateData)
        .eq('id', billingPeriodId)
        .select()
        .single();
        
    if (error) throw error;
    return data;
}

export async function getOutstandingPayments(companyId: string) {
    const { data, error } = await supabase
        .from('billing_periods')
        .select(`
            *,
            users!billing_periods_created_by_fkey(first_name, last_name, email)
        `)
        .eq('company_id', companyId)
        .in('payment_status', ['pending', 'sent', 'overdue'])
        .order('payment_due_date', { ascending: true, nullsLast: true });
        
    if (error) throw error;
    return data || [];
}

export async function getOverduePayments(companyId: string) {
    const { data, error } = await supabase
        .from('billing_periods')
        .select(`
            *,
            users!billing_periods_created_by_fkey(first_name, last_name, email)
        `)
        .eq('company_id', companyId)
        .eq('payment_status', 'overdue')
        .order('payment_due_date', { ascending: true });
        
    if (error) throw error;
    return data || [];
}

export async function getPaymentHistory(billingPeriodId: string) {
    const { data, error } = await supabase
        .from('payment_history')
        .select(`
            *,
            users(first_name, last_name, email)
        `)
        .eq('billing_period_id', billingPeriodId)
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    return data || [];
}

export async function createPaymentHistoryEntry(data: NewPaymentHistory) {
    const { data: result, error } = await supabase
        .from('payment_history')
        .insert(data)
        .select()
        .single();
        
    if (error) throw error;
    return result;
}

// Billing Cycle Generation Functions

export async function generateBillingPeriodForCycle(
    supabase: SupabaseClient,
    companyId: string,
    frequency: BillingFrequency,
    startDate?: Date,
    userId?: string
) {
    const baseDate = startDate || new Date();
    let start: Date;
    let end: Date;
    let name: string;
    
    switch (frequency) {
        case 'weekly':
            start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start
            end = endOfWeek(baseDate, { weekStartsOn: 1 }); // Sunday end
            name = `Week of ${format(start, 'MMM dd, yyyy')}`;
            break;
            
        case 'bi_monthly':
            const day = baseDate.getDate();
            if (day <= 15) {
                start = startOfMonth(baseDate);
                end = new Date(baseDate.getFullYear(), baseDate.getMonth(), 15);
                name = `${format(start, 'MMM yyyy')} (1st Half)`;
            } else {
                start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 16);
                end = endOfMonth(baseDate);
                name = `${format(start, 'MMM yyyy')} (2nd Half)`;
            }
            break;
            
        case 'monthly':
            start = startOfMonth(baseDate);
            end = endOfMonth(baseDate);
            name = format(start, 'MMM yyyy');
            break;
            
        default:
            throw new Error(`Invalid billing frequency: ${frequency}`);
    }
    
    const billingPeriodData: NewBillingPeriod = {
        company_id: companyId,
        name,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        frequency,
        status: 'active',
        payment_status: 'pending',
        created_by: userId || null, // Set to provided userId or null if not provided
    };
    
    // Create the billing period first
    const createdPeriod = await createBillingPeriod(supabase, billingPeriodData);
    
    // Calculate and set the payment amount based on actual time entries
    try {
        const totalAmount = await calculateBillingPeriodAmount(
            companyId,
            start.toISOString().split('T')[0], // Format as YYYY-MM-DD
            end.toISOString().split('T')[0],   // Format as YYYY-MM-DD
            undefined // No user filter for company-wide periods
        );
        
        if (totalAmount > 0) {
            // Update the billing period with the calculated amount
            const updatedPeriod = await updateBillingPeriod(supabase, createdPeriod.id, {
                payment_amount: totalAmount
            });
            console.log(`✅ Updated billing period ${createdPeriod.id} with payment amount: $${totalAmount}`);
            return updatedPeriod;
        }
    } catch (error) {
        console.error('❌ Failed to calculate payment amount for billing period:', error);
        // Continue without failing - the period is created but without payment amount
    }
    
    return createdPeriod;
}

export async function generateNextBillingPeriod(supabase: SupabaseClient, companyId: string, currentPeriodId: string, userId?: string) {
    // Get the current period to determine frequency and dates
    const currentPeriod = await getBillingPeriodById(currentPeriodId);
    if (!currentPeriod) {
        throw new Error('Current billing period not found');
    }
    
    const currentEnd = new Date(currentPeriod.end_date);
    let nextStart: Date;
    
    switch (currentPeriod.frequency) {
        case 'weekly':
            nextStart = addWeeks(currentEnd, 1);
            break;
        case 'bi_monthly':
            // For bi-monthly, the next period starts the day after current ends
            nextStart = addDays(currentEnd, 1);
            break;
        case 'monthly':
            nextStart = addMonths(startOfMonth(currentEnd), 1);
            break;
        default:
            throw new Error(`Invalid billing frequency: ${currentPeriod.frequency}`);
    }
    
    return await generateBillingPeriodForCycle(supabase, companyId, currentPeriod.frequency, nextStart, userId);
}

export async function generateBillingPeriodForUser(
    supabase: SupabaseClient,
    companyId: string,
    targetUserId: string,
    frequency: BillingFrequency,
    startDate?: Date,
    createdByUserId?: string
) {
    // Validate that target user exists and belongs to the company
    const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id, company_id, first_name, last_name')
        .eq('id', targetUserId)
        .eq('company_id', companyId)
        .single();
    
    if (userError || !targetUser) {
        throw new Error('Target user not found or does not belong to the company');
    }
    
    const baseDate = startDate || new Date();
    let start: Date;
    let end: Date;
    let name: string;
    
    switch (frequency) {
        case 'weekly':
            start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start
            end = endOfWeek(baseDate, { weekStartsOn: 1 }); // Sunday end
            name = `${targetUser.first_name} ${targetUser.last_name} - Week of ${format(start, 'MMM dd, yyyy')}`;
            break;
            
        case 'bi_monthly':
            const day = baseDate.getDate();
            if (day <= 15) {
                start = startOfMonth(baseDate);
                end = new Date(baseDate.getFullYear(), baseDate.getMonth(), 15);
                name = `${targetUser.first_name} ${targetUser.last_name} - ${format(start, 'MMM yyyy')} (1st Half)`;
            } else {
                start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 16);
                end = endOfMonth(baseDate);
                name = `${targetUser.first_name} ${targetUser.last_name} - ${format(start, 'MMM yyyy')} (2nd Half)`;
            }
            break;
            
        case 'monthly':
            start = startOfMonth(baseDate);
            end = endOfMonth(baseDate);
            name = `${targetUser.first_name} ${targetUser.last_name} - ${format(start, 'MMM yyyy')}`;
            break;
            
        default:
            throw new Error(`Invalid billing frequency: ${frequency}`);
    }
    
    const billingPeriodData: NewBillingPeriod = {
        company_id: companyId,
        name,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        frequency,
        status: 'active',
        payment_status: 'pending',
        created_by: createdByUserId || null,
        // Add user-specific note to track this is for a specific user
        notes: `Generated for user: ${targetUser.first_name} ${targetUser.last_name} (${targetUser.id})`
    };
    
    // Create the billing period first
    const createdPeriod = await createBillingPeriod(supabase, billingPeriodData);
    
    // Calculate and set the payment amount based on actual time entries for this user
    try {
        const totalAmount = await calculateBillingPeriodAmount(
            companyId,
            start.toISOString().split('T')[0], // Format as YYYY-MM-DD
            end.toISOString().split('T')[0],   // Format as YYYY-MM-DD
            targetUserId // Filter for specific user
        );
        
        if (totalAmount > 0) {
            // Update the billing period with the calculated amount
            const updatedPeriod = await updateBillingPeriod(supabase, createdPeriod.id, {
                payment_amount: totalAmount
            });
            console.log(`✅ Updated user billing period ${createdPeriod.id} with payment amount: $${totalAmount}`);
            return updatedPeriod;
        }
    } catch (error) {
        console.error('❌ Failed to calculate payment amount for user billing period:', error);
        // Continue without failing - the period is created but without payment amount
    }
    
    return createdPeriod;
}

export async function getBillingCycleStats(companyId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    
    const { data, error } = await supabase
        .from('billing_periods')
        .select('*')
        .eq('company_id', companyId)
        .gte('start_date', `${targetYear}-01-01`)
        .lt('start_date', `${targetYear + 1}-01-01`);
        
    if (error) throw error;
    
    const periods = data || [];
    const stats = {
        total: periods.length,
        pending: periods.filter(p => p.payment_status === 'pending').length,
        sent: periods.filter(p => p.payment_status === 'sent').length,
        paid: periods.filter(p => p.payment_status === 'paid').length,
        overdue: periods.filter(p => p.payment_status === 'overdue').length,
        cancelled: periods.filter(p => p.payment_status === 'cancelled').length,
        totalPaid: periods
            .filter(p => p.payment_status === 'paid')
            .reduce((sum, p) => sum + (p.payment_amount || 0), 0),
    };
    
    return { periods, stats };
}

export async function markInvoiceAsSent(supabase: SupabaseClient, billingPeriodId: string, dueDate?: string) {
    const updateData: any = {
        payment_status: 'sent',
        invoice_sent_date: new Date().toISOString(),
    };
    
    if (dueDate) {
        updateData.payment_due_date = dueDate;
    }
    
    return await updateBillingPeriod(supabase, billingPeriodId, updateData);
}

export async function markPaymentAsReceived(
    supabase: SupabaseClient,
    billingPeriodId: string, 
    amount?: number, 
    reference?: string
) {
    const updateData: any = {
        payment_status: 'paid',
        payment_received_date: new Date().toISOString(),
    };
    
    if (amount) {
        updateData.payment_amount = amount;
    }
    
    if (reference) {
        updateData.payment_reference = reference;
    }
    
    return await updateBillingPeriod(supabase, billingPeriodId, updateData);
}

export async function generateBillingReport(
    companyId: string, 
    startDate: string, 
    endDate: string, 
    targetUserId?: string
) {
    try {
        // Fetch all required data - use user-specific function if targetUserId provided
        const timeEntries = targetUserId 
            ? await getTimeEntriesForBillingByUser(companyId, targetUserId, startDate, endDate)
            : await getTimeEntriesForBilling(companyId, startDate, endDate);
        const billingRates = await getBillingRatesByCompany(companyId);
        const companySettings = await getCompanyBillingSettings(companyId);

        if (!timeEntries || timeEntries.length === 0) {
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

        // Add detailed logging for the first few entries to understand data structure
        if (timeEntries.length > 0) {
            console.log('🔍 Sample time entry structure:', JSON.stringify(timeEntries[0], null, 2));
        }

        timeEntries.forEach((entry, index) => {
            try {
                // Debug log for problematic entries
                if (index < 3 || (!entry.users && !entry.user) || (!entry.tickets && !entry.ticket)) {
                    console.log(`🔍 Entry ${index} structure:`, {
                        id: entry.id,
                        hasUsers: !!entry.users,
                        hasUser: !!entry.user,
                        hasTickets: !!entry.tickets,
                        hasTicket: !!entry.ticket,
                        ticketsStructure: entry.tickets ? Object.keys(entry.tickets) : 'null',
                        usersStructure: entry.users ? Object.keys(entry.users) : 'null'
                    });
                }

                // Fix the data structure access - Supabase returns 'users' and 'tickets', not 'user' and 'ticket'
                const user = entry.users || entry.user;
                const ticket = entry.tickets || entry.ticket;
                const project = ticket?.projects || entry.project;

                if (!user || !ticket || !project) {
                    console.warn(`⚠️ Skipping entry ${index} due to missing data:`, {
                        id: entry.id,
                        hasUser: !!user,
                        hasTicket: !!ticket,
                        hasProject: !!project,
                        ticketStructure: ticket ? Object.keys(ticket) : 'null'
                    });
                    skippedEntries++;
                    return;
                }

                const entryDate = format(new Date(entry.start_time), 'yyyy-MM-dd');
                const userId = user.id;
                // Handle project data - it might be nested under ticket.projects
                const projectData = Array.isArray(project) ? project[0] : project;
                if (!projectData) {
                    console.warn(`⚠️ Skipping entry ${index} due to missing project data:`, {
                        entryId: entry.id,
                        projectStructure: project ? (Array.isArray(project) ? 'array' : 'object') : 'null'
                    });
                    skippedEntries++;
                    return;
                }
                const projectId = projectData.id;
                const ticketId = ticket.id;
                const ticketTitle = ticket.title;
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
                        projectName: projectData.name || 'Unknown Project',
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

// Helper function to calculate billing period amount from time entries
export async function calculateBillingPeriodAmount(
    companyId: string,
    startDate: string,
    endDate: string,
    targetUserId?: string
): Promise<number> {
    try {
        console.log('💰 Calculating billing period amount:', { companyId, startDate, endDate, targetUserId });
        
        // Generate billing report for the period
        const billingReport = await generateBillingReport(companyId, startDate, endDate, targetUserId);
        
        // Calculate total amount from the report
        let totalAmount = 0;
        
        Object.entries(billingReport).forEach(([date, dateData]: [string, any]) => {
            Object.entries(dateData).forEach(([userId, userData]: [string, any]) => {
                totalAmount += userData.totalAmount || 0;
            });
        });
        
        console.log('💰 Calculated total amount:', totalAmount);
        return totalAmount;
    } catch (error) {
        console.error('❌ Error calculating billing period amount:', error);
        return 0; // Return 0 if calculation fails rather than throwing
    }
}

// Function to recalculate payment amount for existing billing period
export async function recalculateBillingPeriodAmount(
    supabase: SupabaseClient,
    billingPeriodId: string
): Promise<any> {
    try {
        // Get the billing period
        const billingPeriod = await getBillingPeriodById(billingPeriodId);
        if (!billingPeriod) {
            throw new Error('Billing period not found');
        }
        
        // Extract user ID if this is a user-specific period
        const targetUserId = extractTargetUserIdFromBillingPeriod(billingPeriod);
        
        console.log('🔄 Recalculating payment amount for billing period:', {
            id: billingPeriodId,
            name: billingPeriod.name,
            targetUserId,
            currentAmount: billingPeriod.payment_amount
        });
        
        // Calculate the new amount
        const totalAmount = await calculateBillingPeriodAmount(
            billingPeriod.company_id,
            billingPeriod.start_date.split('T')[0], // Format as YYYY-MM-DD
            billingPeriod.end_date.split('T')[0],   // Format as YYYY-MM-DD
            targetUserId || undefined
        );
        
        // Update the billing period with the calculated amount
        const updatedPeriod = await updateBillingPeriod(supabase, billingPeriodId, {
            payment_amount: totalAmount
        });
        
        console.log(`✅ Recalculated billing period ${billingPeriodId}: $${billingPeriod.payment_amount || 0} → $${totalAmount}`);
        return updatedPeriod;
        
    } catch (error) {
        console.error('❌ Failed to recalculate payment amount:', error);
        throw error;
    }
}

// Helper function to extract target user ID from billing period notes
export function extractTargetUserIdFromBillingPeriod(billingPeriod: any): string | null {
    if (!billingPeriod?.notes) {
        return null;
    }
    
    // Parse the notes field to extract user ID
    // Format: "Generated for user: FirstName LastName (user-id)"
    const match = billingPeriod.notes.match(/Generated for user:.*\(([^)]+)\)/);
    return match ? match[1] : null;
}

// Payment deletion functions

export async function deletePaymentHistory(
    supabase: SupabaseClient,
    paymentHistoryId: string
) {
    const { error } = await supabase
        .from('payment_history')
        .delete()
        .eq('id', paymentHistoryId);

    if (error) {
        throw new Error(`Failed to delete payment history: ${error.message}`);
    }

    return { message: 'Payment history deleted successfully' };
}

export async function resetBillingPeriodPaymentStatus(
    supabase: SupabaseClient,
    billingPeriodId: string,
    userId: string
) {
    // First, get the billing period to check current status
    const { data: billingPeriod, error: fetchError } = await supabase
        .from('billing_periods')
        .select('*')
        .eq('id', billingPeriodId)
        .single();

    if (fetchError || !billingPeriod) {
        throw new Error('Billing period not found');
    }

    // Check if we can reset the payment status (prevent resetting paid periods unless explicitly allowed)
    if (billingPeriod.payment_status === 'paid') {
        // Allow reset but create a warning in payment history
        await createPaymentHistoryEntry({
            billing_period_id: billingPeriodId,
            user_id: userId,
            action: 'payment_status_reset',
            old_value: 'paid',
            new_value: 'pending',
            notes: 'Payment status reset by admin - WARNING: This was previously marked as paid'
        });
    }

    // Reset payment status and clear payment-related fields
    const { data, error } = await supabase
        .from('billing_periods')
        .update({
            payment_status: 'pending',
            payment_amount: null,
            payment_reference: null,
            payment_due_date: null,
            payment_received_date: null,
            invoice_sent_date: null,
            notes: billingPeriod.notes ? `${billingPeriod.notes} [RESET BY ADMIN]` : '[RESET BY ADMIN]'
        })
        .eq('id', billingPeriodId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to reset billing period payment status: ${error.message}`);
    }

    return data;
}

export async function deleteAllPaymentHistory(
    supabase: SupabaseClient,
    billingPeriodId: string,
    userId: string
) {
    // Create a record of this mass deletion
    await createPaymentHistoryEntry({
        billing_period_id: billingPeriodId,
        user_id: userId,
        action: 'bulk_payment_history_deletion',
        old_value: 'multiple_entries',
        new_value: 'deleted',
        notes: 'All payment history entries deleted by admin'
    });

    // Delete all payment history for this billing period
    const { error } = await supabase
        .from('payment_history')
        .delete()
        .eq('billing_period_id', billingPeriodId);

    if (error) {
        throw new Error(`Failed to delete payment history: ${error.message}`);
    }

    return { message: 'All payment history deleted successfully' };
}

// Outstanding payments bulk deletion functions
export async function deleteMultipleOutstandingPayments(
    supabase: SupabaseClient,
    billingPeriodIds: string[],
    userId: string
) {
    if (!billingPeriodIds.length) {
        throw new Error('No billing periods provided for deletion');
    }

    // Validate all billing periods and check they can be safely deleted
    const { data: periods, error: fetchError } = await supabase
        .from('billing_periods')
        .select('id, name, payment_status, company_id')
        .in('id', billingPeriodIds);

    if (fetchError || !periods) {
        throw new Error('Failed to fetch billing periods for validation');
    }

    // Check for any paid periods that shouldn't be deleted
    const paidPeriods = periods.filter(p => p.payment_status === 'paid');
    if (paidPeriods.length > 0) {
        throw new Error(`Cannot delete ${paidPeriods.length} paid billing period(s): ${paidPeriods.map(p => p.name).join(', ')}`);
    }

    // Create payment history entries for tracking
    for (const period of periods) {
        await createPaymentHistoryEntry({
            billing_period_id: period.id,
            user_id: userId,
            action: 'outstanding_payment_deletion',
            old_value: period.payment_status,
            new_value: 'deleted',
            notes: `Outstanding payment deleted as part of bulk deletion by admin`
        });
    }

    // Delete all selected billing periods
    const { error: deleteError } = await supabase
        .from('billing_periods')
        .delete()
        .in('id', billingPeriodIds);

    if (deleteError) {
        throw new Error(`Failed to delete billing periods: ${deleteError.message}`);
    }

    return { 
        message: `Successfully deleted ${periods.length} outstanding payment(s)`,
        deletedCount: periods.length,
        deletedPeriods: periods.map(p => ({ id: p.id, name: p.name }))
    };
}

export async function deleteOutstandingPaymentsByStatus(
    supabase: SupabaseClient,
    companyId: string,
    statuses: string[],
    userId: string
) {
    // Find all billing periods with the specified statuses
    const { data: periods, error: fetchError } = await supabase
        .from('billing_periods')
        .select('id, name, payment_status')
        .eq('company_id', companyId)
        .in('payment_status', statuses);

    if (fetchError || !periods) {
        throw new Error('Failed to fetch billing periods for deletion');
    }

    if (periods.length === 0) {
        return { message: 'No billing periods found with the specified statuses', deletedCount: 0 };
    }

    // Use the bulk deletion function
    return await deleteMultipleOutstandingPayments(
        supabase, 
        periods.map(p => p.id), 
        userId
    );
}

// Enhanced billing period generation functions with custom date range support
export async function generateBillingPeriodWithCustomDates(
    supabase: SupabaseClient,
    companyId: string,
    frequency: BillingFrequency,
    customStartDate: string,
    customEndDate: string,
    userId?: string
) {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    
    // Validate dates
    if (start >= end) {
        throw new Error('Start date must be before end date');
    }
    
    const name = `Custom Period: ${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    
    const billingPeriodData: NewBillingPeriod = {
        company_id: companyId,
        name,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        frequency,
        status: 'active',
        payment_status: 'pending',
        created_by: userId || null,
    };
    
    // Create the billing period first
    const createdPeriod = await createBillingPeriod(supabase, billingPeriodData);
    
    // Calculate and set the payment amount based on actual time entries
    try {
        const totalAmount = await calculateBillingPeriodAmount(
            companyId,
            customStartDate,
            customEndDate
        );
        
        if (totalAmount > 0) {
            // Update the billing period with the calculated amount
            const updatedPeriod = await updateBillingPeriod(supabase, createdPeriod.id, {
                payment_amount: totalAmount
            });
            console.log(`✅ Updated custom billing period ${createdPeriod.id} with payment amount: $${totalAmount}`);
            return updatedPeriod;
        }
    } catch (error) {
        console.error('❌ Failed to calculate payment amount for custom billing period:', error);
        // Continue without failing - the period is created but without payment amount
    }
    
    return createdPeriod;
}

export async function generateBillingPeriodForUserWithCustomDates(
    supabase: SupabaseClient,
    companyId: string,
    targetUserId: string,
    frequency: BillingFrequency,
    customStartDate: string,
    customEndDate: string,
    createdByUserId?: string
) {
    // Validate that target user exists and belongs to the company
    const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, company_id')
        .eq('id', targetUserId)
        .eq('company_id', companyId)
        .single();

    if (userError || !targetUser) {
        throw new Error('Target user not found or does not belong to this company');
    }

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    
    // Validate dates
    if (start >= end) {
        throw new Error('Start date must be before end date');
    }
    
    const name = `${targetUser.first_name} ${targetUser.last_name} - Custom: ${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    
    const billingPeriodData: NewBillingPeriod = {
        company_id: companyId,
        name,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        frequency,
        status: 'active',
        payment_status: 'pending',
        created_by: createdByUserId || null,
        notes: `Generated for user: ${targetUser.first_name} ${targetUser.last_name} (${targetUser.id})`
    };
    
    // Create the billing period first
    const createdPeriod = await createBillingPeriod(supabase, billingPeriodData);
    
    // Calculate and set the payment amount based on actual time entries for this user
    try {
        const totalAmount = await calculateBillingPeriodAmount(
            companyId,
            customStartDate,
            customEndDate,
            targetUserId
        );
        
        if (totalAmount > 0) {
            // Update the billing period with the calculated amount
            const updatedPeriod = await updateBillingPeriod(supabase, createdPeriod.id, {
                payment_amount: totalAmount
            });
            console.log(`✅ Updated custom user billing period ${createdPeriod.id} with payment amount: $${totalAmount}`);
            return updatedPeriod;
        }
    } catch (error) {
        console.error('❌ Failed to calculate payment amount for custom user billing period:', error);
        // Continue without failing - the period is created but without payment amount
    }
    
    return createdPeriod;
}