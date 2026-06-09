/**
 * seed-demo.mjs — Idempotent demo seed for PulseTrack.
 *
 * Usage:
 *   node scripts/seed-demo.mjs              # create / upsert all demo data (safe to re-run)
 *   node scripts/seed-demo.mjs --teardown   # remove all demo data (keeps tables)
 *
 * What it does:
 *   - Loads apps/web/.env manually (no --env-file needed).
 *   - Creates auth users via supabaseAdmin.auth.admin.createUser (service role) and
 *     matching public.users rows (role / company_id / status='active').
 *   - Applies ADDITIVE client-management DDL over a direct Postgres connection
 *     (clients, client_contacts, projects.client_id) — PostgREST cannot run DDL.
 *   - Seeds two demo tenants ("ZKidz Studio", "Globex Co.") with clients,
 *     contacts, projects, members, tickets (all 4 statuses), recent time entries,
 *     billing (rates / periods / time_entry_billing / payment_history) and activities.
 *
 * Teardown is targeted by demo markers:
 *   - companies.slug in ('zkidz-studio','globex-co')
 *   - auth/public users with @pulsetrack.demo email
 *   - activities.metadata.seed = 'demo-2026'
 *   - notes/description fields suffixed '[demo-seed]'
 * It deletes rows in reverse-FK order and drops NO tables.
 *
 * Requires (in apps/web/.env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 */

import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import postgres from 'postgres';

// ---------------------------------------------------------------------------
// Env loading (manual KEY=VALUE parse so `node scripts/seed-demo.mjs` just works)
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, '..', '.env');

function loadEnv(envPath) {
  let text;
  try {
    text = readFileSync(envPath, 'utf8');
  } catch (error) {
    throw new Error(`Could not read env file at ${envPath}: ${error.message}`);
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(ENV_PATH);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL) {
  throw new Error(
    'Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL',
  );
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {persistSession: false, autoRefreshToken: false},
});
const sql = postgres(DATABASE_URL, {prepare: false});

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------
const DEMO_PASSWORD = 'DemoPass!2026';
const DEMO_DOMAIN = '@pulsetrack.demo';
const SEED_TAG = 'demo-2026';
const NOTE_TAG = '[demo-seed]';
const DEMO_SLUGS = ['zkidz-studio', 'globex-co'];

const NOW = new Date();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const daysAgo = (n) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
};
const iso = (d) => d.toISOString();
const dateOnly = (d) => d.toISOString().slice(0, 10);

function timeEntry(daysBack, startHour, durationHours, label) {
  const start = daysAgo(daysBack);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + Math.round(durationHours * 60));
  return {
    start_time: iso(start),
    end_time: iso(end),
    duration: durationHours,
    description: `${label} ${NOTE_TAG}`,
  };
}

function assertOk(res, label) {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data;
}

const counts = {
  companies: 0,
  authUsers: 0,
  users: 0,
  clients: 0,
  client_contacts: 0,
  projects: 0,
  project_members: 0,
  tickets: 0,
  time_entries: 0,
  billing_rates: 0,
  company_billing_settings: 0,
  billing_periods: 0,
  time_entry_billing: 0,
  payment_history: 0,
  activities: 0,
};

// ---------------------------------------------------------------------------
// Demo data definitions
// ---------------------------------------------------------------------------
const COMPANIES = {
  zk: {name: 'ZKidz Studio', slug: 'zkidz-studio'},
  gx: {name: 'Globex Co.', slug: 'globex-co'},
};

