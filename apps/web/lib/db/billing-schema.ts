import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { companies } from "./drizzle-schema";
import { users } from "./drizzle-schema";
import { projects } from "./drizzle-schema";
import { timeEntries } from "./drizzle-schema";

export const billingPeriods = pgTable("billing_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  frequency: text("frequency").notNull(), // 'weekly', 'bi_monthly', 'monthly'
  status: text("status").default("draft"), // 'draft', 'active', 'closed'
  created_by: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingRates = pgTable("billing_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  project_id: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  effective_from: date("effective_from").notNull(),
  effective_to: date("effective_to"),
  created_by: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companyBillingSettings = pgTable("company_billing_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" })
    .unique(),
  default_hourly_rate: decimal("default_hourly_rate", {
    precision: 10,
    scale: 2,
  }),
  default_currency: text("default_currency").default("USD"),
  billing_frequency: text("billing_frequency"), // 'weekly', 'bi_monthly', 'monthly'
  invoice_prefix: text("invoice_prefix"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const timeEntryBilling = pgTable("time_entry_billing", {
  id: uuid("id").primaryKey().defaultRandom(),
  time_entry_id: uuid("time_entry_id")
    .notNull()
    .references(() => timeEntries.id, { onDelete: "cascade" }),
  billing_period_id: uuid("billing_period_id")
    .notNull()
    .references(() => billingPeriods.id, { onDelete: "cascade" }),
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  billable_amount: decimal("billable_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  is_billable: boolean("is_billable").default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
