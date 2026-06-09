import {supabase} from '@/lib/db';
import type {Client, NewClient, ClientContact, NewClientContact, Project} from '@/lib/db/schema';

// Owner embed shape returned by PostgREST via the clients.owner_id foreign key
interface ClientOwnerRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}

// Raw rows returned by Supabase for the list query (counts come back as [{count}])
interface ClientCountRow extends Client {
  owner: ClientOwnerRow | null;
  contacts: {count: number}[] | null;
  projects: {count: number}[] | null;
}

// Raw row returned by Supabase for the detail query
interface ClientDetailRow extends Client {
  owner: ClientOwnerRow | null;
  contacts: ClientContact[] | null;
  projects: Pick<Project, 'id' | 'name' | 'status'>[] | null;
}

// Client enriched with aggregate counts + resolved owner name (list view)
export interface ClientWithCounts extends Client {
  contactsCount: number;
  projectsCount: number;
  ownerName: string | null;
}

// Client with its contacts and projects expanded (detail view)
export interface ClientDetail extends Client {
  contacts: ClientContact[];
  projects: Pick<Project, 'id' | 'name' | 'status'>[];
  ownerName: string | null;
}

function formatOwnerName(owner: ClientOwnerRow | null): string | null {
  if (!owner) return null;
  const name = [owner.first_name, owner.last_name].filter(Boolean).join(' ').trim();
  return name || owner.email;
}

/**
 * List all clients for a company with contact + project counts and owner name.
 * Company-scoped via company_id.
 */
export async function getClientsWithCounts(companyId: string): Promise<ClientWithCounts[]> {
  const {data, error} = await supabase
    .from('clients')
    .select(
      `
      *,
      owner:owner_id ( id, first_name, last_name, email ),
      contacts:client_contacts ( count ),
      projects:projects ( count )
    `,
    )
    .eq('company_id', companyId)
    .order('name', {ascending: true});

  if (error) throw error;

  return ((data ?? []) as ClientCountRow[]).map(({owner, contacts, projects, ...client}) => ({
    ...client,
    contactsCount: contacts?.[0]?.count ?? 0,
    projectsCount: projects?.[0]?.count ?? 0,
    ownerName: formatOwnerName(owner),
  }));
}

/** Fetch a single client row by id. */
export async function getClientById(id: string): Promise<Client | null> {
  const {data, error} = await supabase.from('clients').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return (data as Client) ?? null;
}

/**
 * Fetch a client with its contacts (persons in charge) and projects expanded.
 */
export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const {data, error} = await supabase
    .from('clients')
    .select(
      `
      *,
      owner:owner_id ( id, first_name, last_name, email ),
      contacts:client_contacts ( * ),
      projects:projects ( id, name, status )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const {owner, contacts, projects, ...client} = data as ClientDetailRow;
  return {
    ...client,
    contacts: contacts ?? [],
    projects: projects ?? [],
    ownerName: formatOwnerName(owner),
  };
}

/** Create a new client. company_id must be set on the payload. */
export async function createClient(data: NewClient): Promise<Client> {
  const {data: result, error} = await supabase.from('clients').insert(data).select().single();

  if (error) throw error;
  return result as Client;
}

/** Update an existing client. */
export async function updateClient(id: string, updates: Partial<NewClient>): Promise<Client> {
  const {data, error} = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

/** Archive a client by setting its status to inactive. */
export async function archiveClient(id: string): Promise<Client> {
  return updateClient(id, {status: 'inactive'});
}

/** Create a new person-in-charge (contact) for a client. */
export async function createClientContact(data: NewClientContact): Promise<ClientContact> {
  const {data: result, error} = await supabase
    .from('client_contacts')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result as ClientContact;
}

/** Update a client contact. */
export async function updateClientContact(
  id: string,
  updates: Partial<NewClientContact>,
): Promise<ClientContact> {
  const {data, error} = await supabase
    .from('client_contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ClientContact;
}

/** Delete a client contact. */
export async function deleteClientContact(id: string): Promise<void> {
  const {error} = await supabase.from('client_contacts').delete().eq('id', id);

  if (error) throw error;
}