const ACCOUNTS = [
  {
    key: 'superadmin',
    email: `superadmin${DEMO_DOMAIN}`,
    role: 'super_admin',
    first: 'Sara',
    last: 'Quinn',
    company: 'zk',
    rate: null,
  },
  {
    key: 'sysadmin',
    email: `sysadmin${DEMO_DOMAIN}`,
    role: 'system_admin',
    first: 'Sam',
    last: 'Okafor',
    company: 'zk',
    rate: null,
  },
  {
    key: 'admin',
    email: `admin${DEMO_DOMAIN}`,
    role: 'company_admin',
    first: 'Avery',
    last: 'Lopez',
    company: 'zk',
    rate: 120,
  },
  {
    key: 'manager',
    email: `manager${DEMO_DOMAIN}`,
    role: 'manager',
    first: 'Morgan',
    last: 'Reed',
    company: 'zk',
    rate: 95,
  },
  {
    key: 'dev1',
    email: `dev1${DEMO_DOMAIN}`,
    role: 'user',
    first: 'Dana',
    last: 'Cruz',
    company: 'zk',
    rate: 75,
  },
  {
    key: 'dev2',
    email: `dev2${DEMO_DOMAIN}`,
    role: 'user',
    first: 'Devon',
    last: 'Park',
    company: 'zk',
    rate: 80,
  },
  {
    key: 'designer',
    email: `designer${DEMO_DOMAIN}`,
    role: 'user',
    first: 'Dee',
    last: 'Nakamura',
    company: 'zk',
    rate: 70,
  },
  {
    key: 'admin2',
    email: `admin2${DEMO_DOMAIN}`,
    role: 'company_admin',
    first: 'Blake',
    last: 'Stone',
    company: 'gx',
    rate: 110,
  },
  {
    key: 'user2',
    email: `user2${DEMO_DOMAIN}`,
    role: 'user',
    first: 'Casey',
    last: 'Vega',
    company: 'gx',
    rate: 65,
  },
];

// ZKidz Studio client-management demo: clients -> contacts -> projects
const ZK_CLIENTS = [
  {
    name: 'Acme Corp',
    ownerKey: 'admin',
    contacts: [
      {name: 'Jane Doe', role: 'Project Manager', email: 'jane.doe@acme.demo', isPrimary: true},
      {name: 'John Roe', role: 'Finance', email: 'john.roe@acme.demo', isPrimary: false},
    ],
    projects: [
      {name: 'Acme Website Revamp', leadKey: 'dev1', memberKeys: ['dev1', 'designer']},
      {name: 'Acme Mobile App', leadKey: 'dev2', memberKeys: ['dev2', 'dev1']},
    ],
  },
  {
    name: 'Initech',
    ownerKey: 'manager',
    contacts: [
      {name: 'Bill Lumbergh', role: 'Director', email: 'bill@initech.demo', isPrimary: true},
    ],
    projects: [{name: 'Initech TPS Portal', leadKey: 'dev2', memberKeys: ['dev1', 'dev2']}],
  },
  {
    name: 'Umbrella LLC',
    ownerKey: 'admin',
    contacts: [
      {name: 'Alice Wesker', role: 'CTO', email: 'alice@umbrella.demo', isPrimary: true},
      {name: 'Ada Wong', role: 'Operations', email: 'ada@umbrella.demo', isPrimary: false},
    ],
    projects: [
      {name: 'Umbrella Dashboard', leadKey: 'designer', memberKeys: ['designer', 'dev2']},
      {name: 'Umbrella API', leadKey: 'dev2', memberKeys: ['dev2', 'dev1']},
    ],
  },
];

