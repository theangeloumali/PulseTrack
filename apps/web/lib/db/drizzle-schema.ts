// Drizzle schema for migrations only - not used at runtime
import { pgTable, uuid, text, timestamp, integer, unique, decimal, foreignKey, date, index, boolean, jsonb } from 'drizzle-orm/pg-core';

// Companies table
export const companies = pgTable('companies', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	nameIdx: index('companies_name_idx').on(table.name),
	slugIdx: index('companies_slug_idx').on(table.slug),
})).enableRLS();

// Users table
export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey(), // References auth.users(id)
		email: text('email').notNull(),
		first_name: text('first_name'),
		last_name: text('last_name'),
		avatar_url: text('avatar_url'),
		role: text('role').default('user'), // 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user'
		company_id: uuid('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' }),
		hourly_rate: decimal('hourly_rate', { precision: 10, scale: 2 }), // Hourly rate in dollars
		status: text('status').default('active'), // 'active' | 'inactive'
		invited_by: uuid('invited_by'), // Self-referencing FK defined below
		invited_at: timestamp('invited_at', { withTimezone: true }), // When the invitation was sent
		created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		emailCompanyUnique: unique().on(table.email, table.company_id),
		// Self-referencing foreign key for invited_by
		invitedByFK: foreignKey({
			columns: [table.invited_by],
			foreignColumns: [table.id],
			name: 'users_invited_by_fkey'
		}).onDelete('set null'),
		// Enum constraints will be added via SQL migration
		// Performance indexes
		emailIdx: index('users_email_idx').on(table.email),
		companyIdIdx: index('users_company_id_idx').on(table.company_id),
		roleIdx: index('users_role_idx').on(table.role),
		statusIdx: index('users_status_idx').on(table.status),
	})
).enableRLS();

// Projects table
export const projects = pgTable('projects', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	description: text('description'),
	status: text('status').default('active'), // 'active' | 'archived' | 'completed'
	company_id: uuid('company_id')
		.notNull()
		.references(() => companies.id, { onDelete: 'cascade' }),
	owner_id: uuid('owner_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	visibility: text('visibility').default('company'), // 'public' | 'company' | 'private'
	allow_external_activities: boolean('allow_external_activities').default(false),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Enum constraints will be added via SQL migration
	// Performance indexes
	companyIdIdx: index('projects_company_id_idx').on(table.company_id),
	ownerIdIdx: index('projects_owner_id_idx').on(table.owner_id),
	statusIdx: index('projects_status_idx').on(table.status),
	nameIdx: index('projects_name_idx').on(table.name),
	visibilityIdx: index('projects_visibility_idx').on(table.visibility),
})).enableRLS();

// Project members table (many-to-many relationship between projects and users)
export const projectMembers = pgTable(
	'project_members',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		project_id: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		user_id: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: text('role').default('member'), // 'lead' | 'member'
		created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		projectUserUnique: unique().on(table.project_id, table.user_id),
		// Enum constraints will be added via SQL migration
		// Performance indexes
		projectIdIdx: index('project_members_project_id_idx').on(table.project_id),
		userIdIdx: index('project_members_user_id_idx').on(table.user_id),
	})
).enableRLS();

