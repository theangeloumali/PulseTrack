// Reusable GraphQL query fragments for Supabase

// User fragments
export const userBasicFields = `
  id,
  first_name,
  last_name,
  email,
  avatar_url
`;

export const userWithBillingFields = `
  id,
  first_name,
  last_name,
  email,
  avatar_url,
  hourly_rate
`;

export const userWithCompanyFields = `
  ${userBasicFields},
  role,
  company_id,
  created_at,
  updated_at,
  companies (
    id,
    name,
    slug,
    created_at,
    updated_at
  )
`;

// Company fragments
export const companyBasicFields = `
  id,
  name,
  slug
`;

export const companyFullFields = `
  ${companyBasicFields},
  created_at,
  updated_at
`;

// Project fragments
export const projectBasicFields = `
  id,
  name,
  description,
  status,
  company_id,
  owner_id,
  visibility,
  allow_external_activities,
  created_at,
  updated_at
`;

export const projectWithRelationsFields = `
  ${projectBasicFields},
  companies (
    ${companyBasicFields}
  ),
  users:owner_id (
    ${userBasicFields}
  )
`;

// Ticket fragments
export const ticketBasicFields = `
  id,
  title,
  description,
  status,
  priority,
  project_id,
  assignee_id,
  reporter_id,
  estimated_hours,
  actual_hours,
  due_date,
  sort_order,
  created_at,
  updated_at
`;

export const ticketWithUsersFields = `
  ${ticketBasicFields},
  assignee:users!tickets_assignee_id_users_id_fk (
    ${userBasicFields}
  ),
  reporter:users!tickets_reporter_id_users_id_fk (
    ${userBasicFields}
  )
`;

export const ticketWithProjectFields = `
  ${ticketWithUsersFields},
  projects (
    ${projectBasicFields},
    companies (
      ${companyBasicFields}
    )
  )
`;

export const ticketFullFields = `
  ${ticketWithUsersFields},
  projects (
    ${projectBasicFields},
    companies (
      ${companyBasicFields}
    ),
    users:owner_id (
      ${userBasicFields}
    )
  )
`;

// Time entry fragments
export const timeEntryBasicFields = `
  id,
  ticket_id,
  user_id,
  start_time,
  end_time,
  duration,
  description,
  created_at
`;

export const timeEntryWithUserFields = `
  ${timeEntryBasicFields},
  users (
    ${userWithBillingFields}
  )
`;

export const timeEntryWithTicketFields = `
  ${timeEntryBasicFields},
  tickets (
    id,
    title,
    status,
    priority,
    projects (
      id,
      name,
      companies (
        ${companyBasicFields}
      )
    )
  )
`;

// Comment fragments
export const commentBasicFields = `
  id,
  ticket_id,
  user_id,
  content,
  created_at,
  updated_at
`;

export const commentWithUserFields = `
  ${commentBasicFields},
  users (
    ${userBasicFields}
  )
`;