const TICKET_STATUSES = ['new', 'in_progress', 'review', 'done'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const TICKET_TITLES = ['Discovery & setup', 'Build core feature', 'QA & review', 'Ship & document'];

const BILLING_PERIODS = [
  {
    name: 'May 2026',
    frequency: 'monthly',
    status: 'closed',
    payment_status: 'paid',
    amount: 4200,
    ref: 'INV-ZK-0001',
    sent: 35,
    due: 20,
    recv: 18,
  },
  {
    name: 'April 2026',
    frequency: 'monthly',
    status: 'closed',
    payment_status: 'overdue',
    amount: 3800,
    ref: 'INV-ZK-0002',
    sent: 65,
    due: 35,
    recv: null,
  },
  {
    name: 'June 2026 (current)',
    frequency: 'monthly',
    status: 'active',
    payment_status: 'sent',
    amount: 5100,
    ref: 'INV-ZK-0003',
    sent: 5,
    due: -10,
    recv: null,
  },
  {
    name: 'July 2026 (upcoming)',
    frequency: 'monthly',
    status: 'draft',
    payment_status: 'pending',
    amount: null,
    ref: null,
    sent: null,
    due: -25,
    recv: null,
  },
];

// ---------------------------------------------------------------------------
// Additive DDL (clients / client_contacts / projects.client_id) via direct PG.
// New tables use ENABLE RLS (NOT FORCE) on purpose: this seed inserts into them
// over the DATABASE_URL connection, which is the table owner — the owner is only
// exempt from RLS when the table is not FORCEd. We still apply service_role +
// company-scoped authenticated policies (mirroring rls_policies.sql) so the app's
// PostgREST/authenticated access stays tenant-safe.
// ---------------------------------------------------------------------------
const DDL = `
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'active',
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  contact_email text,
  contact_phone text,
  website text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  title text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_company_id_idx ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS client_contacts_client_id_idx ON public.client_contacts(client_id);

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  has_helpers boolean := EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_service_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_company')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_manage_company');
BEGIN
  IF NOT has_helpers THEN
    RAISE NOTICE 'RLS helper functions not found; skipping policy creation (run pnpm db:rls:apply first).';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "service_role_bypass" ON public.clients';
  EXECUTE 'CREATE POLICY "service_role_bypass" ON public.clients FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role())';
  EXECUTE 'DROP POLICY IF EXISTS "clients_select" ON public.clients';
  EXECUTE 'CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (public.can_access_company(company_id))';
  EXECUTE 'DROP POLICY IF EXISTS "clients_modify" ON public.clients';
  EXECUTE 'CREATE POLICY "clients_modify" ON public.clients FOR ALL TO authenticated USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id))';

  EXECUTE 'DROP POLICY IF EXISTS "service_role_bypass" ON public.client_contacts';
  EXECUTE 'CREATE POLICY "service_role_bypass" ON public.client_contacts FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role())';
  EXECUTE 'DROP POLICY IF EXISTS "client_contacts_select" ON public.client_contacts';
  EXECUTE 'CREATE POLICY "client_contacts_select" ON public.client_contacts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_contacts.client_id AND public.can_access_company(c.company_id)))';
  EXECUTE 'DROP POLICY IF EXISTS "client_contacts_modify" ON public.client_contacts';
  EXECUTE 'CREATE POLICY "client_contacts_modify" ON public.client_contacts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_contacts.client_id AND public.can_manage_company(c.company_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_contacts.client_id AND public.can_manage_company(c.company_id)))';
END $$;
`;

async function applyDdl() {
  await sql.unsafe(DDL);
  // Ask PostgREST to refresh its schema cache so projects.client_id becomes writable via the API.
  await sql.unsafe(`NOTIFY pgrst, 'reload schema'`);
}

// ---------------------------------------------------------------------------
// getOrCreate / ensure helpers
// ---------------------------------------------------------------------------
async function getOrCreateCompany(def) {
  const found = assertOk(
    await supabase.from('companies').select('id').eq('slug', def.slug).limit(1),
    'find company',
  );
  if (found?.length) return found[0].id;
  const row = assertOk(
    await supabase.from('companies').insert({name: def.name, slug: def.slug}).select('id').single(),
    'insert company',
  );
  counts.companies += 1;
  return row.id;
}

async function fetchAuthUsersByEmail() {
  const map = new Map();
  let page = 1;
  for (;;) {
    const {data, error} = await supabase.auth.admin.listUsers({page, perPage: 1000});
    if (error) throw new Error(`listUsers: ${error.message}`);
    const users = data?.users ?? [];
    for (const user of users) {
      if (user.email) map.set(user.email.toLowerCase(), user);
    }
    if (users.length < 1000) break;
    page += 1;
  }
  return map;
}

async function getOrCreateAuthUser(authMap, acct) {
  const existing = authMap.get(acct.email.toLowerCase());
  if (existing) return existing.id;

  const {data, error} = await supabase.auth.admin.createUser({
    email: acct.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {first_name: acct.first, last_name: acct.last, role: acct.role},
  });

  if (error) {
    if (/already.*regist|already been/i.test(error.message)) {
      const refreshed = await fetchAuthUsersByEmail();
      const user = refreshed.get(acct.email.toLowerCase());
      if (user) return user.id;
    }
    throw new Error(`createUser ${acct.email}: ${error.message}`);
  }
  counts.authUsers += 1;
  return data.user.id;
}

async function upsertPublicUser(id, acct, companyId) {
  const res = await supabase
    .from('users')
    .upsert(
      {
        id,
        email: acct.email,
        first_name: acct.first,
        last_name: acct.last,
        role: acct.role,
        company_id: companyId,
        hourly_rate: acct.rate,
        status: 'active',
      },
      {onConflict: 'id'},
    )
    .select('id');
  if (res.error) throw new Error(`upsert user ${acct.email}: ${res.error.message}`);
  counts.users += 1;
}

async function getOrCreateClient(companyId, def, ownerId) {
  const existing = await sql`
    SELECT id FROM public.clients WHERE company_id = ${companyId}::uuid AND name = ${def.name} LIMIT 1
  `;
  if (existing.length) return existing[0].id;
  const rows = await sql`
    INSERT INTO public.clients (company_id, name, owner_id, status, notes)
    VALUES (${companyId}, ${def.name}, ${ownerId}, 'active', ${NOTE_TAG})
    RETURNING id
  `;
  counts.clients += 1;
  return rows[0].id;
}

async function getOrCreateContact(clientId, contact) {
  const existing = await sql`
    SELECT id FROM public.client_contacts WHERE client_id = ${clientId}::uuid AND name = ${contact.name} LIMIT 1
  `;
  if (existing.length) return existing[0].id;
  const rows = await sql`
    INSERT INTO public.client_contacts (client_id, name, email, title, is_primary)
    VALUES (${clientId}, ${contact.name}, ${contact.email}, ${contact.role}, ${contact.isPrimary})
    RETURNING id
  `;
  counts.client_contacts += 1;
  return rows[0].id;
}

async function getOrCreateProject(companyId, name, ownerId) {
  const found = assertOk(
    await supabase
      .from('projects')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name)
      .limit(1),
    'find project',
  );
  if (found?.length) return found[0].id;
  const row = assertOk(
    await supabase
      .from('projects')
      .insert({
        name,
        description: `${name} ${NOTE_TAG}`,
        status: 'active',
        company_id: companyId,
        owner_id: ownerId,
        visibility: 'company',
        allow_external_activities: false,
      })
      .select('id')
      .single(),
    'insert project',
  );
  counts.projects += 1;
  return row.id;
}

