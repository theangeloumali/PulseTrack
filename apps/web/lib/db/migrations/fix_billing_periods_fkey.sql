-- Fix missing foreign key constraint for billing_periods.created_by -> users.id

-- First, let's check if the column exists and has any invalid references
-- If there are any billing_periods with created_by values that don't exist in users table,
-- we need to handle them first

-- Set any invalid created_by references to NULL
UPDATE billing_periods 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM users);

-- Now add the foreign key constraint
ALTER TABLE billing_periods 
ADD CONSTRAINT billing_periods_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON CONSTRAINT billing_periods_created_by_fkey ON billing_periods IS 'Foreign key to users table for the user who created this billing period';