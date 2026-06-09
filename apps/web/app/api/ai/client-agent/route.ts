import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {convertToModelMessages, stepCountIs, streamText, type UIMessage} from 'ai';
import {google} from '@ai-sdk/google';
import {buildClientAgentSystemPrompt} from '@/lib/ai/client-agent-prompt';
import {createClientAgentTools} from '@/lib/ai/client-agent-tools';

// Streams Gemini tokens; must run uncached on the Node runtime.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface UserProfileRow {
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

function resolveUserName(profile: UserProfileRow): string {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return name || profile.email;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate via the session cookie (anon key).
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({name, value, options}) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: {user},
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    // 2. Service-role client: bypasses RLS, used for all tool queries + lookups.
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {auth: {autoRefreshToken: false, persistSession: false}},
    );

    // 3. Resolve company_id + names server-side — the model NEVER supplies these.
    const {data: profileData, error: profileError} = await serviceClient
      .from('users')
      .select('company_id, first_name, last_name, email')
      .eq('id', user.id)
      .single();
    if (profileError || !profileData) {
      return NextResponse.json({error: 'User not found'}, {status: 401});
    }
    const profile = profileData as UserProfileRow;

    const {data: companyData} = await serviceClient
      .from('companies')
      .select('name')
      .eq('id', profile.company_id)
      .maybeSingle();
    const companyName = (companyData as {name: string} | null)?.name ?? 'your company';

    // 4. Stream the agent.
    const {messages} = (await req.json()) as {messages: UIMessage[]};
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: buildClientAgentSystemPrompt({
        companyName,
        userName: resolveUserName(profile),
        today: new Date().toISOString().slice(0, 10),
      }),
      messages: modelMessages,
      tools: createClientAgentTools({
        companyId: profile.company_id,
        userId: user.id,
        supabase: serviceClient,
      }),
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Client agent request failed';
    console.error('[ai/client-agent] error:', error);
    return NextResponse.json({error: message}, {status: 500});
  }
}