// projects has FORCE RLS; the service_role API bypasses it. We retry to absorb
// PostgREST schema-cache lag after ADD COLUMN client_id.
async function setProjectClient(projectId, clientId) {
  if (!clientId) return;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const res = await supabase
      .from('projects')
      .update({client_id: clientId})
      .eq('id', projectId)
      .select('id');
    if (!res.error) return;
    const message = res.error.message ?? '';
    const code = res.error.code ?? '';
    if (code === 'PGRST204' || /client_id/i.test(message) || /schema cache/i.test(message)) {
      await sleep(1500);
      continue;
    }
    throw new Error(`set project client_id: ${message}`);
  }
  throw new Error('set project client_id: PostgREST schema cache did not refresh in time');
}

async function ensureMember(projectId, userId, role) {
  const res = await supabase
    .from('project_members')
    .upsert(
      {project_id: projectId, user_id: userId, role},
      {onConflict: 'project_id,user_id', ignoreDuplicates: true},
    )
    .select('id');
  if (res.error) throw new Error(`ensure member: ${res.error.message}`);
  if (res.data?.length) counts.project_members += res.data.length;
}

async function getOrCreateTicket(projectId, ticket) {
  const found = assertOk(
    await supabase
      .from('tickets')
      .select('id')
      .eq('project_id', projectId)
      .eq('title', ticket.title)
      .is('deleted_at', null)
      .limit(1),
    'find ticket',
  );
  if (found?.length) return found[0].id;
  const row = assertOk(
    await supabase.from('tickets').insert(ticket).select('id').single(),
    'insert ticket',
  );
  counts.tickets += 1;
  return row.id;
}

async function ensureTimeEntries(ticketId, userId, entries) {
  const existing = assertOk(
    await supabase.from('time_entries').select('id, duration, user_id').eq('ticket_id', ticketId),
    'find time entries',
  );
  if (existing?.length) {
    return existing.map((e) => ({id: e.id, userId: e.user_id, duration: Number(e.duration) || 0}));
  }
  const payload = entries.map((e) => ({...e, ticket_id: ticketId, user_id: userId}));
  const inserted = assertOk(
    await supabase
      .from('time_entries')
      .insert(payload)
      .select('id, duration')
      .limit(payload.length),
    'insert time entries',
  );
  counts.time_entries += inserted.length;
  return inserted.map((e) => ({id: e.id, userId, duration: Number(e.duration) || 0}));
}

