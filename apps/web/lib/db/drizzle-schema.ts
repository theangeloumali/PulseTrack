// Drizzle schema for migrations only - not used at runtime
import { pgTable, uuid, text, timestamp, integer, unique, decimal, foreignKey, date } from 'drizzle-orm/pg-core';

// Companies table
export const companies = pgTable('companies', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// Users table
export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey(), // References auth.users(id)
		email: text('email').notNull(),
		first_name: text('first_name'),
		last_name: text('last_name'),
		avatar_url: text('avatar_url'),
		role: text('role').default('user'), // 'admin' | 'manager' | 'user'
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
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

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
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// Time entries table
export const timeEntries = pgTable('time_entries', {
	id: uuid('id').primaryKey().defaultRandom(),
	ticket_id: uuid('ticket_id')
		.notNull()
		.references(() => tickets.id, { onDelete: 'cascade' }),
	user_id: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	start_time: timestamp('start_time', { withTimezone: true }).notNull(),
	end_time: timestamp('end_time', { withTimezone: true }),
	duration: integer('duration'), // in seconds
	description: text('description'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// Comments table
export const comments = pgTable('comments', {
	id: uuid('id').primaryKey().defaultRandom(),
	ticket_id: uuid('ticket_id')
		.notNull()
		.references(() => tickets.id, { onDelete: 'cascade' }),
	user_id: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// Billing Periods table
export const billingPeriods = pgTable('billing_periods', {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),
    frequency: text('frequency').notNull(), // 'weekly', 'bi_monthly', 'monthly'
    status: text('status').default('draft'), // 'draft', 'active', 'closed'
    created_by: uuid('created_by').notNull().references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

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
}).enableRLS();

// Company Billing Settings table
export const companyBillingSettings = pgTable('company_billing_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
    currency: text('currency').default('USD'),
    billing_frequency: text('billing_frequency'), // 'weekly', 'bi_monthly', 'monthly'
    invoice_prefix: text('invoice_prefix'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// Time Entry Billing table
export const timeEntryBilling = pgTable('time_entry_billing', {
    id: uuid('id').primaryKey().defaultRandom(),
    time_entry_id: uuid('time_entry_id').notNull().references(() => timeEntries.id, { onDelete: 'cascade' }),
    billing_period_id: uuid('billing_period_id').notNull().references(() => billingPeriods.id, { onDelete: 'cascade' }),
    hourly_rate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
    billable_amount: decimal('billable_amount', { precision: 10, scale: 2 }).notNull(),
    is_billable: text('is_billable').default('true'), // Using text to avoid boolean issues
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

