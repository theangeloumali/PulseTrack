import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {generateScheduledInvoices} from '@/lib/db/client-invoice-mutations-service';

// Cron route: must run on the Node runtime (service-role key) and never be cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verify the caller is Vercel Cron (or a holder of CRON_SECRET).
 * Vercel sends `authorization: Bearer <CRON_SECRET>` plus an `x-vercel-cron` header.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (secret && authHeader === `Bearer ${secret}`) return true;
  return req.headers.get('x-vercel-cron') !== null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  try {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const asOf = new Date();
    const results = await generateScheduledInvoices(asOf, serviceClient);

    return NextResponse.json({
      generated: results.map((r) => r.invoiceId),
      ranAt: asOf.toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate scheduled invoices';
    console.error('[cron/generate-invoices] error:', error);
    return NextResponse.json({error: message}, {status: 500});
  }
}
