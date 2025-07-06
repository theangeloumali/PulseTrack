# PulseTrack Billing System Documentation

## Overview

The PulseTrack billing system is a comprehensive time-based billing solution that automatically calculates billable amounts based on tracked time entries. It supports flexible billing rates, automated invoice generation, and complete payment lifecycle management.

## System Architecture

### Core Components

1. **Time Entry Billing**: Converts time entries into billable amounts
2. **Billing Periods**: Time-bounded collections of billable work
3. **Billing Rates**: Configurable hourly rates with priority hierarchy
4. **Payment Management**: Invoice generation and payment tracking
5. **Company Settings**: Default configurations and preferences

### Data Flow

```
Time Entry → Rate Calculation → Billing Amount → Billing Period → Invoice → Payment
```

## Billing Rate Hierarchy

The system uses a priority-based rate selection system:

1. **Project-Specific Rates** (Highest Priority)
   - Rates assigned to specific projects
   - Overrides all other rates for that project

2. **User-Specific Rates** (Medium Priority)
   - Rates assigned to individual users
   - Applied when no project rate exists

3. **Company Default Rate** (Low Priority)
   - Company-wide fallback rate
   - Used when no specific rates are defined

4. **User Hourly Rate** (Fallback)
   - Individual user's base rate
   - Last resort when no other rates exist

### Rate Calculation Logic

```typescript
function calculateApplicableRate(timeEntry) {
  const projectRate = findProjectRate(timeEntry.project_id, timeEntry.start_time);
  if (projectRate) return projectRate.hourly_rate;
  
  const userRate = findUserRate(timeEntry.user_id, timeEntry.start_time);
  if (userRate) return userRate.hourly_rate;
  
  const companyDefault = getCompanyDefaultRate(timeEntry.company_id);
  if (companyDefault) return companyDefault.default_hourly_rate;
  
  const userFallback = getUserHourlyRate(timeEntry.user_id);
  return userFallback || 0;
}
```

## Billing Periods

### Types of Billing Periods

1. **Company-Wide Periods**
   - Include all time entries for the company
   - Used for general invoicing

2. **User-Specific Periods**
   - Include only specific user's time entries
   - Useful for contractor billing or individual invoicing

### Frequencies

- **Weekly**: Monday to Sunday periods
- **Bi-Monthly**: 1st-15th and 16th-end of month
- **Monthly**: Full calendar months

### Period Generation

Billing periods are automatically generated based on:
- Company billing frequency settings
- Time range (start and end dates)
- Optional user targeting

## Time Entry Processing

### Billable Amount Calculation

```typescript
interface BillingCalculation {
  time_entry_id: string;
  hourly_rate: string;
  billable_amount: string;
  is_billable: boolean;
}

function calculateBilling(timeEntry) {
  const applicableRate = calculateApplicableRate(timeEntry);
  const durationHours = timeEntry.duration; // Already in hours
  const billableAmount = durationHours * applicableRate;
  
  return {
    time_entry_id: timeEntry.id,
    hourly_rate: applicableRate.toString(),
    billable_amount: billableAmount.toString(),
    is_billable: true
  };
}
```

### Automatic Billing Record Creation

When time entries are created or updated:
1. System calculates applicable billing rate
2. Creates or updates `time_entry_billing` record
3. Stores hourly rate and billable amount
4. Maintains audit trail

## Invoice Generation

### Invoice Components

1. **Header Information**
   - Company details
   - Billing period dates
   - Invoice number and date

2. **Time Entry Details**
   - Daily breakdown by user
   - Project and ticket information
   - Hours worked and amounts

3. **Summary Totals**
   - Total hours for period
   - Total billable amount
   - Payment terms and due dates

### PDF Export Features

- Professional invoice formatting
- Company branding support
- Detailed time entry breakdowns
- Summary totals and payment information

## Payment Management

### Payment Status Workflow

```
pending → sent → paid
    ↓       ↓      ↑
cancelled  overdue → paid
```

### Status Descriptions

- **pending**: Billing period created, invoice not yet sent
- **sent**: Invoice has been sent to client
- **paid**: Payment has been received
- **overdue**: Payment is past due date
- **cancelled**: Billing period was cancelled

### Payment Tracking Features

1. **Payment History**: Complete audit trail of all status changes
2. **Due Date Management**: Automatic overdue detection
3. **Payment References**: Track payment methods and reference numbers
4. **Amount Tracking**: Record actual payment amounts

## Outstanding Payments Management

### Bulk Operations

The system supports bulk management of outstanding payments:

1. **Individual Selection**: Choose specific periods to delete
2. **Status-Based Deletion**: Delete all periods with selected statuses
3. **Safety Checks**: Prevents deletion of paid periods
4. **Audit Trail**: Maintains history of bulk operations

### Safety Features