// Tickets table
export const tickets = pgTable('tickets', {
	id: uuid('id').primaryKey().defaultRandom(),
	title: text('title').notNull(),
	description: text('description'),
	status: text('status').default('new'), // 'new' | 'in_progress' | 'review' | 'done'
	priority: text('priority').default('medium'), // 'low' | 'medium' | 'high' | 'critical'
	project_id: uuid('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	assignee_id: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
	reporter_id: uuid('reporter_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	estimated_hours: integer('estimated_hours'),
	actual_hours: integer('actual_hours'),
	due_date: timestamp('due_date', { withTimezone: true }),
	sort_order: integer('sort_order').default(0), // For custom drag-and-drop ordering within columns
	deleted_at: timestamp('deleted_at', { withTimezone: true }),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Enum constraints will be added via SQL migration
	// Performance indexes
	projectIdIdx: index('tickets_project_id_idx').on(table.project_id),
	assigneeIdIdx: index('tickets_assignee_id_idx').on(table.assignee_id),
	reporterIdIdx: index('tickets_reporter_id_idx').on(table.reporter_id),
	statusIdx: index('tickets_status_idx').on(table.status),
	priorityIdx: index('tickets_priority_idx').on(table.priority),
	dueDateIdx: index('tickets_due_date_idx').on(table.due_date),
	titleIdx: index('tickets_title_idx').on(table.title),
	deletedAtIdx: index('tickets_deleted_at_idx').on(table.deleted_at),
})).enableRLS();

// Time entries table
export const timeEntries = pgTable('time_entries', {
	id: uuid('id').primaryKey().defaultRandom(),
	ticket_id: uuid('ticket_id')
		.notNull()
		.references(() => tickets.id, { onDelete: 'restrict' }),
	user_id: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	start_time: timestamp('start_time', { withTimezone: true }).notNull(),
	end_time: timestamp('end_time', { withTimezone: true }),
	duration: decimal('duration', { precision: 8, scale: 2 }), // in hours with decimals
	description: text('description'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Performance indexes
	ticketIdIdx: index('time_entries_ticket_id_idx').on(table.ticket_id),
	userIdIdx: index('time_entries_user_id_idx').on(table.user_id),
	startTimeIdx: index('time_entries_start_time_idx').on(table.start_time),
	createdAtIdx: index('time_entries_created_at_idx').on(table.created_at),
})).enableRLS();

// Comments table
export const comments = pgTable('comments', {
	id: uuid('id').primaryKey().defaultRandom(),
	ticket_id: uuid('ticket_id')
		.notNull()
		.references(() => tickets.id, { onDelete: 'restrict' }),
	user_id: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Performance indexes
	ticketIdIdx: index('comments_ticket_id_idx').on(table.ticket_id),
	userIdIdx: index('comments_user_id_idx').on(table.user_id),
	createdAtIdx: index('comments_created_at_idx').on(table.created_at),
})).enableRLS();

// Billing Periods table
export const billingPeriods = pgTable('billing_periods', {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),
    frequency: text('frequency').notNull(), // 'weekly', 'bi_monthly', 'monthly'
    status: text('status').default('draft'), // 'draft', 'active', 'closed'
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    // Payment tracking fields
    payment_status: text('payment_status').default('pending'), // enum: 'pending', 'sent', 'paid', 'overdue', 'cancelled'
    invoice_sent_date: timestamp('invoice_sent_date', { withTimezone: true }),
    payment_due_date: timestamp('payment_due_date', { withTimezone: true }),
    payment_received_date: timestamp('payment_received_date', { withTimezone: true }),
    payment_amount: decimal('payment_amount', { precision: 10, scale: 2 }),
    payment_reference: text('payment_reference'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Enum constraints will be added via SQL migration
	// Performance indexes
	companyIdIdx: index('billing_periods_company_id_idx').on(table.company_id),
	statusIdx: index('billing_periods_status_idx').on(table.status),
	frequencyIdx: index('billing_periods_frequency_idx').on(table.frequency),
	startDateIdx: index('billing_periods_start_date_idx').on(table.start_date),
	endDateIdx: index('billing_periods_end_date_idx').on(table.end_date),
})).enableRLS();

// Billing Rates table
export const billingRates = pgTable('billing_rates', {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    hourly_rate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').default('USD').notNull(),
    effective_from: date('effective_from').notNull(),
    effective_to: date('effective_to'),
    created_by: uuid('created_by').notNull().references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Performance indexes
	companyIdIdx: index('billing_rates_company_id_idx').on(table.company_id),
	userIdIdx: index('billing_rates_user_id_idx').on(table.user_id),
	projectIdIdx: index('billing_rates_project_id_idx').on(table.project_id),
	effectiveFromIdx: index('billing_rates_effective_from_idx').on(table.effective_from),
	effectiveToIdx: index('billing_rates_effective_to_idx').on(table.effective_to),
})).enableRLS();

