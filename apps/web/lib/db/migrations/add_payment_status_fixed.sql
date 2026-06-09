-- Add payment status functionality to billing system
-- This migration adds payment tracking, billing cycles, and payment history

-- Create billing frequency enum first (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE billing_frequency AS ENUM ('weekly', 'bi_monthly', 'monthly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add payment status type
CREATE TYPE payment_status AS ENUM ('pending', 'sent', 'paid', 'overdue', 'cancelled');

-- Add payment-related columns to billing_periods table
ALTER TABLE billing_periods 
ADD COLUMN payment_status payment_status DEFAULT 'pending',
ADD COLUMN invoice_sent_date TIMESTAMPTZ,
ADD COLUMN payment_due_date TIMESTAMPTZ,
ADD COLUMN payment_received_date TIMESTAMPTZ,
ADD COLUMN payment_amount DECIMAL(10,2),
ADD COLUMN payment_reference TEXT,
ADD COLUMN notes TEXT;

-- Create payment_history table for audit trail
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_period_id UUID NOT NULL REFERENCES billing_periods(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL CHECK (action IN ('status_changed', 'invoice_sent', 'payment_received', 'due_date_set', 'notes_updated')),
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_payment_history_billing_period ON payment_history(billing_period_id);
CREATE INDEX idx_payment_history_user ON payment_history(user_id);
CREATE INDEX idx_payment_history_action ON payment_history(action);
CREATE INDEX idx_billing_periods_payment_status ON billing_periods(payment_status);
CREATE INDEX idx_billing_periods_payment_due_date ON billing_periods(payment_due_date);

-- Add RLS policies for payment_history table
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only see payment history for their company's billing periods
CREATE POLICY "Users can view payment history for their company" 
ON payment_history FOR SELECT 
USING (
    billing_period_id IN (
        SELECT bp.id 
        FROM billing_periods bp 
        JOIN users u ON u.company_id = bp.company_id 
        WHERE u.id = auth.uid()
    )
);

-- Only admins can insert payment history records
CREATE POLICY "Admins can create payment history" 
ON payment_history FOR INSERT 
WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('company_admin', 'system_admin', 'super_admin')
    )
);

-- Function to automatically create payment history when billing period payment fields change
CREATE OR REPLACE FUNCTION create_payment_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Track payment status changes
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
        INSERT INTO payment_history (billing_period_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'status_changed', OLD.payment_status::text, NEW.payment_status::text);
    END IF;
    
    -- Track invoice sent date changes
    IF OLD.invoice_sent_date IS DISTINCT FROM NEW.invoice_sent_date AND NEW.invoice_sent_date IS NOT NULL THEN
        INSERT INTO payment_history (billing_period_id, user_id, action, new_value)
        VALUES (NEW.id, auth.uid(), 'invoice_sent', NEW.invoice_sent_date::text);
    END IF;
    
    -- Track payment received date changes
    IF OLD.payment_received_date IS DISTINCT FROM NEW.payment_received_date AND NEW.payment_received_date IS NOT NULL THEN
        INSERT INTO payment_history (billing_period_id, user_id, action, new_value)
        VALUES (NEW.id, auth.uid(), 'payment_received', NEW.payment_received_date::text);
    END IF;
    
    -- Track due date changes
    IF OLD.payment_due_date IS DISTINCT FROM NEW.payment_due_date THEN
        INSERT INTO payment_history (billing_period_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'due_date_set', OLD.payment_due_date::text, NEW.payment_due_date::text);
    END IF;
    
    -- Track notes changes
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
        INSERT INTO payment_history (billing_period_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'notes_updated', OLD.notes, NEW.notes);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic payment history tracking
CREATE TRIGGER trigger_billing_period_payment_history
    AFTER UPDATE ON billing_periods
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_history();

-- Function to automatically update overdue status
CREATE OR REPLACE FUNCTION update_overdue_payments()
RETURNS void AS $$
BEGIN
    UPDATE billing_periods 
    SET payment_status = 'overdue'
    WHERE payment_status IN ('pending', 'sent')
    AND payment_due_date < NOW()
    AND payment_received_date IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate billing periods automatically
CREATE OR REPLACE FUNCTION generate_billing_period(
    p_company_id UUID,
    p_frequency TEXT, -- Changed to TEXT to match existing schema
    p_start_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_name TEXT;
    v_billing_period_id UUID;
BEGIN
    -- Set start date based on frequency if not provided
    IF p_start_date IS NULL THEN
        CASE p_frequency
            WHEN 'weekly' THEN
                v_start_date := date_trunc('week', CURRENT_DATE)::DATE;
            WHEN 'bi_monthly' THEN
                -- Start of current half-month (1st or 16th)
                IF EXTRACT(DAY FROM CURRENT_DATE) < 16 THEN
                    v_start_date := date_trunc('month', CURRENT_DATE)::DATE;
                ELSE
                    v_start_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '15 days')::DATE;
                END IF;
            WHEN 'monthly' THEN
                v_start_date := date_trunc('month', CURRENT_DATE)::DATE;
        END CASE;
    ELSE
        v_start_date := p_start_date;
    END IF;
    
    -- Calculate end date based on frequency
    CASE p_frequency
        WHEN 'weekly' THEN
            v_end_date := v_start_date + INTERVAL '6 days';
            v_name := 'Week of ' || to_char(v_start_date, 'Mon DD, YYYY');
        WHEN 'bi_monthly' THEN
            IF EXTRACT(DAY FROM v_start_date) = 1 THEN
                v_end_date := (date_trunc('month', v_start_date) + INTERVAL '14 days')::DATE;
                v_name := to_char(v_start_date, 'Mon YYYY') || ' (1st Half)';
            ELSE
                v_end_date := (date_trunc('month', v_start_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
                v_name := to_char(v_start_date, 'Mon YYYY') || ' (2nd Half)';
            END IF;
        WHEN 'monthly' THEN
            v_end_date := (date_trunc('month', v_start_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            v_name := to_char(v_start_date, 'Mon YYYY');
    END CASE;
    
    -- Create billing period
    INSERT INTO billing_periods (
        company_id, 
        name, 
        start_date, 
        end_date, 
        frequency, 
        status, 
        payment_status,
        created_by
    ) VALUES (
        p_company_id,
        v_name,
        v_start_date,
        v_end_date,
        p_frequency,
        'active',
        'pending',
        auth.uid()
    )
    RETURNING id INTO v_billing_period_id;
    
    RETURN v_billing_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the new columns and tables
COMMENT ON COLUMN billing_periods.payment_status IS 'Current payment status: pending, sent, paid, overdue, cancelled';
COMMENT ON COLUMN billing_periods.invoice_sent_date IS 'Date when invoice was sent to client';
COMMENT ON COLUMN billing_periods.payment_due_date IS 'Date when payment is due';
COMMENT ON COLUMN billing_periods.payment_received_date IS 'Date when payment was received';
COMMENT ON COLUMN billing_periods.payment_amount IS 'Amount paid (may differ from calculated amount)';
COMMENT ON COLUMN billing_periods.payment_reference IS 'Payment reference or transaction ID';
COMMENT ON COLUMN billing_periods.notes IS 'Internal notes about payment or billing period';

COMMENT ON TABLE payment_history IS 'Audit trail for all payment-related changes to billing periods';
COMMENT ON COLUMN payment_history.action IS 'Type of action: status_changed, invoice_sent, payment_received, due_date_set, notes_updated';