- **Paid Period Protection**: Cannot delete billing periods marked as paid
- **Confirmation Dialogs**: Multiple confirmation steps for destructive actions
- **Audit Logging**: All deletions are logged with user and timestamp
- **History Preservation**: Payment history is maintained for compliance

## User-Specific Billing

### Implementation

The system supports generating billing periods for individual users:

```typescript
function generateUserSpecificBilling(companyId, targetUserId, frequency, startDate) {
  // Validate user belongs to company
  const user = validateUserAccess(targetUserId, companyId);
  
  // Generate period with user-specific data
  const billingPeriod = createBillingPeriod({
    company_id: companyId,
    name: `${user.first_name} ${user.last_name} - ${periodName}`,
    notes: `Generated for user: ${user.first_name} ${user.last_name} (${user.id})`
  });
  
  // Fetch only target user's time entries
  const timeEntries = getTimeEntriesForBillingByUser(companyId, targetUserId, startDate, endDate);
  
  return generateBillingReport(companyId, startDate, endDate, targetUserId);
}
```

### Data Isolation

User-specific billing ensures complete data isolation:
- Only target user's time entries are included
- Proper company validation prevents cross-company access
- Billing calculations respect user-specific rates
- Generated invoices clearly indicate user scope

## API Endpoints

### Core Billing APIs

```typescript
// Generate billing report
GET /api/billing/report?companyId=...&startDate=...&endDate=...&targetUserId=...

// Create billing period
POST /api/billing/periods
{
  action: 'generate' | 'generate_next' | 'generate_for_user',
  frequency: 'weekly' | 'bi_monthly' | 'monthly',
  start_date?: string,
  target_user_id?: string
}

// Update payment status
PATCH /api/billing/payment-status
{
  billing_period_id: string,
  payment_status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled',
  payment_amount?: number,
  payment_reference?: string
}

// Delete outstanding payments
DELETE /api/billing/payments?action=delete_multiple_outstanding&billing_period_ids=...
DELETE /api/billing/payments?action=delete_by_status&statuses=...
```

### Authentication & Authorization

All billing APIs require:
- Valid authentication (Supabase session)
- Company membership validation
- Role-based permission checks (typically admin-only for modifications)

## Database Schema

### Key Tables

1. **billing_periods**: Core billing period records
2. **time_entry_billing**: Links time entries to billing calculations
3. **billing_rates**: Configurable hourly rates
4. **payment_history**: Audit trail of payment status changes
5. **company_billing_settings**: Company-wide billing configuration

### Important Relationships

```sql
-- Billing periods belong to companies
billing_periods.company_id → companies.id

-- Time entry billing links to both time entries and periods
time_entry_billing.time_entry_id → time_entries.id

-- Payment history tracks billing period changes
payment_history.billing_period_id → billing_periods.id

-- Billing rates can be project or user specific
billing_rates.project_id → projects.id (optional)
billing_rates.user_id → users.id (optional)
```

## Configuration

### Company Billing Settings

Companies can configure:
- **Default Hourly Rate**: Fallback rate for billing calculations
- **Billing Frequency**: Default frequency for period generation
- **Currency**: Currency for monetary displays
- **Invoice Prefix**: Prefix for invoice numbering

### Rate Management

Administrators can create rates with:
- **Effective Date Ranges**: Rates valid between specific dates
- **Project Targeting**: Rates specific to projects
- **User Targeting**: Rates specific to users
- **Priority Handling**: System automatically selects highest priority rate

## Best Practices

### Rate Management
1. Set company default rates as fallbacks
2. Use project rates for fixed-price work
3. Use user rates for role-based billing
4. Regular rate audits and updates

### Billing Period Management
1. Generate periods consistently
2. Review and approve before sending invoices
3. Track payment status diligently
4. Maintain payment history for auditing

### Data Integrity
1. Validate time entries before billing
2. Verify rate calculations
3. Backup billing data regularly
4. Monitor for orphaned records

## Troubleshooting

### Common Issues

1. **Missing Billing Rates**: Check rate configuration hierarchy
2. **Zero Dollar Invoices**: Verify time entry durations and rates
3. **User Data Isolation**: Ensure proper targetUserId filtering
4. **Payment Status Sync**: Check payment history for status changes

### Debugging Tools

The system includes comprehensive logging:
- Billing report generation logs
- Rate calculation tracing
- Payment status change history
- Time entry processing logs

### Data Validation

Built-in validation prevents:
- Negative billing amounts
- Invalid rate configurations
- Cross-company data access
- Orphaned billing records

## Future Enhancements

### Planned Features
1. **Recurring Billing**: Automatic period generation
2. **Multi-Currency Support**: International billing capabilities
3. **Tax Calculations**: Automatic tax handling
4. **Integration APIs**: Third-party accounting system integration
5. **Advanced Reporting**: Custom billing reports and analytics

This billing system provides a robust foundation for time-based billing with flexibility for various business models and billing requirements.