// Company Billing Settings table
export const companyBillingSettings = pgTable('company_billing_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
    currency: text('currency').default('USD'),
    billing_frequency: text('billing_frequency'), // 'weekly', 'bi_monthly', 'monthly'
    invoice_prefix: text('invoice_prefix'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Enum constraints will be added via SQL migration
	// Performance indexes
	companyIdIdx: index('company_billing_settings_company_id_idx').on(table.company_id),
})).enableRLS();

// Time Entry Billing table
export const timeEntryBilling = pgTable('time_entry_billing', {
    id: uuid('id').primaryKey().defaultRandom(),
    time_entry_id: uuid('time_entry_id').notNull().references(() => timeEntries.id, { onDelete: 'cascade' }),
    billing_period_id: uuid('billing_period_id').notNull().references(() => billingPeriods.id, { onDelete: 'cascade' }),
    hourly_rate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
    billable_amount: decimal('billable_amount', { precision: 10, scale: 2 }).notNull(),
    is_billable: boolean('is_billable').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Performance indexes
	timeEntryIdIdx: index('time_entry_billing_time_entry_id_idx').on(table.time_entry_id),
	billingPeriodIdIdx: index('time_entry_billing_billing_period_id_idx').on(table.billing_period_id),
	isBillableIdx: index('time_entry_billing_is_billable_idx').on(table.is_billable),
})).enableRLS();

// Ticket History table for tracking changes
export const ticketHistory = pgTable('ticket_history', {
	id: uuid('id').primaryKey().defaultRandom(),
	ticket_id: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'restrict' }),
	user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	field_name: text('field_name').notNull(), // 'status', 'assignee', 'priority', 'title', 'description', etc.
	old_value: text('old_value'),
	new_value: text('new_value'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Performance indexes
	ticketIdIdx: index('ticket_history_ticket_id_idx').on(table.ticket_id),
	userIdIdx: index('ticket_history_user_id_idx').on(table.user_id),
	fieldNameIdx: index('ticket_history_field_name_idx').on(table.field_name),
	createdAtIdx: index('ticket_history_created_at_idx').on(table.created_at),
})).enableRLS();

// Activities table for comprehensive activity logging
export const activities = pgTable('activities', {
	id: uuid('id').primaryKey().defaultRandom(),
	type: text('type').notNull(), // 'project_created', 'ticket_created', etc.
	project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
	ticket_id: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
	user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	target_user_id: uuid('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	metadata: jsonb('metadata'), // Additional data as JSON
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Performance indexes
	typeIdx: index('activities_type_idx').on(table.type),
	projectIdIdx: index('activities_project_id_idx').on(table.project_id),
	ticketIdIdx: index('activities_ticket_id_idx').on(table.ticket_id),
	userIdIdx: index('activities_user_id_idx').on(table.user_id),
	targetUserIdIdx: index('activities_target_user_id_idx').on(table.target_user_id),
	createdAtIdx: index('activities_created_at_idx').on(table.created_at),
})).enableRLS();

// Payment History table for tracking payment-related changes
export const paymentHistory = pgTable('payment_history', {
	id: uuid('id').primaryKey().defaultRandom(),
	billing_period_id: uuid('billing_period_id').notNull().references(() => billingPeriods.id, { onDelete: 'cascade' }),
	user_id: uuid('user_id').notNull().references(() => users.id),
	action: text('action').notNull(), // 'status_changed', 'invoice_sent', 'payment_received', 'due_date_set', 'notes_updated'
	old_value: text('old_value'),
	new_value: text('new_value'),
	notes: text('notes'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	// Performance indexes
	billingPeriodIdIdx: index('payment_history_billing_period_id_idx').on(table.billing_period_id),
	userIdIdx: index('payment_history_user_id_idx').on(table.user_id),
	actionIdx: index('payment_history_action_idx').on(table.action),
	createdAtIdx: index('payment_history_created_at_idx').on(table.created_at),
})).enableRLS();
