import { userBasicFields } from './queries';

export const billingPeriodBasicFields = `
    id,
    company_id,
    name,
    start_date,
    end_date,
    frequency,
    status,
    created_by,
    created_at,
    updated_at
`;

export const billingPeriodWithCreatorFields = `
    ${billingPeriodBasicFields},
    creator:created_by (${userBasicFields})
`;

export const billingRateBasicFields = `
    id,
    company_id,
    user_id,
    project_id,
    hourly_rate,
    currency,
    effective_from,
    effective_to,
    created_by,
    created_at
`;

export const companyBillingSettingsBasicFields = `
    id,
    company_id,
    default_hourly_rate,
    default_currency,
    billing_frequency,
    invoice_prefix,
    created_at,
    updated_at
`;

export const timeEntryBillingBasicFields = `
    id,
    time_entry_id,
    billing_period_id,
    hourly_rate,
    billable_amount,
    is_billable,
    created_at
`;
