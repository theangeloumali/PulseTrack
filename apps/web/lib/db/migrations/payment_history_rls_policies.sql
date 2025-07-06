-- Payment History RLS Policies
-- This file adds the missing RLS policies for the payment_history table

-- ==============================================
-- PAYMENT_HISTORY TABLE POLICIES
-- ==============================================

-- Payment History: SELECT policy - users can see payment history for billing periods in their company
CREATE POLICY "Users can see payment history for their company billing periods" 
ON payment_history FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM billing_periods bp
    JOIN users u ON u.id = auth.uid()
    WHERE bp.id = billing_period_id
    AND bp.company_id = u.company_id
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

-- Payment History: INSERT policy - admins can create payment history entries for their company
CREATE POLICY "Admins can create payment history entries for their company" 
ON payment_history FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM billing_periods bp
    JOIN users u ON u.id = auth.uid()
    WHERE bp.id = billing_period_id
    AND bp.company_id = u.company_id
    AND u.role IN ('company_admin', 'system_admin', 'super_admin')
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

-- Payment History: UPDATE policy - only super/system admins can update payment history
CREATE POLICY "Only super/system admins can update payment history" 
ON payment_history FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

-- Payment History: DELETE policy - only super/system admins can delete payment history
CREATE POLICY "Only super/system admins can delete payment history" 
ON payment_history FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

-- ==============================================
-- USAGE INSTRUCTIONS
-- ==============================================

/*
To apply these policies to your database:

1. Connect to your Supabase database or PostgreSQL instance
2. Run this SQL file to create the payment_history policies
3. Verify policies are created with:
   SELECT schemaname, tablename, policyname, permissive, roles, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public' AND tablename = 'payment_history'
   ORDER BY cmd;

These policies implement:
- Company-based isolation for payment history access
- Admin-only creation of payment history entries
- Super/system admin only modification rights
- Proper audit trail protection

Note: These policies ensure that payment history entries can only be:
- Viewed by users in the same company as the billing period
- Created by admins for billing periods in their company
- Modified/deleted only by super/system admins
*/