async function ensureActivities(projectId, ownerId, projectName, clientName, ticketRows) {
  const found = assertOk(
    await supabase
      .from('activities')
      .select('id')
      .eq('project_id', projectId)
      .eq('metadata->>seed', SEED_TAG)
      .limit(1),
    'find activities',
  );
  if (found?.length) return;

  const activities = [
    {
      type: 'project_created',
      project_id: projectId,
      ticket_id: null,
      user_id: ownerId,
      target_user_id: null,
      title: `Project created: ${projectName}`,
      description: `Demo project seeded ${NOTE_TAG}`,
      metadata: {seed: SEED_TAG, client: clientName ?? null},
    },
  ];
  for (const ticket of ticketRows.slice(0, 2)) {
    activities.push({
      type: 'ticket_created',
      project_id: projectId,
      ticket_id: ticket.id,
      user_id: ownerId,
      target_user_id: ticket.assigneeId,
      title: `Ticket created: ${ticket.title}`,
      description: `Seeded ticket ${NOTE_TAG}`,
      metadata: {seed: SEED_TAG, status: ticket.status},
    });
  }
  const inserted = assertOk(
    await supabase.from('activities').insert(activities).select('id'),
    'insert activities',
  );
  counts.activities += inserted.length;
}

// Seeds one project + members + tickets + time entries + activities.
// Returns time-entry info (for billing) collected from this project.
async function seedProject(companyId, projectDef, ownerId, clientId, clientName, userIdByKey) {
  const projectId = await getOrCreateProject(companyId, projectDef.name, ownerId);
  await setProjectClient(projectId, clientId);

  const memberIds = projectDef.memberKeys.map((k) => userIdByKey.get(k));
  const leadId = userIdByKey.get(projectDef.leadKey);
  for (const userId of memberIds) {
    await ensureMember(projectId, userId, userId === leadId ? 'lead' : 'member');
  }

  const entryInfos = [];
  const ticketRows = [];
  for (let i = 0; i < TICKET_STATUSES.length; i += 1) {
    const status = TICKET_STATUSES[i];
    const assigneeId = memberIds[i % memberIds.length];
    const ticketId = await getOrCreateTicket(projectId, {
      title: `${projectDef.name} — ${TICKET_TITLES[i]}`,
      description: `${TICKET_TITLES[i]} for ${projectDef.name} ${NOTE_TAG}`,
      status,
      priority: TICKET_PRIORITIES[i],
      project_id: projectId,
      assignee_id: assigneeId,
      reporter_id: ownerId,
      estimated_hours: 4 + i * 2,
      actual_hours: status === 'done' ? 4 + i * 2 : i,
      due_date: iso(daysAgo(-(i + 2))),
      sort_order: i,
    });
    ticketRows.push({
      id: ticketId,
      title: `${projectDef.name} — ${TICKET_TITLES[i]}`,
      assigneeId,
      status,
    });

    const entries = [
      timeEntry(2 + i, 9, 2.5, 'Implementation'),
      timeEntry(5 + i, 14, 1.5, 'Follow-up'),
    ];
    const inserted = await ensureTimeEntries(ticketId, assigneeId, entries);
    entryInfos.push(...inserted);
  }

  await ensureActivities(projectId, ownerId, projectDef.name, clientName, ticketRows);
  return entryInfos;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------
async function ensureBillingSettings(companyId, prefix, email) {
  const res = await supabase
    .from('company_billing_settings')
    .upsert(
      {
        company_id: companyId,
        currency: 'USD',
        billing_frequency: 'monthly',
        invoice_prefix: prefix,
        company_email: email,
        invoice_footer: `Thank you for your business ${NOTE_TAG}`,
      },
      {onConflict: 'company_id'},
    )
    .select('id');
  if (res.error) throw new Error(`billing settings: ${res.error.message}`);
  counts.company_billing_settings += 1;
}

async function ensureBillingRate(companyId, userId, rate, createdBy) {
  const found = assertOk(
    await supabase
      .from('billing_rates')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .limit(1),
    'find billing rate',
  );
  if (found?.length) return;
  assertOk(
    await supabase
      .from('billing_rates')
      .insert({
        company_id: companyId,
        user_id: userId,
        hourly_rate: rate,
        currency: 'USD',
        effective_from: dateOnly(daysAgo(60)),
        created_by: createdBy,
      })
      .select('id'),
    'insert billing rate',
  );
  counts.billing_rates += 1;
}

async function getOrCreateBillingPeriod(companyId, period, createdBy, index) {
  const fullName = `${period.name} ${NOTE_TAG}`;
  const found = assertOk(
    await supabase
      .from('billing_periods')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', fullName)
      .limit(1),
    'find billing period',
  );
  if (found?.length) return found[0].id;
  const row = assertOk(
    await supabase
      .from('billing_periods')
      .insert({
        company_id: companyId,
        name: fullName,
        start_date: dateOnly(daysAgo(50 + index * 30)),
        end_date: dateOnly(daysAgo(20 + index * 30)),
        frequency: period.frequency,
        status: period.status,
        payment_status: period.payment_status,
        invoice_sent_date: period.sent == null ? null : iso(daysAgo(period.sent)),
        payment_due_date: period.due == null ? null : iso(daysAgo(period.due)),
        payment_received_date: period.recv == null ? null : iso(daysAgo(period.recv)),
        payment_amount: period.amount,
        payment_reference: period.ref,
        notes: NOTE_TAG,
        created_by: createdBy,
      })
      .select('id')
      .single(),
    'insert billing period',
  );
  counts.billing_periods += 1;
  return row.id;
}

async function ensureTimeEntryBilling(entryId, periodId, rate, duration) {
  const found = assertOk(
    await supabase
      .from('time_entry_billing')
      .select('id')
      .eq('time_entry_id', entryId)
      .eq('billing_period_id', periodId)
      .limit(1),
    'find time entry billing',
  );
  if (found?.length) return;
  assertOk(
    await supabase
      .from('time_entry_billing')
      .insert({
        time_entry_id: entryId,
        billing_period_id: periodId,
        hourly_rate: rate,
        billable_amount: Number((duration * rate).toFixed(2)),
        is_billable: true,
      })
      .select('id'),
    'insert time entry billing',
  );
  counts.time_entry_billing += 1;
}

async function ensurePaymentHistory(periodId, userId, action, oldValue, newValue) {
  const found = assertOk(
    await supabase
      .from('payment_history')
      .select('id')
      .eq('billing_period_id', periodId)
      .eq('action', action)
      .limit(1),
    'find payment history',
  );
  if (found?.length) return;
  assertOk(
    await supabase
      .from('payment_history')
      .insert({
        billing_period_id: periodId,
        user_id: userId,
        action,
        old_value: oldValue,
        new_value: newValue,
        notes: NOTE_TAG,
      })
      .select('id'),
    'insert payment history',
  );
  counts.payment_history += 1;
}

async function seedBilling(companyId, adminId, entryInfos, rateByUserId) {
  await ensureBillingSettings(companyId, 'ZK', 'billing@zkidzdev.com');

  for (const key of ['dev1', 'dev2', 'designer']) {
    const acct = ACCOUNTS.find((a) => a.key === key);
    await ensureBillingRate(companyId, rateByUserId.get(`__key__${key}`), acct.rate, adminId);
  }

  const periodIds = [];
  for (let i = 0; i < BILLING_PERIODS.length; i += 1) {
    periodIds.push(await getOrCreateBillingPeriod(companyId, BILLING_PERIODS[i], adminId, i));
  }

  // Attach a handful of time entries to the first (paid) period.
  const paidPeriodId = periodIds[0];
  for (const entry of entryInfos.slice(0, 8)) {
    const rate = rateByUserId.get(entry.userId) ?? 75;
    await ensureTimeEntryBilling(entry.id, paidPeriodId, rate, entry.duration);
  }

  // Payment history across statuses.
  await ensurePaymentHistory(periodIds[0], adminId, 'invoice_sent', null, 'sent');
  await ensurePaymentHistory(periodIds[0], adminId, 'payment_received', 'sent', 'paid');
  await ensurePaymentHistory(periodIds[1], adminId, 'invoice_sent', null, 'sent');
  await ensurePaymentHistory(periodIds[1], adminId, 'status_changed', 'sent', 'overdue');
  await ensurePaymentHistory(periodIds[2], adminId, 'invoice_sent', null, 'sent');
}

// ---------------------------------------------------------------------------
// Seed entry point
// ---------------------------------------------------------------------------
async function seed() {
  console.log('Applying additive client-management DDL...');
  await applyDdl();

  console.log('Ensuring companies...');
  const companyIdByKey = new Map();
  for (const [key, def] of Object.entries(COMPANIES)) {
    companyIdByKey.set(key, await getOrCreateCompany(def));
  }

  console.log('Ensuring auth + public users...');
  const authMap = await fetchAuthUsersByEmail();
  const userIdByKey = new Map();
  const rateByUserId = new Map();
  for (const acct of ACCOUNTS) {
    const companyId = companyIdByKey.get(acct.company);
    const userId = await getOrCreateAuthUser(authMap, acct);
    await upsertPublicUser(userId, acct, companyId);
    userIdByKey.set(acct.key, userId);
    rateByUserId.set(userId, acct.rate ?? 75);
    rateByUserId.set(`__key__${acct.key}`, userId); // key -> userId lookup for billing rates
  }

  const zkCompanyId = companyIdByKey.get('zk');
  const gxCompanyId = companyIdByKey.get('gx');
  const adminId = userIdByKey.get('admin');
  const admin2Id = userIdByKey.get('admin2');

  console.log('Ensuring ZKidz Studio clients, contacts, projects, tickets...');
  const zkEntryInfos = [];
  for (const clientDef of ZK_CLIENTS) {
    const ownerId = userIdByKey.get(clientDef.ownerKey);
    const clientId = await getOrCreateClient(zkCompanyId, clientDef, ownerId);
    for (const contact of clientDef.contacts) {
      await getOrCreateContact(clientId, contact);
    }
    for (const projectDef of clientDef.projects) {
      const infos = await seedProject(
        zkCompanyId,
        projectDef,
        ownerId,
        clientId,
        clientDef.name,
        userIdByKey,
      );
      zkEntryInfos.push(...infos);
    }
  }

  console.log('Ensuring ZKidz Studio billing...');
  await seedBilling(zkCompanyId, adminId, zkEntryInfos, rateByUserId);

  console.log('Ensuring Globex Co. cross-tenant project...');
  await ensureBillingSettings(gxCompanyId, 'GX', 'billing@globex.demo');
  await seedProject(
    gxCompanyId,
    {name: 'Globex Internal Tools', leadKey: 'admin2', memberKeys: ['admin2', 'user2']},
    admin2Id,
    null,
    null,
    userIdByKey,
  );

  printAccounts(companyIdByKey);
  printCounts('Rows ensured this run');
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------
async function delIn(table, column, ids, label) {
  if (!ids.length) return 0;
  const res = await supabase.from(table).delete().in(column, ids).select('id');
  if (res.error) throw new Error(`delete ${table}: ${res.error.message}`);
  return res.data?.length ?? 0;
}

async function teardown() {
  const removed = {};
  const bump = (k, n) => {
    removed[k] = (removed[k] ?? 0) + n;
  };

  const companies = assertOk(
    await supabase.from('companies').select('id').in('slug', DEMO_SLUGS),
    'find demo companies',
  );
  const companyIds = companies.map((c) => c.id);

  let projectIds = [];
  if (companyIds.length) {
    const projects = assertOk(
      await supabase.from('projects').select('id').in('company_id', companyIds),
      'find demo projects',
    );
    projectIds = projects.map((p) => p.id);
  }

  let ticketIds = [];
  if (projectIds.length) {
    const tickets = assertOk(
      await supabase.from('tickets').select('id').in('project_id', projectIds),
      'find demo tickets',
    );
    ticketIds = tickets.map((t) => t.id);
  }

  let entryIds = [];
  if (ticketIds.length) {
    const entries = assertOk(
      await supabase.from('time_entries').select('id').in('ticket_id', ticketIds),
      'find demo time entries',
    );
    entryIds = entries.map((e) => e.id);
  }

  let periodIds = [];
  if (companyIds.length) {
    const periods = assertOk(
      await supabase.from('billing_periods').select('id').in('company_id', companyIds),
      'find demo billing periods',
    );
    periodIds = periods.map((p) => p.id);
  }

  // Reverse-FK deletion order.
  bump('time_entry_billing', await delIn('time_entry_billing', 'time_entry_id', entryIds));
  bump('time_entry_billing', await delIn('time_entry_billing', 'billing_period_id', periodIds));
  bump('payment_history', await delIn('payment_history', 'billing_period_id', periodIds));
  bump('time_entries', await delIn('time_entries', 'ticket_id', ticketIds));
  bump('comments', await delIn('comments', 'ticket_id', ticketIds));
  bump('ticket_history', await delIn('ticket_history', 'ticket_id', ticketIds));
  bump('activities', await delIn('activities', 'project_id', projectIds));

  // Stray activities tagged by seed marker (any project).
  {
    const res = await supabase
      .from('activities')
      .delete()
      .eq('metadata->>seed', SEED_TAG)
      .select('id');
    if (res.error) throw new Error(`delete tagged activities: ${res.error.message}`);
    bump('activities', res.data?.length ?? 0);
  }

  bump('tickets', await delIn('tickets', 'project_id', projectIds));
  bump('billing_periods', await delIn('billing_periods', 'company_id', companyIds));
  bump('billing_rates', await delIn('billing_rates', 'company_id', companyIds));
  bump(
    'company_billing_settings',
    await delIn('company_billing_settings', 'company_id', companyIds),
  );
  bump('project_members', await delIn('project_members', 'project_id', projectIds));
  bump('projects', await delIn('projects', 'company_id', companyIds));

  // New tables via direct PG (PostgREST may not have them cached). Tolerate absence.
  for (const cid of companyIds) {
    try {
      const cc = await sql`
        DELETE FROM public.client_contacts
        WHERE client_id IN (SELECT id FROM public.clients WHERE company_id = ${cid}::uuid)
        RETURNING id
      `;
      bump('client_contacts', cc.length);
      const cl = await sql`DELETE FROM public.clients WHERE company_id = ${cid}::uuid RETURNING id`;
      bump('clients', cl.length);
    } catch (error) {
      if (!/does not exist/i.test(error.message)) throw error;
    }
  }

  // Public user rows (by company OR demo domain), then companies.
  if (companyIds.length) {
    const res = await supabase.from('users').delete().in('company_id', companyIds).select('id');
    if (res.error) throw new Error(`delete users by company: ${res.error.message}`);
    bump('users', res.data?.length ?? 0);
  }
  {
    const res = await supabase.from('users').delete().like('email', `%${DEMO_DOMAIN}`).select('id');
    if (res.error) throw new Error(`delete users by domain: ${res.error.message}`);
    bump('users', res.data?.length ?? 0);
  }
  bump('companies', await delIn('companies', 'id', companyIds));

  // Auth users by demo domain.
  const authMap = await fetchAuthUsersByEmail();
  let authDeleted = 0;
  for (const [email, user] of authMap) {
    if (!email.endsWith(DEMO_DOMAIN)) continue;
    const {error} = await supabase.auth.admin.deleteUser(user.id);
    if (error && !/not found/i.test(error.message)) {
      throw new Error(`delete auth user ${email}: ${error.message}`);
    }
    authDeleted += 1;
  }
  bump('authUsers', authDeleted);

  console.log('\nTeardown complete. No tables dropped.');
  printCountsObject('Rows removed', removed);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function printAccounts(companyIdByKey) {
  const companyNameByKey = Object.fromEntries(
    Object.entries(COMPANIES).map(([k, v]) => [k, v.name]),
  );
  const rows = ACCOUNTS.map((a) => ({
    email: a.email,
    password: DEMO_PASSWORD,
    role: a.role,
    company: companyNameByKey[a.company],
  }));
  console.log('\nDemo accounts (all share the same password):');
  console.table(rows);
}

function printCounts(title) {
  printCountsObject(title, counts);
}

function printCountsObject(title, obj) {
  console.log(`\n${title}:`);
  console.table(Object.entries(obj).map(([table, count]) => ({table, count})));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const isTeardown = process.argv.includes('--teardown');
  try {
    if (isTeardown) {
      console.log('Tearing down PulseTrack demo data...');
      await teardown();
    } else {
      console.log('Seeding PulseTrack demo data...');
      await seed();
      console.log(
        '\nDone. Re-run is safe (idempotent). Teardown: node scripts/seed-demo.mjs --teardown',
      );
    }
  } finally {
    await sql.end({timeout: 5});
  }
}

main().catch((error) => {
  console.error('\nseed-demo failed:', error);
  process.exitCode = 1;
});
