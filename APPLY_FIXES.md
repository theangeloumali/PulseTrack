# Apply PulseTrack RLS and Ticket Logging Fixes

## Overview
This document outlines the steps to apply the fixes for RLS policy violations and missing ticket logging functionality.

## Issues Fixed

### 1. Payment History RLS Policy Violation
**Problem**: `payment_history` table had RLS enabled but no INSERT policy, causing "new row violates row-level security policy" errors.

**Solution**: Created comprehensive RLS policies for `payment_history` table.

### 2. Missing Ticket History Logging
**Problem**: Ticket updates weren't generating history logs for field changes.

**Solution**: Added automatic ticket history logging that tracks all field changes.

### 3. Schema Inconsistency
**Problem**: PaymentHistory action types didn't include new actions used in deletion operations.

**Solution**: Updated schema to include missing action types.

## Database Migration Required

You need to apply the new RLS policies to your Supabase database:

### Step 1: Apply Payment History RLS Policies

Connect to your Supabase SQL editor and run the contents of:
```
lib/db/migrations/payment_history_rls_policies.sql
```

This will create the following policies:
- `Users can see payment history for their company billing periods` (SELECT)
- `Admins can create payment history entries for their company` (INSERT)
- `Only super/system admins can update payment history` (UPDATE)
- `Only super/system admins can delete payment history` (DELETE)

### Step 2: Verify Policies are Applied

Run this query to verify the policies were created:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'payment_history'
ORDER BY cmd;
```

You should see 4 policies for the payment_history table.

## Code Changes Made

### 1. Schema Updates
- **File**: `lib/db/schema.ts`
- **Changes**: Added missing action types to PaymentHistory interfaces:
  - `'outstanding_payment_deletion'`
  - `'bulk_payment_history_deletion'`
  - `'payment_status_reset'`

### 2. Ticket History Functions
- **File**: `lib/db/service.ts`
- **Changes**: Added new functions:
  - `createTicketHistory()` - Create ticket history entries
  - `getTicketHistory()` - Retrieve ticket history for a ticket
  - `logTicketFieldChange()` - Log specific field changes

### 3. Enhanced Ticket Updates
- **File**: `lib/db/service.ts`
- **Changes**: Updated `updateTicket()` function to:
  - Compare old vs new values for each field
  - Automatically log field changes to ticket_history table
  - Track changes for: title, description, status, priority, assignee_id, due_date

## Testing the Fixes

### Test Payment Deletion
1. Go to the billing page
2. Try to delete outstanding payments (bulk deletion)
3. Should work without RLS errors

### Test Ticket History
1. Edit a ticket (change status, assignee, priority, etc.)
2. Check if ticket history entries are created
3. Verify you can see the change logs in the ticket details

### Verify Data Isolation
1. Ensure users can only see payment history for their company's billing periods
2. Ensure ticket history follows proper project access controls

## What This Enables

### For Payment Management
- ✅ Bulk deletion of outstanding payments works without errors
- ✅ Complete audit trail of payment status changes
- ✅ Company-based data isolation for payment history
- ✅ Admin-only payment history modification rights

### For Ticket Management
- ✅ Automatic logging of all ticket field changes
- ✅ Complete audit trail of ticket modifications
- ✅ Field-level change tracking (old value → new value)
- ✅ Integration with existing activity logging system

## Troubleshooting

### If Payment Deletion Still Fails
1. Verify the RLS policies were applied correctly
2. Check user permissions (must be company_admin or higher)
3. Ensure billing periods belong to user's company

### If Ticket History Isn't Working
1. Verify `updateTicket()` is being called with `updatedBy` parameter
2. Check console for any error messages during ticket updates
3. Verify ticket_history table exists and has proper structure

### If RLS Policies Conflict
If you get policy conflicts when applying:
1. Drop existing conflicting policies first
2. Apply the new comprehensive policies
3. Test access patterns work as expected

## Security Considerations

The RLS policies ensure:
- Users can only access payment history for their company's billing periods
- Only admins can create payment history entries
- Only super/system admins can modify payment history
- Ticket history follows existing project access controls
- Complete audit trail is maintained for all changes

## Next Steps

After applying these fixes:
1. Monitor for any remaining RLS violations in logs
2. Test payment deletion operations thoroughly
3. Verify ticket change logging is working as expected
4. Consider adding UI components to display ticket history to users